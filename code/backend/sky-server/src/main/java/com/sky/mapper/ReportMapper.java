package com.sky.mapper;

import org.apache.ibatis.annotations.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Mapper
public interface ReportMapper {
    // 时间按订单创建时间统计，半开区间防止跨天重复；仅已付款且完成订单计营业额。
    @Select("select coalesce(sum(amount),0) from orders where status=5 and pay_status=1 and order_time >= #{begin} and order_time < #{end}")
    BigDecimal turnover(@Param("begin") LocalDateTime begin, @Param("end") LocalDateTime end);
    @Select("select count(*) from orders where status=5 and pay_status=1 and order_time >= #{begin} and order_time < #{end}")
    Integer validOrders(@Param("begin") LocalDateTime begin, @Param("end") LocalDateTime end);
    @Select("select count(*) from orders where status <> 6 and order_time >= #{begin} and order_time < #{end}")
    Integer nonCancelledOrders(@Param("begin") LocalDateTime begin, @Param("end") LocalDateTime end);
    @Select("select count(*) from user where create_time >= #{begin} and create_time < #{end}")
    Integer newUsers(@Param("begin") LocalDateTime begin, @Param("end") LocalDateTime end);
}
