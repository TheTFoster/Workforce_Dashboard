package com.cec.EmployeeDB.Entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name="job_to_project_map",
       indexes = {
         @Index(name="idx_jpm_job", columnList="job_code"),
         @Index(name="idx_jpm_dept", columnList="department_code"),
         @Index(name="idx_jpm_desc", columnList="department_desc")
       })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class JobToProjectMap {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
  private Long id;

  @Column(name="job_code", length=64) private String jobCode;
  @Column(name="department_code", length=64) private String departmentCode;
  @Column(name="department_desc", length=255) private String departmentDesc;

  @Column(name="project_key", nullable=false, length=255) private String projectKey;
  @Column(name="confidence_boost", nullable=false) private Integer confidenceBoost;
  @Column(name="active", nullable=false) private Boolean active;

  @Column(name="created_at", nullable=false,
          columnDefinition = "timestamp default current_timestamp")
  private java.sql.Timestamp createdAt;
}
