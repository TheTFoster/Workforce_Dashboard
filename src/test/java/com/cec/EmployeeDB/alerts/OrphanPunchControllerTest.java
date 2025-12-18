package com.cec.EmployeeDB.alerts;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = OrphanPunchController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(com.cec.EmployeeDB.Config.LocalDateFormatter.class)
class OrphanPunchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrphanPunchService orphanPunchService;

    @Test
    void delete_skips_in_smoke_mode_without_resolve_id() throws Exception {
        mockMvc.perform(delete("/api/v1/alerts/orphan-punches/{id}", 99)
                        .header("X-Smoke-Test", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("smoke"))
                .andExpect(jsonPath("$.message").value("skipped delete orphan-punch"))
                .andExpect(jsonPath("$.id").value(99))
                .andExpect(jsonPath("$.resolveAlertId").doesNotExist());

        verifyNoInteractions(orphanPunchService);
    }

    @Test
    void delete_skips_in_smoke_mode_with_resolve_id() throws Exception {
        mockMvc.perform(delete("/api/v1/alerts/orphan-punches/{id}", 5)
                        .param("resolveAlertId", "10")
                        .header("X-Smoke-Test", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("smoke"))
                .andExpect(jsonPath("$.message").value("skipped delete orphan-punch"))
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.resolveAlertId").value(10));

        verifyNoInteractions(orphanPunchService);
    }

    @Test
    void delete_delegates_when_not_smoke() throws Exception {
        when(orphanPunchService.delete(7L, 11L)).thenReturn(1);

        mockMvc.perform(delete("/api/v1/alerts/orphan-punches/{id}", 7)
                        .param("resolveAlertId", "11"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deleted").value(1));

        verify(orphanPunchService).delete(7L, 11L);
    }

    @Test
    void list_parses_dates_and_limit_before_calling_service() throws Exception {
        List<Map<String, Object>> payload = List.of(Map.of(
                "id", 1L,
                "empCode", "A1",
                "firstName", "Alice",
                "lastName", "Anderson",
                "workDate", "2024-01-02",
                "inPunch", "2024-01-02T08:00:00",
                "outPunch", "2024-01-02T17:00:00",
                "allocationCode", "AC1"
        ));
        when(orphanPunchService.list(anyString(), any(), any(), anyInt())).thenReturn(payload);

        mockMvc.perform(get("/api/v1/alerts/orphan-punches")
                        .param("empCode", "A1")
                        .param("from", "2024-01-01")
                        .param("to", "2024-01-31")
                        .param("limit", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].empCode").value("A1"))
                .andExpect(jsonPath("$[0].workDate").value("2024-01-02"));

        ArgumentCaptor<String> empCode = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<LocalDate> from = ArgumentCaptor.forClass(LocalDate.class);
        ArgumentCaptor<LocalDate> to = ArgumentCaptor.forClass(LocalDate.class);
        ArgumentCaptor<Integer> limit = ArgumentCaptor.forClass(Integer.class);
        verify(orphanPunchService).list(empCode.capture(), from.capture(), to.capture(), limit.capture());

        assertThat(empCode.getValue()).isEqualTo("A1");
        assertThat(from.getValue()).isEqualTo(LocalDate.parse("2024-01-01"));
        assertThat(to.getValue()).isEqualTo(LocalDate.parse("2024-01-31"));
        assertThat(limit.getValue()).isEqualTo(50);
    }
}
