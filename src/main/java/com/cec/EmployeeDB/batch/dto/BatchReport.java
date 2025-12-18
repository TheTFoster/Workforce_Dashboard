package com.cec.EmployeeDB.batch.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BatchReport {

    // when this batch run was produced
    private Instant runAt;

    // true = preview endpoint, false = apply endpoint
    private boolean preview;

    // aggregate counts for this run
    private BatchTotals totals;

    // per-row changes (used for preview diffs)
    private List<BatchChangeRow> changes;

    // error messages (validation, DB errors, etc.)
    private List<String> errors;

    public static BatchReport empty(String label) {
        BatchReport r = new BatchReport();
        r.runAt = Instant.now();
        r.preview = true;
        r.totals = new BatchTotals();
        r.errors = List.of("smoke-test skipped apply: " + label);
        r.changes = List.of();
        return r;
    }
}
