package com.sky.service.impl;

import com.alibaba.fastjson.JSON;
import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import com.sky.context.BaseContext;
import com.sky.dto.*;
import com.sky.entity.*;
import com.sky.exception.OrderBusinessException;
import com.sky.mapper.*;
import com.sky.result.PageResult;
import com.sky.service.OrderService;
import com.sky.service.ShoppingCartService;
import com.sky.vo.*;
import com.sky.websocket.WebSocketServer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class OrderServiceImpl implements OrderService {
    @Autowired private OrderMapper orderMapper;
    @Autowired private ShoppingCartMapper shoppingCartMapper;
    @Autowired private AddressBookMapper addressBookMapper;
    @Autowired private OrderDetailMapper orderDetailMapper;
    @Autowired private DishMapper dishMapper;
    @Autowired private SetmealMapper setmealMapper;
    @Autowired private ShoppingCartService shoppingCartService;
    @Autowired private WebSocketServer webSocketServer;

    /** 价格和收货信息均由服务端取快照，客户端总价、打包费不参与计算。 */
    @Override @Transactional
    public OrderSubmitVO submitOrder(OrdersSubmitDTO dto) {
        if (dto == null || dto.getAddressBookId() == null) throw error("请选择收货地址");
        AddressBook address = addressBookMapper.getById(dto.getAddressBookId());
        Long userId = BaseContext.getCurrentId();
        if (address == null || !Objects.equals(address.getUserId(), userId)) throw error("地址不存在或无权访问");
        List<ShoppingCart> carts = shoppingCartMapper.list(ShoppingCart.builder().userId(userId).build());
        if (carts == null || carts.isEmpty()) throw error("购物车为空");
        BigDecimal total = BigDecimal.ZERO;
        List<OrderDetail> snapshots = new ArrayList<>();
        for (ShoppingCart cart : carts) {
            if (cart.getNumber() == null || cart.getNumber() < 1 || cart.getNumber() > 99) throw error("商品数量必须为1至99");
            refreshProduct(cart);
            total = total.add(cart.getAmount().multiply(BigDecimal.valueOf(cart.getNumber())));
            OrderDetail detail = new OrderDetail(); BeanUtils.copyProperties(cart, detail, "id"); snapshots.add(detail);
        }
        // 显式映射避免将金额、费用或空包装类型写入服务端原始类型字段。
        Orders order = new Orders();
        order.setAddressBookId(dto.getAddressBookId()); order.setRemark(dto.getRemark());
        order.setPayMethod(dto.getPayMethod() == 0 ? 1 : dto.getPayMethod());
        order.setEstimatedDeliveryTime(dto.getEstimatedDeliveryTime()); order.setDeliveryStatus(dto.getDeliveryStatus());
        order.setTablewareNumber(dto.getTablewareNumber() == null ? 0 : dto.getTablewareNumber());
        order.setTablewareStatus(dto.getTablewareStatus());
        order.setPhone(address.getPhone()); order.setConsignee(address.getConsignee());
        order.setAddress(safe(address.getProvinceName()) + safe(address.getCityName()) + safe(address.getDistrictName()) + safe(address.getDetail()));
        order.setNumber(UUID.randomUUID().toString().replace("-", ""));
        order.setUserId(userId); order.setAmount(total); order.setPackAmount(0);
        order.setStatus(Orders.PENDING_PAYMENT); order.setPayStatus(Orders.UN_PAID); order.setOrderTime(LocalDateTime.now());
        orderMapper.insert(order);
        snapshots.forEach(detail -> detail.setOrderId(order.getId()));
        orderDetailMapper.insertBatch(snapshots); shoppingCartMapper.deleteByUserId(userId);
        log.info("event=order_submit userId={} orderId={} itemCount={} amount={}", userId, order.getId(), snapshots.size(), total);
        return OrderSubmitVO.builder().id(order.getId()).orderNumber(order.getNumber()).orderAmount(total).orderTime(order.getOrderTime()).build();
    }

    private String safe(String text) { return text == null ? "" : text; }
    private void refreshProduct(ShoppingCart cart) {
        if ((cart.getDishId() == null) == (cart.getSetmealId() == null)) throw error("购物车商品标识无效");
        BigDecimal price;
        if (cart.getDishId() != null) {
            Dish dish = dishMapper.getById(cart.getDishId());
            if (dish == null || !Integer.valueOf(1).equals(dish.getStatus())) throw error("菜品不存在或已停售");
            price = dish.getPrice(); cart.setName(dish.getName()); cart.setImage(dish.getImage());
        } else {
            Setmeal meal = setmealMapper.getById(cart.getSetmealId());
            if (meal == null || !Integer.valueOf(1).equals(meal.getStatus())) throw error("套餐不存在或已停售");
            price = meal.getPrice(); cart.setName(meal.getName()); cart.setImage(meal.getImage());
        }
        if (price == null || price.signum() < 0) throw error("商品价格无效");
        cart.setAmount(price);
    }

    /** 课程模拟支付：不接入微信，不发生真实扣款。重复支付已付款订单返回相同结果。 */
    @Override @Transactional
    public OrderPaymentVO payment(OrdersPaymentDTO dto) {
        if (dto == null || dto.getOrderNumber() == null) throw error("订单号不能为空");
        Orders order = own(orderMapper.getByNumber(dto.getOrderNumber()));
        if (Orders.PAID.equals(order.getPayStatus()) && order.getStatus() >= 2 && order.getStatus() <= 5) return paymentResult(order);
        requireStatus(order, Orders.PENDING_PAYMENT);
        if (!Orders.UN_PAID.equals(order.getPayStatus())) throw error("订单支付状态错误");
        Orders change = Orders.builder().id(order.getId()).status(Orders.TO_BE_CONFIRMED).payStatus(Orders.PAID)
                .payMethod(dto.getPayMethod() == null ? 1 : dto.getPayMethod()).checkoutTime(LocalDateTime.now()).build();
        if (orderMapper.transition(change, order.getStatus(), order.getPayStatus()) != 1) {
            Orders latest = own(orderMapper.getByNumber(dto.getOrderNumber()));
            if (Orders.PAID.equals(latest.getPayStatus()) && latest.getStatus() >= 2 && latest.getStatus() <= 5) return paymentResult(latest);
            throw error("订单状态已变化，请刷新后重试");
        }
        log.info("event=order_simulated_payment userId={} orderId={} amount={}", order.getUserId(), order.getId(), order.getAmount());
        order.setCheckoutTime(change.getCheckoutTime());
        return paymentResult(order);
    }
    private OrderPaymentVO paymentResult(Orders order) {
        return OrderPaymentVO.builder().nonceStr(order.getNumber()).paySign("SIMULATED").signType("SIMULATED")
                .packageStr("SIMULATED:" + order.getNumber())
                .timeStamp(order.getCheckoutTime() == null ? "0" : String.valueOf(order.getCheckoutTime().toEpochSecond(ZoneOffset.UTC))).build();
    }
    /** 外部支付回调在课程版禁用；只能由已登录用户调用模拟支付。 */
    @Override public void paySuccess(String orderNumber) { throw error("课程版未启用外部支付回调"); }

    @Override public PageResult historyOrdersPageQuery(int page, int pageSize, Integer status) {
        validatePage(page, pageSize); PageHelper.startPage(page, pageSize);
        OrdersPageQueryDTO query = new OrdersPageQueryDTO(); query.setStatus(status); query.setUserId(BaseContext.getCurrentId());
        Page<Orders> results = orderMapper.pageQuery(query);
        return new PageResult(results.getTotal(), results.stream().map(this::view).collect(Collectors.toList()));
    }
    private OrderVO view(Orders order) {
        OrderVO vo = new OrderVO(); BeanUtils.copyProperties(order, vo);
        List<OrderDetail> details = orderDetailMapper.getByOrderId(order.getId()); vo.setOrderDetailList(details);
        vo.setOrderDishes(details.stream().map(item -> item.getName() + "*" + item.getNumber()).collect(Collectors.joining(";")));
        return vo;
    }
    @Override public OrderVO details(Long id) { return view(requireOrder(id)); }
    @Override public OrderVO detailsForCurrentUser(Long id) { return view(own(requireOrder(id))); }

    @Override @Transactional
    public void cancelOrder(Long id) {
        Orders order = own(requireOrder(id));
        if (!Orders.PENDING_PAYMENT.equals(order.getStatus()) && !Orders.TO_BE_CONFIRMED.equals(order.getStatus())) throw error("只能取消待付款或待接单订单");
        cancelWithRefund(order, "用户取消", null);
    }
    @Override @Transactional
    public void repetition(Long id) {
        own(requireOrder(id));
        List<OrderDetail> details = orderDetailMapper.getByOrderId(id);
        for (OrderDetail detail : details) {
            if (detail.getNumber() == null || detail.getNumber() < 1 || detail.getNumber() > 99) throw error("订单商品数量无效");
            ShoppingCartDTO dto = new ShoppingCartDTO(); dto.setDishId(detail.getDishId()); dto.setSetmealId(detail.getSetmealId()); dto.setDishFlavor(detail.getDishFlavor());
            for (int count = 0; count < detail.getNumber(); count++) shoppingCartService.addShoppingCart(dto);
        }
        log.info("event=order_repeat userId={} orderId={}", BaseContext.getCurrentId(), id);
    }
    @Override public PageResult conditionSearch(OrdersPageQueryDTO dto) {
        validatePage(dto.getPage(), dto.getPageSize()); PageHelper.startPage(dto.getPage(), dto.getPageSize());
        Page<Orders> results = orderMapper.pageQuery(dto);
        return new PageResult(results.getTotal(), results.stream().map(this::view).collect(Collectors.toList()));
    }
    @Override public OrderStatisticsVO statistics() {
        OrderStatisticsVO result = new OrderStatisticsVO();
        result.setToBeConfirmed(orderMapper.countStatus(2)); result.setConfirmed(orderMapper.countStatus(3));
        result.setDeliveryInProgress(orderMapper.countStatus(4)); return result;
    }
    @Override @Transactional public void confirm(OrdersConfirmDTO dto) {
        Orders current = requireOrder(dto.getId()); requireStatus(current, Orders.TO_BE_CONFIRMED);
        transition(current, Orders.builder().id(current.getId()).status(Orders.CONFIRMED).build());
    }
    @Override @Transactional public void rejection(OrdersRejectionDTO dto) {
        Orders current = requireOrder(dto.getId()); requireStatus(current, Orders.TO_BE_CONFIRMED);
        cancelWithRefund(current, null, requiredReason(dto.getRejectionReason()));
    }
    @Override @Transactional public void cancel(OrdersCancelDTO dto) {
        Orders current = requireOrder(dto.getId());
        if (current.getStatus() < 1 || current.getStatus() > 4) throw error("已完成或已取消订单不能再次取消");
        cancelWithRefund(current, requiredReason(dto.getCancelReason()), null);
    }
    private String requiredReason(String reason) { if (reason == null || reason.trim().isEmpty()) throw error("取消或拒单原因不能为空"); return reason.trim(); }
    private void cancelWithRefund(Orders current, String reason, String rejection) {
        Orders change = Orders.builder().id(current.getId()).status(Orders.CANCELLED).cancelTime(LocalDateTime.now())
                .cancelReason(reason).rejectionReason(rejection).payStatus(Orders.PAID.equals(current.getPayStatus()) ? Orders.REFUND : current.getPayStatus()).build();
        transition(current, change);
        log.info("event=order_cancel orderId={} refundSimulated={}", current.getId(), Orders.REFUND.equals(change.getPayStatus()));
    }
    @Override @Transactional public void delivery(Long id) {
        Orders current = requireOrder(id); requireStatus(current, Orders.CONFIRMED);
        transition(current, Orders.builder().id(id).status(Orders.DELIVERY_IN_PROGRESS).build());
    }
    @Override @Transactional public void complete(Long id) {
        Orders current = requireOrder(id); requireStatus(current, Orders.DELIVERY_IN_PROGRESS);
        transition(current, Orders.builder().id(id).status(Orders.COMPLETED).deliveryTime(LocalDateTime.now()).build());
    }
    @Override public void reminder(Long id) {
        Orders current = own(requireOrder(id));
        if (current.getStatus() < 2 || current.getStatus() > 4) throw error("当前订单不能催单");
        Map<String,Object> event = new HashMap<>(); event.put("type", 2); event.put("orderId", id); event.put("content", "订单催单");
        webSocketServer.sendToAllClient(JSON.toJSONString(event));
        log.info("event=order_reminder userId={} orderId={}", current.getUserId(), id);
    }
    /** 状态与支付状态同时匹配才允许更新，防止并发接单/取消互相覆盖。 */
    private void transition(Orders before, Orders change) {
        if (orderMapper.transition(change, before.getStatus(), before.getPayStatus()) != 1) throw error("订单状态已变化，请刷新后重试");
        log.info("event=order_transition orderId={} from={} to={}", before.getId(), before.getStatus(), change.getStatus());
    }
    private Orders requireOrder(Long id) { Orders order = id == null ? null : orderMapper.getById(id); if (order == null) throw error("订单不存在"); return order; }
    private Orders own(Orders order) { if (order == null || !Objects.equals(order.getUserId(), BaseContext.getCurrentId())) throw error("订单不存在或无权访问"); return order; }
    private void requireStatus(Orders order, Integer status) { if (!status.equals(order.getStatus())) throw error("订单状态错误"); }
    private void validatePage(int page, int size) { if (page < 1 || size < 1 || size > 100) throw error("页码必须大于0，pageSize必须为1至100"); }
    private OrderBusinessException error(String message) { return new OrderBusinessException(message); }
}
