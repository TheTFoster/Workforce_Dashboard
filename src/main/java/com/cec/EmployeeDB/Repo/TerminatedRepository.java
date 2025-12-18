package com.cec.EmployeeDB.Repo;

import com.cec.EmployeeDB.Entity.Terminated;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TerminatedRepository extends JpaRepository<Terminated, Integer> {
    // add finders if you need them later
}
