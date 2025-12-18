package com.cec.EmployeeDB.Repo;

import com.cec.EmployeeDB.Entity.PwChangeToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PwChangeTokenRepository extends JpaRepository<PwChangeToken, Long> {
    Optional<PwChangeToken> findByIdAndUsedAtIsNull(Long id);
}
