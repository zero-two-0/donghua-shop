package com.sky.task;

import com.sky.entity.Orders;
import com.sky.mapper.OrderMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 定时任务类，定时处理订单状态
 */
@Component
@Slf4j
@org.springframework.context.annotation.Profile("external")
public class OrderTask {

    @Autowired
    private OrderMapper orderMapper;

    /**
     * 处理超时订单
     */
    @Scheduled(cron = "0 * * * * *")
    public void processTimeoutOrder() {
        log.info("定时处理超时订单：{}", LocalDateTime.now());

        LocalDateTime time = LocalDateTime.now().minusMinutes(15);

        // select from orders where status = ? and order_time < (当前时间 - 15min)
        List<Orders> ordersList = orderMapper.getByStatusAndOrderTimeLT(Orders.PENDING_PAYMENT, time);

        if (ordersList != null && !ordersList.isEmpty()) {
            for (Orders orders : ordersList) {
                // 仅取消仍未支付的超时订单；并发支付先完成时，条件更新返回0而不覆盖。
                Orders change = Orders.builder().id(orders.getId()).status(Orders.CANCELLED)
                        .cancelReason("订单超时，取消订单").cancelTime(LocalDateTime.now()).build();
                int updated = orderMapper.transition(change, Orders.PENDING_PAYMENT, Orders.UN_PAID);
                log.info("event=order_timeout orderId={} updated={}", orders.getId(), updated);
            }
        }
    }
}
