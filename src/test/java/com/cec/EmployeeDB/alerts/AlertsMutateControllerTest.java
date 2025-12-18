package com.cec.EmployeeDB.alerts;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@WebMvcTest(controllers = AlertsMutateController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(com.cec.EmployeeDB.Config.LocalDateFormatter.class)
class AlertsMutateControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Mock
    private AlertsMutateService mutateService;

    @InjectMocks
    private AlertsMutateController alertsMutateController;

    @Test
    void ack_smoke_short_circuits() throws Exception {
        mockMvc.perform(post("/api/v1/alerts/ack/{id}", 12)
                        .header("X-Smoke-Test", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("smoke"))
                .andExpect(jsonPath("$.message").value("skipped ack"))
                .andExpect(jsonPath("$.id").value(12));

        verifyNoInteractions(mutateService);
    }

    @Test
    void ack_calls_service_when_not_smoke() throws Exception {
        mockMvc.perform(post("/api/v1/alerts/ack/{id}", 3))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.acked").value(1));

        verify(mutateService).ack(3L);
    }

    @Test
    void resolve_smoke_short_circuits() throws Exception {
        mockMvc.perform(post("/api/v1/alerts/resolve/{id}", 5)
                        .header("X-Smoke-Test", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("smoke"))
                .andExpect(jsonPath("$.message").value("skipped resolve"))
                .andExpect(jsonPath("$.id").value(5));

        verifyNoInteractions(mutateService);
    }

    @Test
    void resolve_calls_service_when_not_smoke() throws Exception {
        mockMvc.perform(post("/api/v1/alerts/resolve/{id}", 9))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resolved").value(1));

        verify(mutateService).resolve(9L);
    }
}
