package com.cec.EmployeeDB.Dto;

import java.sql.Timestamp;
import java.util.List;

import java.time.LocalDate;

public class EmployeeFilterCriteria {
    private List<Float> employeeIds;
    private List<String> names;
    private List<String> groups;
    private List<String> ranked;
    private List<String> projects;
    private List<String> jobNumbers;
    private List<String> employeeCodes;
    private Timestamp startDateFrom;
    private Timestamp startDateTo;
    private Timestamp endDateFrom;
    private Timestamp endDateTo;

    // --- Advanced filter fields for EmployeeSpecification ---
    private String nameLike;
    private String groupLike;
    private String projectLike;
    private List<String> employeeCodesNotIn;
    private LocalDate startDateEquals;
    private LocalDate endDateEquals;
    private Boolean activeOnly;
    private Boolean inactiveOnly;
    private Boolean level1;
    private Boolean level2;
    private Boolean level3;
    private Double incentiveMin;
    private Double incentiveMax;
    private List<String> namesOrCodes;

    // Getters and setters

    public List<Float> getEmployeeIds() {
        return employeeIds;
    }

    public void setEmployeeIds(List<Float> employeeIds) {
        this.employeeIds = employeeIds;
    }

    public List<String> getNames() {
        return names;
    }

    public void setNames(List<String> names) {
        this.names = names;
    }

    public List<String> getGroups() {
        return groups;
    }

    public void setGroups(List<String> groups) {
        this.groups = groups;
    }

    public List<String> getRanked() {
        return ranked;
    }

    public void setRanked(List<String> ranked) {
        this.ranked = ranked;
    }

    public List<String> getProjects() {
        return projects;
    }

    public void setProjects(List<String> projects) {
        this.projects = projects;
    }

    public List<String> getJobNumbers() {
        return jobNumbers;
    }

    public void setJobNumbers(List<String> jobNumbers) {
        this.jobNumbers = jobNumbers;
    }

    public List<String> getEmployeeCodes() {
        return employeeCodes;
    }

    public void setEmployeeCodes(List<String> employeeCodes) {
        this.employeeCodes = employeeCodes;
    }

    public Timestamp getStartDateFrom() {
        return startDateFrom;
    }

    public void setStartDateFrom(Timestamp startDateFrom) {
        this.startDateFrom = startDateFrom;
    }

    public Timestamp getStartDateTo() {
        return startDateTo;
    }

    public void setStartDateTo(Timestamp startDateTo) {
        this.startDateTo = startDateTo;
    }

    public Timestamp getEndDateFrom() {
        return endDateFrom;
    }

    public void setEndDateFrom(Timestamp endDateFrom) {
        this.endDateFrom = endDateFrom;
    }

    public Timestamp getEndDateTo() {
        return endDateTo;
    }

    public void setEndDateTo(Timestamp endDateTo) {
        this.endDateTo = endDateTo;
    }

    public String getNameLike() { return nameLike; }
    public void setNameLike(String nameLike) { this.nameLike = nameLike; }

    public String getGroupLike() { return groupLike; }
    public void setGroupLike(String groupLike) { this.groupLike = groupLike; }

    public String getProjectLike() { return projectLike; }
    public void setProjectLike(String projectLike) { this.projectLike = projectLike; }

    public List<String> getEmployeeCodesNotIn() { return employeeCodesNotIn; }
    public void setEmployeeCodesNotIn(List<String> employeeCodesNotIn) { this.employeeCodesNotIn = employeeCodesNotIn; }

    public LocalDate getStartDateEquals() { return startDateEquals; }
    public void setStartDateEquals(LocalDate startDateEquals) { this.startDateEquals = startDateEquals; }

    public LocalDate getEndDateEquals() { return endDateEquals; }
    public void setEndDateEquals(LocalDate endDateEquals) { this.endDateEquals = endDateEquals; }

    public Boolean getActiveOnly() { return activeOnly; }
    public void setActiveOnly(Boolean activeOnly) { this.activeOnly = activeOnly; }

    public Boolean getInactiveOnly() { return inactiveOnly; }
    public void setInactiveOnly(Boolean inactiveOnly) { this.inactiveOnly = inactiveOnly; }

    public Boolean getLevel1() { return level1; }
    public void setLevel1(Boolean level1) { this.level1 = level1; }

    public Boolean getLevel2() { return level2; }
    public void setLevel2(Boolean level2) { this.level2 = level2; }

    public Boolean getLevel3() { return level3; }
    public void setLevel3(Boolean level3) { this.level3 = level3; }

    public Double getIncentiveMin() { return incentiveMin; }
    public void setIncentiveMin(Double incentiveMin) { this.incentiveMin = incentiveMin; }

    public Double getIncentiveMax() { return incentiveMax; }
    public void setIncentiveMax(Double incentiveMax) { this.incentiveMax = incentiveMax; }

    public List<String> getNamesOrCodes() { return namesOrCodes; }
    public void setNamesOrCodes(List<String> namesOrCodes) { this.namesOrCodes = namesOrCodes; }
}
