// src/main/java/com/cec/EmployeeDB/alerts/NoHoursAlertBatch.java
package com.cec.EmployeeDB.alerts;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
public class NoHoursAlertBatch {

  private final NamedParameterJdbcTemplate jdbc;

  // One query, parameterized for any Mon–Sun window + alert type
  private static final String UPSERT_SQL = """
      INSERT INTO alert_event
        (employee_id, type, severity, occurred_on, details_json, dedupe_key, event_key, event_type, subject)
      SELECT
        nh.emp_id,
        :type,
        :severity,
        :weekStart,
        JSON_OBJECT(
          'week_start', :weekStartStr,
          'week_end',   :weekEndStr,
          'emp_code',   nh.employee_code,
          'emp_id',     nh.emp_id,
          'source',     'paycom_time_report',
          'source_id',  CONCAT('paycom|', nh.employee_code, '|', :weekStartStr),
          'message',    CONCAT('No hours for employee ', nh.employee_code, ' (week ', :weekStartStr, ')'),
          'subject',    CONCAT('No hours for employee ', nh.employee_code, ' (week ', :weekStartStr, ')'),
          'hint',       CONCAT('No punches found in paycom for ', nh.employee_code, ' between ', :weekStartStr, ' and ', :weekEndStr)
        ),
        CONCAT(:type, '|', nh.emp_id, '|', :weekStartStr),
        :type,
        'TIMECARD',
        CONCAT('No hours for employee ', nh.employee_code, ' (week ', :weekStartStr, ')')
      FROM (
        SELECT f.emp_id, f.employee_code
        FROM `field` f
        LEFT JOIN (
           SELECT
             UPPER(TRIM(ee_code)) AS ee_code_norm,
             CASE
               WHEN work_date IS NULL
                 OR DATE_FORMAT(work_date,'%Y-%m-%d')='0000-00-00' THEN NULL
               ELSE DATE(work_date)
             END AS work_date2
           FROM `paycom_time_report`
        ) pr
          ON pr.ee_code_norm = UPPER(TRIM(f.employee_code))
         AND pr.work_date2 BETWEEN :weekStart AND :weekEnd
        LEFT JOIN `inactive`   i ON UPPER(TRIM(i.emp_code)) = UPPER(TRIM(f.employee_code))
        LEFT JOIN `terminated` t ON UPPER(TRIM(t.emp_code)) = UPPER(TRIM(f.employee_code))
        WHERE i.emp_code IS NULL AND t.emp_code IS NULL
        GROUP BY f.emp_id, f.employee_code
        HAVING COUNT(pr.work_date2) = 0
      ) AS nh
      ON DUPLICATE KEY UPDATE
        occurred_on  = VALUES(occurred_on),
        details_json = VALUES(details_json),
        severity     = VALUES(severity),
        type         = VALUES(type)
      """;

  public int upsertNoHours(LocalDate weekStart, LocalDate weekEnd, String type) {
    var p = new MapSqlParameterSource()
        .addValue("weekStart", weekStart)
        .addValue("weekEnd", weekEnd)
        .addValue("weekStartStr", weekStart.toString())
        .addValue("weekEndStr", weekEnd.toString())
        .addValue("type", type)
        .addValue("severity", "WARN");
    return jdbc.update(UPSERT_SQL, p);
  }

  private static final ZoneId CT = ZoneId.of("America/Chicago");

  private static LocalDate todayCT() {
    return LocalDate.now(CT);
  }

  private static LocalDate mondayOf(LocalDate d) {
    return d.minusDays(d.getDayOfWeek().getValue() - DayOfWeek.MONDAY.getValue());
  }

  private static LocalDate sundayOf(LocalDate monday) {
    return monday.plusDays(6);
  }

  /** Upsert for the current Mon–Sun week (to-date). */
  public int upsertNoHoursThisWeek() {
    var mon = mondayOf(todayCT());
    var sun = sundayOf(mon);
    return upsertNoHours(mon, sun, "NO_HOURS_THIS_WEEK");
  }

  /** Upsert for the last full Mon–Sun week. */
  public int upsertNoHoursLastWeek() {
    var lastMon = mondayOf(todayCT()).minusWeeks(1);
    var lastSun = sundayOf(lastMon);
    return upsertNoHours(lastMon, lastSun, "NO_HOURS_LAST_WEEK");
  }
}
