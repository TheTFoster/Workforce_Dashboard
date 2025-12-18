package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.Dto.TimecardDTO;
import com.cec.EmployeeDB.Entity.Timecard;
import com.cec.EmployeeDB.Repo.TimecardRepo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.rowset.SqlRowSet;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TimecardsServiceImplTest {

    @Mock
    JdbcTemplate jdbc;

    @Mock
    TimecardRepo repo;

    @InjectMocks
    TimecardsServiceImpl service;

    @SuppressWarnings("null")
    @Test
    void normalizeZeroDatesAndNulls_returns_counts_from_updates() {
        when(jdbc.update(anyString())).thenReturn(2, 3);

        Map<String, Object> result = service.normalizeZeroDatesAndNulls();

        assertThat(result).containsEntry("zeroDatesFixedIn", 2)
                .containsEntry("zeroDatesFixedOut", 3);
    }

    @SuppressWarnings("null")
    @Test
    void rebuild_returns_stage_count_and_window() {
        SqlRowSet rowSet = mock(SqlRowSet.class);
        when(rowSet.next()).thenReturn(true, false);
        when(rowSet.getInt("c")).thenReturn(7);
        when(jdbc.queryForRowSet(anyString())).thenReturn(rowSet);

        Map<String, Object> result = service.rebuild(30);

        assertThat(result).containsEntry("windowDays", 30)
                .containsEntry("recordsInStage", 7);
    }

    @SuppressWarnings("null")
    @Test
    void findInRange_maps_page_results_with_project_fallback() {
        Timecard tc = new Timecard();
        tc.setId(1L);
        tc.setEmployeeCode("EE1");
        tc.setFirstName("Alice");
        tc.setLastName("Smith");
        tc.setInPunchTime(LocalDateTime.of(2024, 1, 1, 8, 0));
        tc.setOutPunchTime(LocalDateTime.of(2024, 1, 1, 16, 0));
        tc.setDistJobDesc("ab12-34 some desc");

        Page<Timecard> page = new PageImpl<>(List.of(tc));
        when(repo.findOverlapping(any(), any(), any(PageRequest.class))).thenReturn(page);

        List<TimecardDTO> dtos = service.findInRange(LocalDate.now().minusDays(1), LocalDate.now(), 10);

        assertThat(dtos).hasSize(1);
        assertThat(dtos.get(0).getProject()).isEqualTo("AB12-34");
    }

    @SuppressWarnings("null")
    @Test
    void findInRangePaged_respects_existing_pageable() {
        Timecard tc = new Timecard();
        tc.setId(2L);
        tc.setEmployeeCode("EE2");
        tc.setFirstName("Bob");
        tc.setInPunchTime(LocalDateTime.of(2024, 2, 1, 8, 0));
        tc.setOutPunchTime(LocalDateTime.of(2024, 2, 1, 16, 0));

        Page<Timecard> page = new PageImpl<>(List.of(tc), PageRequest.of(1, 5, Sort.by("inPunchTime")), 6);
        when(repo.findOverlapping(any(), any(), any(PageRequest.class))).thenReturn(page);

        var result = service.findInRangePaged(LocalDate.now().minusDays(1), LocalDate.now(),
                PageRequest.of(1, 5, Sort.by("inPunchTime")));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getNumber()).isEqualTo(1);
        assertThat(result.getSize()).isEqualTo(5);
    }
}
