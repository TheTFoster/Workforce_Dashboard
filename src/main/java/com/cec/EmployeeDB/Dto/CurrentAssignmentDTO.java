package com.cec.EmployeeDB.Dto;

import java.time.LocalDateTime;

public class CurrentAssignmentDTO {
    private String employeeCode;
    private String workGroup;
    private String project;
    private String jobNumber;
    private LocalDateTime lastSeenAt;

    public String getEmployeeCode() { return employeeCode; }
    public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }

    public String getWorkGroup() { return workGroup; }
    public void setWorkGroup(String workGroup) { this.workGroup = workGroup; }

    public String getProject() { return project; }
    public void setProject(String project) { this.project = project; }

    public String getJobNumber() { return jobNumber; }
    public void setJobNumber(String jobNumber) { this.jobNumber = jobNumber; }

    public LocalDateTime getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(LocalDateTime lastSeenAt) { this.lastSeenAt = lastSeenAt; }
}
