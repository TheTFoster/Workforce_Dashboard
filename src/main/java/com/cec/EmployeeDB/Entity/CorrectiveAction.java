// src/main/java/com/cec/EmployeeDB/Entity/CorrectiveAction.java
package com.cec.EmployeeDB.Entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "corrective_action")
public class CorrectiveAction {

    public enum Category {
        ATTENDANCE, PERFORMANCE, BEHAVIOR
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Points to field(emp_id)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "emp_id", nullable = false)
    private Employee employee; // maps to table `field`

    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 16, nullable = false)
    private Category category;

    @Column(name = "action_date")
    private LocalDate actionDate;

    @Column(name = "summary", length = 255)
    private String summary;

    @JdbcTypeCode(SqlTypes.LONGVARCHAR) // maps to TEXT on MySQL
    @Column(nullable = true) // drop columnDefinition; let dialect choose
    private String details;

    @Column(name = "issued_by", length = 128)
    private String issuedBy;

    @Column(name = "severity", length = 32)
    private String severity; // e.g., Verbal, Written, Final

    @Column(name = "status", length = 32)
    private String status; // e.g., Open, Closed

    // Using DB defaults for timestamps
    @Column(name = "created_at", updatable = false, insertable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    // getters/setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Employee getEmployee() {
        return employee;
    }

    public void setEmployee(Employee employee) {
        this.employee = employee;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public LocalDate getActionDate() {
        return actionDate;
    }

    public void setActionDate(LocalDate actionDate) {
        this.actionDate = actionDate;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public String getIssuedBy() {
        return issuedBy;
    }

    public void setIssuedBy(String issuedBy) {
        this.issuedBy = issuedBy;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
