package com.cec.EmployeeDB.alerts;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OrphanPunchService {
    private final NamedParameterJdbcTemplate jdbc;
    private final AlertsService alertsService;

    public List<Map<String, Object>> list(String empCode, LocalDate from, LocalDate to, int limit) {
        var sql = new StringBuilder("""
                SELECT
                  id,
                  ee_code         AS empCode,
                  first_name      AS firstName,
                  last_name       AS lastName,
                  STR_TO_DATE(work_date_csv, '%Y-%m-%d') AS workDate,
                  work_date_csv   AS workDateRaw,
                  in_punch_time   AS inPunch,
                  out_punch_time  AS outPunch,
                  allocation_code AS allocationCode
                FROM paycom_time_report
                WHERE (in_punch_time IS NULL OR out_punch_time IS NULL)
                """);
        var p = new MapSqlParameterSource().addValue("limit", Math.max(1, Math.min(limit, 2000)));
        if (empCode != null && !empCode.isBlank()) {
            sql.append(" AND UPPER(TRIM(ee_code)) = UPPER(TRIM(:empCode))");
            p.addValue("empCode", empCode);
        }
        if (from != null) {
            sql.append(" AND STR_TO_DATE(work_date_csv,'%Y-%m-%d') >= :fromDate");
            p.addValue("fromDate", from);
        }
        if (to != null) {
            sql.append(" AND STR_TO_DATE(work_date_csv,'%Y-%m-%d') <= :toDate");
            p.addValue("toDate", to);
        }
        sql.append(" ORDER BY work_date DESC, id DESC LIMIT :limit");
        return jdbc.query(sql.toString(), p, (java.sql.ResultSet rs, int i) -> {
            Map<String, Object> m = new java.util.HashMap<>();
            m.put("id", rs.getLong("id"));
            m.put("empCode", rs.getString("empCode") != null ? rs.getString("empCode") : "");
            m.put("firstName", rs.getString("firstName") != null ? rs.getString("firstName") : "");
            m.put("lastName", rs.getString("lastName") != null ? rs.getString("lastName") : "");
            m.put("workDate", rs.getDate("workDate") != null ? rs.getDate("workDate").toLocalDate().toString() : (rs.getString("workDateRaw") != null ? rs.getString("workDateRaw") : ""));
            var inPunchTs = rs.getTimestamp("inPunch");
            m.put("inPunch", inPunchTs != null ? inPunchTs.toString() : "");
            m.put("outPunch", rs.getTimestamp("outPunch") != null ? rs.getTimestamp("outPunch").toString() : "");
            m.put("allocationCode", rs.getString("allocationCode") != null ? rs.getString("allocationCode") : "");
            return m;
        });
    }

    public int delete(long id, Long resolveAlertId) {
        int n = jdbc.update("DELETE FROM paycom_time_report WHERE id=:id", new MapSqlParameterSource("id", id));
        if (resolveAlertId != null && n > 0) {
            try {
                alertsService.resolve(resolveAlertId);
            } catch (Exception ignored) {
            }
        }
        return n;
    }
}
