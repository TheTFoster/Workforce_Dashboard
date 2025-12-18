// src/main/java/com/cec/EmployeeDB/Repo/EmployeeAnalyticsRepo.java
package com.cec.EmployeeDB.Repo;

import com.cec.EmployeeDB.Entity.Employee; // <-- use your actual entity
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

@Repository
public interface EmployeeAnalyticsRepo extends JpaRepository<Employee, Long> {
    interface LastTcRow {
        String getEmployeeCode();

        LocalDate getLastWorkDate();

        String getLastJobCode();

        String getLastJobDesc();
    }

    interface TransferRow {
        String getEmployeeCode();

        LocalDate getTransferEffectiveDate();
    }

    @Query(value = """
            SELECT employee_code AS employeeCode,
                   last_work_date AS lastWorkDate,
                   last_job_code  AS lastJobCode,
                   last_job_desc  AS lastJobDesc
            FROM vw_employee_last_timecard
            WHERE employee_code = :ee
            LIMIT 1
            """, nativeQuery = true)
    LastTcRow findLastTimecard(@Param("ee") String ee);

    @Query(value = """
            SELECT employee_code AS employeeCode,
                   transfer_effective_date AS transferEffectiveDate
            FROM vw_employee_latest_transfer
            WHERE employee_code = :ee
            LIMIT 1
            """, nativeQuery = true)
    TransferRow findLatestTransfer(@Param("ee") String ee);
}
