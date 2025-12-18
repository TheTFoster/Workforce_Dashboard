package com.cec.EmployeeDB.Dto;

import lombok.*;
import java.time.OffsetDateTime;
import java.util.*;

@Getter @Setter
@Builder @NoArgsConstructor @AllArgsConstructor
public class BatchReport {
  private String startedAt;
  private String finishedAt;
  private boolean dryRun;
  @Builder.Default private Totals totals = new Totals();
  @Builder.Default private List<ChangeRow> changes = new ArrayList<>();
  @Builder.Default private List<ErrorRow> errors = new ArrayList<>();

  @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
  public static class Totals {
    @Builder.Default private int inserted = 0;
    @Builder.Default private int updated = 0;
    @Builder.Default private int unchanged = 0;
    @Builder.Default private int deactivated = 0;
    @Builder.Default private int terminated = 0;
    @Builder.Default private int errors = 0;
  }

  @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
  public static class ChangeRow {
    private Long empId;               // field.emp_id
    private String employeeCode;      // field.emp_code or staging employee_code
    private String nameBefore;
    private String nameAfter;
    private String statusBefore;
    private String statusAfter;
    private String wageBefore;        // annual_salary or rate_1, stringified
    private String wageAfter;
    private String reason;            // e.g., "UPDATE by emp_code"
    private Map<String, Object> changes; // field -> { before, after }
  }

  @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
  public static class ErrorRow {
    private String rowId;
    private String code;
    private String message;
  }

  public static BatchReport start(boolean dryRun) {
    return BatchReport.builder()
      .dryRun(dryRun)
      .startedAt(OffsetDateTime.now().toString())
      .totals(new Totals())
      .build();
  }

  public void finish() { this.finishedAt = OffsetDateTime.now().toString(); }
}