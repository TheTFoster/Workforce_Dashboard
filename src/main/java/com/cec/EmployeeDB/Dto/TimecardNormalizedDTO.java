package com.cec.EmployeeDB.Dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TimecardNormalizedDTO {
  private String empCode;
  private LocalDate workDate;
  private LocalDateTime inPunch;
  private LocalDateTime outPunch;
  private BigDecimal earnHours;
  private BigDecimal dollars;
  private String earnCode;

  // candidate mapping inputs
  private String distJobCode;
  private String homeJobCode;
  private String homeDepartment;
  private String distDepartmentDesc;

  // derived
  private String mappedProjectKey;
}