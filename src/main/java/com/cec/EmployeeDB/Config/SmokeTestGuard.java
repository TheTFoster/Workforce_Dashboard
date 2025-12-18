package com.cec.EmployeeDB.Config;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Utility to detect "dry-run" smoke tests. If the incoming request includes
 * header X-Smoke-Test=true, controllers can short-circuit before mutating data.
 */
public final class SmokeTestGuard {
    private static final String HEADER = "X-Smoke-Test";

    private SmokeTestGuard() {}

    public static boolean isSmokeTest(HttpServletRequest req) {
        if (req == null) return false;
        String v = req.getHeader(HEADER);
        return v != null && v.equalsIgnoreCase("true");
    }
}
