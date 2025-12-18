package com.cec.EmployeeDB.model;

import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class RowMap {
  // Present in live SELECTs and used in BatchReport.ChangeRow.empId
  private Long id;

  // Keys / identifiers
  private String empCode;
  private String tixId;
  private String badge;
  private String badgeNorm;

  // Person data
  private String name;
  private String status;
  private String phone;
  private String workEmail;
  private String personalEmail;

  // Comp / pay (must be numeric for your strip(BigDecimal) helper)
  private BigDecimal annualSalary;
  private BigDecimal rate1;
  private String payType;

  // Org / location / job
  private String department;
  private String workLocation;
  private String jobCode;
}
