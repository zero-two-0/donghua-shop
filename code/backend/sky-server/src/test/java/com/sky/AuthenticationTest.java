package com.sky;

import com.sky.security.PasswordHasher;
import com.sky.context.BaseContext;
import com.sky.constant.JwtClaimsConstant;
import com.sky.interceptor.JwtTokenUserInterceptor;
import com.sky.properties.JwtProperties;
import com.sky.utils.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.method.HandlerMethod;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class AuthenticationTest {
    public void endpoint() {}
    @Test void passwordUsesRandomSaltAndRejectsWrongPassword() {
        String a=PasswordHasher.hash("Course-password-123");
        String b=PasswordHasher.hash("Course-password-123");
        assertNotEquals(a,b);
        assertTrue(PasswordHasher.matches("Course-password-123",a));
        assertFalse(PasswordHasher.matches("wrong",a));
        assertFalse(PasswordHasher.matches("wrong","invalid"));
    }
    @Test void bearerUserTokenAuthenticatesAndContextIsCleared() throws Exception {
        JwtProperties properties=new JwtProperties();
        properties.setUserSecretKey("test-user-key-only-01234567890123456789");
        properties.setUserTokenName("authentication");
        JwtTokenUserInterceptor interceptor=new JwtTokenUserInterceptor();
        ReflectionTestUtils.setField(interceptor,"jwtProperties",properties);
        MockHttpServletRequest request=new MockHttpServletRequest();
        request.addHeader("Authorization","Bearer "+JwtUtil.createJWT(properties.getUserSecretKey(),60000,Map.of(JwtClaimsConstant.USER_ID,7L)));
        HandlerMethod handler=new HandlerMethod(this,getClass().getMethod("endpoint"));
        assertTrue(interceptor.preHandle(request,new MockHttpServletResponse(),handler));
        assertEquals(7L,BaseContext.getCurrentId());
        interceptor.afterCompletion(request,new MockHttpServletResponse(),handler,null);
        assertNull(BaseContext.getCurrentId());
    }
    @Test void missingOrAdminTokenCannotBecomeUser() throws Exception {
        JwtProperties properties=new JwtProperties();properties.setUserSecretKey("test-user-key");properties.setUserTokenName("authentication");
        JwtTokenUserInterceptor interceptor=new JwtTokenUserInterceptor();ReflectionTestUtils.setField(interceptor,"jwtProperties",properties);
        HandlerMethod handler=new HandlerMethod(this,getClass().getMethod("endpoint"));
        MockHttpServletRequest request=new MockHttpServletRequest();MockHttpServletResponse response=new MockHttpServletResponse();
        assertFalse(interceptor.preHandle(request,response,handler));assertEquals(401,response.getStatus());
        request.addHeader("Authorization","Bearer "+JwtUtil.createJWT("test-user-key",60000,Map.of(JwtClaimsConstant.EMP_ID,1L)));
        assertFalse(interceptor.preHandle(request,new MockHttpServletResponse(),handler));
        assertNull(BaseContext.getCurrentId());
    }
}
