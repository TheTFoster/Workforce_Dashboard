// src/main/java/com/cec/EmployeeDB/alerts/AlertsMutateService.java
package com.cec.EmployeeDB.alerts;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Objects;

@Service @RequiredArgsConstructor
public class AlertsMutateService {
  private final NamedParameterJdbcTemplate jdbc;

  public void ack(long id) {
    jdbc.update("""
      UPDATE alert_event SET status='ACKED', acked_at=:now WHERE id=:id
    """, Objects.requireNonNull(Map.of("id", id, "now", LocalDateTime.now()), "parameters cannot be null"));
  }
  public void resolve(long id) {
    jdbc.update("""
      UPDATE alert_event SET status='RESOLVED', resolved_at=:now WHERE id=:id
    """, Objects.requireNonNull(Map.of("id", id, "now", LocalDateTime.now()), "parameters cannot be null"));
  }
}
