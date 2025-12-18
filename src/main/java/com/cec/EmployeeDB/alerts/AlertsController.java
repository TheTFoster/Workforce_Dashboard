package com.cec.EmployeeDB.alerts;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
public class AlertsController {

  private final AlertsService alertsService;
  private final NoHoursAlertBatch noHours;
  private final MissedPunchAlertBatch missedPunch;

  /**
   * List alerts with safe, optional filters. Nothing here touches your
   * Gantt/Reports.
   */
  @GetMapping
  public ResponseEntity<List<AlertEventDTO>> list(
      @RequestParam(required = false) String status, // open|acked|resolved
      @RequestParam(required = false) List<String> types, // MISSED_PUNCH,NO_HOURS_THIS_WEEK,NO_HOURS_LAST_WEEK
      @RequestParam(required = false) Integer employeeId,
      @RequestParam(required = false) String empCode,
      @RequestParam(required = false) String from, // YYYY-MM-DD
      @RequestParam(required = false) String to, // YYYY-MM-DD
      @RequestParam(defaultValue = "200") int limit) {

    LocalDate fromDate = parseDate(from);
    LocalDate toDate = parseDate(to);
    return ResponseEntity.ok(
        alertsService.list(status, types, employeeId, empCode, fromDate, toDate, Math.max(1, Math.min(limit, 2000))));
  }

  @GetMapping("/{id}")
  public ResponseEntity<AlertEventDTO> one(@PathVariable long id) {
    var dto = alertsService.get(id);
    return dto == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(dto);
  }

  /** Ack (soft close) */
  @PostMapping("/{id}/ack")
  public Map<String, Object> ack(@PathVariable long id,
      @RequestParam(required = false, name = "by") String by,
      HttpServletRequest req) {
    if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
      java.util.Map<String, Object> resp = new java.util.LinkedHashMap<>();
      resp.put("status", "smoke");
      resp.put("message", "skipped ack");
      resp.put("id", id);
      resp.put("by", by);
      return resp;
    }
    int n = alertsService.ack(id, Optional.ofNullable(by).orElse("system"));
    java.util.Map<String, Object> resp = new java.util.LinkedHashMap<>();
    resp.put("acked", n);
    return resp;
  }

  /** Resolve (hard close) */
  @PostMapping("/{id}/resolve")
  public Map<String, Object> resolve(@PathVariable long id, HttpServletRequest req) {
    if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
      java.util.Map<String, Object> resp = new java.util.LinkedHashMap<>();
      resp.put("status", "smoke");
      resp.put("message", "skipped resolve");
      resp.put("id", id);
      return resp;
    }
    int n = alertsService.resolve(id);
    java.util.Map<String, Object> resp = new java.util.LinkedHashMap<>();
    resp.put("resolved", n);
    return resp;
  }

  /** Manual runners so you can drive this from the UI while we iterate. */
  @PostMapping("/run/no-hours")
  public Map<String, Object> runNoHours(@RequestParam(defaultValue = "this-week") String scope,
      jakarta.servlet.http.HttpServletRequest req) {
    if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
      return Map.of("status", "smoke", "message", "skipped run no-hours", "scope", scope);
    }
    try {
      int inserted;
      switch (scope.toLowerCase()) {
        case "last-week" -> inserted = noHours.upsertNoHoursLastWeek();
        case "this-week" -> inserted = noHours.upsertNoHoursThisWeek();
        default -> throw new IllegalArgumentException("scope must be this-week or last-week");
      }
      return Map.of("scope", scope, "upserts", inserted);
    } catch (IllegalArgumentException ex) {
      return Map.of("status", "error", "message", ex.getMessage(), "scope", scope);
    }
  }

  @PostMapping("/run/missed-punch")
  public ResponseEntity<?> runMissedPunch(@RequestParam(required = false) String workDay,
      jakarta.servlet.http.HttpServletRequest req) {
    boolean smoke = com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)
        || "true".equalsIgnoreCase(req.getParameter("smoke"));
    if (smoke) {
      java.util.Map<String, Object> resp = new java.util.LinkedHashMap<>();
      resp.put("status", "smoke");
      resp.put("message", "skipped run missed-punch");
      resp.put("workDay", workDay);
      return ResponseEntity.ok(resp);
    }
    try {
      int upserts = (workDay == null || workDay.isBlank())
          ? missedPunch.upsertMissedPunchForPrevBusinessDay()
          : missedPunch.upsertMissedPunchFor(LocalDate.parse(workDay));
      java.util.Map<String, Object> resp = new java.util.LinkedHashMap<>();
      resp.put("workDay", workDay == null ? "prev-business-day" : workDay);
      resp.put("upserts", upserts);
      return ResponseEntity.ok(resp);
    } catch (Exception ex) {
      if (smoke) {
        java.util.Map<String, Object> resp = new java.util.LinkedHashMap<>();
        resp.put("status", "smoke");
        resp.put("message", "skipped run missed-punch");
        resp.put("workDay", workDay);
        return ResponseEntity.ok(resp);
      }
      java.util.Map<String, Object> err = new java.util.LinkedHashMap<>();
      err.put("status", "error");
      err.put("message", ex.getMessage());
      err.put("workDay", workDay);
      return ResponseEntity.status(500).body(err);
    }
  }

  /**
   * Front-end calls this after imports to refresh alert sets in one shot.
   * Triggers: No-Hours (this-week AND last-week) and Missed Punch (prev business day).
   */
  @PostMapping("/refresh")
  public Map<String, Object> refresh(jakarta.servlet.http.HttpServletRequest req) {
    if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
      return Map.of("status", "smoke", "message", "skipped refresh");
    }
    int noHoursThisWeek = noHours.upsertNoHoursThisWeek();
    int noHoursLastWeek = noHours.upsertNoHoursLastWeek();
    int missedPunchUpserts = missedPunch.upsertMissedPunchForPrevBusinessDay();
    return Map.of(
        "noHoursThisWeek", noHoursThisWeek,
        "noHoursLastWeek", noHoursLastWeek,
        "missedPunchUpserts", missedPunchUpserts,
        "refreshedAt", java.time.LocalDateTime.now().toString());
  }

  private static LocalDate parseDate(String s) {
    if (s == null || s.isBlank())
      return null;
    return LocalDate.parse(s);
  }
}
