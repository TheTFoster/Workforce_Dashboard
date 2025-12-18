package com.cec.EmployeeDB.alerts;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrphanPunchServiceTest {

    @Mock
    private NamedParameterJdbcTemplate jdbc;
    @Mock
    private AlertsService alertsService;

    @Test
    void delete_invokes_resolve_when_row_deleted_and_alert_id_present() {
        when(jdbc.update(eq("DELETE FROM paycom_time_report WHERE id=:id"), any(MapSqlParameterSource.class))).thenReturn(1);
        OrphanPunchService service = new OrphanPunchService(jdbc, alertsService);

        service.delete(9L, 15L);

        verify(jdbc).update(eq("DELETE FROM paycom_time_report WHERE id=:id"), any(MapSqlParameterSource.class));
        verify(alertsService).resolve(15L);
    }

    @Test
    void delete_does_not_resolve_when_no_rows_deleted() {
        when(jdbc.update(eq("DELETE FROM paycom_time_report WHERE id=:id"), any(MapSqlParameterSource.class))).thenReturn(0);
        OrphanPunchService service = new OrphanPunchService(jdbc, alertsService);

        service.delete(9L, 15L);

        verify(alertsService, never()).resolve(anyLong());
    }

    @Test
    void delete_does_not_resolve_when_alert_id_missing() {
        when(jdbc.update(eq("DELETE FROM paycom_time_report WHERE id=:id"), any(MapSqlParameterSource.class))).thenReturn(1);
        OrphanPunchService service = new OrphanPunchService(jdbc, alertsService);

        service.delete(9L, null);

        verify(alertsService, never()).resolve(anyLong());
    }
}
