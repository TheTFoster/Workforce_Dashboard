package com.cec.EmployeeDB.Dto;

import lombok.*;

@Getter @Setter
@Builder
@NoArgsConstructor @AllArgsConstructor
public class ImportResultDTO {
  private long batchId;
  private int total;
  private int inserted;
  private int duplicates;
  private int errors;
}
