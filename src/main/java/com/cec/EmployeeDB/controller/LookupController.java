package com.cec.EmployeeDB.controller;

import com.cec.EmployeeDB.Service.LookupService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/lookups")
public class LookupController {

    private final LookupService lookupService;

    public LookupController(LookupService lookupService) {
        this.lookupService = lookupService;
    }

    @GetMapping("/groups")
    public ResponseEntity<List<String>> groups() {
        return ResponseEntity.ok(lookupService.groups());
    }

    @GetMapping("/ranks")
    public ResponseEntity<List<String>> ranks() {
        return ResponseEntity.ok(lookupService.ranks());
    }

    @GetMapping("/projects")
    public ResponseEntity<List<String>> projects() {
        return ResponseEntity.ok(lookupService.projects());
    }

    @GetMapping("/jobnumbers")
    public ResponseEntity<List<String>> jobNumbers() {
        return ResponseEntity.ok(lookupService.jobNumbers());
    }

    @GetMapping("/supervisors")
    public ResponseEntity<List<String>> supervisors() {
        return ResponseEntity.ok(lookupService.supervisors());
    }

    @GetMapping("/all")
    public ResponseEntity<Map<String, List<String>>> all() {
        return ResponseEntity.ok(Map.of(
                "groups", lookupService.groups(),
                "ranks", lookupService.ranks(),
                "projects", lookupService.projects(),
                "jobNumbers", lookupService.jobNumbers(),
                "supervisors", lookupService.supervisors()
        ));
    }
}