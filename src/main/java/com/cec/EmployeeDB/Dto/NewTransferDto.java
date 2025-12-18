package com.cec.EmployeeDB.Dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record NewTransferDto(
        String empCode,
        String xid,
        String empName,
        String classification,
        String fromJobsite,
        String toJobsite,
        LocalDate effectiveDate,
        String transferStatus,
        String term,
        BigDecimal rateHourly,
        String rateType,
        BigDecimal perDiem,
        BigDecimal evaluationScore,
        String notes,
        String email,
        String license1,
        String license2,
        String license3,
        String license4,
        String contactPhone,
        String locationCity,
        String locationState,
        String badging,
        String level1Status,
        String scissorLiftStatus,
        String correctiveAction,
        String language,
        String group,
        String newGroup,
        String jobsitesOfInterest,
        String updates,
        String newHireFollowUp,
        LocalDate lastPayChange,
        LocalDate osha10Date,
        LocalDate osha30Date
) { }
