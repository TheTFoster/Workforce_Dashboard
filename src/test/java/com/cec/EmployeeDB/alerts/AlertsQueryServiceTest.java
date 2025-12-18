package com.cec.EmployeeDB.alerts;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlertsQueryServiceTest {

    @Mock
    NamedParameterJdbcTemplate jdbc;

    @InjectMocks
    AlertsQueryService service;

    @Test
    @SuppressWarnings({"unchecked", "null"})
    void find_returns_parsed_rows() {
        Map<String, Object> row = Map.of(
                "id", 1L,
                "employeeId", 10,
                "type", "NO_HOURS",
                "severity", "INFO",
                "occurredOn", "2024-01-01",
                "status", "OPEN",
                "details", Map.of("emp_code", "EE1"));

        when(jdbc.query(anyString(), any(Map.class), any(org.springframework.jdbc.core.RowMapper.class)))
                .thenReturn(List.of(row));

        var result = service.find("OPEN", 5);
        assertThat(result).singleElement().satisfies(map -> {
            assertThat(map.get("id")).isEqualTo(1L);
            assertThat(((Map<?, ?>) map.get("details"))).isNotNull();
        });
    }

    @Test
    @SuppressWarnings({"unchecked", "null"})
    void count_returns_zero_when_null() {
        when(jdbc.queryForObject(anyString(), any(Map.class), any(Class.class))).thenReturn(null);

        int result = service.count("OPEN");
        assertThat(result).isZero();
    }
}
