// src/main/java/com/cec/EmployeeDB/Repo/EmployeeFileRepository.java
package com.cec.EmployeeDB.Repo;

import com.cec.EmployeeDB.Entity.EmployeeFile;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeFileRepository extends JpaRepository<EmployeeFile, Long> {

    @Query("""
            select f
            from EmployeeFile f
            where f.id = :fileId
              and f.employee.id = :employeeId
            """)
    Optional<EmployeeFile> findByIdAndEmployeeEmployeeid(
            @Param("fileId") Long fileId,
            @Param("employeeId") Integer employeeId);

    @Query("""
            select f
            from EmployeeFile f
            where f.employee.id = :employeeId
            order by f.createdAt desc
            """)
    List<EmployeeFile> findAllByEmployeeEmployeeidOrderByCreatedAtDesc(
            @Param("employeeId") Integer employeeId);
}
