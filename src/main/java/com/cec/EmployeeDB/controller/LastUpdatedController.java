package com.cec.EmployeeDB.controller;

import com.cec.EmployeeDB.Repo.EmployeeRepo;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@RestController
public class LastUpdatedController {
    private final EmployeeRepo repo;

    public LastUpdatedController(EmployeeRepo repo) {
        this.repo = repo;
    }

    @GetMapping("/api/v1/field/last-updated")
    public Instant lastUpdatedUtc() {
        LocalDateTime raw = repo.lastUpdatedRaw();        // stored as UTC in your entity hooks
        return raw == null ? null : raw.atOffset(ZoneOffset.UTC).toInstant(); // serialize as 2025-10-15T14:56:57Z
    }
}

