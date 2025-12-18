package com.cec.EmployeeDB.Dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LatestWorkedDTO {

    private String eeCode;
    private String project;
    private String jobNumber;
    private String workLocation;

    // Canonical field we will use everywhere going forward
    @JsonProperty("lastWorkedAt")
    @JsonAlias({
        "lastDate",          // older server responses
        "last_work_date",    // snake case
        "last_worked_at",    // snake case alt
        "max_ts",            // some queries name it this way
        "updated_at"         // very old payloads reused this
    })
    private LocalDateTime lastWorkedAt;
}
