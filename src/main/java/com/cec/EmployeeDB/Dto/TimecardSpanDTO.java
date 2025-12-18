// src/main/java/com/cec/EmployeeDB/Dto/TimecardSpanDTO.java
package com.cec.EmployeeDB.Dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TimecardSpanDTO {

    /** Employee CEC ID (ee_code) */
    private String eeCode;

    /** Inclusive start; exclusive end (better for Gantt bars) */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate startDate;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate endDateExcl;

    /** Charged job info */
    private String distJobCode;
    private String distJobDesc;

    /** Charged activity info */
    private String distActivityCode;
    private String distActivityDesc;

    /** Earn/Allocation code from the time record */
    private String allocationCode;

    /** Home allocation (Q+S+U+W+Y+AA or provided column) */
    private String homeAllocation;

    /** Optional badge (present for leased labor, etc.) */
    private String badge;

    /** Sum of hours in the span */
    private BigDecimal totalHours;

    /**
     * Convenience ctor to match existing service call:
     * (String, LocalDate, LocalDate, String, String, String, String, String,
     * String, String, double)
     * Converts the final double into BigDecimal and sets badge.
     */
    public TimecardSpanDTO(
            String eeCode,
            LocalDate startDate,
            LocalDate endDateExcl,
            String distJobCode,
            String distJobDesc,
            String distActivityCode,
            String distActivityDesc,
            String allocationCode,
            String homeAllocation,
            String badge,
            double totalHours) {
        this.eeCode = eeCode;
        this.startDate = startDate;
        this.endDateExcl = endDateExcl;
        this.distJobCode = distJobCode;
        this.distJobDesc = distJobDesc;
        this.distActivityCode = distActivityCode;
        this.distActivityDesc = distActivityDesc;
        this.allocationCode = allocationCode;
        this.homeAllocation = homeAllocation;
        this.badge = badge;
        this.totalHours = BigDecimal.valueOf(totalHours);
    }
}
