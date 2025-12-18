// src/main/java/com/cec/EmployeeDB/Entity/InactiveEmployee.java
package com.cec.EmployeeDB.Entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "inactive")
public class InactiveEmployee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "emp_id")
    private Integer employeeid;

    @Column(name = "emp_name")
    private String employeename;

    @Column(name = "work_group")
    private String workGroup;

    @Column(name = "emp_rank")
    private String ranked;

    @Column(name = "work_project")
    private String project;

    @Column(name = "job_num")
    private String jobNumber;

    @Column(name = "phone_num")
    private String phoneNumber;

    @Column(name = "supervisor")
    private String supervisor;

    // If you need dates/filters later
    @Column(name = "start_date") private LocalDate startDate;
    @Column(name = "end_date")   private LocalDate endDate;

    // getters
    public Integer getEmployeeid() { return employeeid; }
    public String getEmployeename() { return employeename; }
    public String getWorkGroup() { return workGroup; }
    public String getRanked() { return ranked; }
    public String getProject() { return project; }
    public String getJobNumber() { return jobNumber; }
    public String getPhoneNumber() { return phoneNumber; }
    public String getSupervisor() { return supervisor; }
}
