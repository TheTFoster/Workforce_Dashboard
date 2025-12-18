package com.cec.EmployeeDB.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Entity
@Table(name = "paycom_time_report",
       indexes = {
         @Index(name="idx_paycom_empdate", columnList="ee_code,work_date"),
         @Index(name="idx_paycom_earncode", columnList="earn_code"),
         @Index(name="idx_paycom_home_job", columnList="home_job_code"),
         @Index(name="idx_paycom_dist_job", columnList="dist_job_code"),
         @Index(name="idx_paycom_work_date", columnList="work_date")
       },
       uniqueConstraints = {
         @UniqueConstraint(name="ux_paycom_rowhash", columnNames = "raw_row_hash")
       })
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class PaycomTimeReport {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name="ee_code", nullable=false, length=64)
  private String eeCode;

  @Column(name="last_name", length=128)   private String lastName;
  @Column(name="first_name", length=128)  private String firstName;
  @Column(name="home_department", length=64) private String homeDepartment;
  @Column(name="home_allocation", length=64) private String homeAllocation;
  @Column(name="pay_class", length=64)    private String payClass;
  @Column(name="badge", length=64)        private String badge;

  @Column(name="in_punch_time")  private LocalDateTime inPunchTime;
  @Column(name="out_punch_time") private LocalDateTime outPunchTime;

  @Column(name="allocation_code", length=64) private String allocationCode;
  @Column(name="earn_code", length=64)       private String earnCode;
  @Column(name="earn_hours", precision=10, scale=2) private BigDecimal earnHours;
  @Column(name="dollars", precision=12, scale=2)    private BigDecimal dollars;

  @Column(name="employee_approved")   private Boolean employeeApproved;
  @Column(name="supervisor_approved") private Boolean supervisorApproved;
  @Column(name="tax_profile", length=64) private String taxProfile;

  @Column(name="home_department_desc", length=255) private String homeDepartmentDesc;
  @Column(name="home_payroll_profile_code", length=64) private String homePayrollProfileCode;
  @Column(name="home_payroll_profile_desc", length=255) private String homePayrollProfileDesc;
  @Column(name="home_job_code", length=64) private String homeJobCode;
  @Column(name="home_job_desc", length=255) private String homeJobDesc;
  @Column(name="home_section_code", length=64) private String homeSectionCode;
  @Column(name="home_section_desc", length=255) private String homeSectionDesc;
  @Column(name="home_activity_code", length=64) private String homeActivityCode;
  @Column(name="home_activity_desc", length=255) private String homeActivityDesc;
  @Column(name="home_user_access_code", length=64) private String homeUserAccessCode;
  @Column(name="home_user_access_desc", length=255) private String homeUserAccessDesc;
  @Column(name="home_sub_department_code", length=64) private String homeSubDepartmentCode;
  @Column(name="home_sub_department_desc", length=255) private String homeSubDepartmentDesc;

  @Column(name="dist_department_desc", length=255) private String distDepartmentDesc;
  @Column(name="dist_payroll_profile_code", length=64) private String distPayrollProfileCode;
  @Column(name="dist_payroll_profile_desc", length=255) private String distPayrollProfileDesc;
  @Column(name="dist_job_code", length=64) private String distJobCode;
  @Column(name="dist_job_desc", length=255) private String distJobDesc;
  @Column(name="dist_section_code", length=64) private String distSectionCode;
  @Column(name="dist_section_desc", length=255) private String distSectionDesc;
  @Column(name="dist_activity_code", length=64) private String distActivityCode;
  @Column(name="dist_activity_desc", length=255) private String distActivityDesc;
  @Column(name="dist_user_access_code", length=64) private String distUserAccessCode;
  @Column(name="dist_user_access_desc", length=255) private String distUserAccessDesc;
  @Column(name="dist_sub_department_code", length=64) private String distSubDepartmentCode;
  @Column(name="dist_sub_department_desc", length=255) private String distSubDepartmentDesc;
  @Column(name="distributed_department_code", length=64) private String distributedDepartmentCode;

  @Column(name="units", precision=10, scale=2) private BigDecimal units;

  // work_date is a GENERATED column in MySQL - calculated from punch times
  // JPA should only READ it, never write to it
  @Column(name="work_date", insertable=false, updatable=false) 
  private LocalDate workDate;
  
  // work_date_effective is a GENERATED column in MySQL - calculated from work_date
  // JPA should only READ it, never write to it
  @Column(name="work_date_effective", insertable=false, updatable=false)
  private LocalDate workDateEffective;

  @Column(name="import_batch_id", nullable=false) private Long importBatchId;
  @Column(name="raw_row_hash", nullable=false, length=40, unique=true) private String rawRowHash;

  // created_at is auto-populated by MySQL DEFAULT CURRENT_TIMESTAMP
  // JPA should only READ it, never write to it
  @Column(name="created_at", insertable=false, updatable=false)
  private java.sql.Timestamp createdAt;
}
