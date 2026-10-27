package com.sky.service.impl;

import com.sky.context.BaseContext;
import com.sky.entity.AddressBook;
import com.sky.exception.AddressBookBusinessException;
import com.sky.mapper.AddressBookMapper;
import com.sky.service.AddressBookService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Objects;

@Service
@Slf4j
public class AddressBookServiceImpl implements AddressBookService {
    @Autowired private AddressBookMapper addressBookMapper;
    public List<AddressBook> list(AddressBook address) {
        address.setUserId(BaseContext.getCurrentId());
        return addressBookMapper.list(address);
    }
    public void save(AddressBook address) {
        if (address == null || address.getConsignee() == null || address.getPhone() == null || address.getDetail() == null)
            throw new AddressBookBusinessException("收货人、电话和详细地址不能为空");
        address.setId(null); address.setUserId(BaseContext.getCurrentId()); address.setIsDefault(0);
        addressBookMapper.insert(address);
    }
    public AddressBook getById(Long id) {
        AddressBook existing = id == null ? null : addressBookMapper.getById(id);
        if (existing == null || !Objects.equals(existing.getUserId(), BaseContext.getCurrentId()))
            throw new AddressBookBusinessException("地址不存在或无权访问");
        return existing;
    }
    public void update(AddressBook address) {
        if (address == null) throw new AddressBookBusinessException("地址不能为空");
        getById(address.getId());
        // 归属和默认标记仅能由服务端控制，默认地址通过独立接口设置。
        address.setUserId(BaseContext.getCurrentId()); address.setIsDefault(null);
        if (address.getConsignee() == null && address.getPhone() == null && address.getDetail() == null && address.getSex() == null
                && address.getLabel() == null && address.getProvinceCode() == null && address.getProvinceName() == null
                && address.getCityCode() == null && address.getCityName() == null && address.getDistrictCode() == null && address.getDistrictName() == null)
            throw new AddressBookBusinessException("至少提供一个可修改的地址字段");
        addressBookMapper.update(address);
    }
    @Transactional
    public void setDefault(AddressBook input) {
        if (input == null) throw new AddressBookBusinessException("地址不能为空");
        AddressBook existing = getById(input.getId());
        addressBookMapper.updateIsDefaultByUserId(AddressBook.builder().userId(existing.getUserId()).isDefault(0).build());
        addressBookMapper.update(AddressBook.builder().id(existing.getId()).userId(existing.getUserId()).isDefault(1).build());
        log.info("event=address_default userId={} addressId={}", existing.getUserId(), existing.getId());
    }
    public void deleteById(Long id) { getById(id); addressBookMapper.deleteById(id); }
}
