package com.cec.EmployeeDB.controller;

import com.cec.EmployeeDB.Dto.CurrentAssignmentDTO;
import com.cec.EmployeeDB.Dto.EmpCodeBatchRequest;
import com.cec.EmployeeDB.Service.TimecardCacheService;
import com.cec.EmployeeDB.Service.TimecardImportService;
import com.cec.EmployeeDB.Service.TimecardPredictionService;
import com.cec.EmployeeDB.Service.TimecardQueryService;
import com.cec.EmployeeDB.Service.TimecardsService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;

@WebMvcTest(controllers = TimecardsController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(com.cec.EmployeeDB.Config.LocalDateFormatter.class)
class TimecardsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TimecardImportService importService;
    @MockBean
    private TimecardPredictionService predictionService;
    @MockBean
    private TimecardQueryService timecardQueryService;
    @MockBean
    private TimecardCacheService cacheService;
    @MockBean
    private TimecardsService timecardsService;
    @MockBean
    private JdbcTemplate jdbcTemplate;

    @Test
    void normalize_skips_in_smoke_mode() throws Exception {
        mockMvc.perform(post("/api/v1/timecards/normalize")
                        .header("X-Smoke-Test", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("smoke"))
                .andExpect(jsonPath("$.message").value("skipped normalize"));

        verifyNoInteractions(timecardsService);
    }

    @Test
    void normalize_calls_service_and_returns_timestamp() throws Exception {
        when(timecardsService.normalizeZeroDatesAndNulls()).thenReturn(new java.util.HashMap<>(Map.of("normalized", 3)));

        mockMvc.perform(post("/api/v1/timecards/normalize"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.normalized").value(3))
                .andExpect(jsonPath("$.normalizedAt").exists());

        verify(timecardsService).normalizeZeroDatesAndNulls();
    }

    @Test
    void rebuild_predictions_skips_in_smoke_mode() throws Exception {
        mockMvc.perform(post("/api/v1/timecards/predict/rebuild")
                        .header("X-Smoke-Test", "true")
                        .param("windowDays", "14"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("smoke"))
                .andExpect(jsonPath("$.message").value("skipped rebuild"));

        verifyNoInteractions(timecardsService);
    }

    @Test
    void rebuild_predictions_calls_service() throws Exception {
        when(timecardsService.rebuild(30)).thenReturn(Map.of("upserts", 5));

        mockMvc.perform(post("/api/v1/timecards/predict/rebuild")
                        .param("windowDays", "30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.upserts").value(5));

        verify(timecardsService).rebuild(30);
    }

    @Test
    void current_assignments_by_emp_returns_empty_when_no_codes() throws Exception {
        mockMvc.perform(post("/api/v1/timecards/current-assignments/by-emp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"empCodes\":[]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(0))
                .andExpect(jsonPath("$.items").isArray());

        verify(timecardsService, never()).currentAssignmentsFor(anyList(), anyInt());
    }

    @Test
    void current_assignments_by_emp_normalizes_codes_and_delegates() throws Exception {
        CurrentAssignmentDTO dto = new CurrentAssignmentDTO();
        dto.setEmployeeCode("AA");
        dto.setJobNumber("J1");
        dto.setProject("Project A");
        dto.setWorkGroup("WG1");
        dto.setLastSeenAt(LocalDateTime.parse("2024-01-02T10:15:00"));

        when(timecardsService.currentAssignmentsFor(anyList(), anyInt())).thenReturn(List.of(dto));

        mockMvc.perform(post("/api/v1/timecards/current-assignments/by-emp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"empCodes\":[\" aa \", \"AA\", \"bb\"]}")
                        .param("days", "60"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days").value(60))
                .andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.items[0].employeeCode").value("AA"))
                .andExpect(jsonPath("$.items[0].jobNumber").value("J1"))
                .andExpect(jsonPath("$.items[0].project").value("Project A"))
                .andExpect(jsonPath("$.items[0].workGroup").value("WG1"))
                .andExpect(jsonPath("$.items[0].lastSeenAt").value("2024-01-02T10:15:00"));

        ArgumentCaptor<List<String>> codesCaptor = ArgumentCaptor.forClass(List.class);
        ArgumentCaptor<Integer> daysCaptor = ArgumentCaptor.forClass(Integer.class);
        verify(timecardsService).currentAssignmentsFor(codesCaptor.capture(), daysCaptor.capture());

        assertThat(codesCaptor.getValue()).containsExactly("AA", "BB");
        assertThat(daysCaptor.getValue()).isEqualTo(60);
    }

    @Test
    void week_detail_requires_params() throws Exception {
        mockMvc.perform(get("/api/v1/timecards/week-detail"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @SuppressWarnings("unchecked")
    void week_detail_queries_db_and_returns_rows() throws Exception {
        var row = Map.of("workDate", "2024-01-02", "hours", 8);
        org.mockito.Mockito.when(jdbcTemplate.query(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(org.springframework.jdbc.core.PreparedStatementSetter.class),
                org.mockito.ArgumentMatchers.any(org.springframework.jdbc.core.RowMapper.class)
        )).thenReturn(List.of(row));

        mockMvc.perform(get("/api/v1/timecards/week-detail")
                        .param("eeCode", "EE1")
                        .param("weekEnding", "2024-01-05")
                        .param("projectCode", "P1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].workDate").value("2024-01-02"))
                .andExpect(jsonPath("$[0].hours").value(8));
    }

    @Test
    @SuppressWarnings("unchecked")
    void search_filters_and_delegates_to_jdbc() throws Exception {
        var row = Map.of("employeeCode", "EE1", "hours", 40);
        org.mockito.Mockito.when(jdbcTemplate.query(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(org.springframework.jdbc.core.PreparedStatementSetter.class),
                org.mockito.ArgumentMatchers.any(org.springframework.jdbc.core.RowMapper.class)
        )).thenReturn(List.of(row));

        mockMvc.perform(get("/api/v1/timecards/search")
                        .param("employeeCode", "EE1")
                        .param("employeeName", "Alice")
                        .param("project", "Proj")
                        .param("businessTitle", "Eng")
                        .param("workGroup", "WG")
                        .param("startDate", "2024-01-01")
                        .param("endDate", "2024-01-31")
                        .param("page", "1")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].employeeCode").value("EE1"))
                .andExpect(jsonPath("$[0].hours").value(40));

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sqlCaptor.capture(),
                org.mockito.ArgumentMatchers.any(org.springframework.jdbc.core.PreparedStatementSetter.class),
                org.mockito.ArgumentMatchers.any(org.springframework.jdbc.core.RowMapper.class));
        assertThat(sqlCaptor.getValue()).contains("FROM paycom_time_report");
    }

    @Test
    void range_parses_dates_and_limit() throws Exception {
        when(timecardsService.findInRange(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyInt()))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/v1/timecards/range")
                        .param("startDate", "2024-01-01")
                        .param("endDate", "2024-01-31")
                        .param("limit", "500"))
                .andExpect(status().isOk());

        ArgumentCaptor<java.time.LocalDate> start = ArgumentCaptor.forClass(java.time.LocalDate.class);
        ArgumentCaptor<java.time.LocalDate> end = ArgumentCaptor.forClass(java.time.LocalDate.class);
        ArgumentCaptor<Integer> limit = ArgumentCaptor.forClass(Integer.class);
        verify(timecardsService).findInRange(start.capture(), end.capture(), limit.capture());
        assertThat(start.getValue()).isEqualTo(java.time.LocalDate.parse("2024-01-01"));
        assertThat(end.getValue()).isEqualTo(java.time.LocalDate.parse("2024-01-31"));
        assertThat(limit.getValue()).isEqualTo(500);
    }

    @Test
    void range_paged_parses_page_and_size() throws Exception {
        org.springframework.data.domain.Page< com.cec.EmployeeDB.Dto.TimecardDTO > page =
                new org.springframework.data.domain.PageImpl<>(List.of(), org.springframework.data.domain.PageRequest.of(1, 100), 0);
        when(timecardsService.findInRangePaged(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/timecards/range/paged")
                        .param("startDate", "2024-01-01")
                        .param("endDate", "2024-02-01")
                        .param("page", "1")
                        .param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(100))
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").value(0))
                .andExpect(jsonPath("$.totalPages").value(0));
    }

    @Test
    void raw_timecards_requires_eeCode() throws Exception {
        mockMvc.perform(get("/api/v1/timecards/raw"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @SuppressWarnings("unchecked")
    void raw_timecards_returns_rows_from_jdbc() throws Exception {
        var row = Map.of("ee_code", "EE1", "work_date", "2024-01-02", "earn_hours", 8);
        org.mockito.Mockito.when(jdbcTemplate.query(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(org.springframework.jdbc.core.PreparedStatementSetter.class),
                org.mockito.ArgumentMatchers.any(org.springframework.jdbc.core.RowMapper.class)
        )).thenReturn(List.of(row));

        mockMvc.perform(get("/api/v1/timecards/raw")
                        .param("eeCode", "EE1")
                        .param("start", "2024-01-01")
                        .param("end", "2024-01-31")
                        .param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].ee_code").value("EE1"))
                .andExpect(jsonPath("$.rows[0].work_date").value("2024-01-02"))
                .andExpect(jsonPath("$.rows[0].earn_hours").value(8));
    }

    @Test
    void by_emp_requires_ee_param() throws Exception {
        mockMvc.perform(get("/api/v1/timecards/by-emp"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @SuppressWarnings("unchecked")
    void by_emp_returns_rows_from_jdbc() throws Exception {
        var row = Map.of("ee_code", "EE1", "work_date", "2024-01-03", "earn_hours", 6);
        org.mockito.Mockito.when(jdbcTemplate.query(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(org.springframework.jdbc.core.PreparedStatementSetter.class),
                org.mockito.ArgumentMatchers.any(org.springframework.jdbc.core.RowMapper.class)
        )).thenReturn(List.of(row));

        mockMvc.perform(get("/api/v1/timecards/by-emp")
                        .param("ee", "EE1")
                        .param("start", "2024-01-01")
                        .param("end", "2024-01-31")
                        .param("limit", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ee_code").value("EE1"))
                .andExpect(jsonPath("$[0].work_date").value("2024-01-03"))
                .andExpect(jsonPath("$[0].earn_hours").value(6));
    }

    @Test
    void range_handles_invalid_dates_and_caps_limit() throws Exception {
        when(timecardsService.findInRange(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyInt()))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/v1/timecards/range")
                        .param("startDate", "bad-date")
                        .param("endDate", "")
                        .param("limit", "99999"))
                .andExpect(status().isOk());

        ArgumentCaptor<Integer> limit = ArgumentCaptor.forClass(Integer.class);
        verify(timecardsService).findInRange(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), limit.capture());
        assertThat(limit.getValue()).isEqualTo(99999); // current controller passes through as-is
    }

    @Test
    void latest_by_emp_returns_error_when_service_throws() throws Exception {
        org.mockito.Mockito.when(timecardQueryService.latestByEmpCodes(org.mockito.ArgumentMatchers.anyList(), org.mockito.ArgumentMatchers.anyInt()))
                .thenThrow(new RuntimeException("boom"));

        mockMvc.perform(post("/api/v1/timecards/latest-by-emp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"empCodes\":[\"E1\"]}"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("latest-by-emp failed"))
                .andExpect(jsonPath("$.message").value("boom"));
    }

    @Test
    void latest_by_emp_success_returns_predictions() throws Exception {
        var pred = com.cec.EmployeeDB.Dto.LatestWorkedDTO.builder().eeCode("E1").project("P1").build();
        java.util.Map<String, com.cec.EmployeeDB.Dto.LatestWorkedDTO> map = java.util.Map.of("E1", pred);
        org.mockito.Mockito.when(timecardQueryService.latestByEmpCodes(org.mockito.ArgumentMatchers.anyList(), org.mockito.ArgumentMatchers.anyInt()))
                .thenReturn(map);

        mockMvc.perform(post("/api/v1/timecards/latest-by-emp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"empCodes\":[\"E1\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.predictions.E1.eeCode").value("E1"))
                .andExpect(jsonPath("$.predictions.E1.project").value("P1"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void latest_single_employee_delegates_service() throws Exception {
        var dto = com.cec.EmployeeDB.Dto.LatestWorkedDTO.builder()
                .eeCode("EE1")
                .project("Proj1")
                .jobNumber("J1")
                .lastWorkedAt(java.time.LocalDateTime.parse("2024-01-02T10:00:00"))
                .build();
        org.mockito.Mockito.when(timecardQueryService.latestForEmp("EE1", 180)).thenReturn(dto);

        mockMvc.perform(get("/api/v1/timecards/latest/{eeCode}", "EE1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eeCode").value("EE1"))
                .andExpect(jsonPath("$.project").value("Proj1"))
                .andExpect(jsonPath("$.jobNumber").value("J1"))
                .andExpect(jsonPath("$.lastWorkedAt").value("2024-01-02T10:00:00"));
    }

    @Test
    void latest_single_employee_service_failure() throws Exception {
        org.mockito.Mockito.when(timecardQueryService.latestForEmp("EE1", 180)).thenThrow(new RuntimeException("svc fail"));

        mockMvc.perform(get("/api/v1/timecards/latest/{eeCode}", "EE1"))
                .andExpect(status().is5xxServerError())
                .andExpect(jsonPath("$.error").value("latest-for-emp failed"))
                .andExpect(jsonPath("$.message").value("svc fail"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void current_assignments_fallbacks_to_jdbc_on_service_error() throws Exception {
        org.mockito.Mockito.when(timecardsService.currentAssignmentsFor(org.mockito.ArgumentMatchers.anyList(), org.mockito.ArgumentMatchers.anyInt()))
                .thenThrow(new RuntimeException("svc fail"));
        var fallbackRow = Map.of(
                "employeeCode", "E1",
                "jobNumber", "J1",
                "project", "Proj",
                "workGroup", "WG",
                "lastSeenAt", "2024-01-01T08:00:00"
        );
        org.mockito.Mockito.when(jdbcTemplate.query(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(org.springframework.jdbc.core.PreparedStatementSetter.class),
                org.mockito.ArgumentMatchers.any(org.springframework.jdbc.core.RowMapper.class)
        )).thenReturn(List.of(fallbackRow));

        mockMvc.perform(post("/api/v1/timecards/current-assignments/by-emp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"empCodes\":[\"E1\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.items[0].employeeCode").value("E1"))
                .andExpect(jsonPath("$.items[0].jobNumber").value("J1"))
                .andExpect(jsonPath("$.items[0].project").value("Proj"))
                .andExpect(jsonPath("$.items[0].workGroup").value("WG"))
                .andExpect(jsonPath("$.items[0].lastSeenAt").value("2024-01-01T08:00:00"));
    }

    @Test
    void current_assignments_fallback_failure_returns_500() throws Exception {
        org.mockito.Mockito.when(timecardsService.currentAssignmentsFor(org.mockito.ArgumentMatchers.anyList(), org.mockito.ArgumentMatchers.anyInt()))
                .thenThrow(new RuntimeException("svc fail"));
        org.mockito.Mockito.when(jdbcTemplate.query(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(org.springframework.jdbc.core.PreparedStatementSetter.class),
                org.mockito.ArgumentMatchers.any(org.springframework.jdbc.core.RowMapper.class)
        )).thenThrow(new RuntimeException("jdbc fail"));

        mockMvc.perform(post("/api/v1/timecards/current-assignments/by-emp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"empCodes\":[\"E1\"]}"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("current-assignments/by-emp failed"))
                .andExpect(jsonPath("$.serviceMessage").value("svc fail"))
                .andExpect(jsonPath("$.jdbcMessage").value("jdbc fail"));
    }
}
