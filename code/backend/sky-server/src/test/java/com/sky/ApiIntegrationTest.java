package com.sky;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sky.entity.Employee;
import com.sky.mapper.EmployeeMapper;
import com.sky.security.PasswordHasher;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real Spring services, MyBatis SQL, transaction manager and in-memory H2; no mocked mappers. */
// Mock web environment keeps the integration suite repeatable in restricted CI sandboxes
// where binding an embedded server socket is not available. MockMvc still traverses the
// real Spring MVC resource, interceptor, controller, service and mapper layers.
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles({"course","test"})
class ApiIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired EmployeeMapper employees;
    @Autowired JdbcTemplate jdbc;

    @Test void packagedContractAndCourseAssetsAreServedByMvc() {
        try {
            String openapi = mvc.perform(get("/openapi.yaml"))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            assertTrue(openapi.contains("/user/order/submit:"));
            mvc.perform(get("/assets/dish-1.svg")).andExpect(status().isOk());
        } catch (Exception e) {
            throw new AssertionError("course static resources should be served by Spring MVC", e);
        }
    }

    private JsonNode call(String method,String path,Object body,String token) throws Exception {
        MockHttpServletRequestBuilder request=request(org.springframework.http.HttpMethod.valueOf(method),path);
        if (body != null) request.contentType("application/json").content(json.writeValueAsString(body));
        if (token != null) request.header("Authorization","Bearer "+token);
        String response=mvc.perform(request).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(response);
    }
    private String user(String code) throws Exception {
        JsonNode result=call("POST","/user/user/test-login",Map.of("loginCode",code),null);
        assertEquals(1,result.path("code").asInt(),result.toString());return result.path("data").path("token").asText();
    }
    private String admin() throws Exception {
        String password="Test-only-pass-9283";
        if (employees.getByUsername("admin") == null)
            employees.insert(Employee.builder().username("admin").name("测试管理员").password(PasswordHasher.hash(password)).status(1).build());
        JsonNode result=call("POST","/admin/employee/login",Map.of("username","admin","password",password),null);
        assertEquals(1,result.path("code").asInt(),result.toString());return result.path("data").path("token").asText();
    }
    private void ok(JsonNode result) {assertEquals(1,result.path("code").asInt(),result.toString());}

    @Test void orderingPaymentAndManagementCompleteAgainstDatabase() throws Exception {
        String user=user("demo-user"),admin=admin();
        ok(call("DELETE","/user/shoppingCart/clean",null,user));
        ok(call("GET","/user/dish/list?categoryId=1&keyword=宫保",null,null));
        ok(call("POST","/user/shoppingCart/add",Map.of("dishId",1),user));
        ok(call("POST","/user/shoppingCart/add",Map.of("dishId",1),user));
        JsonNode cart=call("GET","/user/shoppingCart/list",null,user);
        assertEquals(2,cart.path("data").get(0).path("number").asInt());
        // Client deliberately sends a forged total; the server must charge 18*2.
        JsonNode order=call("POST","/user/order/submit",Map.of("addressBookId",1,"amount",0.01),user);ok(order);
        long id=order.path("data").path("id").asLong();String number=order.path("data").path("orderNumber").asText();
        assertEquals(36.0,order.path("data").path("orderAmount").asDouble());
        assertEquals(0,call("GET","/user/shoppingCart/list",null,user).path("data").size());
        ok(call("PUT","/user/order/payment",Map.of("orderNumber",number),user));
        ok(call("PUT","/user/order/payment",Map.of("orderNumber",number),user));
        assertEquals(0,call("PUT","/admin/order/delivery/"+id,null,admin).path("code").asInt());
        ok(call("PUT","/admin/order/confirm",Map.of("id",id),admin));
        ok(call("PUT","/admin/order/delivery/"+id,null,admin));
        ok(call("PUT","/admin/order/complete/"+id,null,admin));
        JsonNode detail=call("GET","/user/order/orderDetail/"+id,null,user);ok(detail);
        assertEquals(5,detail.path("data").path("status").asInt());
        assertEquals(36,jdbc.queryForObject("select amount from orders where id=?",java.math.BigDecimal.class,id).intValue());
        assertEquals(2,jdbc.queryForObject("select number from order_detail where order_id=?",Integer.class,id));
        ok(call("GET","/user/order/historyOrders?page=1&pageSize=10",null,user));
        ok(call("GET","/admin/order/conditionSearch?page=1&pageSize=10",null,admin));
        String date=java.time.LocalDate.now().toString();
        JsonNode turnover=call("GET","/admin/report/turnoverStatistics?begin="+date+"&end="+date,null,admin);ok(turnover);
        assertEquals("36.00",turnover.path("data").path("turnoverList").asText());
        ok(call("GET","/admin/workspace/businessData?date="+date,null,admin));
    }
    @Test void ownershipAuthenticationAndInputFailures() throws Exception {
        String first=user("demo-user"),second=user("demo-user-2");
        mvc.perform(get("/user/addressBook/list")).andExpect(status().isUnauthorized());
        mvc.perform(get("/admin/order/statistics").header("Authorization","Bearer "+first)).andExpect(status().isUnauthorized());
        mvc.perform(get("/user/order/historyOrders?page=0&pageSize=10").header("Authorization","Bearer "+first)).andExpect(status().isBadRequest());
        mvc.perform(get("/user/order/historyOrders?page=1&pageSize=101").header("Authorization","Bearer "+first)).andExpect(status().isBadRequest());
        mvc.perform(get("/user/order/historyOrders").header("Authorization","Bearer "+first)).andExpect(status().isBadRequest());
        assertEquals(0,call("GET","/user/addressBook/1",null,second).path("code").asInt());
        assertEquals(0,call("PUT","/user/addressBook/default",Map.of("id",1),second).path("code").asInt());
        assertEquals(0,call("DELETE","/user/addressBook?id=1",null,second).path("code").asInt());
        assertEquals(0,call("POST","/user/user/test-login",Map.of("loginCode","arbitrary-id"),null).path("code").asInt());
        assertEquals(0,call("POST","/user/shoppingCart/add",Map.of("dishId",1,"setmealId",1),first).path("code").asInt());
        mvc.perform(post("/user/shoppingCart/add").header("Authorization","Bearer "+first).contentType("application/json").content("{"))
                .andExpect(status().isBadRequest());
    }
    @Test void categoryDishAndAddressCrudUsesActualMapperSql() throws Exception {
        String admin=admin(),user=user("demo-user-2");
        ok(call("POST","/admin/category",Map.of("type",1,"name","集成分类","sort",20),admin));
        Long categoryId=jdbc.queryForObject("select id from category where name='集成分类'",Long.class);
        ok(call("POST","/admin/category/status/1?id="+categoryId,null,admin));
        ok(call("POST","/admin/dish",Map.of("name","集成菜品","categoryId",categoryId,"price",9.5,"status",0,"flavors",java.util.List.of(Map.of("name","温度","value","[\"热\"]"))),admin));
        Long dishId=jdbc.queryForObject("select id from dish where name='集成菜品'",Long.class);
        ok(call("POST","/admin/dish/status/1?id="+dishId,null,admin));
        ok(call("GET","/admin/dish/"+dishId,null,admin));
        ok(call("PUT","/admin/dish",Map.of("id",dishId,"name","保留口味"),admin));
        assertEquals(1,call("GET","/admin/dish/"+dishId,null,admin).path("data").path("flavors").size());
        ok(call("PUT","/admin/dish",Map.of("id",dishId,"name","集成菜品更新","price",10,"flavors",java.util.List.of()),admin));
        ok(call("POST","/admin/dish/status/0?id="+dishId,null,admin));
        ok(call("DELETE","/admin/dish?ids="+dishId,null,admin));
        ok(call("DELETE","/admin/category?id="+categoryId,null,admin));
        ok(call("POST","/user/addressBook",Map.of("consignee","测试","phone","00000000000","detail","新增测试地址","userId",1,"isDefault",1),user));
        Long addressId=jdbc.queryForObject("select id from address_book where detail='新增测试地址'",Long.class);
        assertEquals(2L,jdbc.queryForObject("select user_id from address_book where id=?",Long.class,addressId));
        ok(call("PUT","/user/addressBook",Map.of("id",addressId,"detail","修改测试地址","cityName","上海"),user));
        ok(call("PUT","/user/addressBook/default",Map.of("id",addressId),user));
        assertEquals(addressId.longValue(),call("GET","/user/addressBook/default",null,user).path("data").path("id").asLong());
        ok(call("DELETE","/user/addressBook?id="+addressId,null,user));
    }

    @Test void employeePasswordsAndSetmealLifecycle() throws Exception {
        String admin=admin();
        String password="Staff-test-only-3817";
        ok(call("POST","/admin/employee",Map.of("username","staff-test","name","测试员工","password",password),admin));
        Employee employee=employees.getByUsername("staff-test");
        assertTrue(PasswordHasher.matches(password,employee.getPassword()));
        ok(call("PUT","/admin/employee",Map.of("id",employee.getId(),"sex","1"),admin));
        assertEquals("1",employees.getById(employee.getId()).getSex());
        JsonNode detail=call("GET","/admin/employee/"+employee.getId(),null,admin);ok(detail);
        assertFalse(detail.path("data").has("password"));
        JsonNode page=call("GET","/admin/employee/page?page=1&pageSize=10",null,admin);ok(page);
        for(JsonNode item:page.path("data").path("records"))assertFalse(item.has("password"));
        ok(call("POST","/admin/employee/login",Map.of("username","staff-test","password",password),null));
        // Populate the all-category cache before creation, then verify invalidation.
        ok(call("GET","/user/setmeal/list",null,null));
        ok(call("POST","/admin/setmeal",Map.of("name","集成套餐","categoryId",2,"price",20,
                "setmealDishes",java.util.List.of(Map.of("dishId",1,"name","宫保鸡丁","price",18,"copies",1))),admin));
        Long id=jdbc.queryForObject("select id from setmeal where name='集成套餐'",Long.class);
        ok(call("GET","/admin/setmeal/"+id,null,admin));
        ok(call("PUT","/admin/setmeal",Map.of("id",id,"name","集成套餐局部更新"),admin));
        assertEquals(1,call("GET","/admin/setmeal/"+id,null,admin).path("data").path("setmealDishes").size());
        ok(call("GET","/admin/setmeal/page?page=1&pageSize=10",null,admin));
        ok(call("POST","/admin/setmeal/status/1?id="+id,null,admin));
        assertTrue(call("GET","/user/setmeal/list",null,null).path("data").size()>=2);
        ok(call("GET","/user/setmeal/dish/"+id,null,null));
        ok(call("POST","/admin/setmeal/status/0?id="+id,null,admin));
        ok(call("PUT","/admin/setmeal",Map.of("id",id,"name","集成套餐更新","price",21,"setmealDishes",java.util.List.of()),admin));
        ok(call("DELETE","/admin/setmeal?ids="+id,null,admin));
    }
}
