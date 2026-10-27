package com.sky.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "sky.jwt")
@Data
public class JwtProperties {

    /**
     * 管理端员工生成jwt令牌相关配置
     */
    @lombok.ToString.Exclude
    private String adminSecretKey = randomKey();
    private long adminTtl;
    private String adminTokenName;

    /**
     * 用户端微信用户生成jwt令牌相关配置
     */
    @lombok.ToString.Exclude
    private String userSecretKey = randomKey();
    private long userTtl;
    private String userTokenName;

    private static String randomKey() {
        byte[] key = new byte[48];
        new java.security.SecureRandom().nextBytes(key);
        return java.util.Base64.getEncoder().encodeToString(key);
    }
}
