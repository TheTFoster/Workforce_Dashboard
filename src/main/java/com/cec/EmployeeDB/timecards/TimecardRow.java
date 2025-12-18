package com.cec.EmployeeDB.timecards;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class TimecardRow {
    public String ee_code;
    public LocalDate work_date; // daily API path
    public LocalDateTime in_punch_time; // optional
    public LocalDateTime out_punch_time; // optional
    public String dist_job_code;
    public String dist_job_desc;
    public String dist_activity_code;
    public String dist_activity_desc;
    public String allocation_code;
    public String home_allocation;
    public String badge;
    public Double earn_hours;

    // span API path
    public LocalDate start_date;
    public LocalDate end_date_excl;
    public Double total_hours;
}