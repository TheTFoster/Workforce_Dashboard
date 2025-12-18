package com.cec.EmployeeDB.auth;

import com.cec.EmployeeDB.Repo.SupervisorRepository;
import com.cec.EmployeeDB.Entity.Supervisor;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;

@RestController("accountController")
@RequestMapping("/api/v1/auth")
public class AccountController {
    private final SupervisorRepository supervisorRepository;
    private final PasswordEncoder passwordEncoder;

    public AccountController(SupervisorRepository supervisorRepository,
            PasswordEncoder passwordEncoder) {
        this.supervisorRepository = supervisorRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/change-password")
    @Transactional
    public ResponseEntity<?> changePassword(
            @Valid @RequestBody ChangePasswordRequest req,
            Authentication auth,
            HttpServletRequest request,
            HttpServletResponse response) {

        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            return ResponseEntity.status(401).body(Map.of("message", "Not authenticated"));
        }
        final String cecId = auth.getName();
        Supervisor u = supervisorRepository.findByEmployeeCode(cecId).orElse(null);
        if (u == null)
            return ResponseEntity.status(404).body(Map.of("message", "Account not found"));

        String stored = u.getPassword();
        if (!(stored != null
                && (passwordEncoder.matches(req.currentPassword(), stored) || req.currentPassword().equals(stored)))) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid current password"));
        }
        if (passwordEncoder.matches(req.newPassword(), stored) || req.newPassword().equals(stored)) {
            return ResponseEntity.badRequest().body(Map.of("message", "New password must be different"));
        }

        u.setPassword(passwordEncoder.encode(req.newPassword()));
        supervisorRepository.save(u);
        new SecurityContextLogoutHandler().logout(request, response, auth);
        return ResponseEntity.noContent().build();
    }
}
