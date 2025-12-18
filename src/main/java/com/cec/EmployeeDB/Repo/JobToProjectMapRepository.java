package com.cec.EmployeeDB.Repo;

import com.cec.EmployeeDB.Entity.JobToProjectMap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobToProjectMapRepository extends JpaRepository<JobToProjectMap, Long> {
  List<JobToProjectMap> findByActiveTrueAndJobCode(String jobCode);
  List<JobToProjectMap> findByActiveTrueAndDepartmentCode(String departmentCode);
  List<JobToProjectMap> findByActiveTrueAndDepartmentDescIgnoreCase(String departmentDesc);
}
