package com.cec.EmployeeDB.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class KpiDashboardDTO {
    // Employee Metrics
    private EmployeeMetrics employeeMetrics;
    
    // Project Distribution
    private List<ProjectDistribution> projectDistribution;
    private Double projectHoursTotal;
    private String projectHoursStartDate;
    private String projectHoursEndDate;
    
    // Transfer Analytics
    private TransferAnalytics transferAnalytics;
    
    // Timecard Insights
    private TimecardInsights timecardInsights;
    
    // Alert Summary
    private AlertSummary alertSummary;
    
    // Trends
    private TrendData trendData;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeMetrics {
        private long totalEmployees;
        private long activeEmployees;
        private long activeLeasedLabor;
        private long activeDirectHire;
        private long inactiveEmployees;
        private long onLeaveEmployees;
        private long terminatedEmployees;
        private long newHiresThisMonth;
        private long newHiresThisYear;
        private long leasedLaborCount;
        private long directHireCount;
        private Map<String, Long> statusBreakdown;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectDistribution {
        private String projectName;
        private String jobNumber;
        private long employeeCount;
        private long activeCount;
        private long inactiveCount;
        private Double totalHours;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransferAnalytics {
        private long totalTransfers;
        private long transfersThisMonth;
        private long transfersThisYear;
        private long pendingTransfers;
        private List<RecentTransfer> recentTransfers;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentTransfer {
        private Integer employeeId;
        private String employeeName;
        private String fromProject;
        private String toProject;
        private String transferDate;
        private String status;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimecardInsights {
        private long totalTimecardEntries;
        private long entriesThisMonth;
        private long entriesThisWeek;
        private Double averageHoursPerWeek;
        private long uniqueEmployeesWithTimecards;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AlertSummary {
        private long totalAlerts;
        private long openAlerts;
        private long criticalAlerts;
        private long warningAlerts;
        private long infoAlerts;
        private long resolvedToday;
        private long resolvedThisWeek;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendData {
        private List<MonthlyTrend> hiringTrend;
        private List<MonthlyTrend> terminationTrend;
        private List<MonthlyTrend> transferTrend;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyTrend {
        private String month; // e.g., "2025-01"
        private long count; // total count (all roles)
        private long fieldCount;
        private long professionalCount;
    }
}
