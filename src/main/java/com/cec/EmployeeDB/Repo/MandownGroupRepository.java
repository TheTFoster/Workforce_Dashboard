package com.cec.EmployeeDB.Repo;

import com.cec.EmployeeDB.Entity.MandownGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MandownGroupRepository extends JpaRepository<MandownGroup, Long> {
    List<MandownGroup> findAllByOrderByDisplayOrderAsc();
}
