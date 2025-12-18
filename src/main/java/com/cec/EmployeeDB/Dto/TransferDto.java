package com.cec.EmployeeDB.Dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record TransferDto(
                @JsonProperty("transfer_id") Long transferId,
                @JsonProperty("emp_code") String empCode,
                @JsonProperty("xid") String xid,
                @JsonProperty("emp_name") String empName,
                @JsonProperty("classification") String classification,
                @JsonProperty("from_jobsite") String fromJobsite,
                @JsonProperty("to_jobsite") String toJobsite,
                @JsonProperty("effective_date") LocalDate effectiveDate,
                @JsonProperty("rate_hourly") BigDecimal rateHourly,
                @JsonProperty("rate_type") String rateType,
                @JsonProperty("evaluation_score") BigDecimal evaluationScore,
                @JsonProperty("notes") String notes,
                @JsonProperty("email") String email,
                @JsonProperty("license_1") String license1,
                @JsonProperty("license_2") String license2,
                @JsonProperty("license_3") String license3,
                @JsonProperty("license_4") String license4,
                @JsonProperty("contact_phone") String contactPhone,
                @JsonProperty("location_city") String locationCity,
                @JsonProperty("location_state") String locationState,
                @JsonProperty("sheet_date") LocalDate sheetDate,
                @JsonProperty("last_pay_change") LocalDate lastPayChange,
                @JsonProperty("hire_date") LocalDate hireDate,
                @JsonProperty("badging") String badging,
                @JsonProperty("level1_status") String level1Status,
                @JsonProperty("scissor_lift_status") String scissorLiftStatus,
                @JsonProperty("corrective_action") String correctiveAction,
                @JsonProperty("language") String language,
                @JsonProperty("group") String group,
                @JsonProperty("new_group") String newGroup,
                @JsonProperty("jobsites_of_interest") String jobsitesOfInterest,
                @JsonProperty("updates") String updates,
                @JsonProperty("new_hire_follow_up") String newHireFollowUp,
                @JsonProperty("osha_10_date") LocalDate osha10Date,
                @JsonProperty("osha_30_date") LocalDate osha30Date,
                @JsonProperty("transfer_status") String transferStatus,
                @JsonProperty("term") String term,
                @JsonProperty("per_diem") BigDecimal perDiem,
                @JsonProperty("source_file") String sourceFile,
                @JsonProperty("travel_preference") Integer travelPreference,
                @JsonProperty("is_archived") Boolean isArchived,
                @JsonProperty("created_at") LocalDateTime createdAt,
                @JsonProperty("updated_at") LocalDateTime updatedAt,
                @JsonProperty("emp_code_norm_key") String empCodeNormKey,
                @JsonProperty("eff_key") LocalDate effKey,
                @JsonProperty("from_jobsite_key") String fromJobsiteKey,
                @JsonProperty("to_jobsite_key") String toJobsiteKey) {
}
