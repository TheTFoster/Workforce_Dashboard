// src/main/java/com/cec/EmployeeDB/Dto/TimecardDTO.java
package com.cec.EmployeeDB.Dto;

import java.time.LocalDateTime;

public class TimecardDTO {
    private Long id;
    private String employeeCode;
    private String EmployeeName;

    // canonical project key (what Reports groups by)
    private String project;

    // punches
    private LocalDateTime start;
    private LocalDateTime end;

    // ---------- rich fields from paycom_time_report ----------
    // job
    private String distJobCode;
    private String distJobDesc;

    // "Section (Dist Dept Desc)" = left-side filter label
    private String distDepartmentDesc;

    // "Department (Dist Section Desc)" = shown on employee card
    private String distSectionCode;
    private String distSectionDesc;

    // Activity shown on employee card
    private String distActivityDesc;

    // other descriptors that sometimes help classification
    private String allocationCode;
    private String homeAllocation;
    private String homeDepartmentDesc;

    public TimecardDTO() {
    }

    // --- getters/setters ---
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmployeeCode() {
        return employeeCode;
    }

    public void setEmployeeCode(String employeeCode) {
        this.employeeCode = employeeCode;
    }

    public String getEmployeeName() {
        return EmployeeName;
    }

    public void setEmployeeName(String EmployeeName) {
        this.EmployeeName = EmployeeName;
    }

    public String getProject() {
        return project;
    }

    public void setProject(String project) {
        this.project = project;
    }

    public LocalDateTime getStart() {
        return start;
    }

    public void setStart(LocalDateTime start) {
        this.start = start;
    }

    public LocalDateTime getEnd() {
        return end;
    }

    public void setEnd(LocalDateTime end) {
        this.end = end;
    }

    public String getDistJobCode() {
        return distJobCode;
    }

    public void setDistJobCode(String distJobCode) {
        this.distJobCode = distJobCode;
    }

    public String getDistJobDesc() {
        return distJobDesc;
    }

    public void setDistJobDesc(String distJobDesc) {
        this.distJobDesc = distJobDesc;
    }

    public String getDistDepartmentDesc() {
        return distDepartmentDesc;
    }

    public void setDistDepartmentDesc(String distDepartmentDesc) {
        this.distDepartmentDesc = distDepartmentDesc;
    }

    public String getDistSectionCode() {
        return distSectionCode;
    }

    public void setDistSectionCode(String distSectionCode) {
        this.distSectionCode = distSectionCode;
    }

    public String getDistSectionDesc() {
        return distSectionDesc;
    }

    public void setDistSectionDesc(String distSectionDesc) {
        this.distSectionDesc = distSectionDesc;
    }

    public String getDistActivityDesc() {
        return distActivityDesc;
    }

    public void setDistActivityDesc(String distActivityDesc) {
        this.distActivityDesc = distActivityDesc;
    }

    public String getAllocationCode() {
        return allocationCode;
    }

    public void setAllocationCode(String allocationCode) {
        this.allocationCode = allocationCode;
    }

    public String getHomeAllocation() {
        return homeAllocation;
    }

    public void setHomeAllocation(String homeAllocation) {
        this.homeAllocation = homeAllocation;
    }

    public String getHomeDepartmentDesc() {
        return homeDepartmentDesc;
    }

    public void setHomeDepartmentDesc(String homeDepartmentDesc) {
        this.homeDepartmentDesc = homeDepartmentDesc;
    }
}
