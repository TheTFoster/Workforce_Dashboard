package com.cec.EmployeeDB.Repo;

import com.cec.EmployeeDB.Entity.Pending;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PendingRepository extends JpaRepository<Pending, Integer> {

    Optional<Pending> findByEmployeeCode(String employeeCode);
    boolean existsByEmployeeCode(String employeeCode);

    List<Pending> findByEmployeeNameContainingIgnoreCase(String employeeName);

    List<Pending> findByWorkGroupIgnoreCase(String workGroup);
    Page<Pending> findBySupervisorIgnoreCase(String supervisor, Pageable pageable);

    List<Pending> findByRankedIgnoreCase(String ranked);

    void deleteByEmployeeCode(String employeeCode);

    @Query("""
      SELECT p FROM Pending p
      WHERE (:code IS NULL OR p.employeeCode = :code)
        AND (:wg IS NULL OR LOWER(p.workGroup) = LOWER(:wg))
        AND (:sup IS NULL OR LOWER(p.supervisor) = LOWER(:sup))
        AND (:fromDate IS NULL OR p.startDate >= :fromDate)
        AND (:toDate IS NULL OR p.endDate <= :toDate)
    """)
    List<Pending> search(@Param("code") String code,
                         @Param("wg") String workGroup,
                         @Param("sup") String supervisor,
                         @Param("fromDate") LocalDate fromDate,
                         @Param("toDate") LocalDate toDate);
}
