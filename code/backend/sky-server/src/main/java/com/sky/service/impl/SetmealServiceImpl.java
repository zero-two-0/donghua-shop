package com.sky.service.impl;

import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import com.github.xiaoymin.knife4j.core.util.CollectionUtils;
import com.sky.constant.MessageConstant;
import com.sky.constant.StatusConstant;
import com.sky.dto.SetmealDTO;
import com.sky.dto.SetmealPageQueryDTO;
import com.sky.entity.Dish;
import com.sky.entity.Setmeal;
import com.sky.entity.SetmealDish;
import com.sky.exception.DeletionNotAllowedException;
import com.sky.exception.SetmealNotFoundException;
import com.sky.mapper.DishMapper;
import com.sky.mapper.SetmealDishMapper;
import com.sky.mapper.SetmealMapper;
import com.sky.result.PageResult;
import com.sky.service.DishService;
import com.sky.service.SetmealService;
import com.sky.vo.DishItemVO;
import com.sky.vo.SetmealVO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class SetmealServiceImpl implements SetmealService {

    @Autowired
    private SetmealMapper setmealMapper;
    @Autowired
    private SetmealDishMapper setmealDishMapper;
    @Autowired
    private DishMapper dishMapper;

    /**
     * 新增套餐和对应菜品
     *
     * @param setmealDTO
     */
    @Override
    @Transactional
    public void saveWithDishes(SetmealDTO setmealDTO) {
        if (setmealDTO == null || setmealDTO.getName() == null || setmealDTO.getName().trim().isEmpty()
                || setmealDTO.getCategoryId() == null || setmealDTO.getCategoryId() <= 0
                || setmealDTO.getPrice() == null || setmealDTO.getPrice().signum() < 0) {
            throw new com.sky.exception.BaseException("套餐名称、分类和非负价格不能为空");
        }
        Setmeal setmeal = new Setmeal();
        BeanUtils.copyProperties(setmealDTO, setmeal);
        setmeal.setStatus(StatusConstant.DISABLE);

        //向套餐表插入数据
        setmealMapper.insert(setmeal);

        Long id = setmeal.getId();

        //向setmeal_dish表插入数据
        List<SetmealDish> setmealDishes = setmealDTO.getSetmealDishes();
        if (setmealDishes != null && !setmealDishes.isEmpty()) {
            setmealDishes.forEach(setmealDish -> {
                setmealDish.setSetmealId(id);
            });
            setmealDishMapper.insertBatch(setmealDishes);
        }
    }

    /**
     * 批量删除套餐
     *
     * @param ids
     */
    @Override
    @Transactional
    public void deleteBatch(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return;
        }
        //起售中不能删除
        for (Long id : ids) {
            Setmeal setmeal = setmealMapper.getById(id);
            if (setmeal == null) {
                throw new SetmealNotFoundException(MessageConstant.SETMEAL_NOT_FOUND);
            }
            if (setmeal.getStatus() == StatusConstant.ENABLE) {
                throw new DeletionNotAllowedException(MessageConstant.SETMEAL_ON_SALE);
            }
        }

        //批量删除
        setmealMapper.deleteByIds(ids);
        setmealDishMapper.deleteBySetmealIds(ids);
    }

    /**
     * 根据id查询套餐
     *
     * @param id
     * @return
     */
    @Override
    public SetmealVO getById(Long id) {
        Setmeal setmeal = setmealMapper.getById(id);
        if (setmeal == null) {
            throw new SetmealNotFoundException(MessageConstant.SETMEAL_NOT_FOUND);
        }

        List<SetmealDish> setmealDishes = setmealDishMapper.getBySetmealId(id);

        //将查询到的数据封装到VO
        SetmealVO setmealVO = new SetmealVO();
        BeanUtils.copyProperties(setmeal, setmealVO);
        setmealVO.setSetmealDishes(setmealDishes);

        return setmealVO;
    }

    /**
     * 修改套餐
     *
     * @param setmealDTO
     */
    @Override
    @Transactional
    public void update(SetmealDTO setmealDTO) {
        if (setmealDTO == null || setmealDTO.getId() == null || setmealMapper.getById(setmealDTO.getId()) == null) {
            throw new SetmealNotFoundException(MessageConstant.SETMEAL_NOT_FOUND);
        }
        Setmeal setmeal = new Setmeal();
        BeanUtils.copyProperties(setmealDTO, setmeal);

        //修改套餐信息
        setmealMapper.update(setmeal);

        //删除原来套餐包含菜品
        if (setmealDTO.getSetmealDishes() != null) {
            setmealDishMapper.deleteBySetmealId(setmeal.getId());
        }

        //新增套餐包含菜品
        List<SetmealDish> setmealDishes = setmealDTO.getSetmealDishes();
        if (setmealDishes != null && setmealDishes.size() > 0) {
            setmealDishes.forEach(setmealDish -> {
                setmealDish.setSetmealId(setmeal.getId());
            });
            setmealDishMapper.insertBatch(setmealDishes);
        }
    }

    /**
     * 启用停用套餐
     *
     * @param status
     * @param id
     */
    @Override
    public void startOrStop(Integer status, Long id) {
        if (status == null || (status != 0 && status != 1)) {
            throw new com.sky.exception.BaseException("status must be 0 or 1");
        }
        if (id == null || id <= 0) {
            throw new SetmealNotFoundException(MessageConstant.SETMEAL_NOT_FOUND);
        }
        Setmeal setmeal = setmealMapper.getById(id);
        if (setmeal == null) {
            throw new SetmealNotFoundException(MessageConstant.SETMEAL_NOT_FOUND);
        }
        if (status == StatusConstant.ENABLE) {
            //如果套餐内有停售菜品则禁止起售
            List<SetmealDish> setmealDishes = setmealDishMapper.getBySetmealId(id);
            if (setmealDishes != null && setmealDishes.size() > 0) {
                for (int i = 0; i < setmealDishes.size(); i++) {
                    Long dishId = setmealDishes.get(i).getDishId();
                    Dish dish = dishMapper.getById(dishId);

                    if (dish == null || !Integer.valueOf(StatusConstant.ENABLE).equals(dish.getStatus())) {
                        throw new DeletionNotAllowedException(MessageConstant.SETMEAL_ENABLE_FAILED);
                    }
                }
            }
        }
        setmeal.setStatus(status);
        setmealMapper.update(setmeal);
    }

    /**
     * 套餐分页查询
     *
     * @param setmealPageQueryDTO
     * @return
     */
    @Override
    public PageResult pageQuery(SetmealPageQueryDTO setmealPageQueryDTO) {
        PageHelper.startPage(setmealPageQueryDTO.getPage(), setmealPageQueryDTO.getPageSize());
        Page<SetmealVO> page = setmealMapper.pageQuery(setmealPageQueryDTO);
        return new PageResult(page.getTotal(), page.getResult());
    }

    /**
     * 条件查询
     * @param setmeal
     * @return
     */
    public List<Setmeal> list(Setmeal setmeal) {
        List<Setmeal> list = setmealMapper.list(setmeal);
        return list;
    }

    /**
     * 根据id查询菜品选项
     * @param id
     * @return
     */
    public List<DishItemVO> getDishItemById(Long id) {
        return setmealMapper.getDishItemBySetmealId(id);
    }
}
