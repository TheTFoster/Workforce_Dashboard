// src/main/java/com/cec/EmployeeDB/Repo/CorrectiveActionRepository.java
package com.cec.EmployeeDB.Repo;

import com.cec.EmployeeDB.Entity.CorrectiveAction;
import com.cec.EmployeeDB.Entity.CorrectiveAction.Category;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CorrectiveActionRepository extends JpaRepository<CorrectiveAction, Long> {

    // Keep the service-friendly name but drive it with JPQL so we don’t rely on
    // Spring’s property-path parsing. We target the Employee PK as `id`.
    @Query("""
            select c
            from CorrectiveAction c
            where c.employee.id = :employeeId
            order by c.actionDate desc
            """)
    List<CorrectiveAction> findByEmployeeEmployeeidOrderByActionDateDesc(
            @Param("employeeId") Integer employeeId);

    @Query("""
            select c
            from CorrectiveAction c
            where c.employee.id = :employeeId
              and c.category = :category
            order by c.actionDate desc
            """)
    List<CorrectiveAction> findByEmployeeEmployeeidAndCategoryOrderByActionDateDesc(
            @Param("employeeId") Integer employeeId,
            @Param("category") Category category);
}
