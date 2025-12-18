package com.cec.EmployeeDB.batch.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record BatchApplyRequest(
        BatchApplyRules rules,
        BatchScope scope
) {}
