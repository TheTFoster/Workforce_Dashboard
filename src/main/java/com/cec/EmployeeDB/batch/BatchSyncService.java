package com.cec.EmployeeDB.batch;

import com.cec.EmployeeDB.batch.dto.BatchReport;
import com.cec.EmployeeDB.batch.dto.BatchApplyRequest;
import org.springframework.web.multipart.MultipartFile;

public interface BatchSyncService {
    void ingest(MultipartFile file);
    BatchReport preview();
    BatchReport apply(BatchApplyRequest request);
}
