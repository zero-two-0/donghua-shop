package com.sky.service.impl;

import com.sky.exception.BaseException;
import com.sky.mapper.ReportMapper;
import com.sky.service.ReportService;
import com.sky.vo.BusinessDataVO;
import com.sky.vo.TurnoverReportVO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@Slf4j
public class ReportServiceImpl implements ReportService {
    @Autowired private ReportMapper reportMapper;
    @Override @Transactional(readOnly = true)
    public TurnoverReportVO turnoverStatistics(LocalDate begin, LocalDate end) {
        if (begin == null || end == null || end.isBefore(begin) || ChronoUnit.DAYS.between(begin, end) > 30)
            throw new BaseException("起止日期不能为空，且统计区间必须为1至31天");
        List<String> dates = new ArrayList<>(), amounts = new ArrayList<>();
        for (LocalDate date = begin; !date.isAfter(end); date = date.plusDays(1)) {
            dates.add(date.toString());
            amounts.add(zero(reportMapper.turnover(date.atStartOfDay(), date.plusDays(1).atStartOfDay())).setScale(2, RoundingMode.HALF_UP).toPlainString());
        }
        log.info("event=turnover_statistics begin={} end={} days={}", begin, end, dates.size());
        return TurnoverReportVO.builder().dateList(String.join(",", dates)).turnoverList(String.join(",", amounts)).build();
    }
    /** 完成率分母排除取消订单；空日和零有效订单统一返回0，金额中间计算使用BigDecimal。 */
    @Override @Transactional(readOnly = true)
    public BusinessDataVO businessData(LocalDate date) {
        if (date == null) date = LocalDate.now();
        LocalDateTime begin = date.atStartOfDay(), end = date.plusDays(1).atStartOfDay();
        BigDecimal turnover = zero(reportMapper.turnover(begin, end));
        int valid = zero(reportMapper.validOrders(begin, end)), total = zero(reportMapper.nonCancelledOrders(begin, end));
        double rate = total == 0 ? 0 : BigDecimal.valueOf(valid).divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP).doubleValue();
        double unit = valid == 0 ? 0 : turnover.divide(BigDecimal.valueOf(valid), 2, RoundingMode.HALF_UP).doubleValue();
        BusinessDataVO result = BusinessDataVO.builder().turnover(turnover.doubleValue()).validOrderCount(valid)
                .orderCompletionRate(rate).unitPrice(unit).newUsers(zero(reportMapper.newUsers(begin, end))).build();
        log.info("event=workspace_statistics date={} validOrders={} nonCancelledOrders={}", date, valid, total);
        return result;
    }
    private BigDecimal zero(BigDecimal value) { return value == null ? BigDecimal.ZERO : value; }
    private int zero(Integer value) { return value == null ? 0 : value; }
}
