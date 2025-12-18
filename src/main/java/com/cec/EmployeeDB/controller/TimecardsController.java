// src/main/java/com/cec/EmployeeDB/controller/TimecardsController.java
package com.cec.EmployeeDB.controller;

import com.cec.EmployeeDB.Service.TimecardsService;
import com.cec.EmployeeDB.Dto.*;
import com.cec.EmployeeDB.Service.TimecardImportService;
import com.cec.EmployeeDB.Service.TimecardPredictionService;
import com.cec.EmployeeDB.Service.TimecardQueryService;
import com.cec.EmployeeDB.Service.TimecardCacheService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.servlet.http.HttpServletRequest;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/timecards")
@RequiredArgsConstructor
public class TimecardsController {

    private final TimecardImportService importService;
    private final TimecardPredictionService predictionService;
    private final TimecardQueryService timecardQueryService;
    private final TimecardCacheService cacheService;
    private final TimecardsService timecardsService;

    // NEW: JDBC fallback to guarantee /current-assignments/by-emp works even if the
    // service path fails
    private final JdbcTemplate jdbc;

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportResultDTO> importFile(
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "replaceAll", defaultValue = "false") boolean replaceAll,
            HttpServletRequest req) throws Exception {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return ResponseEntity.ok(new ImportResultDTO(0L, 0, 0, 0, 0));
        }
        var result = importService.importCsv(file, replaceAll);
        return ResponseEntity.ok(result);
    }

    // FE uses this for Gantt
    @GetMapping("/range")
    public ResponseEntity<List<TimecardDTO>> getRange(@RequestParam Map<String, String> qp) {
        // Accept both styles: start/end and startDate/endDate
        String s = qp.getOrDefault("startDate", qp.get("start"));
        String e = qp.getOrDefault("endDate", qp.get("end"));
        int limit;
        try {
            limit = Integer.parseInt(qp.getOrDefault("limit", "6000"));
        } catch (NumberFormatException ex) {
            limit = 6000;
        }

        LocalDate endDate = null, startDate = null;
        try {
            endDate = (e != null && !e.isBlank()) ? LocalDate.parse(e) : null;
        } catch (Exception ignored) {
        }
        try {
            startDate = (s != null && !s.isBlank()) ? LocalDate.parse(s) : null;
        } catch (Exception ignored) {
        }

        if (endDate == null)
            endDate = LocalDate.now();
        if (startDate == null)
            startDate = endDate.minusMonths(12);

        List<TimecardDTO> rows = timecardsService.findInRange(startDate, endDate, limit);
        return ResponseEntity.ok(rows);
    }

    // Server-side paginated variant for large windows
    @GetMapping("/range/paged")
    public ResponseEntity<Map<String, Object>> getRangePaged(@RequestParam Map<String, String> qp) {
        String s = qp.getOrDefault("startDate", qp.get("start"));
        String e = qp.getOrDefault("endDate", qp.get("end"));
        int page = 0, size = 2000;
        try { page = Integer.parseInt(qp.getOrDefault("page", "0")); } catch (Exception ignored) {}
        try { size = Integer.parseInt(qp.getOrDefault("size", "2000")); } catch (Exception ignored) {}

        LocalDate startDate = (s != null && !s.isBlank()) ? LocalDate.parse(s) : LocalDate.now().minusMonths(12);
        LocalDate endDate = (e != null && !e.isBlank()) ? LocalDate.parse(e) : LocalDate.now();

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 10000)), Sort.by(Sort.Direction.DESC, "inPunchTime"));
        var resultPage = timecardsService.findInRangePaged(startDate, endDate, pageable);

        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("content", resultPage.getContent());
        body.put("page", resultPage.getNumber());
        body.put("size", resultPage.getSize());
        body.put("totalElements", resultPage.getTotalElements());
        body.put("totalPages", resultPage.getTotalPages());
        body.put("hasNext", resultPage.hasNext());
        body.put("hasPrevious", resultPage.hasPrevious());
        return ResponseEntity.ok(body);
    }

    // Manual cache refresh (call after big backfills/imports)
    @PostMapping("/cache/refresh")
    public ResponseEntity<Map<String, Object>> refreshCache(
            @RequestParam("start") String start,
            @RequestParam("end") String end,
            HttpServletRequest req) {

        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return ResponseEntity.ok(Map.of("status", "smoke", "message", "skipped cache refresh"));
        }

        LocalDate s = LocalDate.parse(start);
        LocalDate e = LocalDate.parse(end);

        var result = cacheService.refreshWindow(s, e);
        int inserted = result.inserted();

        return ResponseEntity.ok(Map.of("start", s.toString(), "end", e.toString(), "inserted", inserted));
    }

    @GetMapping("/predict/{empCode}")
    public ResponseEntity<LastWorkedPredictionDTO> predict(@PathVariable String empCode) {
        return ResponseEntity.ok(predictionService.predictForEmp(empCode));
    }

    @PostMapping("/predict/batch")
    public ResponseEntity<BatchPredictionResponse> predictBatch(@RequestBody EmpCodeBatchRequest req) {
        var preds = predictionService.predictForEmpList(
                Optional.ofNullable(req).map(EmpCodeBatchRequest::getEmpCodes).orElse(List.of()));
        return ResponseEntity.ok(BatchPredictionResponse.builder().predictions(preds).build());
    }

    @PostMapping("/predict/rebuild")
    public Map<String, Object> rebuildPredictions(@RequestParam(defaultValue = "28") int windowDays, HttpServletRequest req) {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return Map.of("status", "smoke", "message", "skipped rebuild");
        }
        return timecardsService.rebuild(windowDays);
    }

    @PostMapping("/latest-by-emp")
    public ResponseEntity<?> latestByEmp(@RequestBody EmpCodeBatchRequest req,
            @RequestParam(defaultValue = "180") int windowDays) {
        try {
            List<String> codes = Optional.ofNullable(req.getEmpCodes()).orElseGet(List::of);
            var map = timecardQueryService.latestByEmpCodes(codes, windowDays);
            return ResponseEntity.ok(BatchLatestResponse.builder().predictions(map).build());
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                    "error", "latest-by-emp failed",
                    "message", ex.getMessage()));
        }
    }

    @GetMapping("/latest/{eeCode}")
    public ResponseEntity<?> latestOne(
            @PathVariable String eeCode,
            @RequestParam(defaultValue = "180") int windowDays) {
        try {
            return ResponseEntity.ok(timecardQueryService.latestForEmp(eeCode, windowDays));
        } catch (Exception ex) {
            java.util.Map<String, Object> err = new java.util.LinkedHashMap<>();
            err.put("error", "latest-for-emp failed");
            err.put("message", ex.getMessage());
            return ResponseEntity.status(500).body(err);
        }
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> upload(@RequestParam("file") MultipartFile file, HttpServletRequest req) throws Exception {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return ResponseEntity.ok(Map.of("status", "smoke", "message", "skipped upload"));
        }
        var result = timecardsService.ingest(file); // stream/parse; write rows
        return ResponseEntity.ok(result); // e.g. { rowsIngested, duplicates, errors }
    }

    @GetMapping("/range/sample")
    public List<TimecardDTO> sample(@RequestParam(defaultValue = "7") int days,
            @RequestParam(defaultValue = "25") int limit) {
        var end = LocalDate.now();
        var start = end.minusDays(days);
        return timecardsService.findInRange(start, end, limit);
    }

    /**
     * Simple search endpoint for the Timecards page.
     * Returns weekly grouped hours with basic employee/project context.
     */
    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> search(@RequestParam Map<String, String> qp) {
        String empCode = trimToNull(qp.get("employeeCode"));
        String empName = trimToNull(qp.get("employeeName"));
        String project = trimToNull(qp.get("project"));
        String businessTitle = trimToNull(qp.get("businessTitle"));
        String workGroup = trimToNull(qp.get("workGroup"));

        LocalDate endDate = resolveEndDate(qp.get("endDate"));
        LocalDate startDate = resolveStartDate(qp.get("startDate"), endDate);

        int page = 0;
        int size = 100;
        try {
            page = Math.max(0, Integer.parseInt(qp.getOrDefault("page", "0")));
        } catch (Exception ignored) {
        }
        try {
            size = Math.max(1, Math.min(Integer.parseInt(qp.getOrDefault("size", "100")), 1000));
        } catch (Exception ignored) {
        }
        int offset = page * size;

        final String sqlTemplate = """
                SELECT
                  DATE_FORMAT(
                    DATE_ADD(
                      t.work_date,
                      INTERVAL MOD(8 - DAYOFWEEK(t.work_date), 7) DAY
                    ),
                    '%%Y-%%m-%%d'
                  ) AS week_ending,
                  UPPER(t.ee_code) AS employee_code,
                  COALESCE(f.display_name,
                           CONCAT(TRIM(COALESCE(f.legal_firstname, '')), ' ', TRIM(COALESCE(f.legal_lastname, ''))),
                           f.employee_code) AS employee_name,
                  COALESCE(t.dist_job_code, t.home_job_code, t.allocation_code) AS project_code,
                  COALESCE(t.dist_job_desc, t.home_job_desc, t.dist_department_desc, t.home_department_desc) AS project_desc,
                  COALESCE(f.business_title, f.position_title) AS business_title,
                  f.work_group,
                  SUM(COALESCE(t.earn_hours, t.units, 0)) AS hours
                FROM paycom_time_report t
                LEFT JOIN field f ON f.employee_code = t.ee_code
                WHERE t.work_date BETWEEN ? AND ?
                  AND t.work_date IS NOT NULL
                  %s
                GROUP BY 1,2,3,4,5,6,7
                ORDER BY week_ending DESC, employee_name ASC
                LIMIT ? OFFSET ?
                """;

        // Build optional predicates + params
        StringBuilder where = new StringBuilder();
        List<Object> params = new ArrayList<>();
        params.add(startDate);
        params.add(endDate);

        if (empCode != null) {
            where.append(" AND UPPER(t.ee_code) LIKE ?");
            params.add("%" + empCode.toUpperCase() + "%");
        }
        if (empName != null) {
            where.append(" AND (f.display_name LIKE ? OR CONCAT(f.legal_firstname, ' ', f.legal_lastname) LIKE ?)");
            params.add("%" + empName + "%");
            params.add("%" + empName + "%");
        }
        if (project != null) {
            where.append(" AND (t.dist_job_code LIKE ? OR t.home_job_code LIKE ? OR t.dist_job_desc LIKE ? OR t.home_job_desc LIKE ?)");
            params.add("%" + project + "%");
            params.add("%" + project + "%");
            params.add("%" + project + "%");
            params.add("%" + project + "%");
        }
        if (businessTitle != null) {
            where.append(" AND (f.business_title LIKE ? OR f.position_title LIKE ?)");
            params.add("%" + businessTitle + "%");
            params.add("%" + businessTitle + "%");
        }
        if (workGroup != null) {
            where.append(" AND f.work_group LIKE ?");
            params.add("%" + workGroup + "%");
        }

        params.add(size);
        params.add(offset);

        String finalSql = sqlTemplate.formatted(where.toString());

        List<Map<String, Object>> rows = jdbc.query(
                finalSql,
                ps -> {
                    for (int i = 0; i < params.size(); i++) {
                        ps.setObject(i + 1, params.get(i));
                    }
                },
                (rs, i) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("weekEnding", rs.getString("week_ending"));
                    m.put("employeeCode", rs.getString("employee_code"));
                    m.put("employeeName", rs.getString("employee_name"));
                    String projCode = rs.getString("project_code");
                    String projDesc = rs.getString("project_desc");
                    m.put("project", projDesc != null ? projDesc : projCode);
                    m.put("projectCode", projCode);
                    m.put("businessTitle", rs.getString("business_title"));
                    m.put("workGroup", rs.getString("work_group"));
                    m.put("hours", rs.getBigDecimal("hours"));
                    return m;
                });

        return ResponseEntity.ok(rows);
    }

    /**
     * Options for dropdowns on the Timecards page.
     */
    @GetMapping("/options")
    public ResponseEntity<Map<String, List<String>>> options() {
        List<String> projects = jdbc.query(
                """
                SELECT DISTINCT COALESCE(dist_job_code, home_job_code)
                FROM paycom_time_report
                WHERE work_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
                  AND COALESCE(dist_job_code, home_job_code) IS NOT NULL
                ORDER BY 1
                LIMIT 500
                """,
                (rs, i) -> rs.getString(1));

        List<String> titles = jdbc.query(
                """
                SELECT DISTINCT COALESCE(business_title, position_title)
                FROM field
                WHERE COALESCE(business_title, position_title) IS NOT NULL
                ORDER BY 1
                LIMIT 500
                """,
                (rs, i) -> rs.getString(1));

        List<String> groups = jdbc.query(
                """
                SELECT DISTINCT work_group
                FROM field
                WHERE work_group IS NOT NULL
                ORDER BY 1
                LIMIT 300
                """,
                (rs, i) -> rs.getString(1));

        return ResponseEntity.ok(Map.of(
                "projects", projects,
                "businessTitles", titles,
                "workGroups", groups
        ));
    }

    /**
     * Detailed rows for a given employee week (optionally narrowed by project code).
     */
    @GetMapping("/week-detail")
    public ResponseEntity<List<Map<String, Object>>> weekDetail(
            @RequestParam("eeCode") String eeCode,
            @RequestParam("weekEnding") String weekEnding,
            @RequestParam(value = "projectCode", required = false) String projectCode) {

        if (eeCode == null || eeCode.isBlank() || weekEnding == null || weekEnding.isBlank()) {
            return ResponseEntity.badRequest().body(List.of());
        }

        LocalDate end = LocalDate.parse(weekEnding);
        LocalDate start = end.minusDays(6);

        StringBuilder where = new StringBuilder();
        List<Object> params = new ArrayList<>();
        params.add(eeCode);
        params.add(start);
        params.add(end);

        if (trimToNull(projectCode) != null) {
            where.append(" AND (COALESCE(t.dist_job_code, t.home_job_code, t.allocation_code) = ?)");
            params.add(projectCode);
        }

        final String sql = """
                SELECT
                  t.work_date,
                  COALESCE(t.dist_job_code, t.home_job_code, t.allocation_code) AS project_code,
                  COALESCE(t.dist_job_desc, t.home_job_desc, t.dist_department_desc, t.home_department_desc) AS project_desc,
                  COALESCE(t.dist_activity_desc, t.home_activity_desc, t.earn_code) AS activity,
                  t.in_punch_time,
                  t.out_punch_time,
                  COALESCE(t.earn_hours, t.units, 0) AS hours
                FROM paycom_time_report t
                WHERE UPPER(t.ee_code) = UPPER(?)
                  AND t.work_date BETWEEN ? AND ?
                  %s
                ORDER BY t.work_date, t.in_punch_time
                """.formatted(where.toString());

        List<Map<String, Object>> rows = jdbc.query(
                sql,
                ps -> {
                    for (int i = 0; i < params.size(); i++) {
                        ps.setObject(i + 1, params.get(i));
                    }
                },
                (rs, i) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    LocalDate wd = rs.getObject("work_date", LocalDate.class);
                    m.put("workDate", wd != null ? wd.toString() : null);
                    m.put("projectCode", rs.getString("project_code"));
                    m.put("projectDesc", rs.getString("project_desc"));
                    m.put("activity", rs.getString("activity"));
                    m.put("inPunch", rs.getString("in_punch_time"));
                    m.put("outPunch", rs.getString("out_punch_time"));
                    m.put("hours", rs.getBigDecimal("hours"));
                    return m;
                });

        return ResponseEntity.ok(rows);
    }

    // Front-end calls this after import to clean bad zero dates/nulls in stage
    @PostMapping("/normalize")
    public ResponseEntity<Map<String, Object>> normalizeStage(HttpServletRequest req) {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return ResponseEntity.ok(Map.of("status", "smoke", "message", "skipped normalize"));
        }
        var result = timecardsService.normalizeZeroDatesAndNulls();
        // include a timestamp for FE progress indicator
        result.put("normalizedAt", LocalDateTime.now().toString());
        return ResponseEntity.ok(result);
    }

    // Simple: whole company latest-per-emp inside window
    @GetMapping("/current-assignments")
    public Map<String, Object> currentAssignments(@RequestParam(defaultValue = "45") int days) {
        List<CurrentAssignmentDTO> items = timecardsService.currentAssignments(days);
        return Map.of("days", days, "count", items.size(), "items", items);
    }

    // Efficient for Home: only for the employees on-screen
    @PostMapping("/current-assignments/by-emp")
    public ResponseEntity<Map<String, Object>> currentAssignmentsByEmp(
            @RequestBody EmpCodeBatchRequest req,
            @RequestParam(defaultValue = "45") int days) {
        try {
            final List<String> codes = Optional.ofNullable(req)
                    .map(EmpCodeBatchRequest::getEmpCodes)
                    .orElseGet(List::of)
                    .stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(String::toUpperCase)
                    .distinct()
                    .toList();

            if (codes.isEmpty()) {
                return ResponseEntity.ok(Map.of("days", days, "count", 0, "items", List.of()));
            }

            try {
                List<CurrentAssignmentDTO> items = timecardsService.currentAssignmentsFor(codes, days);
                return ResponseEntity.ok(Map.of("days", days, "count", items.size(), "items", items));
            } catch (Exception serviceFailure) {
                try {
                    final String placeholders = codes.stream().map(c -> "?").collect(Collectors.joining(","));
                    final String sql = """
                        SELECT UPPER(t.ee_code) AS employee_code,
                               MAX(COALESCE(t.out_punch_time, t.in_punch_time)) AS last_seen_at,
                               SUBSTRING_INDEX(
                                   GROUP_CONCAT(COALESCE(t.allocation_code, t.home_job_code)
                                                ORDER BY COALESCE(t.out_punch_time, t.in_punch_time) DESC),
                                   ',', 1) AS job_number,
                               SUBSTRING_INDEX(
                                   GROUP_CONCAT(COALESCE(t.home_job_desc, t.home_department_desc, t.dist_department_desc)
                                                ORDER BY COALESCE(t.out_punch_time, t.in_punch_time) DESC),
                                   ',', 1) AS project,
                               SUBSTRING_INDEX(
                                   GROUP_CONCAT(COALESCE(t.home_department_desc, t.home_department)
                                                ORDER BY COALESCE(t.out_punch_time, t.in_punch_time) DESC),
                                   ',', 1) AS work_group
                          FROM paycom_time_report t
                         WHERE UPPER(t.ee_code) IN (%s)
                           AND (t.out_punch_time >= NOW() - INTERVAL ? DAY
                                OR t.in_punch_time >= NOW() - INTERVAL ? DAY)
                         GROUP BY UPPER(t.ee_code)
                        """.formatted(placeholders);

                    final List<Object> params = new ArrayList<>();
                    params.addAll(codes);
                    params.add(days);
                    params.add(days);

                    List<Map<String, Object>> rows = jdbc.query(
                            sql,
                            ps -> {
                                for (int j = 0; j < params.size(); j++) {
                                    ps.setObject(j + 1, params.get(j));
                                }
                            },
                            (rs, i) -> {
                                Map<String, Object> r = new LinkedHashMap<>();
                                r.put("employeeCode", rs.getString("employee_code"));
                                r.put("jobNumber", rs.getString("job_number"));
                                r.put("project", rs.getString("project"));
                                r.put("workGroup", rs.getString("work_group"));
                                Timestamp ts = rs.getTimestamp("last_seen_at");
                                r.put("lastSeenAt", ts != null ? ts.toLocalDateTime().toString() : null);
                                return r;
                            });

                    Map<String, Map<String, Object>> best = new HashMap<>();
                    for (Map<String, Object> r : rows) {
                        String code = (String) r.get("employeeCode");
                        String dtStr = (String) r.get("lastSeenAt");
                        LocalDateTime cur = dtStr != null ? LocalDateTime.parse(dtStr) : LocalDateTime.MIN;
                        Map<String, Object> prev = best.get(code);
                        if (prev == null) {
                            best.put(code, r);
                        } else {
                            String prevDtStr = (String) prev.get("lastSeenAt");
                            LocalDateTime prevT = prevDtStr != null ? LocalDateTime.parse(prevDtStr) : LocalDateTime.MIN;
                            if (cur.isAfter(prevT)) best.put(code, r);
                        }
                    }

                    List<Map<String, Object>> items = new ArrayList<>(best.values());
                    return ResponseEntity.ok(Map.of("days", days, "count", items.size(), "items", items));
                } catch (Exception jdbcFailure) {
                    return ResponseEntity.status(500).body(Map.of(
                            "error", "current-assignments/by-emp failed",
                            "serviceMessage", serviceFailure.getMessage(),
                            "jdbcMessage", jdbcFailure.getMessage()));
                }
            }
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(Map.of(
                    "error", "current-assignments/by-emp failed",
                    "message", ex.getMessage()));
        }
    }

    // ADD: return recent "spans" for one employee over a date window
    @GetMapping("/spans")
    public ResponseEntity<List<Map<String, Object>>> spans(
            @RequestParam("ee") String ee,
            @RequestParam("start") String start,
            @RequestParam("end") String end,
            @RequestParam(value = "limit", defaultValue = "50") int limit) {

        // Parse dates (inclusive)
        LocalDate s = LocalDate.parse(start);
        LocalDate e = LocalDate.parse(end);

        // Aggregate by job/activity; use work_date when punches are null
        final String sql = """
                SELECT
                  UPPER(t.ee_code)                                                   AS employee_code,
                  COALESCE(t.dist_job_code, t.home_job_code, t.allocation_code)     AS job_code,
                  COALESCE(t.dist_job_desc, t.home_job_desc, t.dist_department_desc,
                           t.home_department_desc)                                   AS job_desc,
                  COALESCE(t.dist_activity_desc, t.home_activity_desc, t.earn_code) AS activity,
                  MIN(COALESCE(t.in_punch_time,  CAST(t.work_date AS DATETIME)))    AS start_ts,
                  MAX(COALESCE(t.out_punch_time, CAST(t.work_date AS DATETIME)))    AS end_ts,
                  SUM(COALESCE(t.earn_hours, t.units, 0))                           AS total_hours
                FROM paycom_time_report t
                WHERE UPPER(t.ee_code) = UPPER(?)
                  AND t.work_date BETWEEN ? AND ?
                GROUP BY employee_code, job_code, job_desc, activity
                ORDER BY end_ts DESC
                LIMIT ?
                """;

        List<Map<String, Object>> rows = jdbc.query(
                con -> {
                    var ps = con.prepareStatement(sql);
                    ps.setString(1, ee);
                    ps.setObject(2, s);
                    ps.setObject(3, e);
                    ps.setInt(4, Math.max(1, limit));
                    return ps;
                },
                (rs, i) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("employeeCode", rs.getString("employee_code"));
                    m.put("jobCode", rs.getString("job_code"));
                    m.put("jobDesc", rs.getString("job_desc"));
                    m.put("activity", rs.getString("activity"));
                    var st = rs.getTimestamp("start_ts");
                    var en = rs.getTimestamp("end_ts");
                    // Use local datetime instead of UTC
                    m.put("start", st != null ? st.toLocalDateTime().toString() : null);
                    m.put("end", en != null ? en.toLocalDateTime().toString() : null);
                    m.put("totalHours", rs.getBigDecimal("total_hours"));
                    return m;
                });

        return ResponseEntity.ok(rows);
    }

    // Raw timecard data with proper local datetime formatting (no UTC conversion)
    @GetMapping("/raw")
    public ResponseEntity<Map<String, Object>> rawTimecards(
            @RequestParam(value = "eeCode", required = false) String eeCode,
            @RequestParam(value = "start", required = false) String start,
            @RequestParam(value = "end", required = false) String end,
            @RequestParam(value = "limit", defaultValue = "1000") int limit) {

        if (eeCode == null || eeCode.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "eeCode parameter is required"));
        }

        final LocalDate endDate = resolveEndDate(end);
        final LocalDate startDate = resolveStartDate(start, endDate);
        final int maxLimit = Math.max(1, Math.min(limit, 5000));

        final String sql = """
                SELECT
                  t.ee_code,
                  t.work_date,
                  t.in_punch_time,
                  t.out_punch_time,
                  COALESCE(t.dist_job_code, t.home_job_code, t.allocation_code) AS job_code,
                  COALESCE(t.dist_job_desc, t.home_job_desc) AS job_desc,
                  COALESCE(t.dist_activity_code, t.home_activity_code) AS activity_code,
                  COALESCE(t.dist_activity_desc, t.home_activity_desc, t.earn_code) AS activity_desc,
                  t.earn_hours
                FROM paycom_time_report t
                WHERE UPPER(t.ee_code) = UPPER(?)
                  AND t.work_date BETWEEN ? AND ?
                ORDER BY t.work_date, t.in_punch_time
                LIMIT ?
                """;

        List<Map<String, Object>> rows = jdbc.query(
                sql,
                ps -> {
                    ps.setString(1, eeCode);
                    ps.setObject(2, startDate);
                    ps.setObject(3, endDate);
                    ps.setInt(4, maxLimit);
                },
                (rs, rowNum) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("ee_code", rs.getString("ee_code"));

                    LocalDate wd = rs.getObject("work_date", LocalDate.class);
                    m.put("work_date", wd != null ? wd.toString() : null);

                    // Keep timestamps in local time - don't convert to UTC
                    Timestamp inTs = rs.getTimestamp("in_punch_time");
                    Timestamp outTs = rs.getTimestamp("out_punch_time");
                    m.put("in_punch_time", inTs != null ? inTs.toLocalDateTime().toString() : null);
                    m.put("out_punch_time", outTs != null ? outTs.toLocalDateTime().toString() : null);

                    m.put("dist_job_code", rs.getString("job_code"));
                    m.put("dist_activity_code", rs.getString("activity_code"));
                    m.put("dist_activity_desc", rs.getString("activity_desc"));
                    m.put("earn_hours", rs.getBigDecimal("earn_hours"));

                    return m;
                });

        return ResponseEntity.ok(Map.of("rows", rows));
    }

    // NEW: raw rows for one employee over a date window
    @GetMapping("/by-emp")
    public ResponseEntity<List<Map<String, Object>>> byEmp(
            @RequestParam("ee") String ee,
            @RequestParam(value = "start", required = false) String start,
            @RequestParam(value = "end", required = false) String end,
            @RequestParam(value = "limit", defaultValue = "1000") int limit) {

        if (ee == null || ee.isBlank()) {
            return ResponseEntity.badRequest().body(List.of());
        }

        // Resolve dates once – these are now effectively final
        final LocalDate endDate = resolveEndDate(end);
        final LocalDate startDate = resolveStartDate(start, endDate);

        final int maxLimit = Math.max(1, Math.min(limit, 5000));

        final String sql = """
                SELECT
                  t.ee_code,
                  t.work_date,
                  t.in_punch_time,
                  t.out_punch_time,
                  COALESCE(t.dist_job_code, t.home_job_code, t.allocation_code)     AS job_code,
                  COALESCE(t.dist_job_desc, t.home_job_desc, t.dist_department_desc,
                           t.home_department_desc)                                   AS job_desc,
                  COALESCE(t.dist_activity_desc, t.home_activity_desc, t.earn_code) AS activity,
                  t.earn_hours
                FROM paycom_time_report t
                WHERE UPPER(t.ee_code) = UPPER(?)
                  AND t.work_date BETWEEN ? AND ?
                ORDER BY t.work_date, t.in_punch_time
                LIMIT ?
                """;

        List<Map<String, Object>> rows = jdbc.query(
                sql,
                ps -> {
                    ps.setString(1, ee);
                    ps.setObject(2, startDate);
                    ps.setObject(3, endDate);
                    ps.setInt(4, maxLimit);
                },
                (rs, rowNum) -> {
                    Map<String, Object> m = new LinkedHashMap<>();

                    String code = rs.getString("ee_code");
                    m.put("ee_code", code);
                    m.put("eeCode", code);
                    m.put("employeeCode", code);

                    LocalDate wd = rs.getObject("work_date", LocalDate.class);
                    if (wd != null) {
                        String wdStr = wd.toString();
                        m.put("workDate", wdStr);
                        m.put("work_date", wdStr);
                        m.put("date", wdStr);
                    }

                    String inRaw = rs.getString("in_punch_time");
                    String outRaw = rs.getString("out_punch_time");

                    // Pass through exactly what MySQL returns, no timezone conversions
                    m.put("in_punch_time", inRaw);
                    m.put("out_punch_time", outRaw);

                    String jobCode = rs.getString("job_code");
                    String jobDesc = rs.getString("job_desc");
                    String activity = rs.getString("activity");
                    BigDecimal hours = rs.getBigDecimal("earn_hours");

                    // Job / project info – multiple aliases for the FE normalizer
                    m.put("dist_job_code", jobCode);
                    m.put("job_code", jobCode);
                    m.put("jobCode", jobCode);
                    m.put("jobNumber", jobCode);

                    m.put("dist_job_desc", jobDesc);
                    m.put("job_desc", jobDesc);
                    m.put("jobDesc", jobDesc);
                    m.put("project", jobDesc);

                    // Activity / earn code
                    m.put("dist_activity_desc", activity);
                    m.put("activity", activity);
                    m.put("earn_code_desc", activity);

                    // Hours
                    m.put("earn_hours", hours);
                    m.put("hours", hours);
                    m.put("totalHours", hours);

                    return m;
                });

        return ResponseEntity.ok(rows);
    }

    /* ---------- helpers (add these inside TimecardsController) ---------- */

    private static LocalDate resolveEndDate(String end) {
        if (end == null || end.isBlank()) {
            return LocalDate.now();
        }
        try {
            return LocalDate.parse(end);
        } catch (Exception e) {
            return LocalDate.now();
        }
    }

    private static LocalDate resolveStartDate(String start, LocalDate endDate) {
        LocalDate defaultStart = endDate.minusDays(30);
        if (start == null || start.isBlank()) {
            return defaultStart;
        }
        try {
            return LocalDate.parse(start);
        } catch (Exception e) {
            return defaultStart;
        }
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    // OPTIONAL: simple latest-by-emp fallback using the same table
    @GetMapping("/latest")
    public ResponseEntity<Map<String, Object>> latest(@RequestParam("eeCode") String ee) {
        final String sql = """
                  SELECT
                    COALESCE(t.out_punch_time, t.in_punch_time, CAST(t.work_date AS DATETIME)) AS ts,
                    COALESCE(t.dist_job_code, t.home_job_code, t.allocation_code)              AS job_code,
                    COALESCE(t.dist_job_desc, t.home_job_desc, t.dist_department_desc,
                             t.home_department_desc)                                          AS job_desc
                  FROM paycom_time_report t
                  WHERE UPPER(t.ee_code) = UPPER(?)
                  ORDER BY ts DESC
                  LIMIT 1
                """;
        List<Map<String, Object>> out = jdbc.query(sql, ps -> ps.setString(1, ee),
                (rs, i) -> {
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("employeeCode", ee);
                    result.put("eeCode", ee);

                    Timestamp ts = rs.getTimestamp("ts");
                    // Use local datetime instead of UTC
                    result.put("last", ts != null ? ts.toLocalDateTime().toString() : null);

                    String jobCode = rs.getString("job_code");
                    result.put("jobCode", jobCode);
                    result.put("job_code", jobCode);

                    String jobDesc = rs.getString("job_desc");
                    result.put("jobDesc", jobDesc);
                    result.put("job_desc", jobDesc);
                    result.put("jobsite", jobDesc);
                    result.put("project", jobDesc);

                    result.put("workLocation", jobDesc);
                    result.put("work_location", jobDesc);

                    return result;
                });
        return ResponseEntity.ok(out.isEmpty() ? Map.of() : out.get(0));
    }

}
