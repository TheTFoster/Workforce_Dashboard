// src/main/java/com/cec/EmployeeDB/controller/AuthController.java
package com.cec.EmployeeDB.controller;

import com.cec.EmployeeDB.Dto.LoginDTO;
import com.cec.EmployeeDB.Service.EmployeeService;
import com.cec.EmployeeDB.Repo.SupervisorRepository;
import com.cec.EmployeeDB.payloadresponse.LoginMessage;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import com.cec.EmployeeDB.Security.RateLimiterService;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    private final EmployeeService employeeService;
    private final com.cec.EmployeeDB.auth.PwChangeTokenService pwChangeTokenService;
    private final SupervisorRepository supervisorRepository;
    private final com.cec.EmployeeDB.Repo.EmployeeRepo employeeRepo;
    private final RateLimiterService rateLimiterService;

    public AuthController(EmployeeService employeeService,
                          com.cec.EmployeeDB.auth.PwChangeTokenService pwChangeTokenService,
                          SupervisorRepository supervisorRepository,
                          com.cec.EmployeeDB.Repo.EmployeeRepo employeeRepo,
                          RateLimiterService rateLimiterService) {
        this.employeeService = employeeService;
        this.pwChangeTokenService = pwChangeTokenService;
        this.supervisorRepository = supervisorRepository;
        this.employeeRepo = employeeRepo;
        this.rateLimiterService = rateLimiterService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginMessage> login(
            @Valid @RequestBody LoginDTO loginDTO,
            HttpServletRequest req,
            HttpServletResponse res) {

        String clientIp = clientIp(req);
        String rawCode = loginDTO.getEmployeeCode() == null ? "" : loginDTO.getEmployeeCode().trim();
        if (!rateLimiterService.allowLoginByIp(clientIp) || !rateLimiterService.allowLoginById(rawCode)) {
            log.warn("Login rate-limited for code={} ip={}", rawCode, clientIp);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new LoginMessage("Too many login attempts. Please try again later.", false));
        }

        try {
            LoginMessage resp = employeeService.loginEmployee(loginDTO);
            boolean ok = (resp != null) && resp.getStatus();

            if (ok) {
                // Build roles dynamically from Supervisor record (grant ROLE_ADMIN when is_admin flag set)
                var optSup = supervisorRepository.findByEmployeeCode(loginDTO.getEmployeeCode().trim())
                    .or(() -> supervisorRepository.findByEmployeeCodeIgnoreCase(loginDTO.getEmployeeCode().trim()));
                List<GrantedAuthority> roles;
                if (optSup.isPresent() && Boolean.TRUE.equals(optSup.get().getIsAdmin())) {
                    roles = List.of(new SimpleGrantedAuthority("ROLE_USER"), new SimpleGrantedAuthority("ROLE_ADMIN"));
                } else {
                    roles = List.of(new SimpleGrantedAuthority("ROLE_USER"));
                }

                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    loginDTO.getEmployeeCode().trim(), null, roles);
                SecurityContext context = SecurityContextHolder.createEmptyContext();
                context.setAuthentication(auth);
                SecurityContextHolder.setContext(context);

                req.getSession(true);
                req.changeSessionId();
                new HttpSessionSecurityContextRepository().saveContext(context, req, res);

                // If the login response indicates a forced password change, create a short-lived pw-change token
                if (resp != null && resp.getMustChangePassword() != null && resp.getMustChangePassword()) {
                    String code = loginDTO.getEmployeeCode().trim();
                    var opt = supervisorRepository.findByEmployeeCode(code).or(() -> supervisorRepository.findByEmployeeCodeIgnoreCase(code));
                    if (opt.isPresent()) {
                        var sup = opt.get();
                        String token = pwChangeTokenService.createForSupervisor(sup, 15);
                        resp.setPwChangeToken(token);
                    }
                }

                return ResponseEntity.ok(resp);
            }

            String msg = (resp != null && resp.getMessage() != null)
                    ? resp.getMessage()
                    : "Invalid credentials";
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new LoginMessage(msg, false));

        } catch (Exception e) {
            log.error("Login error for {}: {}", loginDTO.getEmployeeCode(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new LoginMessage("Login failed", false));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication auth) {
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not authenticated"));
        }

        List<String> roles = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        // Get first name from Employee table via Supervisor
        String firstName = null;
        var optSup = supervisorRepository.findByEmployeeCode(auth.getName())
            .or(() -> supervisorRepository.findByEmployeeCodeIgnoreCase(auth.getName()));
        if (optSup.isPresent()) {
            Integer employeeId = optSup.get().getEmployeeid();
            if (employeeId != null) {
                var optEmp = employeeRepo.findById(employeeId);
                if (optEmp.isPresent()) {
                    var emp = optEmp.get();
                    // Use preferred first name if available, otherwise use first name
                    firstName = emp.getPreferredFirstName() != null && !emp.getPreferredFirstName().isBlank()
                        ? emp.getPreferredFirstName()
                        : emp.getFirstName();
                }
            }
        }

        var response = new java.util.HashMap<String, Object>();
        response.put("username", auth.getName());
        response.put("roles", roles);
        if (firstName != null && !firstName.isBlank()) {
            response.put("firstName", firstName);
        }

        return ResponseEntity.ok(response);
    }

    //Revisit implementaion
    // private static boolean isStrongPassword(String password) {
    //     if (password == null || password.length() < 12) return false;
    //     int classes = 0;
    //     if (password.chars().anyMatch(Character::isUpperCase)) classes++;
    //     if (password.chars().anyMatch(Character::isLowerCase)) classes++;
    //     if (password.chars().anyMatch(Character::isDigit)) classes++;
    //     if (password.chars().anyMatch(ch -> "!@#$%^&*()-_=+[]{};:'\",.<>/?\\|`~".indexOf(ch) >= 0)) classes++;
    //     return classes >= 3;
    // }

    private static String clientIp(HttpServletRequest req) {
        String hdr = req.getHeader("X-Forwarded-For");
        if (hdr != null && !hdr.isBlank()) {
            return hdr.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }
}
