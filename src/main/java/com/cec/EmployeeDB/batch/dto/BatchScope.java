package com.cec.EmployeeDB.batch.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record BatchScope(
        boolean deactivations,
        boolean terminations,
        boolean reactivations,
        boolean updatesOther
) {}
