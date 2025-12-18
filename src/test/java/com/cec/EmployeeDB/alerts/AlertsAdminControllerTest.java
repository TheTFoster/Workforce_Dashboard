package com.cec.EmployeeDB.alerts;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AlertsAdminController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(com.cec.EmployeeDB.Config.LocalDateFormatter.class)
class AlertsAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private NoHoursAlertBatch noHoursAlertBatch;

    @Test
    void run_smoke_short_circuits() throws Exception {
        mockMvc.perform(post("/api/v1/alerts/admin/no-hours/run")
                        .param("scope", "last")
                        .header("X-Smoke-Test", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("smoke"))
                .andExpect(jsonPath("$.message").value("skipped no-hours admin run"))
                .andExpect(jsonPath("$.scope").value("last"));

        verifyNoInteractions(noHoursAlertBatch);
    }

    @Test
    void run_dispatches_current_scope_by_default() throws Exception {
        when(noHoursAlertBatch.upsertNoHoursThisWeek()).thenReturn(4);

        mockMvc.perform(post("/api/v1/alerts/admin/no-hours/run"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scope").value("current"))
                .andExpect(jsonPath("$.rowsAffected").value(4));

        verify(noHoursAlertBatch).upsertNoHoursThisWeek();
    }

    @Test
    void run_dispatches_last_scope_when_requested() throws Exception {
        when(noHoursAlertBatch.upsertNoHoursLastWeek()).thenReturn(2);

        mockMvc.perform(post("/api/v1/alerts/admin/no-hours/run")
                        .param("scope", "last"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scope").value("last"))
                .andExpect(jsonPath("$.rowsAffected").value(2));

        verify(noHoursAlertBatch).upsertNoHoursLastWeek();
    }
}
