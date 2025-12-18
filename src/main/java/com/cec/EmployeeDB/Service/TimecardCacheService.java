// src/main/java/com/cec/EmployeeDB/Service/TimecardCacheService.java
package com.cec.EmployeeDB.Service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.sql.Date;

@Service
@RequiredArgsConstructor
public class TimecardCacheService {

    private final JdbcTemplate jdbc;

    public record RefreshResult(int deleted, int inserted) {}

    /**
     * Rebuild cache rows overlapping [start, end).
     * Idempotent and window-bounded for speed.
     */
    @Transactional
    public RefreshResult refreshWindow(LocalDate start, LocalDate end) {
        Date endSql   = Date.valueOf(end);
        Date startSql = Date.valueOf(start);

        int deleted = jdbc.update(
            "DELETE FROM timecard_spans_cache " +
            "WHERE start_date < ? AND end_date_excl > ?",
            endSql, startSql
        );

        int inserted = jdbc.update(
            "INSERT INTO timecard_spans_cache " +
            "(ee_code,start_date,end_date_excl,dist_job_code,dist_job_desc," +
            " dist_activity_code,dist_activity_desc,allocation_code,home_allocation,total_hours) " +
            "SELECT ee_code,start_date,end_date_excl,dist_job_code,dist_job_desc," +
            "       dist_activity_code,dist_activity_desc,allocation_code,home_allocation,total_hours " +
            "FROM v_timecard_spans " +
            "WHERE start_date < ? AND end_date_excl > ?",
            endSql, startSql
        );

        return new RefreshResult(deleted, inserted);
    }
}
