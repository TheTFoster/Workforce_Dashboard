package com.cec.EmployeeDB.Repo;

import com.cec.EmployeeDB.Entity.Transfer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface TransferRepository extends JpaRepository<Transfer, Long> {
    // Used by the main Transfers list - fetch only non-archived transfers
    List<Transfer> findByIsArchivedFalseOrderByEffectiveDateDesc();
    
    // Fetch archived transfers for the Archived Entries tab
    List<Transfer> findByIsArchivedTrueOrderByEffectiveDateDesc();
    
    // Fetch all transfers including archived (for admin purposes)
    List<Transfer> findAllByOrderByEffectiveDateDesc();

    // For employee form: fetch by employee code
    List<Transfer> findByEmpCodeOrderByEffectiveDateDesc(String empCode);

    // Optional: for details by XID if you still want it
    List<Transfer> findByXidOrderByEffectiveDateDesc(String xid);

    // Optional: if you want to key off normalized emp_code
    List<Transfer> findByEmpCodeNormKeyOrderByEffectiveDateDesc(String empCodeNormKey);

    // For Gantt view: fetch upcoming/active transfers (future or recent past)
    @Query("SELECT t FROM Transfer t WHERE t.effectiveDate >= :startDate ORDER BY t.effectiveDate ASC")
    List<Transfer> findUpcomingTransfers(@Param("startDate") LocalDate startDate);

    // For Gantt view: fetch transfers in a date range
    @Query("SELECT t FROM Transfer t WHERE t.effectiveDate BETWEEN :startDate AND :endDate ORDER BY t.effectiveDate ASC")
    List<Transfer> findTransfersInRange(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
