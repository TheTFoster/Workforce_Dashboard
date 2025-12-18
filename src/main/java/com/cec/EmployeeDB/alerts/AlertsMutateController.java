package com.cec.EmployeeDB.alerts;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

/**
 * Mutating alerts endpoints with smoke-test guard to avoid data changes when header
 * X-Smoke-Test=true is present.
 */
@RestController
@RequestMapping("/api/v1/alerts")
public class AlertsMutateController {

  private final AlertsMutateService mutateService;

  public AlertsMutateController(AlertsMutateService mutateService) {
    this.mutateService = mutateService;
  }

  @PostMapping("/ack/{id}")
  public ResponseEntity<?> ack(@PathVariable long id, HttpServletRequest req) {
    if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
      return ResponseEntity.ok(java.util.Map.of("status", "smoke", "message", "skipped ack", "id", id));
    }
    mutateService.ack(id);
    return ResponseEntity.ok(java.util.Map.of("acked", 1));
  }

  @PostMapping("/resolve/{id}")
  public ResponseEntity<?> resolve(@PathVariable long id, HttpServletRequest req) {
    if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
      return ResponseEntity.ok(java.util.Map.of("status", "smoke", "message", "skipped resolve", "id", id));
    }
    mutateService.resolve(id);
    return ResponseEntity.ok(java.util.Map.of("resolved", 1));
  }
}
