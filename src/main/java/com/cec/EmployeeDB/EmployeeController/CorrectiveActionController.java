// src/main/java/com/cec/EmployeeDB/EmployeeController/CorrectiveActionController.java
package com.cec.EmployeeDB.EmployeeController;

import com.cec.EmployeeDB.Dto.CorrectiveActionDTO;
import com.cec.EmployeeDB.Entity.CorrectiveAction.Category;
import com.cec.EmployeeDB.Service.CorrectiveActionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/v1")
public class CorrectiveActionController {

    private final CorrectiveActionService service;

    public CorrectiveActionController(CorrectiveActionService service) {
        this.service = service;
    }

    // List for an employee, optional ?category=ATTENDANCE|PERFORMANCE|BEHAVIOR
    @GetMapping("/employee/{employeeid}/corrective-actions")
    public ResponseEntity<List<CorrectiveActionDTO>> list(
            @PathVariable Integer employeeid,
            @RequestParam(required = false) String category) {
        Category cat = (category == null || category.isBlank()) ? null : Category.valueOf(category.toUpperCase());
        return ResponseEntity.ok(service.listByEmployee(employeeid, cat));
    }

    // Create
    @PostMapping("/employee/{employeeid}/corrective-actions")
    public ResponseEntity<CorrectiveActionDTO> create(
            @PathVariable Integer employeeid,
            @RequestBody CorrectiveActionDTO dto,
            HttpServletRequest req) {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return ResponseEntity.ok(dto);
        }
        return ResponseEntity.ok(service.create(employeeid, dto));
    }

    // Update
    @PutMapping("/corrective-actions/{id}")
    public ResponseEntity<CorrectiveActionDTO> update(
            @PathVariable Long id,
            @RequestBody CorrectiveActionDTO dto,
            HttpServletRequest req) {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return ResponseEntity.ok(dto);
        }
        return ResponseEntity.ok(service.update(id, dto));
    }

    // Delete
    @DeleteMapping("/corrective-actions/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, HttpServletRequest req) {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return ResponseEntity.ok(java.util.Map.of("status", "smoke", "message", "skipped delete corrective action", "id", id));
        }
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
