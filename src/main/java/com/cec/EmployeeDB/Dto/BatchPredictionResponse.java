package com.cec.EmployeeDB.Dto;

import lombok.*;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BatchPredictionResponse {
  // key = empCode
  private Map<String, LastWorkedPredictionDTO> predictions;
}