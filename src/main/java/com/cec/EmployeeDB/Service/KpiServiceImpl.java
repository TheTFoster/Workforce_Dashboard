package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.Dto.KpiDashboardDTO;
import com.cec.EmployeeDB.Dto.KpiDashboardDTO.*;
import com.cec.EmployeeDB.Entity.Employee;
import com.cec.EmployeeDB.Repo.EmployeeRepo;
import com.cec.EmployeeDB.util.TitleClassifier;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class KpiServiceImpl implements KpiService {
    
    private static final Logger logger = LoggerFactory.getLogger(KpiServiceImpl.class);
    private static final Map<String, Object> NO_PARAMS = Map.of();
    private final EmployeeRepo employeeRepo;
    private final NamedParameterJdbcTemplate jdbc;

    @Override
    public KpiDashboardDTO getDashboardKpis() {
        logger.info("Generating KPI dashboard data");
        
        KpiDashboardDTO dto = new KpiDashboardDTO();
        dto.setEmployeeMetrics(safeExecute(this::getEmployeeMetrics, new EmployeeMetrics()));
        dto.setProjectDistribution(safeExecute(this::getProjectDistribution, new ArrayList<>()));
        ProjectHoursScope projectHoursScope = safeExecute(
            this::getProjectHoursScope,
            new ProjectHoursScope(null, null, 0.0)
        );
        dto.setProjectHoursStartDate(projectHoursScope.getStartDate());
        dto.setProjectHoursEndDate(projectHoursScope.getEndDate());
        dto.setProjectHoursTotal(projectHoursScope.getTotalHours());
        dto.setTransferAnalytics(safeExecute(this::getTransferAnalytics, new TransferAnalytics()));
        dto.setTimecardInsights(safeExecute(this::getTimecardInsights, new TimecardInsights()));
        dto.setAlertSummary(safeExecute(this::getAlertSummary, new AlertSummary()));
        dto.setTrendData(safeExecute(this::getTrendData, new TrendData()));
        
        return dto;
    }

    private <T> T safeExecute(java.util.function.Supplier<T> supplier, T defaultValue) {
        try {
            return supplier.get();
        } catch (Exception e) {
            logger.warn("Error during KPI calculation, returning default: {}", e.getMessage());
            return defaultValue;
        }
    }

    private EmployeeMetrics getEmployeeMetrics() {
        List<Employee> allEmployees = employeeRepo.findAll();
        
        LocalDate now = LocalDate.now();
        LocalDate firstOfMonth = now.withDayOfMonth(1);
        LocalDate firstOfYear = now.withDayOfYear(1);

        long total = allEmployees.size();
        long active = allEmployees.stream()
            .filter(e -> isActive(e.getEmployeeStatus()))
            .count();
        long activeLeased = allEmployees.stream()
            .filter(e -> e.isLeasedLabor() && isActive(e.getEmployeeStatus()))
            .count();
        long activeDirect = allEmployees.stream()
            .filter(e -> !e.isLeasedLabor() && isActive(e.getEmployeeStatus()))
            .count();
        long inactive = allEmployees.stream()
            .filter(e -> "Inactive".equalsIgnoreCase(e.getEmployeeStatus()))
            .count();
        long onLeave = allEmployees.stream()
            .filter(e -> "On Leave".equalsIgnoreCase(e.getEmployeeStatus()) || 
                        "Leave".equalsIgnoreCase(e.getEmployeeStatus()))
            .count();
        long terminated = allEmployees.stream()
            .filter(e -> "Terminated".equalsIgnoreCase(e.getEmployeeStatus()))
            .count();
        
        long newHiresMonth = allEmployees.stream()
            .filter(e -> e.getHireDate() != null && !e.getHireDate().isBefore(firstOfMonth))
            .count();
        
        long newHiresYear = allEmployees.stream()
            .filter(e -> e.getHireDate() != null && !e.getHireDate().isBefore(firstOfYear))
            .count();

        long leasedLabor = allEmployees.stream()
            .filter(Employee::isLeasedLabor)
            .count();
        
        long directHire = total - leasedLabor;

        Map<String, Long> statusBreakdown = allEmployees.stream()
            .collect(Collectors.groupingBy(
                e -> e.getEmployeeStatus() != null ? e.getEmployeeStatus() : "Unknown",
                Collectors.counting()
            ));

        EmployeeMetrics metrics = new EmployeeMetrics();
        metrics.setTotalEmployees(total);
        metrics.setActiveEmployees(active);
        metrics.setActiveLeasedLabor(activeLeased);
        metrics.setActiveDirectHire(activeDirect);
        metrics.setInactiveEmployees(inactive);
        metrics.setOnLeaveEmployees(onLeave);
        metrics.setTerminatedEmployees(terminated);
        metrics.setNewHiresThisMonth(newHiresMonth);
        metrics.setNewHiresThisYear(newHiresYear);
        metrics.setLeasedLaborCount(leasedLabor);
        metrics.setDirectHireCount(directHire);
        metrics.setStatusBreakdown(statusBreakdown);

        return metrics;
    }

    private boolean isActive(String status) {
        if (status == null) return false;
        String s = status.toLowerCase();
        return s.contains("active") || s.equals("employed") || s.equals("working");
    }

    private List<ProjectDistribution> getProjectDistribution() {
        try {
            String sql = """
                SELECT 
                    COALESCE(ptr.dist_job_code, 'Unassigned') as project_name,
                    COALESCE(ptr.home_department, 'N/A') as job_number,
                    COUNT(*) as employee_count,
                    COUNT(DISTINCT CASE WHEN f.employee_status = 'Active' THEN ptr.ee_code END) as active_count,
                    COUNT(DISTINCT CASE WHEN f.employee_status IN ('Inactive', 'Terminated') OR f.employee_status IS NULL THEN ptr.ee_code END) as inactive_count,
                    SUM(COALESCE(ptr.earn_hours, 0)) as total_hours
                FROM paycom_time_report ptr
                LEFT JOIN field f ON f.employee_code = ptr.ee_code
                GROUP BY COALESCE(ptr.dist_job_code, 'Unassigned'), COALESCE(ptr.home_department, 'N/A')
                ORDER BY employee_count DESC
                """;
            
            return jdbc.query(sql, NO_PARAMS, (rs, i) -> 
                new ProjectDistribution(
                    rs.getString("project_name"),
                    rs.getString("job_number"),
                    rs.getLong("employee_count"),
                    rs.getLong("active_count"),
                    rs.getLong("inactive_count"),
                    rs.getDouble("total_hours")
                )
            );
        } catch (Exception e) {
            logger.warn("Error fetching project distribution: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    private ProjectHoursScope getProjectHoursScope() {
        try {
            String sql = """
                SELECT 
                    MIN(work_date) as start_date,
                    MAX(work_date) as end_date,
                    SUM(COALESCE(earn_hours, 0)) as total_hours
                FROM paycom_time_report
                """;

            Map<String, Object> result = jdbc.queryForMap(sql, NO_PARAMS);
            String start = formatDateObject(result.get("start_date"));
            String end = formatDateObject(result.get("end_date"));
            double totalHours = result.get("total_hours") != null
                ? ((Number) result.get("total_hours")).doubleValue()
                : 0.0;

            return new ProjectHoursScope(start, end, totalHours);
        } catch (Exception e) {
            logger.warn("Error fetching project hours scope: {}", e.getMessage());
            return new ProjectHoursScope(null, null, 0.0);
        }
    }

    private String formatDateObject(Object dateObj) {
        if (dateObj == null) return null;
        if (dateObj instanceof LocalDate) {
            return ((LocalDate) dateObj).toString();
        }
        if (dateObj instanceof java.sql.Date) {
            return ((java.sql.Date) dateObj).toLocalDate().toString();
        }
        return dateObj.toString();
    }

    private static class ProjectHoursScope {
        private final String startDate;
        private final String endDate;
        private final double totalHours;

        ProjectHoursScope(String startDate, String endDate, double totalHours) {
            this.startDate = startDate;
            this.endDate = endDate;
            this.totalHours = totalHours;
        }

        public String getStartDate() {
            return startDate;
        }

        public String getEndDate() {
            return endDate;
        }

        public double getTotalHours() {
            return totalHours;
        }
    }

    private TransferAnalytics getTransferAnalytics() {
        try {
            String countSql = """
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN DATE(effective_date) >= CURDATE() - INTERVAL 1 MONTH THEN 1 ELSE 0 END) as this_month,
                    SUM(CASE WHEN YEAR(effective_date) = YEAR(CURDATE()) THEN 1 ELSE 0 END) as this_year,
                    SUM(CASE WHEN transfer_status = 'Pending' THEN 1 ELSE 0 END) as pending
                FROM transfers_v2
                """;

            Map<String, Object> counts = jdbc.queryForMap(countSql, NO_PARAMS);
            long total = ((Number) counts.getOrDefault("total", 0L)).longValue();
            long thisMonth = ((Number) counts.getOrDefault("this_month", 0L)).longValue();
            long thisYear = ((Number) counts.getOrDefault("this_year", 0L)).longValue();
            long pending = ((Number) counts.getOrDefault("pending", 0L)).longValue();

            String recentSql = """
                SELECT 
                    t.transfer_id,
                    t.emp_code,
                    t.from_jobsite as from_location,
                    t.to_jobsite as to_location,
                    t.effective_date as transfer_date,
                    t.transfer_status
                FROM transfers_v2 t
                ORDER BY t.effective_date DESC
                LIMIT 10
                """;

            List<RecentTransfer> recentTransfers = jdbc.query(recentSql, NO_PARAMS, (rs, i) ->
                new RecentTransfer(
                    0, // Using 0 for employee ID since emp_code is string-based
                    rs.getString("emp_code"),
                    rs.getString("from_location"),
                    rs.getString("to_location"),
                    rs.getString("transfer_date"),
                    rs.getString("transfer_status")
                )
            );

            return new TransferAnalytics(total, thisMonth, thisYear, pending, recentTransfers);
        } catch (Exception e) {
            logger.warn("Error fetching transfer analytics: {}", e.getMessage());
            return new TransferAnalytics(0L, 0L, 0L, 0L, new ArrayList<>());
        }
    }

    private TimecardInsights getTimecardInsights() {
        try {
            LocalDate now = LocalDate.now();
            LocalDate fourWeeksAgo = now.minusWeeks(4);
            LocalDate firstOfMonth = now.withDayOfMonth(1);
            LocalDate startOfWeek = now.minusDays(now.getDayOfWeek().getValue() - 1); // Monday start

            String sql = """
                SELECT
                    COUNT(*) as total_entries,
                    SUM(CASE WHEN work_date >= :monthStart THEN 1 ELSE 0 END) as entries_this_month,
                    SUM(CASE WHEN work_date >= :weekStart THEN 1 ELSE 0 END) as entries_this_week,
                    AVG(CASE WHEN work_date >= :fourWeeksAgo THEN earn_hours ELSE NULL END) as avg_hours_week,
                    COUNT(DISTINCT ee_code) as unique_employees
                FROM paycom_time_report
                """;
            
            Map<String, Object> params = new HashMap<>();
            params.put("monthStart", firstOfMonth);
            params.put("weekStart", startOfWeek);
            params.put("fourWeeksAgo", fourWeeksAgo);

            Map<String, Object> result = jdbc.queryForMap(sql, params);
            
            return new TimecardInsights(
                ((Number) result.getOrDefault("total_entries", 0L)).longValue(),
                ((Number) result.getOrDefault("entries_this_month", 0L)).longValue(),
                ((Number) result.getOrDefault("entries_this_week", 0L)).longValue(),
                result.get("avg_hours_week") != null ? ((Number) result.get("avg_hours_week")).doubleValue() : 0.0,
                ((Number) result.getOrDefault("unique_employees", 0L)).longValue()
            );
        } catch (Exception e) {
            logger.warn("Error fetching timecard insights: {}", e.getMessage());
            return new TimecardInsights(0L, 0L, 0L, 0.0, 0L);
        }
    }

    private AlertSummary getAlertSummary() {
        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime startOfToday = now.toLocalDate().atStartOfDay();
            LocalDateTime startOfWeek = now.minusDays(now.getDayOfWeek().getValue() - 1).toLocalDate().atStartOfDay();

            String sql = """
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_alerts,
                    SUM(CASE WHEN severity = 'critical' AND status = 'open' THEN 1 ELSE 0 END) as critical,
                    SUM(CASE WHEN severity = 'warning' AND status = 'open' THEN 1 ELSE 0 END) as warning,
                    SUM(CASE WHEN severity = 'info' AND status = 'open' THEN 1 ELSE 0 END) as info,
                    SUM(CASE WHEN status = 'resolved' AND resolved_at >= :today THEN 1 ELSE 0 END) as resolved_today,
                    SUM(CASE WHEN status = 'resolved' AND resolved_at >= :weekStart THEN 1 ELSE 0 END) as resolved_week
                FROM alert_event
                """;
            
            Map<String, Object> params = new HashMap<>();
            params.put("today", startOfToday);
            params.put("weekStart", startOfWeek);

            Map<String, Object> result = jdbc.queryForMap(sql, params);
            
            return new AlertSummary(
                ((Number) result.getOrDefault("total", 0L)).longValue(),
                ((Number) result.getOrDefault("open_alerts", 0L)).longValue(),
                ((Number) result.getOrDefault("critical", 0L)).longValue(),
                ((Number) result.getOrDefault("warning", 0L)).longValue(),
                ((Number) result.getOrDefault("info", 0L)).longValue(),
                ((Number) result.getOrDefault("resolved_today", 0L)).longValue(),
                ((Number) result.getOrDefault("resolved_week", 0L)).longValue()
            );
        } catch (Exception e) {
            logger.warn("Error fetching alert summary: {}", e.getMessage());
            return new AlertSummary(0L, 0L, 0L, 0L, 0L, 0L, 0L);
        }
    }

    private TrendData getTrendData() {
        try {
            LocalDate now = LocalDate.now();
            LocalDate sixMonthsAgo = now.minusMonths(6);

            List<MonthlyTrend> hiringTrend = getHiringTrend(sixMonthsAgo);
            List<MonthlyTrend> terminationTrend = getTerminationTrend(sixMonthsAgo);
            List<MonthlyTrend> transferTrend = getTransferTrend(sixMonthsAgo);

            return new TrendData(hiringTrend, terminationTrend, transferTrend);
        } catch (Exception e) {
            logger.warn("Error fetching trend data: {}", e.getMessage());
            return new TrendData(new ArrayList<>(), new ArrayList<>(), new ArrayList<>());
        }
    }

    private List<MonthlyTrend> getHiringTrend(LocalDate since) {
        try {
            String sql = """
                SELECT
                    hire_date,
                    business_title
                FROM field
                WHERE hire_date >= :since
                AND hire_date IS NOT NULL
                """;

            Map<String, Object> params = new HashMap<>();
            params.put("since", since);
            List<TrendRow> rows = jdbc.query(sql, params, (rs, i) ->
                new TrendRow(
                    rs.getDate("hire_date") != null ? rs.getDate("hire_date").toLocalDate() : null,
                    rs.getString("business_title")
                )
            );
            return aggregateTrend(rows);
        } catch (Exception e) {
            logger.warn("Error fetching hiring trend: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    private List<MonthlyTrend> getTerminationTrend(LocalDate since) {
        try {
            LocalDate now = LocalDate.now();
            LocalDate futureLimit = now.plusMonths(1);
            String sql = """
                SELECT
                    termination_date,
                    business_title
                FROM field
                WHERE termination_date >= :since
                AND termination_date < :futureLimit
                AND termination_date IS NOT NULL
                """;

            Map<String, Object> params = new HashMap<>();
            params.put("since", since);
            params.put("futureLimit", futureLimit);
            List<TrendRow> rows = jdbc.query(sql, params, (rs, i) ->
                new TrendRow(
                    rs.getDate("termination_date") != null ? rs.getDate("termination_date").toLocalDate() : null,
                    rs.getString("business_title")
                )
            );
            return aggregateTrend(rows);
        } catch (Exception e) {
            logger.warn("Error fetching termination trend: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    private List<MonthlyTrend> getTransferTrend(LocalDate since) {
        try {
            String sql = """
                SELECT
                    t.effective_date,
                    f.business_title
                FROM transfers_v2 t
                LEFT JOIN field f ON f.employee_code = t.emp_code
                WHERE t.effective_date >= :since
                AND t.effective_date IS NOT NULL
                """;

            Map<String, Object> params = new HashMap<>();
            params.put("since", since);
            List<TrendRow> rows = jdbc.query(sql, params, (rs, i) ->
                new TrendRow(
                    rs.getDate("effective_date") != null ? rs.getDate("effective_date").toLocalDate() : null,
                    rs.getString("business_title")
                )
            );
            return aggregateTrend(rows);
        } catch (Exception e) {
            logger.warn("Error fetching transfer trend: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    private List<MonthlyTrend> aggregateTrend(List<TrendRow> rows) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM");
        Map<String, TrendCounts> byMonth = new TreeMap<>();

        for (TrendRow row : rows) {
            if (row.date == null) continue;
            String month = formatter.format(row.date.withDayOfMonth(1));
            TitleClassifier.Role role = TitleClassifier.classifyBusinessTitle(row.businessTitle);
            TrendCounts counts = byMonth.computeIfAbsent(month, m -> new TrendCounts());
            counts.increment(role);
        }

        List<MonthlyTrend> trends = new ArrayList<>();
        byMonth.forEach((month, counts) ->
            trends.add(new MonthlyTrend(month, counts.total(), counts.field, counts.professional))
        );
        return trends;
    }

    private record TrendRow(LocalDate date, String businessTitle) {}

    private static class TrendCounts {
        long field;
        long professional;
        long unknown;

        void increment(TitleClassifier.Role role) {
            switch (role) {
                case FIELD -> field++;
                case PROFESSIONAL -> professional++;
                default -> unknown++;
            }
        }

        long total() {
            return field + professional + unknown;
        }
    }
}
