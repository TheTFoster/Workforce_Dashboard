// src/main/java/com/cec/EmployeeDB/Repo/ResetPasswordTokenRepository.java
package com.cec.EmployeeDB.Repo;

import com.cec.EmployeeDB.Entity.ResetPasswordToken;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResetPasswordTokenRepository extends JpaRepository<ResetPasswordToken, Long> {
}
