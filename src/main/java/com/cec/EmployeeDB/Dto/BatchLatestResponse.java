// src/main/java/com/cec/EmployeeDB/Dto/BatchLatestResponse.java
package com.cec.EmployeeDB.Dto;

import lombok.*;
import java.util.Map;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class BatchLatestResponse {
  private Map<String, LatestWorkedDTO> predictions; // keep key name so FE logic works unchanged
}
