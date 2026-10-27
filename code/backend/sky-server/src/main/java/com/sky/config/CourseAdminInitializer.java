package com.sky.config;

import com.sky.entity.Employee;
import com.sky.mapper.EmployeeMapper;
import com.sky.security.PasswordHasher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;

/** Optional bootstrap for a new course database; never resets an existing account. */
@Component
@Profile("course")
public class CourseAdminInitializer implements ApplicationRunner {
    private final EmployeeMapper employees;
    @Value("${course.admin-password:}") private String password;
    public CourseAdminInitializer(EmployeeMapper employees) { this.employees=employees; }
    @Override public void run(ApplicationArguments args) {
        if (password.isEmpty() || employees.getByUsername("admin") != null) return;
        LocalDateTime now = LocalDateTime.now();
        employees.insert(Employee.builder().username("admin").name("课程管理员").password(PasswordHasher.hash(password))
                .status(1).createTime(now).updateTime(now).createUser(0L).updateUser(0L).build());
    }
}
