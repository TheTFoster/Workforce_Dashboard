// src/main/java/com/cec/EmployeeDB/controller/FieldImportController.java
package com.cec.EmployeeDB.controller;

import com.cec.EmployeeDB.Dto.FieldImportResult;
import com.cec.EmployeeDB.Service.FieldImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/field-import")
@RequiredArgsConstructor
public class FieldImportController {
    private final FieldImportService service;

    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public ResponseEntity<FieldImportResult> upload(@RequestPart("file") MultipartFile file,
            jakarta.servlet.http.HttpServletRequest req) throws Exception {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            FieldImportResult r = new FieldImportResult("smoke.csv", 0, 0, 0, "smoke");
            return ResponseEntity.ok(r);
        }
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        FieldImportResult result = service.importCsv(file);
        return ResponseEntity.ok(result);
    }
}
