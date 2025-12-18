// src/main/java/com/cec/EmployeeDB/Service/TimecardRangeService.java
package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.Dto.TimecardSpanDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TimecardRangeService {

    private final JdbcTemplate jdbc;

    // Map a row from v_timecard_spans to the DTO using the builder
    private static final @org.springframework.lang.NonNull RowMapper<TimecardSpanDTO> MAPPER = new RowMapper<>() {
        @Override
        public TimecardSpanDTO mapRow(@org.springframework.lang.NonNull ResultSet rs, int rowNum) throws SQLException {
            return TimecardSpanDTO.builder()
                    .eeCode(rs.getString("ee_code"))
                    .startDate(rs.getObject("start_date", LocalDate.class))
                    .endDateExcl(rs.getObject("end_date_excl", LocalDate.class))
                    .distJobCode(rs.getString("dist_job_code"))
                    .distJobDesc(rs.getString("dist_job_desc"))
                    .distActivityCode(rs.getString("dist_activity_code"))
                    .distActivityDesc(rs.getString("dist_activity_desc"))
                    .allocationCode(rs.getString("allocation_code"))
                    .homeAllocation(rs.getString("home_allocation"))
                    .totalHours(defaultBig(rs.getBigDecimal("total_hours")))
                    .build();
        }

        private BigDecimal defaultBig(BigDecimal v) {
            return v != null ? v : BigDecimal.ZERO;
        }
    };

    /**
     * Fetch spans from the view. We use inclusive start and exclusive end in the
     * DTO,
     * so a bar from Mon..Fri will have endDateExcl=Sat.
     */
    public List<TimecardSpanDTO> fetchSpans(LocalDate start, LocalDate end, String emp) {
        String baseSql = """
                SELECT ee_code, start_date, end_date_excl,
                       dist_job_code, dist_job_desc,
                       dist_activity_code, dist_activity_desc,
                       allocation_code, home_allocation,
                       total_hours
                FROM v_timecard_spans
                WHERE start_date < ? AND end_date_excl > ?
                """;
        List<Object> args = new ArrayList<>();
        args.add(end); // start_date < end
        args.add(start); // end_date_excl > start

        if (emp != null && !emp.isBlank()) {
            baseSql += " AND ee_code = ? ";
            args.add(emp.trim());
        }
        baseSql += " ORDER BY ee_code, start_date";

        return jdbc.query(baseSql, MAPPER, args.toArray());
    }
}
