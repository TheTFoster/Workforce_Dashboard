package com.cec.EmployeeDB.Service.impl;

import com.cec.EmployeeDB.Dto.LatestWorkedDTO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TimecardQueryServiceImplTest {

    @Mock
    JdbcTemplate jdbc;

    @InjectMocks
    TimecardQueryServiceImpl service;

    @Test
    void latestForEmp_returns_row_from_query() {
        LatestWorkedDTO dto = LatestWorkedDTO.builder()
                .eeCode("EE1")
                .project("HJ")
                .lastWorkedAt(java.time.LocalDateTime.parse("2024-01-01T00:00:00"))
                .build();

        TimecardQueryServiceImpl spy = org.mockito.Mockito.spy(service);
        org.mockito.Mockito.doReturn(Map.of("EE1", dto))
                .when(spy).latestByEmpCodes(anyList(), anyInt());

        LatestWorkedDTO result = spy.latestForEmp("EE1", 30);

        assertThat(result.getEeCode()).isEqualTo("EE1");
        assertThat(result.getProject()).isEqualTo("HJ");
    }

    @Test
    void latestByEmpCodes_returns_empty_when_none() {
        Map<String, LatestWorkedDTO> result = service.latestByEmpCodes(List.of(), 30);
        assertThat(result).isEmpty();
    }

    @Test
    void fetchSpans_limits_and_maps_rows() {
        when(jdbc.query(anyString(), any(org.springframework.jdbc.core.ResultSetExtractor.class), any(Object[].class))).thenAnswer(inv -> {
            var extractor = inv.getArgument(1, org.springframework.jdbc.core.ResultSetExtractor.class);
            java.sql.ResultSet rs = org.mockito.Mockito.mock(java.sql.ResultSet.class);
            when(rs.next()).thenReturn(true, false);
            when(rs.getString("ee_code")).thenReturn("EE1");
            when(rs.getDate("start_date")).thenReturn(java.sql.Date.valueOf(LocalDate.of(2024, 1, 1)));
            when(rs.getDate("end_date_excl")).thenReturn(java.sql.Date.valueOf(LocalDate.of(2024, 1, 8)));
            when(rs.getString("dist_job_code")).thenReturn("JOB");
            when(rs.getString("dist_job_desc")).thenReturn("Desc");
            when(rs.getString("dist_activity_code")).thenReturn("ACT");
            when(rs.getString("dist_activity_desc")).thenReturn("Activity");
            when(rs.getString("allocation_code")).thenReturn("ALC");
            when(rs.getString("home_allocation")).thenReturn("HOME");
            when(rs.getBigDecimal("total_hours")).thenReturn(java.math.BigDecimal.TEN);
            return extractor.extractData(rs);
        });

        var spans = service.fetchSpans(LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 31), "EE1", 5);

        assertThat(spans).hasSize(1);
        assertThat(spans.get(0).getEeCode()).isEqualTo("EE1");
        assertThat(spans.get(0).getTotalHours()).isEqualByComparingTo("10");
    }
}
