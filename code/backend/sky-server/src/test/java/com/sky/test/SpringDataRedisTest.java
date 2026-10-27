package com.sky.test;

import com.sky.config.RedisConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

/** Optional Redis codec configuration test. No live Redis availability claim. */
class SpringDataRedisTest {
    @Test void stringKeysRemainReadableAndValuesRoundTrip() {
        RedisTemplate template = new RedisConfiguration().redisTemplate(mock(RedisConnectionFactory.class));
        template.afterPropertiesSet();
        assertArrayEquals("dish_1".getBytes(StandardCharsets.UTF_8),template.getKeySerializer().serialize("dish_1"));
        byte[] encoded = template.getValueSerializer().serialize(1);
        assertEquals(1,template.getValueSerializer().deserialize(encoded));
    }
}
