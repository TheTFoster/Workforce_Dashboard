// src/main/java/com/cec/EmployeeDB/Repo/SupervisorRepository.java
package com.cec.EmployeeDB.Repo;

import com.cec.EmployeeDB.Entity.Supervisor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SupervisorRepository extends JpaRepository<Supervisor, Integer> {

    Optional<Supervisor> findByEmployeeCode(String employeeCode);

    Optional<Supervisor> findByEmployeeCodeIgnoreCase(String employeeCode);
    
    // Return the current maximum employee id (or null when table empty)
    @org.springframework.data.jpa.repository.Query("select max(s.employeeid) from Supervisor s")
    Integer findMaxEmployeeid();
}
