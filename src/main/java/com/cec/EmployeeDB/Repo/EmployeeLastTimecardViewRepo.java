package com.cec.EmployeeDB.Repo;

import com.cec.EmployeeDB.Entity.EmployeeLastTimecardView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EmployeeLastTimecardViewRepo extends JpaRepository<EmployeeLastTimecardView, String> {
    // Spring Data will generate: SELECT ... FROM vw_employee_last_timecard WHERE employee_code = ?
    EmployeeLastTimecardProjection findByEmployeeCode(String employeeCode);
}
