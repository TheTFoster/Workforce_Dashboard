package com.cec.EmployeeDB.controller;

import com.cec.EmployeeDB.Entity.MandownGroup;
import com.cec.EmployeeDB.Service.MandownGroupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/mandown-groups")
@RequiredArgsConstructor
@Slf4j
public class MandownGroupController {
    
    private final MandownGroupService service;
    
    @GetMapping
    public ResponseEntity<List<MandownGroup>> getAllGroups() {
        return ResponseEntity.ok(service.getAllGroups());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<MandownGroup> getGroupById(@PathVariable Long id) {
        return service.getGroupById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<MandownGroup> createGroup(@RequestBody MandownGroup group, HttpServletRequest req) {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return ResponseEntity.ok(group);
        }
        log.info("Creating mandown group: {}", group.getName());
        MandownGroup created = service.createGroup(group);
        return ResponseEntity.ok(created);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<MandownGroup> updateGroup(@PathVariable Long id, @RequestBody MandownGroup group, HttpServletRequest req) {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return ResponseEntity.ok(group);
        }
        log.info("Updating mandown group: {}", id);
        try {
            MandownGroup updated = service.updateGroup(id, group);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id, HttpServletRequest req) {
        log.info("Deleting mandown group: {}", id);
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return ResponseEntity.ok().build();
        }
        service.deleteGroup(id);
        return ResponseEntity.ok().build();
    }
    
    @PostMapping("/reorder")
    public ResponseEntity<Void> reorderGroups(@RequestBody List<Long> groupIds, HttpServletRequest req) {
        log.info("Reordering {} groups", groupIds.size());
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return ResponseEntity.ok().build();
        }
        service.reorderGroups(groupIds);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/employees")
    public ResponseEntity<MandownGroup> addEmployeesToGroup(
            @PathVariable Long id,
            @RequestBody Map<String, List<String>> payload,
            HttpServletRequest req) {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return ResponseEntity.ok(service.getGroupById(id).orElse(null));
        }
        List<String> employeeIds = payload.get("employeeIds");
        log.info("Adding {} employees to group {}", employeeIds.size(), id);
        try {
            MandownGroup updated = service.addEmployeesToGroup(id, employeeIds);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/{id}/employees/{employeeId}")
    public ResponseEntity<MandownGroup> removeEmployeeFromGroup(
            @PathVariable Long id,
            @PathVariable String employeeId,
            HttpServletRequest req) {
        log.info("Removing employee {} from group {}", employeeId, id);
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return ResponseEntity.ok(service.getGroupById(id).orElse(null));
        }
        try {
            MandownGroup updated = service.removeEmployeeFromGroup(id, employeeId);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
