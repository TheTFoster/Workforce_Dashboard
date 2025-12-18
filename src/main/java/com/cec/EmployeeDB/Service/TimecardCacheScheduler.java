// src/main/java/com/cec/EmployeeDB/Service/TimecardCacheScheduler.java
package com.cec.EmployeeDB.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class TimecardCacheScheduler {

    private final TimecardCacheService cacheService;

    // rolling window length (months)
    @Value("${app.timecards.cache.window-months:6}")
    private int windowMonths;

    // 02:15 every day
    @Scheduled(cron = "${app.timecards.cache.cron:0 15 2 * * *}")
    public void refreshRollingWindow() {
        LocalDate end   = LocalDate.now().plusDays(1);     // exclusive
        LocalDate start = LocalDate.now().minusMonths(windowMonths);

        var result = cacheService.refreshWindow(start, end);

        log.info("Timecard cache refresh: inserted {} rows for [{} .. {})",
                result, start, end);
    }
}
