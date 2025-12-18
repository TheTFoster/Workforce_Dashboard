package com.cec.EmployeeDB.controller;

import com.cec.EmployeeDB.Dto.CreateUserRequest;
import com.cec.EmployeeDB.Entity.Supervisor;
import com.cec.EmployeeDB.Repo.SupervisorRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private final SupervisorRepository supervisorRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminController(SupervisorRepository supervisorRepository, PasswordEncoder passwordEncoder) {
        this.supervisorRepository = supervisorRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/users")
    @Transactional
    public ResponseEntity<?> createUser(@RequestBody CreateUserRequest req, HttpServletRequest httpReq) {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(httpReq)) {
            return ResponseEntity.ok(Map.of("status", "smoke", "message", "skipped user create"));
        }
        // Check for existing employee code
        var exists = supervisorRepository.findByEmployeeCode(req.getEmployeeCode()).or(() -> supervisorRepository.findByEmployeeCodeIgnoreCase(req.getEmployeeCode()));
        if (exists.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Employee code already exists"));
        }

        Supervisor s = new Supervisor();
        // If caller did not supply an id, generate a new one by taking max+1.
        Integer providedId = req.getId();
        if (providedId == null || providedId == 0) {
            Integer max = supervisorRepository.findMaxEmployeeid();
            providedId = (max == null) ? 1 : (max + 1);
        }
        s.setEmployeeid(providedId);
        s.setEmployeename(req.getName());
        s.setEmployeeCode(req.getEmployeeCode());
        s.setPassword(passwordEncoder.encode(req.getPassword()));
        s.setMustChangePassword(req.getMustChangePassword());
        s.setPasswordChangedAt(req.getMustChangePassword() != null && req.getMustChangePassword() ? null : LocalDateTime.now());
        s.setIsAdmin(req.getIsAdmin() != null ? req.getIsAdmin() : Boolean.FALSE);

        supervisorRepository.save(s);
        return ResponseEntity.status(201).body(Map.of("message", "created"));
    }

    @GetMapping("/users/next-id")
    public ResponseEntity<?> nextUserId() {
        Integer max = supervisorRepository.findMaxEmployeeid();
        int next = (max == null) ? 1 : (max + 1);
        return ResponseEntity.ok(Map.of("nextId", next));
    }
}
