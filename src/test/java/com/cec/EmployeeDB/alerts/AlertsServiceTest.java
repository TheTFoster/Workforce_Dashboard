package com.cec.EmployeeDB.alerts;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlertsServiceTest {

    @Mock
    NamedParameterJdbcTemplate jdbc;

    @InjectMocks
    AlertsService service;

    @Test
    void list_passes_filters_and_returns_rows() {
        when(jdbc.query(anyString(), any(MapSqlParameterSource.class), any(RowMapper.class)))
                .thenReturn(Collections.emptyList());

        List<AlertEventDTO> rows = service.list("OPEN", List.of("TYPE1"), 123, "EE1",
                LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 31), 20);

        assertThat(rows).isEmpty();

        ArgumentCaptor<MapSqlParameterSource> params = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(jdbc).query(anyString(), params.capture(), any(RowMapper.class));
        assertThat(params.getValue().getValue("status")).isEqualTo("OPEN");
        assertThat(params.getValue().getValue("types")).isEqualTo(List.of("TYPE1"));
        assertThat(params.getValue().getValue("employeeId")).isEqualTo(123);
        assertThat(params.getValue().getValue("empCode")).isEqualTo("EE1");
    }
}
