package com.cec.EmployeeDB.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/meta")
public class MetaController {

    private final JdbcTemplate jdbc;

    public MetaController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // Prefer: add an updated_at column to field and use that.
    @GetMapping("/last-updated")
    public Map<String, Object> lastUpdated() {
        String sql = """
            SELECT DATE_FORMAT(
              COALESCE(
                MAX(updated_at),
                MAX(start_date),
                MAX(end_date),
                NOW()
              ),
              '%Y-%m-%d %H:%i:%s'
            ) AS lastUpdated
            FROM field
        """;
        String ts = jdbc.queryForObject(sql, String.class);
        return Map.of("lastUpdated", ts);
    }
}
