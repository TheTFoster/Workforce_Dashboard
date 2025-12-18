package com.cec.EmployeeDB.alerts;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/v1/alerts/orphan-punches")
@RequiredArgsConstructor
public class OrphanPunchController {

    private final OrphanPunchService orphanPunchService;

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(required = false) String empCode,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "200") int limit
    ) {
        LocalDate fromDate = parseDate(from);
        LocalDate toDate = parseDate(to);
        return ResponseEntity.ok(orphanPunchService.list(empCode, fromDate, toDate, limit));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable long id,
            @RequestParam(required = false) Long resolveAlertId,
            HttpServletRequest req
    ) {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            Map<String, Object> response = new java.util.LinkedHashMap<>();
            response.put("status", "smoke");
            response.put("message", "skipped delete orphan-punch");
            response.put("id", id);
            if (resolveAlertId != null) {
                response.put("resolveAlertId", resolveAlertId);
            }
            return ResponseEntity.ok(response);
        }
        int deleted = orphanPunchService.delete(id, resolveAlertId);
        return ResponseEntity.ok(Map.of("deleted", deleted));
    }

    private static LocalDate parseDate(String s) {
        if (s == null || s.isBlank()) return null;
        return LocalDate.parse(s);
    }
}
