// src/main/java/com/cec/EmployeeDB/alerts/AlertsQueryService.java
package com.cec.EmployeeDB.alerts;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AlertsQueryService {

  private final NamedParameterJdbcTemplate jdbc;
  private static final ObjectMapper MAPPER = new ObjectMapper();
  private static final TypeReference<Map<String, Object>> MAP_TYPE =
      new TypeReference<>() {};

  public List<Map<String, Object>> find(String status, int limit) {
    String sql = """
      SELECT id,
             employee_id   AS employeeId,
             type,
             severity,
             occurred_on   AS occurredOn,
             status,
             details_json  AS details
      FROM alert_event
      WHERE status = :status
      ORDER BY occurred_on DESC, id DESC
      LIMIT :limit
      """;

    return jdbc.query(sql, Objects.requireNonNull(Map.of("status", status, "limit", limit), "parameters cannot be null"), (rs, i) -> {
      String detailsStr = rs.getString("details");
      Map<String, Object> details;
      try {
        details = (detailsStr == null || detailsStr.isBlank())
            ? Map.<String, Object>of()
            : MAPPER.readValue(detailsStr, MAP_TYPE);
      } catch (Exception e) {
        details = Map.<String, Object>of(); // be resilient if a row has bad JSON
      }

      Date d = rs.getDate("occurredOn");
      String occurredOn = Optional.ofNullable(d)
          .map(Date::toLocalDate)
          .map(Object::toString)
          .orElse("");

      return Map.of(
          "id", rs.getLong("id"),
          "employeeId", rs.getInt("employeeId"),
          "type", rs.getString("type"),
          "severity", rs.getString("severity"),
          "occurredOn", occurredOn,
          "status", rs.getString("status"),
          "details", details
      );
    });
  }

  public int count(String status) {
    Integer n = jdbc.queryForObject(
        "SELECT COUNT(*) FROM alert_event WHERE status = :s",
        Objects.requireNonNull(Map.of("s", status), "parameters cannot be null"),
        Integer.class
    );
    return Objects.requireNonNullElse(n, 0);
  }
}
