// src/main/java/com/cec/EmployeeDB/alerts/MissedPunchAlertBatch.java
package com.cec.EmployeeDB.alerts;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
public class MissedPunchAlertBatch {

  private final NamedParameterJdbcTemplate jdbc;

  /**
   * Inserts/updates one alert per employee for the given workDay (Mon–Sun),
   * when either IN or OUT punch is missing. Dedupe key:
   * MISSED_PUNCH|{empId}|{workDay}.
   *
   * NOTE: no alias after INSERT INTO — MySQL doesn't allow it.
   */
  private static final String UPSERT_SQL = """
      INSERT INTO alert_event
        (employee_id, type, severity, occurred_on, details_json, dedupe_key, event_key, event_type, subject)
      SELECT DISTINCT
        f.emp_id,
        'MISSED_PUNCH',
        'WARN',
        :workDay,
        JSON_OBJECT(
          'work_date', :workDayStr,
          'emp_code',  f.employee_code,
          'emp_id',    f.emp_id,
          'issue',     CASE
                         WHEN pr.in_punch_time2  IS NULL THEN 'MISSING_IN'
                         WHEN pr.out_punch_time2 IS NULL THEN 'MISSING_OUT'
                         ELSE 'UNKNOWN'
                       END,
          'source',    'paycom_time_report',
          'source_id', CONCAT('paycom|', f.employee_code, '|', :workDayStr),
          'message',   CONCAT('Missed punch for employee ', f.employee_code, ' on ', :workDayStr),
          'subject',   CONCAT('Missed punch for employee ', f.employee_code, ' on ', :workDayStr),
          'hint',      CONCAT('Check punches for ', f.employee_code, ' on ', :workDayStr, ' (paycom)')
        ),
        CONCAT('MISSED_PUNCH|', f.emp_id, '|', :workDayStr),
        'MISSED_PUNCH',
        'TIMECARD',
        CONCAT('Missed punch for employee ', f.employee_code, ' on ', :workDayStr)
      FROM `field` f
      JOIN (
        SELECT
          UPPER(TRIM(ee_code)) AS ee_code_norm,
          CASE
            WHEN in_punch_time IS NULL
              OR DATE_FORMAT(in_punch_time, '%Y-%m-%d %H:%i:%s')='0000-00-00 00:00:00'
              THEN NULL ELSE in_punch_time
          END AS in_punch_time2,
          CASE
            WHEN out_punch_time IS NULL
              OR DATE_FORMAT(out_punch_time, '%Y-%m-%d %H:%i:%s')='0000-00-00 00:00:00'
              THEN NULL ELSE out_punch_time
          END AS out_punch_time2,
          CASE
            WHEN work_date IS NULL
              OR DATE_FORMAT(work_date,'%Y-%m-%d')='0000-00-00' THEN NULL
            ELSE DATE(work_date)
          END AS work_date2
        FROM `paycom_time_report`
      ) pr
        ON pr.ee_code_norm = UPPER(TRIM(f.employee_code))
       AND pr.work_date2   = :workDay
      LEFT JOIN `inactive`   i ON UPPER(TRIM(i.emp_code)) = UPPER(TRIM(f.employee_code))
      LEFT JOIN `terminated` t ON UPPER(TRIM(t.emp_code)) = UPPER(TRIM(f.employee_code))
      WHERE i.emp_code IS NULL
        AND t.emp_code IS NULL
        AND (pr.in_punch_time2 IS NULL OR pr.out_punch_time2 IS NULL)
      ON DUPLICATE KEY UPDATE
        occurred_on  = VALUES(occurred_on),
        details_json = VALUES(details_json),
        severity     = VALUES(severity),
        type         = VALUES(type)
      """;

  private static final ZoneId CT = ZoneId.of("America/Chicago");

  /**
   * Compute the previous business day in Central time (Mon→Fri, Sun→Fri,
   * otherwise yesterday).
   */
  public static LocalDate previousBusinessDayCT() {
    LocalDate today = LocalDate.now(CT);
    return switch (today.getDayOfWeek()) {
      case MONDAY -> today.minusDays(3); // Mon run → prior Fri
      case SUNDAY -> today.minusDays(2); // Sun run → prior Fri
      default -> today.minusDays(1); // Tue–Sat → yesterday
    };
  }

  /** Upsert for a specific work day (YYYY-MM-DD). */
  public int upsertMissedPunchFor(LocalDate workDay) {
    var p = new MapSqlParameterSource()
        .addValue("workDay", workDay)
        .addValue("workDayStr", workDay.toString());
    return jdbc.update(UPSERT_SQL, p);
  }

  /** Upsert for the previous business day (Central time). */
  public int upsertMissedPunchForPrevBusinessDay() {
    return upsertMissedPunchFor(previousBusinessDayCT());
  }
}
