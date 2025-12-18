package com.cec.EmployeeDB.Service.impl;

import com.cec.EmployeeDB.Dto.LatestWorkedDTO;
import com.cec.EmployeeDB.Dto.TimecardSpanDTO;
import com.cec.EmployeeDB.Service.TimecardQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TimecardQueryServiceImpl implements TimecardQueryService {

    private final JdbcTemplate jdbc;

    @Value("${app.timecards.use-cache:true}")
    private boolean useCache;

    private String sourceTable() {
        return useCache ? "timecard_spans_cache" : "v_timecard_spans";
    }

    // If you actually have a location column, e.g. p.work_location_desc, set:
    // private static final String WORK_LOCATION_EXPR =
    // "COALESCE(p.work_location_desc, '')";
    private static final String WORK_LOCATION_EXPR = "''"; // safe default → UI shows "—"

    @Override
    public List<TimecardSpanDTO> fetchSpans(LocalDate start, LocalDate end, String emp, int limit) {
        int max = Math.max(100, Math.min(limit, 20_000));

        StringBuilder sql = new StringBuilder(
                "SELECT ee_code, start_date, end_date_excl, dist_job_code, dist_job_desc, " +
                        "       dist_activity_code, dist_activity_desc, allocation_code, home_allocation, total_hours "
                        +
                        "  FROM " + sourceTable() + " " +
                        " WHERE start_date < ? AND end_date_excl > ? ");

        List<Object> args = new ArrayList<>();
        args.add(java.sql.Date.valueOf(end));
        args.add(java.sql.Date.valueOf(start));

        if (emp != null && !emp.isBlank()) {
            sql.append(" AND ee_code = ? ");
            args.add(emp);
        }
        sql.append(" ORDER BY end_date_excl DESC, start_date DESC LIMIT ").append(max);

        return jdbc.query(Objects.requireNonNull(sql.toString(), "sql cannot be null"), rs -> {
            List<TimecardSpanDTO> out = new ArrayList<>();
            while (rs.next()) {
                out.add(TimecardSpanDTO.builder()
                        .eeCode(rs.getString("ee_code"))
                        .startDate(rs.getDate("start_date").toLocalDate())
                        .endDateExcl(rs.getDate("end_date_excl").toLocalDate())
                        .distJobCode(rs.getString("dist_job_code"))
                        .distJobDesc(rs.getString("dist_job_desc"))
                        .distActivityCode(rs.getString("dist_activity_code"))
                        .distActivityDesc(rs.getString("dist_activity_desc"))
                        .allocationCode(rs.getString("allocation_code"))
                        .homeAllocation(rs.getString("home_allocation"))
                        .totalHours(
                                Optional.ofNullable(rs.getBigDecimal("total_hours"))
                                        .orElse(java.math.BigDecimal.ZERO))
                        .build());
            }
            return out;
        }, args.toArray());
    }

    @Override
    public Map<String, LatestWorkedDTO> latestByEmpCodes(List<String> eeCodes, int windowDays) {
        if (eeCodes == null || eeCodes.isEmpty())
            return Collections.emptyMap();

        LocalDate start = LocalDate.now().minusDays(Math.max(1, windowDays));
        Map<String, LatestWorkedDTO> out = new HashMap<>();

        final int CHUNK = 900;
        for (int i = 0; i < eeCodes.size(); i += CHUNK) {
            List<String> chunk = eeCodes.subList(i, Math.min(i + CHUNK, eeCodes.size()));
            String placeholders = chunk.stream().map(s -> "?").collect(Collectors.joining(","));

            String sql = """
                    WITH ranked AS (
                      SELECT
                          p.ee_code AS ee_code,
                          COALESCE(p.dist_job_code, '') AS job_code,
                          COALESCE(p.dist_job_desc, '') AS job_desc,
                          %s AS work_location,
                          GREATEST(
                            CASE WHEN p.out_punch_time IS NOT NULL AND p.out_punch_time > '1000-01-01 00:00:00' THEN p.out_punch_time END,
                            CASE WHEN p.in_punch_time  IS NOT NULL AND p.in_punch_time  > '1000-01-01 00:00:00' THEN p.in_punch_time  END,
                            TIMESTAMP(p.work_date, '18:00:00')
                          ) AS ts,
                          ROW_NUMBER() OVER (
                            PARTITION BY p.ee_code
                            ORDER BY
                              GREATEST(
                                CASE WHEN p.out_punch_time IS NOT NULL AND p.out_punch_time > '1000-01-01 00:00:00' THEN p.out_punch_time END,
                                CASE WHEN p.in_punch_time  IS NOT NULL AND p.in_punch_time  > '1000-01-01 00:00:00' THEN p.in_punch_time  END,
                                TIMESTAMP(p.work_date, '18:00:00')
                              ) DESC
                          ) AS rn
                      FROM paycom_time_report p
                      WHERE p.work_date >= ?
                        AND p.ee_code IN (%s)
                    )
                    SELECT ee_code, job_code, job_desc, work_location, ts
                      FROM ranked
                     WHERE rn = 1
                    """
                    .formatted(WORK_LOCATION_EXPR, placeholders);

            List<Object> params = new ArrayList<>();
            params.add(java.sql.Date.valueOf(start));
            params.addAll(chunk);

            jdbc.query(Objects.requireNonNull(sql, "sql cannot be null"), rs -> {
                while (rs.next()) {
                    String code = rs.getString("ee_code");
                    Timestamp ts = rs.getTimestamp("ts");
                    LatestWorkedDTO dto = LatestWorkedDTO.builder()
                            .eeCode(code)
                            .jobNumber(rs.getString("job_code"))
                            .project(rs.getString("job_desc"))
                            .workLocation(rs.getString("work_location"))
                            .lastWorkedAt(ts != null ? ts.toLocalDateTime() : null)
                            .build();
                    out.put(code, dto);
                }
                return null;
            }, params.toArray());
        }
        return out;
    }

    @Override
    public LatestWorkedDTO latestForEmp(String eeCode, int windowDays) {
        if (eeCode == null || eeCode.isBlank()) {
            return LatestWorkedDTO.builder().eeCode("").build();
        }
        Map<String, LatestWorkedDTO> map = latestByEmpCodes(List.of(eeCode), windowDays);
        return map.getOrDefault(eeCode, LatestWorkedDTO.builder().eeCode(eeCode).build());
    }
}
