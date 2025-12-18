package com.cec.EmployeeDB.controller;
import com.cec.EmployeeDB.dao.EmployeeStatusDao;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/employee")
public class EmployeeStatusController {

    private final EmployeeStatusDao dao;

    public EmployeeStatusController(EmployeeStatusDao dao) {
        this.dao = dao;
    }

    @GetMapping("/active")
    public List<Map<String,Object>> active() {
        return dao.getActive();
    }

    @GetMapping("/inactive")
    public List<Map<String,Object>> inactive() {
        return dao.getInactive();
    }

    @GetMapping("/terminated")
    public List<Map<String,Object>> terminated() {
        return dao.getTerminated();
    }

    // Optional generic route: /api/v1/employee/status?value=active
    @GetMapping("/status")
    public List<Map<String,Object>> byStatus(@RequestParam("value") String value) {
        return dao.getByStatus(value);
    }

    // Optional: /api/v1/employee/status-counts
    @GetMapping("/status-counts")
    public List<Map<String,Object>> counts() {
        return dao.getCounts();
    }
}