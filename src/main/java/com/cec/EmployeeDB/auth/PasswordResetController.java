package com.cec.EmployeeDB.auth;

import com.cec.EmployeeDB.Config.AppProperties;
import com.cec.EmployeeDB.Entity.ResetPasswordToken;
import com.cec.EmployeeDB.Entity.Supervisor;
import com.cec.EmployeeDB.Repo.ResetPasswordTokenRepository;
import com.cec.EmployeeDB.Repo.SupervisorRepository;
import com.cec.EmployeeDB.Security.RateLimiterService;
import com.cec.EmployeeDB.Security.CaptchaService;
import com.cec.EmployeeDB.Service.EmailService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/auth")
public class PasswordResetController {

    private final SupervisorRepository supervisorRepository;
    private final ResetPasswordTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final RateLimiterService rateLimiter;
    private final CaptchaService captchaService;
    private final EmailService emailService;
    private final SecureRandom random = new SecureRandom();
    private final AppProperties props;

    public PasswordResetController(SupervisorRepository supervisorRepository,
            ResetPasswordTokenRepository tokenRepository,
            PasswordEncoder passwordEncoder,
            RateLimiterService rateLimiter,
            CaptchaService captchaService,
            EmailService emailService,
            AppProperties props) {
        this.supervisorRepository = supervisorRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.rateLimiter = rateLimiter;
        this.captchaService = captchaService;
        this.emailService = emailService;
        this.props = props;
    }

    public static class ForgotPasswordRequest {
        @NotBlank
        private String employeeCode;
        private String captchaToken;

        public String getEmployeeCode() {
            return employeeCode;
        }

        public void setEmployeeCode(String employeeCode) {
            this.employeeCode = employeeCode;
        }

        public String getCaptchaToken() {
            return captchaToken;
        }

        public void setCaptchaToken(String captchaToken) {
            this.captchaToken = captchaToken;
        }
    }

    public static class ResetPasswordRequest {
        @NotBlank
        private String tokenId;
        @NotBlank
        private String token;
        @NotBlank
        private String newPassword;

        public String getTokenId() {
            return tokenId;
        }

        public void setTokenId(String tokenId) {
            this.tokenId = tokenId;
        }

        public String getToken() {
            return token;
        }

        public void setToken(String token) {
            this.token = token;
        }

        public String getNewPassword() {
            return newPassword;
        }

        public void setNewPassword(String newPassword) {
            this.newPassword = newPassword;
        }
    }

    @PostMapping("/forgot-password")
    @Transactional
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req,
            HttpServletRequest http) {

        String ip = clientIp(http);
        String cec = safe(req.getEmployeeCode());

        if (!rateLimiter.allowForgotByIp(ip) || !rateLimiter.allowForgotById(cec)) {
            return ResponseEntity.status(429).body(Map.of("message", "Too many requests"));
        }

        if (!captchaService.verify(req.getCaptchaToken(), ip)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Captcha failed"));
        }

        Optional<Supervisor> supOpt = supervisorRepository.findByEmployeeCode(cec);
        if (supOpt.isPresent()) {
            Supervisor sup = supOpt.get();

            byte[] buf = new byte[32];
            random.nextBytes(buf);
            String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(buf);

            ResetPasswordToken prt = new ResetPasswordToken();
            prt.setSupervisor(sup);
            prt.setTokenHash(passwordEncoder.encode(rawToken));
            prt.setExpiresAt(LocalDateTime.now().plusHours(props.getReset().getTokenHours()));
            tokenRepository.save(prt);

            String url = props.getReset().getBaseUrl() + "?tokenId=" + prt.getId() + "&token=" + rawToken;

            String subject = "Employee DB password reset link";
            String body = """
                    A password reset was requested for CEC ID: %s

                    Reset link (valid for %d hour(s)):
                    %s

                    If you did not request this, you can ignore this email.
                    """.formatted(cec, props.getReset().getTokenHours(), url);

            emailService.send(props.getMail().getResetRecipient(), subject, body);

            System.out.printf("[AUDIT] forgot-password: cec=%s ip=%s tokenId=%d%n", cec, ip, prt.getId());
        }

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reset-password")
    @Transactional
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest req,
            HttpServletRequest http) {

        String ip = clientIp(http);
        if (!rateLimiter.allowResetByIp(ip)) {
            return ResponseEntity.status(429).body(Map.of("message", "Too many requests"));
        }

        if (!validPassword(req.getNewPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message",
                    "Password must be 12+ chars and include 3 of: upper, lower, digit, symbol"));
        }

        long id;
        try {
            id = Long.parseLong(req.getTokenId());
        } catch (NumberFormatException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid token"));
        }

        ResetPasswordToken token = tokenRepository.findById(id).orElse(null);
        if (token == null)
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid token"));
        if (token.getUsedAt() != null || LocalDateTime.now().isAfter(token.getExpiresAt())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Token expired"));
        }
        if (!passwordEncoder.matches(req.getToken(), token.getTokenHash())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid token"));
        }

        Supervisor sup = token.getSupervisor();
        if (sup == null)
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid token"));

        sup.setPassword(passwordEncoder.encode(req.getNewPassword()));
        sup.setMustChangePassword(false);
        sup.setPasswordChangedAt(LocalDateTime.now());
        supervisorRepository.save(sup);
        token.setUsedAt(LocalDateTime.now());

        System.out.printf("[AUDIT] reset-password: supervisorId=%s ip=%s tokenId=%d%n",
                sup.getEmployeeid(), ip, token.getId());

        return ResponseEntity.noContent().build();
    }

    private static String clientIp(HttpServletRequest req) {
        String h = req.getHeader("X-Forwarded-For");
        if (h != null && !h.isBlank())
            return h.split(",")[0].trim();
        return req.getRemoteAddr();
    }

    private static String safe(String s) {
        return s == null ? "" : s.trim();
    }

    private static boolean validPassword(String p) {
        if (p == null || p.length() < 12)
            return false;
        int classes = 0;
        if (p.chars().anyMatch(Character::isUpperCase))
            classes++;
        if (p.chars().anyMatch(Character::isLowerCase))
            classes++;
        if (p.chars().anyMatch(Character::isDigit))
            classes++;
        if (p.chars().anyMatch(ch -> "!@#$%^&*()-_=+[]{}|;:'\",.<>/?`~\\".indexOf(ch) >= 0))
            classes++;
        return classes >= 3;
    }
}
