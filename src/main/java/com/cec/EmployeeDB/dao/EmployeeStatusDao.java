package com.cec.EmployeeDB.dao;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class EmployeeStatusDao {

    private final JdbcTemplate jdbc;

    public EmployeeStatusDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String,Object>> getActive() {
        return jdbc.queryForList(
            "SELECT * FROM v_employees_active ORDER BY employeename"
        );
    }

    public List<Map<String,Object>> getInactive() {
        return jdbc.queryForList(
            "SELECT * FROM v_employees_inactive ORDER BY employeename"
        );
    }

    public List<Map<String,Object>> getTerminated() {
        return jdbc.queryForList(
            "SELECT * FROM v_employees_terminated ORDER BY employeename"
        );
    }

    // Flexible one: /status?value=active|inactive|terminated
    public List<Map<String,Object>> getByStatus(String value) {
        return jdbc.queryForList(
            "SELECT * FROM v_employee_status WHERE status_norm = ? ORDER BY employeename",
            value.toLowerCase()
        );
    }

    // Optional: quick counts for chips/badges
    public List<Map<String,Object>> getCounts() {
        return jdbc.queryForList(
            "SELECT status_norm, COUNT(*) AS count FROM v_employee_status GROUP BY status_norm"
        );
    }
}