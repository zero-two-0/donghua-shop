package com.sky.controller.admin;

import com.sky.result.Result;
import com.sky.service.ReportService;
import com.sky.vo.BusinessDataVO;
import io.swagger.annotations.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@RestController
@RequestMapping("/admin/workspace")
@Api(tags = "工作台")
public class WorkSpaceController {
    @Autowired private ReportService reportService;
    @GetMapping("/businessData")
    @ApiOperation("查询指定日经营数据（默认今天）")
    public Result<BusinessDataVO> businessData(@RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return Result.success(reportService.businessData(date));
    }
}
