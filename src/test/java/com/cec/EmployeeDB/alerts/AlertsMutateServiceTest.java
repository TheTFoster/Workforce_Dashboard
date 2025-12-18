package com.cec.EmployeeDB.alerts;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AlertsMutateServiceTest {

    @Mock
    NamedParameterJdbcTemplate jdbc;

    @InjectMocks
    AlertsMutateService service;

    @Test
    void ack_updates_status() {
        service.ack(5);

        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(jdbc).update(anyString(), params.capture());
        assertThat(params.getValue()).containsEntry("id", 5L);
    }

    @Test
    void resolve_updates_status() {
        service.resolve(7);

        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(jdbc).update(anyString(), params.capture());
        assertThat(params.getValue()).containsEntry("id", 7L);
    }
}
