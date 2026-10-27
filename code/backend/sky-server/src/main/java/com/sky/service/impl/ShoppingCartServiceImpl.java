package com.sky.service.impl;

import com.sky.context.BaseContext;
import com.sky.dto.ShoppingCartDTO;
import com.sky.entity.*;
import com.sky.exception.ShoppingCartBusinessException;
import com.sky.mapper.*;
import com.sky.service.ShoppingCartService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
public class ShoppingCartServiceImpl implements ShoppingCartService {
    @Autowired private ShoppingCartMapper shoppingCartMapper;
    @Autowired private DishMapper dishMapper;
    @Autowired private SetmealMapper setmealMapper;

    /** 商品实时校验，已存在行使用原子加一，避免空数量和并发丢失更新。 */
    @Override @Transactional
    public void addShoppingCart(ShoppingCartDTO dto) {
        if (dto == null || (dto.getDishId() == null) == (dto.getSetmealId() == null)) {
            throw new ShoppingCartBusinessException("dishId与setmealId必须且只能提供一个");
        }
        ShoppingCart cart = new ShoppingCart();
        BeanUtils.copyProperties(dto, cart);
        cart.setUserId(BaseContext.getCurrentId());
        cart.setDishFlavor(dto.getDishFlavor() == null ? "" : dto.getDishFlavor().trim());
        if (dto.getDishId() != null) {
            Dish dish = dishMapper.getById(dto.getDishId());
            if (dish == null || !Integer.valueOf(1).equals(dish.getStatus()) || dish.getPrice() == null || dish.getPrice().signum() < 0)
                throw new ShoppingCartBusinessException("菜品不存在或已停售");
            cart.setName(dish.getName()); cart.setAmount(dish.getPrice()); cart.setImage(dish.getImage());
        } else {
            Setmeal meal = setmealMapper.getById(dto.getSetmealId());
            if (meal == null || !Integer.valueOf(1).equals(meal.getStatus()) || meal.getPrice() == null || meal.getPrice().signum() < 0)
                throw new ShoppingCartBusinessException("套餐不存在或已停售");
            cart.setName(meal.getName()); cart.setAmount(meal.getPrice()); cart.setImage(meal.getImage());
        }
        List<ShoppingCart> existing = shoppingCartMapper.list(cart);
        if (existing != null && !existing.isEmpty()) {
            if (shoppingCartMapper.increment(existing.get(0).getId(), cart.getUserId()) != 1)
                throw new ShoppingCartBusinessException("数量已达99或购物车已变更");
        } else {
            cart.setNumber(1); cart.setCreateTime(LocalDateTime.now()); shoppingCartMapper.insert(cart);
        }
        log.info("event=cart_add userId={} dishId={} setmealId={}", cart.getUserId(), dto.getDishId(), dto.getSetmealId());
    }
    @Override public List<ShoppingCart> showShoppingCart() {
        return shoppingCartMapper.list(ShoppingCart.builder().userId(BaseContext.getCurrentId()).build());
    }
    @Override public void cleanShoppingCart() { shoppingCartMapper.deleteByUserId(BaseContext.getCurrentId()); }
    @Override public void changeQuantity(Long id, Integer number) {
        if (id == null || number == null || number < 1 || number > 99)
            throw new ShoppingCartBusinessException("数量必须为1至99");
        if (shoppingCartMapper.setOwnedQuantity(id, BaseContext.getCurrentId(), number) != 1)
            throw new ShoppingCartBusinessException("购物车商品不存在或无权访问");
        log.info("event=cart_quantity userId={} cartId={} number={}", BaseContext.getCurrentId(), id, number);
    }
    @Override public void deleteItem(Long id) {
        if (id == null || shoppingCartMapper.deleteOwned(id, BaseContext.getCurrentId()) != 1)
            throw new ShoppingCartBusinessException("购物车商品不存在或无权访问");
    }
}
