package com.cec.EmployeeDB.auth;

import com.cec.EmployeeDB.Entity.Supervisor;
import com.cec.EmployeeDB.Repo.SupervisorRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class ChangePasswordController {

    private final SupervisorRepository supervisorRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.cec.EmployeeDB.auth.PwChangeTokenService pwChangeTokenService;

    public ChangePasswordController(SupervisorRepository supervisorRepository,
                                    PasswordEncoder passwordEncoder,
                                    com.cec.EmployeeDB.auth.PwChangeTokenService pwChangeTokenService) {
        this.supervisorRepository = supervisorRepository;
        this.passwordEncoder = passwordEncoder;
        this.pwChangeTokenService = pwChangeTokenService;
    }

    // Token-based, single-use change endpoint (keeps the existing authenticated flow intact)
    @PostMapping("/change-password-token")
    @Transactional
    public ResponseEntity<?> changePassword(@Valid @RequestBody ChangePasswordRequest req,
                                            HttpServletRequest request) {

        Supervisor sup = null;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null && !auth.getName().isBlank()) {
            String username = auth.getName();
            var opt = supervisorRepository.findByEmployeeCode(username)
                    .or(() -> supervisorRepository.findByEmployeeCodeIgnoreCase(username));
            if (opt.isPresent()) sup = opt.get();
        }

        // If not authenticated via session, accept a pw-change token header in the format "<id>:<raw>"
        if (sup == null) {
            String header = request.getHeader("X-PW-CHANGE-TOKEN");
            if (header != null && header.contains(":")) {
                String[] parts = header.split(":", 2);
                var validated = pwChangeTokenService.validateToken(parts[0], parts[1]);
                if (validated != null) sup = validated;
            }
        }

        if (sup == null) return ResponseEntity.status(401).body(Map.of("message", "Not authenticated"));

        // Verify current password similar to login flow
        String stored = sup.getPassword();
        String current = req.currentPassword() == null ? "" : req.currentPassword();

        boolean currentMatches = false;
        if (stored != null && !stored.isBlank()) {
            if (passwordEncoder.matches(current, stored)) currentMatches = true;
            else if (!stored.startsWith("$2") && current.equals(stored)) currentMatches = true; // legacy raw
        }

        if (!currentMatches) {
            return ResponseEntity.badRequest().body(Map.of("message", "Current password invalid"));
        }

        String newPw = req.newPassword();
        if (!validPassword(newPw)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Password must be 12+ chars and include 3 of: upper, lower, digit, symbol"));
        }

        // Prevent reuse
        if (stored != null && (passwordEncoder.matches(newPw, stored) || (!stored.startsWith("$2") && newPw.equals(stored)))) {
            return ResponseEntity.badRequest().body(Map.of("message", "New password must differ from current password"));
        }

        sup.setPassword(passwordEncoder.encode(newPw));
        sup.setMustChangePassword(false);
        sup.setPasswordChangedAt(LocalDateTime.now());
        supervisorRepository.save(sup);

        // If this change was done via a pw-change token, mark it used
        String header = request.getHeader("X-PW-CHANGE-TOKEN");
        if (header != null && header.contains(":")) {
            String idStr = header.split(":", 2)[0];
            try { pwChangeTokenService.markUsed(Long.parseLong(idStr)); } catch (Exception ignored) {}
        }

        // Invalidate current session so client must re-login
        var sess = request.getSession(false);
        if (sess != null) {
            try { sess.invalidate(); } catch (IllegalStateException ignored) {}
        }

        System.out.printf("[AUDIT] change-password: supervisorId=%s ip=%s%n", sup.getEmployeeid(), clientIp(request));

        return ResponseEntity.noContent().build();
    }

    private static boolean validPassword(String p) {
        if (p == null || p.length() < 12) return false;
        int classes = 0;
        if (p.chars().anyMatch(Character::isUpperCase)) classes++;
        if (p.chars().anyMatch(Character::isLowerCase)) classes++;
        if (p.chars().anyMatch(Character::isDigit)) classes++;
        if (p.chars().anyMatch(ch -> "!@#$%^&*()-_=+[]{}|;:'\",.<>/?`~\\".indexOf(ch) >= 0)) classes++;
        return classes >= 3;
    }

    private static String clientIp(HttpServletRequest req) {
        String h = req.getHeader("X-Forwarded-For");
        if (h != null && !h.isBlank()) return h.split(",")[0].trim();
        return req.getRemoteAddr();
    }
}
