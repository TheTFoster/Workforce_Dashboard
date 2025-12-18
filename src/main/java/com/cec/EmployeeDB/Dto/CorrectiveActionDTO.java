// src/main/java/com/cec/EmployeeDB/Dto/CorrectiveActionDTO.java
package com.cec.EmployeeDB.Dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class CorrectiveActionDTO {
    private Long id;
    private Integer employeeid;      // emp_id
    private String employeeName;     // optional convenience
    private String category;         // ATTENDANCE | PERFORMANCE | BEHAVIOR
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate actionDate;
    private String summary;
    private String details;
    private String issuedBy;
    private String severity;         // Verbal | Written | Final, etc.
    private String status;           // Open | Closed
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime createdAt;
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime updatedAt;

    public CorrectiveActionDTO() {}

    public CorrectiveActionDTO(Long id, Integer employeeid, String employeeName, String category,
                               LocalDate actionDate, String summary, String details,
                               String issuedBy, String severity, String status,
                               LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.employeeid = employeeid;
        this.employeeName = employeeName;
        this.category = category;
        this.actionDate = actionDate;
        this.summary = summary;
        this.details = details;
        this.issuedBy = issuedBy;
        this.severity = severity;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // getters/setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getEmployeeid() { return employeeid; }
    public void setEmployeeid(Integer employeeid) { this.employeeid = employeeid; }

    public String getEmployeeName() { return employeeName; }
    public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public LocalDate getActionDate() { return actionDate; }
    public void setActionDate(LocalDate actionDate) { this.actionDate = actionDate; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public String getIssuedBy() { return issuedBy; }
    public void setIssuedBy(String issuedBy) { this.issuedBy = issuedBy; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
