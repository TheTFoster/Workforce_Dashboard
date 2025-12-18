package com.cec.EmployeeDB.controller;

import com.cec.EmployeeDB.batch.dto.BatchReport;
import com.cec.EmployeeDB.Service.FieldBatchSyncService;
import com.cec.EmployeeDB.Service.FieldImportService;
import com.cec.EmployeeDB.Dto.FieldImportResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/batch-sync")
@RequiredArgsConstructor
public class BatchSyncController {

    private final FieldImportService importService;
    private final FieldBatchSyncService fieldBatchSyncService;

    // Preview endpoint - front-end calls this with POST + XSRF
    @PostMapping("/preview")
    public ResponseEntity<BatchReport> preview() {
        return ResponseEntity.ok(fieldBatchSyncService.preview());
    }

    @PostMapping("/apply")
    public ResponseEntity<BatchReport> apply(jakarta.servlet.http.HttpServletRequest req) {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return ResponseEntity.ok(BatchReport.empty("smoke"));
        }
        return ResponseEntity.ok(fieldBatchSyncService.apply());
    }

    // Upload CSV/XLSX -> stage into field_import
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FieldImportResult> upload(@RequestPart("file") MultipartFile file,
                                                    jakarta.servlet.http.HttpServletRequest req) throws Exception {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            FieldImportResult r = new FieldImportResult("smoke.csv", 0, 0, 0, "smoke");
            return ResponseEntity.ok(r);
        }
        FieldImportResult result = importService.importCsv(file);
        return ResponseEntity.ok(result);
    }
}
