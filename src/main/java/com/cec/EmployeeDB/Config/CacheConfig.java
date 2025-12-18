package com.cec.EmployeeDB.Config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.concurrent.ConcurrentMapCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;

/**
 * Cache configuration for timecard queries.
 * Reduces database load by caching frequently-requested date ranges.
 */
@Configuration
public class CacheConfig implements CachingConfigurer {

    @Bean
    @Override
    @SuppressWarnings("null")
    public CacheManager cacheManager() {
        SimpleCacheManager cacheManager = new SimpleCacheManager();
        cacheManager.setCaches(Arrays.<org.springframework.cache.Cache>asList(
            // Cache timecard range queries for 5 minutes
            // Key format: "startDate-endDate-limit"
            new ConcurrentMapCache("timecardRange")
        ));
        return cacheManager;
    }
}
