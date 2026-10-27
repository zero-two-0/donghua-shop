package com.sky.service;

import com.sky.dto.DishDTO;
import com.sky.dto.SetmealDTO;
import com.sky.entity.Dish;
import com.sky.entity.Setmeal;
import com.sky.exception.BaseException;
import com.sky.exception.AccountNotFoundException;
import com.sky.exception.SetmealNotFoundException;
import com.sky.mapper.CategoryMapper;
import com.sky.mapper.DishFlavorMapper;
import com.sky.mapper.DishMapper;
import com.sky.mapper.EmployeeMapper;
import com.sky.mapper.SetmealDishMapper;
import com.sky.mapper.SetmealMapper;
import com.sky.service.impl.CategoryServiceImpl;
import com.sky.service.impl.DishServiceImpl;
import com.sky.service.impl.EmployeeServiceImpl;
import com.sky.service.impl.SetmealServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CatalogValidationTest {
    @Mock EmployeeMapper employeeMapper;
    @Mock CategoryMapper categoryMapper;
    @Mock DishMapper dishMapper;
    @Mock DishFlavorMapper dishFlavorMapper;
    @Mock SetmealMapper setmealMapper;
    @Mock SetmealDishMapper setmealDishMapper;

    @InjectMocks EmployeeServiceImpl employeeService;
    @InjectMocks CategoryServiceImpl categoryService;
    @InjectMocks DishServiceImpl dishService;
    @InjectMocks SetmealServiceImpl setmealService;

    @Test
    void employeeStartOrStopRejectsInvalidStatusBeforeLookup() {
        assertThrows(BaseException.class, () -> employeeService.startOrStop(2, 1L));
        verify(employeeMapper, never()).getById(any());
    }

    @Test
    void employeeStartOrStopRejectsMissingEmployee() {
        when(employeeMapper.getById(99L)).thenReturn(null);
        assertThrows(AccountNotFoundException.class, () -> employeeService.startOrStop(1, 99L));
    }

    @Test
    void categoryStartOrStopRequiresExistingCategoryAndValidStatus() {
        assertThrows(BaseException.class, () -> categoryService.startOrStop(-1, 1L));
        when(categoryMapper.getById(1L)).thenReturn(null);
        assertThrows(BaseException.class, () -> categoryService.startOrStop(1, 1L));
    }

    @Test
    void setmealStartOrStopRejectsInvalidStatusBeforeLookup() {
        assertThrows(BaseException.class, () -> setmealService.startOrStop(3, 1L));
        verify(setmealMapper, never()).getById(any());
    }

    @Test
    void setmealStartOrStopRejectsMissingSetmeal() {
        when(setmealMapper.getById(99L)).thenReturn(null);
        assertThrows(SetmealNotFoundException.class, () -> setmealService.startOrStop(1, 99L));
        verify(setmealMapper, never()).update(any());
    }

    @Test
    void dishCreateDefaultsToDisabledAndRejectsInvalidPrice() {
        DishDTO dto = new DishDTO();
        dto.setName("番茄面");
        dto.setCategoryId(1L);
        dto.setPrice(BigDecimal.TEN);

        dishService.saveWithFlavor(dto);
        ArgumentCaptor<Dish> saved = ArgumentCaptor.forClass(Dish.class);
        verify(dishMapper).insert(saved.capture());
        assertEquals(0, saved.getValue().getStatus());

        DishDTO invalid = new DishDTO();
        invalid.setName("错误价格");
        invalid.setCategoryId(1L);
        invalid.setPrice(BigDecimal.valueOf(-1));
        assertThrows(BaseException.class, () -> dishService.saveWithFlavor(invalid));
    }

    @Test
    void setmealCreateRejectsMissingRequiredFields() {
        SetmealDTO dto = new SetmealDTO();
        dto.setCategoryId(1L);
        dto.setPrice(BigDecimal.TEN);
        assertThrows(BaseException.class, () -> setmealService.saveWithDishes(dto));
        verify(setmealMapper, never()).insert(any(Setmeal.class));
    }
}
