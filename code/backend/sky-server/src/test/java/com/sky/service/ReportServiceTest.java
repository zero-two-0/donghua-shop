package com.sky.service;

import com.sky.exception.BaseException;
import com.sky.mapper.ReportMapper;
import com.sky.service.impl.ReportServiceImpl;
import com.sky.vo.*;
import org.junit.jupiter.api.*;
import org.mockito.*;
import java.math.BigDecimal;
import java.time.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

class ReportServiceTest {
    @Mock ReportMapper mapper;
    @InjectMocks ReportServiceImpl service;
    @BeforeEach void setup() { MockitoAnnotations.initMocks(this); }
    @Test void rejectsReversedOrOversizedOrMissingRange() {
        LocalDate day = LocalDate.of(2026, 10, 1);
        assertThrows(BaseException.class, () -> service.turnoverStatistics(day, day.minusDays(1)));
        assertThrows(BaseException.class, () -> service.turnoverStatistics(day, day.plusDays(31)));
        assertThrows(BaseException.class, () -> service.turnoverStatistics(null, day));
        verifyNoInteractions(mapper);
    }
    @Test void dailySeriesIncludesZeroDaysAndHalfOpenBoundaries() {
        LocalDate day = LocalDate.of(2026, 10, 1);
        when(mapper.turnover(day.atStartOfDay(), day.plusDays(1).atStartOfDay())).thenReturn(new BigDecimal("25.50"));
        TurnoverReportVO result = service.turnoverStatistics(day, day.plusDays(1));
        assertEquals("2026-10-01,2026-10-02", result.getDateList());
        assertEquals("25.50,0.00", result.getTurnoverList());
        verify(mapper).turnover(day.plusDays(1).atStartOfDay(), day.plusDays(2).atStartOfDay());
    }
    @Test void emptyBusinessDayHasZeroMetricsInsteadOfDivisionByZero() {
        BusinessDataVO result = service.businessData(LocalDate.of(2026, 10, 1));
        assertEquals(0.0, result.getTurnover()); assertEquals(0, result.getValidOrderCount());
        assertEquals(0.0, result.getOrderCompletionRate()); assertEquals(0.0, result.getUnitPrice()); assertEquals(0, result.getNewUsers());
    }
    @Test void businessMetricsFollowDocumentedDenominatorAndMonetaryRounding() {
        LocalDate date = LocalDate.of(2026, 10, 1); LocalDateTime start = date.atStartOfDay(), end = date.plusDays(1).atStartOfDay();
        when(mapper.turnover(start, end)).thenReturn(new BigDecimal("25.00"));
        when(mapper.validOrders(start, end)).thenReturn(2); when(mapper.nonCancelledOrders(start, end)).thenReturn(3);
        when(mapper.newUsers(start, end)).thenReturn(4);
        BusinessDataVO result = service.businessData(date);
        assertEquals(25.0, result.getTurnover()); assertEquals(2, result.getValidOrderCount());
        assertEquals(0.6667, result.getOrderCompletionRate()); assertEquals(12.5, result.getUnitPrice()); assertEquals(4, result.getNewUsers());
    }
    @Test void full31DayRangeAccepted() {
        LocalDate day = LocalDate.of(2026, 10, 1);
        assertEquals(31, service.turnoverStatistics(day, day.plusDays(30)).getDateList().split(",").length);
        verify(mapper, times(31)).turnover(any(), any());
    }
}
