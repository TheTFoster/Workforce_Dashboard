// src/main/java/com/cec/EmployeeDB/alerts/AlertsAdminController.java
package com.cec.EmployeeDB.alerts;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/v1/alerts/admin")
@RequiredArgsConstructor
public class AlertsAdminController {

  private final NoHoursAlertBatch batch;

  @PostMapping("/no-hours/run")
  public Map<String,Object> run(@RequestParam(defaultValue = "current") String scope,
      HttpServletRequest req) {
    if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
      java.util.Map<String, Object> resp = new java.util.LinkedHashMap<>();
      resp.put("status", "smoke");
      resp.put("message", "skipped no-hours admin run");
      resp.put("scope", scope);
      return resp;
    }
    int affected = "last".equalsIgnoreCase(scope)
        ? batch.upsertNoHoursLastWeek()
        : batch.upsertNoHoursThisWeek();
    java.util.Map<String, Object> resp = new java.util.LinkedHashMap<>();
    resp.put("scope", scope);
    resp.put("rowsAffected", affected);
    return resp;
  }
}
