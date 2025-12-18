package com.cec.EmployeeDB.batch.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
public class BatchChangeRow {

    private String empCode;
    private String displayName;
        private String reason;  // e.g., "NEW", "UPDATE", "DEACTIVATE", etc.
    private List<FieldDiff> fieldDiffs;

    @Data
    @AllArgsConstructor
    public static class FieldDiff {
        private String field;
        private String oldValue;
        private String newValue;
    }
}
