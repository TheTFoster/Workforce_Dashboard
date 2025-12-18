package com.cec.EmployeeDB.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;

@Entity
@Table(name = "paycom_time_report") // <-- your existing table
public class Timecard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ee_code")
    private String employeeCode;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(name = "allocation_code") // use your canonical project field here
    private String allocationCode;

    @Column(name = "in_punch_time", columnDefinition = "datetime")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime inPunchTime;

    @Column(name = "out_punch_time", columnDefinition = "datetime")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime outPunchTime;

    @Column(name = "dist_job_code")
    private String distJobCode;

    @Column(name = "dist_job_desc")
    private String distJobDesc;

    @Column(name = "dist_section_code")
    private String distSectionCode;

    @Column(name = "dist_section_desc")
    private String distSectionDesc;

    @Column(name = "home_allocation")
    private String homeAllocation;

    @Column(name = "home_department_desc")
    private String homeDepartmentDesc;

    @Column(name = "dist_department_desc")
    private String distDepartmentDesc;

    @Column(name = "dist_activity_code")
    private String distActivityCode;

    @Column(name = "dist_activity_desc")
    private String distActivityDesc;

    // in your PaycomTimeReport entity
    @Column(name = "raw_row_hash", columnDefinition = "char(40)")
    private String rawRowHash;

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

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getAllocationCode() {
        return allocationCode;
    }

    public void setAllocationCode(String allocationCode) {
        this.allocationCode = allocationCode;
    }

    public LocalDateTime getInPunchTime() {
        return inPunchTime;
    }

    public void setInPunchTime(LocalDateTime inPunchTime) {
        this.inPunchTime = inPunchTime;
    }

    public LocalDateTime getOutPunchTime() {
        return outPunchTime;
    }

    public void setOutPunchTime(LocalDateTime outPunchTime) {
        this.outPunchTime = outPunchTime;
    }

    @Transient
    public String getEmployeeName() {
        String fn = firstName == null ? "" : firstName.trim();
        String ln = lastName == null ? "" : lastName.trim();
        return (fn + " " + ln).trim();
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

    public String getDistDepartmentDesc() {
        return distDepartmentDesc;
    }

    public void setDistDepartmentDesc(String v) {
        this.distDepartmentDesc = v;
    }

    public String getDistActivityCode() {
        return distActivityCode;
    }

    public void setDistActivityCode(String v) {
        this.distActivityCode = v;
    }

    public String getDistActivityDesc() {
        return distActivityDesc;
    }

    public void setDistActivityDesc(String v) {
        this.distActivityDesc = v;
    }

    public String getRawRowHash() {
        return rawRowHash;
    }

    public void setRawRowHash(String rawRowHash) {
        this.rawRowHash = rawRowHash;
    }
}
