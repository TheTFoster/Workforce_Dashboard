package com.cec.EmployeeDB.batch.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BatchTotals {

    // total rows in the staging table (field_import)
    private int staged;

    // rows that matched an existing field.emp_code
    private int matched;

    // brand-new rows that will be inserted as new employees
    private int inserted;

    // existing employees that will be updated
    private int updated;

    // rows that result in no net change
    private int unchanged;

    // rows that failed validation / errored
    private int errors;

    // employment status transitions
    private int deactivated;
    private int terminated;
    private int reactivated;
}
