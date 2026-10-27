package com.sky.interceptor;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/** Enforce the shared pagination contract before any mapper starts a page. */
@Component
public class PaginationInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        int page = Integer.parseInt(request.getParameter("page"));
        int size = Integer.parseInt(request.getParameter("pageSize"));
        if (page < 1 || size < 1 || size > 100) {
            throw new IllegalArgumentException("Invalid pagination bounds");
        }
        return true;
    }
}
