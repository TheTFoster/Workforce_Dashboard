package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.batch.dto.BatchReport;

public interface FieldBatchSyncService {

    /**
     * Preview the changes that would be applied from field_import to field.
     */
    BatchReport preview();

    /**
     * Apply the changes from field_import to field.
     */
    BatchReport apply();
}
