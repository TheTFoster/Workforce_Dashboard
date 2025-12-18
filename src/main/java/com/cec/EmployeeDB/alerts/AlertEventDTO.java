package com.cec.EmployeeDB.alerts;

import java.time.Instant;
import java.time.LocalDate;

public record AlertEventDTO(
        Long id,
        Integer employeeId,
        String type,
        String severity,
        LocalDate occurredOn,
        String status,
        String empCode,
        String dedupeKey,
        String eventType,
        String subject,
        Instant firstSeenAt,
        Instant lastSeenAt,
        Integer occurrenceCount,
        String detailsJson
) {}
