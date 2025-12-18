package com.cec.EmployeeDB.batch.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record BatchApplyRules(
        boolean allowFallbackMatch,   // allow TIXID/XID fallback when emp_code is missing
        boolean ackMapping,           // user confirms mapping (dept->work_group, etc.)
        boolean ackDeactivations,     // user acknowledged deactivations
        boolean ackTerminations,      // user acknowledged terminations
        boolean ackWageDecreases      // user acknowledged wage decreases
) {}
