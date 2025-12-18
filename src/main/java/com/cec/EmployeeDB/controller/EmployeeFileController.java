package com.cec.EmployeeDB.controller;

import com.cec.EmployeeDB.Entity.EmployeeFile;
import com.cec.EmployeeDB.Service.EmployeeFileService;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.servlet.http.HttpServletRequest;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/employee")
public class EmployeeFileController {

    private final EmployeeFileService fileService;

    public EmployeeFileController(EmployeeFileService fileService) {
        this.fileService = fileService;
    }

    @PostMapping("/{employeeId}/files")
    public ResponseEntity<?> uploadFile(
            @PathVariable Integer employeeId,
            @RequestParam("file") MultipartFile file,
            HttpServletRequest req) {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return ResponseEntity.ok(Map.of("status", "smoke", "message", "skipped upload", "employeeId", employeeId));
        }
        try {
            EmployeeFile savedFile = fileService.uploadFile(employeeId, file);
            
            Map<String, Object> response = new HashMap<>();
            response.put("id", savedFile.getId());
            response.put("fileName", savedFile.getFileName());
            response.put("contentType", savedFile.getContentType());
            response.put("createdAt", savedFile.getCreatedAt());
            response.put("message", "File uploaded successfully");
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to upload file: " + e.getMessage()));
        }
    }

    @GetMapping("/{employeeId}/files")
    public ResponseEntity<?> listFiles(@PathVariable Integer employeeId) {
        try {
            List<EmployeeFile> files = fileService.findAllByEmployee(employeeId);
            
            List<Map<String, Object>> fileList = files.stream().map(f -> {
                Map<String, Object> fileInfo = new HashMap<>();
                fileInfo.put("id", f.getId());
                fileInfo.put("fileName", f.getFileName());
                fileInfo.put("contentType", f.getContentType());
                fileInfo.put("createdAt", f.getCreatedAt());
                fileInfo.put("size", f.getBytes() != null ? f.getBytes().length : 0);
                return fileInfo;
            }).collect(Collectors.toList());
            
            return ResponseEntity.ok(fileList);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to list files: " + e.getMessage()));
        }
    }

    @GetMapping("/{employeeId}/files/{fileId}")
    @SuppressWarnings("null")
    public ResponseEntity<?> downloadFile(
            @PathVariable Integer employeeId,
            @PathVariable Long fileId) {
        try {
            EmployeeFile file = fileService.findOne(employeeId, fileId)
                    .orElseThrow(() -> new IllegalArgumentException("File not found"));

            byte[] bytes = file.getBytes();
            if (bytes == null) {
                throw new IllegalArgumentException("File content not available");
            }
            Resource resource = new ByteArrayResource(bytes);

            String filename = file.getFileName() != null ? file.getFileName() : "download";
            String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .body(resource);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to download file: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{employeeId}/files/{fileId}")
    public ResponseEntity<?> deleteFile(
            @PathVariable Integer employeeId,
            @PathVariable Long fileId,
            HttpServletRequest req) {
        try {
            if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
                return ResponseEntity.ok(Map.of("status", "smoke", "message", "skipped delete file", "employeeId", employeeId, "fileId", fileId));
            }
            fileService.deleteFile(employeeId, fileId);
            return ResponseEntity.ok(Map.of("message", "File deleted successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to delete file: " + e.getMessage()));
        }
    }
}
