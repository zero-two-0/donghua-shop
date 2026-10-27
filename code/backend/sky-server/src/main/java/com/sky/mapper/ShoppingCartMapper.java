package com.sky.mapper;

import com.sky.entity.ShoppingCart;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Update;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ShoppingCartMapper {
    @Update("update shopping_cart set number = number + 1 where id = #{id} and user_id = #{userId} and number < 99")
    int increment(@Param("id") Long id, @Param("userId") Long userId);

    @Update("update shopping_cart set number = #{number} where id = #{id} and user_id = #{userId}")
    int setOwnedQuantity(@Param("id") Long id, @Param("userId") Long userId, @Param("number") Integer number);

    @Delete("delete from shopping_cart where id = #{id} and user_id = #{userId}")
    int deleteOwned(@Param("id") Long id, @Param("userId") Long userId);


    /**
     * 动态条件查询
     * @param shoppingCart
     * @return
     */
    List<ShoppingCart> list(ShoppingCart shoppingCart);

    /**
     * 根据id修改商品数量
     * @param shoppingCart
     */
    @Update("update shopping_cart set number = #{number} where id = #{id}")
    void updateNumberById(ShoppingCart shoppingCart);

    /**
     * 插入购物车数据
     * @param shoppingCart
     */
    @Insert("insert into shopping_cart (name, user_id, dish_id, setmeal_id, dish_flavor, number, amount, image, create_time) " +
            " values (#{name},#{userId},#{dishId},#{setmealId},#{dishFlavor},#{number},#{amount},#{image},#{createTime})")
    void insert(ShoppingCart shoppingCart);

    /**
     * 根据用户ID删除购物车数据
     * @param userId
     */
    @Delete("delete from shopping_cart where user_id = #{userId}")
    void deleteByUserId(Long userId);

    /**
     * 批量插入购物车数据
     * @param shoppingCartList
     */
    void insertBatch(@Param("shoppingCartList") List<ShoppingCart> shoppingCartList);
}
