// src/main/java/com/cec/EmployeeDB/alerts/MissedPunchAdminController.java
package com.cec.EmployeeDB.alerts;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/v1/alerts/admin/missed-punch")
@RequiredArgsConstructor
public class MissedPunchAdminController {

  private final MissedPunchAlertBatch batch;

  @PostMapping("/run")
  public Map<String,Object> run(
      @RequestParam(required = false)
      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate workDay,
      HttpServletRequest req
  ) {
    if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
      java.util.Map<String, Object> resp = new java.util.LinkedHashMap<>();
      resp.put("status", "smoke");
      resp.put("message", "skipped missed-punch admin run");
      resp.put("workDay", workDay);
      return resp;
    }
    int affected = (workDay == null)
        ? batch.upsertMissedPunchForPrevBusinessDay()
        : batch.upsertMissedPunchFor(workDay);
    java.util.Map<String, Object> resp = new java.util.LinkedHashMap<>();
    resp.put("workDay", workDay == null ? MissedPunchAlertBatch.previousBusinessDayCT() : workDay);
    resp.put("rowsAffected", affected);
    return resp;
  }
}
