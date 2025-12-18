package com.cec.EmployeeDB.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name="employee_project_prediction")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EmployeeProjectPrediction {
  @Id
  @Column(name="emp_code", length=64)
  private String empCode;

  @Column(name="project_key", nullable=false, length=255)
  private String projectKey;

  @Column(name="confidence", nullable=false)
  private Integer confidence;

  @Column(name="method", nullable=false, length=32)
  private String method;

  @Column(name="as_of", nullable=false)
  private LocalDateTime asOf;

  @Column(name="source", nullable=false, length=32)
  private String source;

  @Column(name="explanation") private String explanation;

  @Column(name="expires_at") private LocalDateTime expiresAt;

  @Column(name="created_at", nullable=false,
          columnDefinition = "timestamp default current_timestamp")
  private java.sql.Timestamp createdAt;
}
