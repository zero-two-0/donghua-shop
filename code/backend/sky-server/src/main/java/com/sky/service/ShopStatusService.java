package com.sky.service;

import org.springframework.stereotype.Service;
import java.util.concurrent.atomic.AtomicInteger;

/** Single-instance course setting. Redis persistence is reserved for the deployment stage. */
@Service
public class ShopStatusService {
    private final AtomicInteger status = new AtomicInteger(1);
    public int get() { return status.get(); }
    public void set(Integer value) {
        if (value == null || (value != 0 && value != 1)) throw new IllegalArgumentException("状态只能为0或1");
        status.set(value);
    }
}
