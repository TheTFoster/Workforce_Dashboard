package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.Dto.TimecardDTO;
import com.cec.EmployeeDB.Entity.Timecard;
import com.cec.EmployeeDB.Repo.TimecardRepo;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.rowset.SqlRowSet;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import com.cec.EmployeeDB.Dto.CurrentAssignmentDTO;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.sql.Timestamp;
import java.util.Set;

@Service
@Transactional
public class TimecardsServiceImpl implements TimecardsService {

    private final JdbcTemplate jdbc;
    private final TimecardRepo timecardRepo;

    public TimecardsServiceImpl(JdbcTemplate jdbc, TimecardRepo timecardRepo) {
        this.jdbc = jdbc;
        this.timecardRepo = timecardRepo;
    }

    // ----------------------------------------------------
    // Ingest CSV → stage table
    // ----------------------------------------------------
    @Override
    public Map<String, Object> ingest(MultipartFile file) throws Exception {
        final Path tmp = Files.createTempFile("timecards-", ".csv");
        try {
            Files.copy(file.getInputStream(), tmp, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Failed to write upload to temp file", e);
        }

        final String abs = tmp.toAbsolutePath().toString().replace("\\", "\\\\");
        // wrap with Objects.requireNonNull to satisfy nullness analysis in some IDEs
        final String sql = Objects.requireNonNull(String.format("""
                LOAD DATA LOCAL INFILE '%s'
                INTO TABLE paycom_time_report_stage
                CHARACTER SET utf8mb4
                FIELDS TERMINATED BY ',' ENCLOSED BY '"' ESCAPED BY ''
                LINES TERMINATED BY '\\r\\n'
                IGNORE 1 LINES
                (
                  ee_code,
                  last_name,
                  first_name,
                  home_department,
                  home_allocation,
                  pay_class,
                  badge,
                  in_punch_time,
                  out_punch_time,
                  allocation_code,
                  earn_code,
                  earn_hours,
                  dollars,
                  employee_approved,
                  supervisor_approved,
                  tax_profile,
                  home_department_desc,
                  home_payroll_profile_code,
                  home_payroll_profile_desc,
                  home_job_code,
                  home_job_desc,
                  home_section_code,
                  home_section_desc,
                  home_activity_code,
                  home_activity_desc,
                  home_user_access_code,
                  home_user_access_desc,
                  home_sub_department_code,
                  home_sub_department_desc,
                  dist_department_desc
                )
                """, abs));

        final int loaded = jdbc.update(sql);

        try {
            Files.deleteIfExists(tmp);
        } catch (IOException ignore) {
        }

        Map<String, Object> out = new HashMap<>();
        out.put("fileName", file.getOriginalFilename());
        out.put("rowsIngested", loaded);
        out.put("ingestedAt", LocalDateTime.now().toString());
        return out;
    }

    // ----------------------------------------------------
    // Normalization helper
    // ----------------------------------------------------
    @Override
    public Map<String, Object> normalizeZeroDatesAndNulls() {
        int fixedIn = jdbc.update("""
                UPDATE paycom_time_report_stage
                SET in_punch_time = NULL
                WHERE in_punch_time = '0000-00-00 00:00:00'
                   OR in_punch_time = '0000-00-00'
                """);
        int fixedOut = jdbc.update("""
                UPDATE paycom_time_report_stage
                SET out_punch_time = NULL
                WHERE out_punch_time = '0000-00-00 00:00:00'
                   OR out_punch_time = '0000-00-00'
                """);

        Map<String, Object> out = new HashMap<>();
        out.put("zeroDatesFixedIn", fixedIn);
        out.put("zeroDatesFixedOut", fixedOut);
        return out;
    }

    @Override
    public Map<String, Object> rebuild(int windowDays) {
        SqlRowSet rs = jdbc.queryForRowSet("SELECT COUNT(*) AS c FROM paycom_time_report_stage");
        int count = 0;
        if (rs.next())
            count = rs.getInt("c");
        Map<String, Object> out = new HashMap<>();
        out.put("windowDays", windowDays);
        out.put("recordsInStage", count);
        return out;
    }

    // ----------------------------------------------------
    // Read window for FE (any overlap)
    // Cached for 5 minutes - GanttView often makes repeated requests for same date range
    // ----------------------------------------------------
    @Override
    @Cacheable(value = "timecardRange", key = "#start.toString() + '-' + #end.toString() + '-' + #limit", unless = "#result.size() == 0")
    public List<TimecardDTO> findInRange(LocalDate start, LocalDate end, int limit) {
        LocalDateTime from = start.atStartOfDay();
        LocalDateTime to = end.plusDays(1).atStartOfDay(); // exclusive

        int pageSize = Math.max(1, Math.min((limit <= 0 ? 6000 : limit), 20000));
        Pageable pageReq = PageRequest.of(0, pageSize, Sort.by(Sort.Direction.DESC, "inPunchTime"));

        Page<Timecard> page = timecardRepo.findOverlapping(from, to, pageReq);
        return page.getContent().stream().map(TimecardsServiceImpl::toDto).toList();
    }

    @Override
    @Cacheable(value = "timecardRange", key = "'paged:' + #start.toString() + '-' + #end.toString() + '-' + #pageable.pageNumber + '-' + #pageable.pageSize", unless = "#result == null || #result.content.isEmpty()")
    public Page<TimecardDTO> findInRangePaged(LocalDate start, LocalDate end, Pageable pageable) {
        LocalDateTime from = start.atStartOfDay();
        LocalDateTime to = end.plusDays(1).atStartOfDay(); // exclusive

        Pageable pageReq = pageable == null
                ? PageRequest.of(0, 2000, Sort.by(Sort.Direction.DESC, "inPunchTime"))
                : pageable;

        Page<Timecard> page = timecardRepo.findOverlapping(from, to, pageReq);
        return page.map(TimecardsServiceImpl::toDto);
    }

    // ----------------------------------------------------
    // Mapping helpers
    // ----------------------------------------------------
    private static final Pattern JOB_CODE_RE =
            // Adjust the regex if your job-code pattern differs
            Pattern.compile("\\b[A-Za-z]{2}\\d{2}-\\d{2}\\b", Pattern.CASE_INSENSITIVE);

    private static TimecardDTO toDto(Timecard t) {
        TimecardDTO dto = new TimecardDTO();

        dto.setId(t.getId());
        dto.setEmployeeCode(nz(t.getEmployeeCode()));
        dto.setEmployeeName(nz(t.getEmployeeName()));

        dto.setStart(t.getInPunchTime());
        dto.setEnd(t.getOutPunchTime() != null ? t.getOutPunchTime() : t.getInPunchTime());

        // full descriptors
        dto.setDistJobCode(nz(t.getDistJobCode()));
        dto.setDistJobDesc(nz(t.getDistJobDesc()));
        dto.setDistDepartmentDesc(nz(t.getDistDepartmentDesc())); // "Section (Dist Dept Desc)"
        dto.setDistSectionCode(nz(t.getDistSectionCode()));
        dto.setDistSectionDesc(nz(t.getDistSectionDesc())); // "Department (Dist Section Desc)"
        dto.setDistActivityDesc(nz(t.getDistActivityDesc())); // Activity

        dto.setAllocationCode(nz(t.getAllocationCode()));
        dto.setHomeAllocation(nz(t.getHomeAllocation()));
        dto.setHomeDepartmentDesc(nz(t.getHomeDepartmentDesc()));

        // canonical project key used for grouping: prefer Dist Job Code,
        // otherwise try to parse from descriptions/allocation strings
        String project = firstNonBlank(
                dto.getDistJobCode(),
                codeFrom(dto.getDistJobDesc()),
                codeFrom(dto.getAllocationCode()),
                codeFrom(dto.getHomeAllocation()));
        dto.setProject(project != null ? project : "Unknown");

        return dto;
    }

    private static String codeFrom(String s) {
        if (s == null || s.isBlank())
            return null;
        var m = JOB_CODE_RE.matcher(s);
        return m.find() ? m.group().toUpperCase() : null;
    }

    private static String firstNonBlank(String... vals) {
        for (String v : vals)
            if (v != null && !v.isBlank())
                return v.trim();
        return null;
    }

    private static String nz(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    @Override
    public List<CurrentAssignmentDTO> currentAssignments(int windowDays) {
        // Latest row per employee inside window
        final String sql = """
                                SELECT *
                FROM (
                  SELECT
                    UPPER(t.ee_code) AS emp_code,
                    t.dist_department_desc,
                    t.home_department_desc,
                    t.dist_job_code,
                    t.dist_job_desc,
                    t.allocation_code,
                    t.home_job_code,
                    COALESCE(t.out_punch_time, t.in_punch_time) AS last_seen,
                    ROW_NUMBER() OVER (
                      PARTITION BY UPPER(t.ee_code)
                      ORDER BY COALESCE(t.out_punch_time, t.in_punch_time) DESC
                    ) rn
                  FROM paycom_time_report t
                  WHERE COALESCE(t.out_punch_time, t.in_punch_time) >= NOW() - INTERVAL ? DAY
                ) s
                WHERE s.rn = 1
                                """;

        return jdbc.query(sql, ps -> ps.setInt(1, windowDays), (rs, i) -> {
            CurrentAssignmentDTO d = new CurrentAssignmentDTO();
            String emp = nz(rs.getString("emp_code"));
            String distDept = nz(rs.getString("dist_department_desc"));
            String homeDept = nz(rs.getString("home_department_desc"));
            String distJob = nz(rs.getString("dist_job_code"));
            String distJobDesc = nz(rs.getString("dist_job_desc"));
            String alloc = nz(rs.getString("allocation_code"));
            String homeJob = nz(rs.getString("home_job_code"));
            Timestamp ts = rs.getTimestamp("last_seen");

            d.setEmployeeCode(emp);
            d.setWorkGroup(firstNonBlank(distDept, homeDept));
            String job = firstNonBlank(
                    distJob,
                    codeFrom(distJobDesc),
                    codeFrom(alloc),
                    homeJob);
            d.setJobNumber(job);
            d.setProject(job); // your UI treats project as the code key
            d.setLastSeenAt(ts == null ? null : ts.toLocalDateTime());
            return d;
        });
    }

    @Override
    public List<CurrentAssignmentDTO> currentAssignmentsFor(List<String> empCodes, int windowDays) {
        if (empCodes == null || empCodes.isEmpty()) {
            return currentAssignments(windowDays);
        }
        // Uppercase keys to match query projection
        final Set<String> want = empCodes.stream()
                .filter(Objects::nonNull)
                .map(s -> s.trim().toUpperCase())
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());

        // Keep SQL simple; filter in Java. If this window is huge for you, we can push
        // an IN (...) into SQL.
        List<CurrentAssignmentDTO> all = currentAssignments(windowDays);
        List<CurrentAssignmentDTO> out = new ArrayList<>(want.size());
        for (CurrentAssignmentDTO d : all) {
            if (d.getEmployeeCode() != null && want.contains(d.getEmployeeCode())) {
                out.add(d);
            }
        }
        return out;
    }

}
