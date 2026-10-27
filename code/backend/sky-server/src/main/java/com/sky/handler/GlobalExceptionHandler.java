package com.sky.handler;

import com.sky.exception.BaseException;
import com.sky.result.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.dao.DataIntegrityViolationException;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    @ExceptionHandler(BaseException.class)
    public Result<?> business(BaseException ex) {
        log.warn("event=business_rejected reason={}",ex.getMessage());
        return Result.error(ex.getMessage());
    }
    @ExceptionHandler({IllegalArgumentException.class, ServletRequestBindingException.class,
            HttpMessageNotReadableException.class, org.springframework.validation.BindException.class})
    public ResponseEntity<Result<?>> invalid(Exception ex) {
        log.warn("event=invalid_request type={}",ex.getClass().getSimpleName());
        return ResponseEntity.badRequest().body(Result.error("参数格式错误或超出允许范围"));
    }
    @ExceptionHandler({DataIntegrityViolationException.class, java.sql.SQLIntegrityConstraintViolationException.class})
    public ResponseEntity<Result<?>> conflict(Exception ex) {
        log.warn("event=data_conflict type={}",ex.getClass().getSimpleName());
        return ResponseEntity.status(409).body(Result.error("数据重复或关联约束不满足"));
    }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<?>> unexpected(Exception ex) {
        // Do not expose SQL text, request payloads or configuration in error responses/logs.
        log.error("event=request_failed type={}",ex.getClass().getSimpleName());
        return ResponseEntity.status(500).body(Result.error("服务内部错误"));
    }
}
