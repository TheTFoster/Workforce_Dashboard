package com.cec.EmployeeDB.auth;

import com.cec.EmployeeDB.Entity.PwChangeToken;
import com.cec.EmployeeDB.Entity.Supervisor;
import com.cec.EmployeeDB.Repo.PwChangeTokenRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Service
public class PwChangeTokenService {

    private final PwChangeTokenRepository repo;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    public PwChangeTokenService(PwChangeTokenRepository repo, PasswordEncoder passwordEncoder) {
        this.repo = repo;
        this.passwordEncoder = passwordEncoder;
    }

    // Generate a short-lived token (raw returned to client, hashed stored)
    public String createForSupervisor(Supervisor sup, int minutesValid) {
        byte[] buf = new byte[32];
        random.nextBytes(buf);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(buf);

        PwChangeToken t = new PwChangeToken();
        t.setSupervisor(sup);
        t.setTokenHash(passwordEncoder.encode(raw));
        t.setExpiresAt(LocalDateTime.now().plus(minutesValid, ChronoUnit.MINUTES));
        repo.save(t);
        Long id = t.getId();
        if (id == null) return raw;
        return id + ":" + raw;
    }

    // Validate a raw token string by searching recent tokens (linear search acceptable for small table)
    // For simplicity, client will pass tokenId:rawToken as "<id>:<raw>" or just raw if you choose.
    public Supervisor validateToken(String tokenIdStr, String rawToken) {
        if (tokenIdStr == null || rawToken == null) return null;
        long id;
        try { id = Long.parseLong(tokenIdStr); } catch (NumberFormatException e) { return null; }
        var opt = repo.findByIdAndUsedAtIsNull(id);
        if (opt.isEmpty()) return null;
        PwChangeToken t = opt.get();
        if (t.getExpiresAt() == null || LocalDateTime.now().isAfter(t.getExpiresAt())) return null;
        if (!passwordEncoder.matches(rawToken, t.getTokenHash())) return null;
        return t.getSupervisor();
    }

    public void markUsed(Long id) {
        var opt = repo.findByIdAndUsedAtIsNull(id);
        if (opt.isEmpty()) return;
        PwChangeToken t = opt.get();
        t.setUsedAt(LocalDateTime.now());
        repo.save(t);
    }
}
