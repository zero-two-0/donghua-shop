package com.sky.exception;

/**
 * 套餐不存在异常
 */
public class SetmealNotFoundException extends BaseException {

    public SetmealNotFoundException(){}

    public SetmealNotFoundException(String msg){
        super(msg);
    }
}
