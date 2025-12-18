package com.cec.EmployeeDB.util;

import java.util.List;

/**
 * Classifies business titles into Field vs Professional buckets based on common title patterns.
 * Titles are matched case-insensitively using substring checks; field-specific overrides are applied first.
 */
public final class TitleClassifier {

    public enum Role {
        FIELD,
        PROFESSIONAL,
        UNKNOWN
    }

    private static final List<String> FIELD_OVERRIDES = List.of(
        "field operations manager",
        "hvac field operations manager",
        "field logistics coordinator",
        "field logistics supervisor",
        "field logistics specialist",
        "field engineer",
        "field material handler",
        "field supervisor",
        "special projects superintendent",
        "technology superintendent",
        "technology foreman",
        "general superintendent",
        "senior superintendent",
        "construction manager", // jobsite-focused construction managers
        "warehouse supervisor", // treated as field-facing per guidance
        "prefab intern"
    );

    private static final List<String> FIELD_KEYWORDS = List.of(
        "apprentice",
        "helper",
        "tradesman",
        "journeyman",
        "technician",
        "tech",
        "installer",
        "installation technician",
        "foreman",
        "superintendent",
        "laborer",
        "operator",
        "driver",
        "material handler",
        "warehouse associate",
        "warehouse driver",
        "warehouse specialist",
        "field logistics",
        "directional bore",
        "welder",
        "total station surveyor",
        "service technician",
        "field operations"
    );

    private static final List<String> PROFESSIONAL_OVERRIDES = List.of(
        "production manager - electrical prefabrication",
        "service operations manager",
        "warehouse operations manager",
        "logistics manager",
        "operational excellence",
        "safety coordinator",
        "senior safety coordinator",
        "safety manager"
    );

    private static final List<String> PROFESSIONAL_KEYWORDS = List.of(
        "account manager",
        "sales engineer",
        "service manager",
        "project manager",
        "project executive",
        "project coordinator",
        "project administrator",
        "assistant project manager",
        "estimator",
        "preconstruction",
        "bim",
        "engineer",
        "director",
        "service operations",
        "operations manager",
        "coordinator",
        "administrator",
        "scheduler",
        "administrative assistant",
        "quality control specialist",
        "manager, warehouse operations",
        "warehouse operations",
        "service engineer",
        "project engineer"
    );

    private TitleClassifier() {
    }

    public static Role classifyBusinessTitle(String title) {
        if (title == null) return Role.UNKNOWN;
        String normalized = title.trim().toLowerCase();
        if (normalized.isBlank()) return Role.UNKNOWN;

        if (containsAny(normalized, FIELD_OVERRIDES)) return Role.FIELD;
        if (containsAny(normalized, PROFESSIONAL_OVERRIDES)) return Role.PROFESSIONAL;

        if (containsAny(normalized, FIELD_KEYWORDS)) return Role.FIELD;
        if (containsAny(normalized, PROFESSIONAL_KEYWORDS)) return Role.PROFESSIONAL;

        return Role.UNKNOWN;
    }

    private static boolean containsAny(String title, List<String> needles) {
        for (String needle : needles) {
            if (title.contains(needle)) {
                return true;
            }
        }
        return false;
    }
}
