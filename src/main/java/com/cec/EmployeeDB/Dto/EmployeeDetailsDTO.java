// src/main/java/com/cec/EmployeeDB/Dto/EmployeeDetailsDTO.java
package com.cec.EmployeeDB.Dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

@Data @Builder @AllArgsConstructor @NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class EmployeeDetailsDTO {
  // core
  private Integer employeeid;
  private String displayName;         // already title-cased
  private String employeeCode;
  private String tixid;
  private String badgeNum;

  // ids / keys
  private String gwaTagNum;
  private String jobNumber;           // fallback
  private String lastJobCode;         // from view
  private String lastJobDesc;         // from view (also "site")

  // org / titles
  private String businessTitle;
  private String positionTitle;
  private String positionType;
  private String departmentDesc;
  private String subDepartmentDesc;
  private String supervisorPrimary;
  private String supervisorSecondary;

  // contact / address
  private String workEmail;
  private String personalEmail;
  private String primaryAddressLine1;
  private String primaryAddressLine2;
  private String timeZoneDescription;
  private String essLanguagePreference;

  // dates
  private LocalDate hireDate;
  private LocalDate lastWorkDate;         // view
  private LocalDate transferEffectiveDate;// view
  private LocalDate terminationLatest;    // computed max
  private LocalDate endDateResolved;      // computed
  private LocalDate transferToDate;

  // chips
  private String employeeStatus;
  private String timeInPosition;

  // pay
  private BigDecimal rate1;
  private String payType;

  // JSON blobs
  private String trainingLevelOne;
  private String trainingLevelTwo;
  private String trainingLevelThree;
  private String onboardingStatus;

  // misc
  private Boolean independentContractor;
  private Boolean travelers;
  private BigDecimal travelAllowance;

  // audit
  private java.time.LocalDateTime updatedAt;
  private String lastSource;
  private String lastBatchId;
}
