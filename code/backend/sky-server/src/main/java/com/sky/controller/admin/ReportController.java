package com.sky.controller.admin;

import com.sky.result.Result;
import com.sky.service.ReportService;
import com.sky.vo.TurnoverReportVO;
import io.swagger.annotations.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@RestController
@RequestMapping("/admin/report")
@Api(tags = "营业统计")
public class ReportController {
    @Autowired private ReportService reportService;
    @GetMapping("/turnoverStatistics")
    @ApiOperation("按日统计营业额（最多31天）")
    public Result<TurnoverReportVO> turnoverStatistics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate begin,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return Result.success(reportService.turnoverStatistics(begin, end));
    }
}
