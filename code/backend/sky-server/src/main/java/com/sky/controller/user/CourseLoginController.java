package com.sky.controller.user;

import com.sky.constant.JwtClaimsConstant;
import com.sky.entity.User;
import com.sky.exception.BaseException;
import com.sky.mapper.UserMapper;
import com.sky.properties.JwtProperties;
import com.sky.result.Result;
import com.sky.utils.JwtUtil;
import com.sky.vo.UserLoginVO;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.Map;

/** Course-only identities are explicitly allow-listed and cannot select arbitrary user ids. */
@RestController
@Profile("course")
@RequestMapping("/user/user")
@Slf4j
public class CourseLoginController {
    @Autowired private UserMapper userMapper;
    @Autowired private JwtProperties jwtProperties;
    @Data public static class LoginRequest { private String loginCode; }
    @PostMapping("/test-login")
    public synchronized Result<UserLoginVO> login(@RequestBody LoginRequest request) {
        String code = request.getLoginCode();
        if (!"demo-user".equals(code) && !"demo-user-2".equals(code)) throw new BaseException("仅允许课程演示账号");
        String openid = "course:" + code;
        User user = userMapper.getByOpenid(openid);
        if (user == null) {
            user = User.builder().openid(openid).name(code).createTime(LocalDateTime.now()).build();
            userMapper.insert(user);
        }
        String token = JwtUtil.createJWT(jwtProperties.getUserSecretKey(),jwtProperties.getUserTtl(),Map.of(JwtClaimsConstant.USER_ID,user.getId()));
        log.info("event=course_login userId={} result=success",user.getId());
        return Result.success(UserLoginVO.builder().id(user.getId()).openid(openid).token(token).build());
    }
}
