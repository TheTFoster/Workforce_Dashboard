package com.cec.EmployeeDB.Entity;

import jakarta.persistence.*;
import org.hibernate.annotations.Immutable;
import java.time.LocalDate;

@Entity
@Table(name = "vw_employee_last_timecard")
@Immutable 
public class EmployeeLastTimecardView {

    @Id
    @Column(name = "employee_code", length = 64)
    private String employeeCode;

    @Column(name = "last_work_date")
    private LocalDate lastWorkDate;

    @Column(name = "last_job_code")
    private String lastJobCode;

    @Column(name = "last_job_desc")
    private String lastJobDesc;

    @Column(name = "location_text")
    private String locationText;

    // --- getters/setters ---
    public String getEmployeeCode() { return employeeCode; }
    public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }

    public LocalDate getLastWorkDate() { return lastWorkDate; }
    public void setLastWorkDate(LocalDate lastWorkDate) { this.lastWorkDate = lastWorkDate; }

    public String getLastJobCode() { return lastJobCode; }
    public void setLastJobCode(String lastJobCode) { this.lastJobCode = lastJobCode; }

    public String getLastJobDesc() { return lastJobDesc; }
    public void setLastJobDesc(String lastJobDesc) { this.lastJobDesc = lastJobDesc; }

    public String getLocationText() { return locationText; }
    public void setLocationText(String locationText) { this.locationText = locationText; }
}
