package com.cec.EmployeeDB.alerts;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AlertsService {
    private final NamedParameterJdbcTemplate jdbc;

    public List<AlertEventDTO> list(String status,
            List<String> types,
            Integer employeeId,
            String empCode,
            LocalDate from,
            LocalDate to,
            int limit) {
        var sql = new StringBuilder("""
                SELECT
                  id, employee_id, type, severity, occurred_on, status,
                  JSON_EXTRACT(details_json,'$.emp_code') AS emp_code,
                  dedupe_key, event_type, subject, first_seen_at, last_seen_at, occurrence_count,
                  CAST(details_json AS CHAR) AS details_json
                FROM alert_event
                WHERE 1=1
                """);

        var p = new MapSqlParameterSource().addValue("limit", limit);

        if (status != null && !status.isBlank()) {
            sql.append(" AND status = :status");
            p.addValue("status", status);
        }
        if (types != null && !types.isEmpty()) {
            sql.append(" AND type IN (:types)");
            p.addValue("types", types);
        }
        if (employeeId != null) {
            sql.append(" AND employee_id = :employeeId");
            p.addValue("employeeId", employeeId);
        }
        if (empCode != null && !empCode.isBlank()) {
            sql.append(" AND JSON_UNQUOTE(JSON_EXTRACT(details_json,'$.emp_code')) = :empCode");
            p.addValue("empCode", empCode.trim());
        }
        if (from != null) {
            sql.append(" AND occurred_on >= :fromDate");
            p.addValue("fromDate", from);
        }
        if (to != null) {
            sql.append(" AND occurred_on <= :toDate");
            p.addValue("toDate", to);
        }

        sql.append(" ORDER BY occurred_on DESC, id DESC LIMIT :limit");

        return jdbc.query(Objects.requireNonNull(sql.toString(), "sql cannot be null"), p, (rs, i) -> new AlertEventDTO(
                rs.getLong("id"),
                (Integer) rs.getObject("employee_id"),
                Objects.requireNonNull(rs.getString("type"), "type cannot be null"),
                Objects.requireNonNull(rs.getString("severity"), "severity cannot be null"),
                rs.getDate("occurred_on").toLocalDate(),
                Objects.requireNonNull(rs.getString("status"), "status cannot be null"),
                Objects.requireNonNull(Objects.requireNonNullElse(rs.getString("emp_code"), ""), "emp_code cannot be null"),
                Objects.requireNonNull(rs.getString("dedupe_key"), "dedupe_key cannot be null"),
                Objects.requireNonNullElse(rs.getString("event_type"), ""),
                Objects.requireNonNullElse(rs.getString("subject"), ""),
                rs.getTimestamp("first_seen_at") != null ? rs.getTimestamp("first_seen_at").toInstant() : null,
                rs.getTimestamp("last_seen_at") != null ? rs.getTimestamp("last_seen_at").toInstant() : null,
                rs.getInt("occurrence_count"),
                Objects.requireNonNullElse(rs.getString("details_json"), "{}")));
    }

    public int ack(long id, String by) {
        var sql = """
                UPDATE alert_event
                   SET status='acked', acked_by=:by, acked_at=NOW()
                 WHERE id=:id AND status='open'
                """;
        return jdbc.update(sql, new MapSqlParameterSource().addValue("id", id).addValue("by", by));
    }

    public int resolve(long id) {
        var sql = """
                UPDATE alert_event
                   SET status='resolved', resolved_at=NOW()
                 WHERE id=:id AND status<> 'resolved'
                """;
        return jdbc.update(sql, new MapSqlParameterSource().addValue("id", id));
    }

    public AlertEventDTO get(long id) {
        var sql = """
                  SELECT id, employee_id, type, severity, occurred_on, status,
                         JSON_EXTRACT(details_json,'$.emp_code') AS emp_code,
                         dedupe_key, event_type, subject, first_seen_at, last_seen_at, occurrence_count,
                         CAST(details_json AS CHAR) AS details_json
                    FROM alert_event
                   WHERE id=:id
                """;
        var p = new MapSqlParameterSource("id", id);
        var list = jdbc.query(sql, p, (rs, i) -> new AlertEventDTO(
                rs.getLong("id"),
                (Integer) rs.getObject("employee_id"),
                Objects.requireNonNull(rs.getString("type"), "type cannot be null"),
                Objects.requireNonNull(rs.getString("severity"), "severity cannot be null"),
                rs.getDate("occurred_on").toLocalDate(),
                Objects.requireNonNull(rs.getString("status"), "status cannot be null"),
                Objects.requireNonNull(Objects.requireNonNullElse(rs.getString("emp_code"), ""), "emp_code cannot be null"),
                Objects.requireNonNull(rs.getString("dedupe_key"), "dedupe_key cannot be null"),
                Objects.requireNonNullElse(rs.getString("event_type"), ""),
                Objects.requireNonNullElse(rs.getString("subject"), ""),
                rs.getTimestamp("first_seen_at") != null ? rs.getTimestamp("first_seen_at").toInstant() : null,
                rs.getTimestamp("last_seen_at") != null ? rs.getTimestamp("last_seen_at").toInstant() : null,
                rs.getInt("occurrence_count"),
                Objects.requireNonNullElse(rs.getString("details_json"), "{}")));
        return list.isEmpty() ? null : list.get(0);
    }

}
