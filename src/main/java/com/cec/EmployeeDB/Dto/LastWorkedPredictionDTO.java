package com.cec.EmployeeDB.Dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LastWorkedPredictionDTO {
  private String empCode;
  private String projectKey;
  private int confidence;          // 0–100
  private String method;           // recency | weekly-majority | hybrid
  private LocalDateTime asOf;
  private String explanation;      // human-friendly reason
}