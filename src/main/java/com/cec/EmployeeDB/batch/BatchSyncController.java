// package com.cec.EmployeeDB.batch;

// import com.cec.EmployeeDB.batch.dto.BatchApplyRequest;
// import com.cec.EmployeeDB.batch.dto.BatchApplyRules;
// import com.cec.EmployeeDB.batch.dto.BatchScope;
// import com.cec.EmployeeDB.batch.dto.BatchReport;

// import org.springframework.http.ResponseEntity;
// import org.springframework.http.HttpStatus;
// import org.springframework.web.bind.annotation.*;
// import org.springframework.web.multipart.MultipartFile;

// import java.time.Instant;

// @RestController
// @RequestMapping("/api/v1/batch-sync")
// public class BatchSyncController {

//     private final BatchSyncService batchSyncService;

//     public BatchSyncController(BatchSyncService batchSyncService) {
//         this.batchSyncService = batchSyncService;
//     }

//     /** CSV/XLSX ingest -> field_import (or your staging) */
//     @PostMapping(path = "/upload", consumes = {"multipart/form-data"})
//     public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) {
//         batchSyncService.ingest(file);
//         return ResponseEntity.ok().body(java.util.Map.of("status", "ok", "uploadedAt", Instant.now().toString()));
//     }

//     /** Compute diffs against live table, no writes */
//     @PostMapping("/preview")
//     public ResponseEntity<BatchReport> preview() {
//         BatchReport report = batchSyncService.preview();
//         return ResponseEntity.ok(report);
//     }

//     /** Apply changes, honoring front-end rules/scope */
//     @PostMapping("/apply")
//     public ResponseEntity<BatchReport> apply(@RequestBody(required = false) BatchApplyRequest request) {
//         // default empty request so front-end can omit body
//         if (request == null) {
//             request = new BatchApplyRequest(new BatchApplyRules(false, false, false, false, false),
//                                             new BatchScope(true, false, false, true));
//         }
//         // Let the service enforce rule gating using the computed preview
//         BatchReport report = batchSyncService.apply(request);
//         return ResponseEntity.status(HttpStatus.OK).body(report);
//     }
// }
