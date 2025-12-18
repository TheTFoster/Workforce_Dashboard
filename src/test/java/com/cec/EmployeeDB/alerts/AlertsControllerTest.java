package com.cec.EmployeeDB.alerts;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AlertsController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(com.cec.EmployeeDB.Config.LocalDateFormatter.class)
class AlertsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @org.mockito.Mock
    private AlertsService alertsService;
    @org.mockito.Mock
    private NoHoursAlertBatch noHoursAlertBatch;
    @org.mockito.Mock
    private MissedPunchAlertBatch missedPunchAlertBatch;

    @Test
    void ack_skips_in_smoke_mode() throws Exception {
        mockMvc.perform(post("/api/v1/alerts/{id}/ack", 10)
                        .header("X-Smoke-Test", "true")
                        .param("by", "tester"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("smoke"))
                .andExpect(jsonPath("$.message").value("skipped ack"))
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.by").value("tester"));

        verifyNoInteractions(alertsService);
    }

    @Test
    void ack_invokes_service_with_default_by() throws Exception {
        when(alertsService.ack(anyLong(), anyString())).thenReturn(1);

        mockMvc.perform(post("/api/v1/alerts/{id}/ack", 5))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.acked").value(1));

        ArgumentCaptor<Long> idCaptor = ArgumentCaptor.forClass(Long.class);
        ArgumentCaptor<String> byCaptor = ArgumentCaptor.forClass(String.class);
        verify(alertsService).ack(idCaptor.capture(), byCaptor.capture());
        assertThat(idCaptor.getValue()).isEqualTo(5L);
        assertThat(byCaptor.getValue()).isEqualTo("system");
    }

    @Test
    void resolve_skips_in_smoke_mode() throws Exception {
        mockMvc.perform(post("/api/v1/alerts/{id}/resolve", 4)
                        .header("X-Smoke-Test", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("smoke"))
                .andExpect(jsonPath("$.message").value("skipped resolve"))
                .andExpect(jsonPath("$.id").value(4));

        verifyNoInteractions(alertsService);
    }

    @Test
    void run_no_hours_dispatches_scope() throws Exception {
        when(noHoursAlertBatch.upsertNoHoursLastWeek()).thenReturn(3);

        mockMvc.perform(post("/api/v1/alerts/run/no-hours")
                        .param("scope", "last-week"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scope").value("last-week"))
                .andExpect(jsonPath("$.upserts").value(3));

        verify(noHoursAlertBatch).upsertNoHoursLastWeek();
    }

    @Test
    void run_no_hours_invalid_scope_returns_error() throws Exception {
        mockMvc.perform(post("/api/v1/alerts/run/no-hours")
                        .param("scope", "invalid"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("error"))
                .andExpect(jsonPath("$.message").value("scope must be this-week or last-week"))
                .andExpect(jsonPath("$.scope").value("invalid"));
    }

    @Test
    void run_missed_punch_smoke_short_circuits() throws Exception {
        mockMvc.perform(post("/api/v1/alerts/run/missed-punch")
                        .header("X-Smoke-Test", "true")
                        .param("workDay", "2024-01-02"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("smoke"))
                .andExpect(jsonPath("$.message").value("skipped run missed-punch"))
                .andExpect(jsonPath("$.workDay").value("2024-01-02"));

        verifyNoInteractions(missedPunchAlertBatch);
    }

    @Test
    void run_missed_punch_invokes_batch_for_specific_date() throws Exception {
        when(missedPunchAlertBatch.upsertMissedPunchFor(LocalDate.parse("2024-02-01"))).thenReturn(7);

        mockMvc.perform(post("/api/v1/alerts/run/missed-punch")
                        .param("workDay", "2024-02-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.workDay").value("2024-02-01"))
                .andExpect(jsonPath("$.upserts").value(7));

        verify(missedPunchAlertBatch).upsertMissedPunchFor(LocalDate.parse("2024-02-01"));
    }

    @Test
    void refresh_triggers_all_batches() throws Exception {
        when(noHoursAlertBatch.upsertNoHoursThisWeek()).thenReturn(2);
        when(noHoursAlertBatch.upsertNoHoursLastWeek()).thenReturn(1);
        when(missedPunchAlertBatch.upsertMissedPunchForPrevBusinessDay()).thenReturn(5);

        mockMvc.perform(post("/api/v1/alerts/refresh"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.noHoursThisWeek").value(2))
                .andExpect(jsonPath("$.noHoursLastWeek").value(1))
                .andExpect(jsonPath("$.missedPunchUpserts").value(5))
                .andExpect(jsonPath("$.refreshedAt").exists());

        verify(noHoursAlertBatch).upsertNoHoursThisWeek();
        verify(noHoursAlertBatch).upsertNoHoursLastWeek();
        verify(missedPunchAlertBatch).upsertMissedPunchForPrevBusinessDay();
    }

    @Test
    void list_parses_dates_and_limit() throws Exception {
        mockMvc.perform(get("/api/v1/alerts")
                        .param("status", "open")
                        .param("types", "MISSED_PUNCH", "NO_HOURS_THIS_WEEK")
                        .param("employeeId", "123")
                        .param("empCode", "A1")
                        .param("from", "2024-01-01")
                        .param("to", "2024-01-31")
                        .param("limit", "50"))
                .andExpect(status().isOk());

        ArgumentCaptor<String> status = ArgumentCaptor.forClass(String.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<java.util.List<String>> types = ArgumentCaptor.forClass(java.util.List.class);
        ArgumentCaptor<Integer> employeeId = ArgumentCaptor.forClass(Integer.class);
        ArgumentCaptor<String> empCode = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<LocalDate> from = ArgumentCaptor.forClass(LocalDate.class);
        ArgumentCaptor<LocalDate> to = ArgumentCaptor.forClass(LocalDate.class);
        ArgumentCaptor<Integer> limit = ArgumentCaptor.forClass(Integer.class);

        verify(alertsService).list(status.capture(), types.capture(), employeeId.capture(), empCode.capture(),
                from.capture(), to.capture(), limit.capture());

        assertThat(status.getValue()).isEqualTo("open");
        assertThat(types.getValue()).containsExactly("MISSED_PUNCH", "NO_HOURS_THIS_WEEK");
        assertThat(employeeId.getValue()).isEqualTo(123);
        assertThat(empCode.getValue()).isEqualTo("A1");
        assertThat(from.getValue()).isEqualTo(LocalDate.parse("2024-01-01"));
        assertThat(to.getValue()).isEqualTo(LocalDate.parse("2024-01-31"));
        assertThat(limit.getValue()).isEqualTo(50);
    }
}
