package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.Dto.LastWorkedPredictionDTO;
import com.cec.EmployeeDB.Entity.EmployeeProjectPrediction;
import com.cec.EmployeeDB.Entity.JobToProjectMap;
import com.cec.EmployeeDB.Entity.PaycomTimeReport;
import com.cec.EmployeeDB.Repo.EmployeeProjectPredictionRepository;
import com.cec.EmployeeDB.Repo.JobToProjectMapRepository;
import com.cec.EmployeeDB.Repo.PaycomTimeReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TimecardPredictionService {
    private final PaycomTimeReportRepository paycomRepo;
    private final JobToProjectMapRepository mapRepo;
    private final EmployeeProjectPredictionRepository predRepo;

    // Earn codes to ignore for "worked at" logic (tune for your Paycom set)
    private static final Set<String> EXCLUDE_EARN = Set.of("PTO", "VAC", "HOL", "TRAIN", "ORIENT", "BEREAV");

    public LastWorkedPredictionDTO predictForEmp(String empCode) {
        // look back 28 days for enough data
        LocalDate end = LocalDate.now(ZoneId.systemDefault());
        LocalDate start = end.minusDays(28);

        List<PaycomTimeReport> rows = paycomRepo.findByEmpAndDateRange(empCode, start, end);
        rows = rows.stream()
                .filter(r -> r.getEarnCode() == null || !EXCLUDE_EARN.contains(r.getEarnCode().toUpperCase()))
                .collect(Collectors.toList());

        if (rows.isEmpty()) {
            return LastWorkedPredictionDTO.builder()
                    .empCode(empCode).projectKey(null).confidence(0)
                    .method("none").asOf(LocalDateTime.now())
                    .explanation("No qualifying timecard rows in last 28 days").build();
        }

        // Mapping helper
        var mapCache = new HashMap<String, String>(); // key -> projectKey

        java.util.function.Function<PaycomTimeReport, String> mapProject = r -> {
            // 1) Prefer DIST job code if present
            if (notBlank(r.getDistJobCode())) {
                String k = "job:" + r.getDistJobCode();
                return mapCache.computeIfAbsent(k, kk -> mapByJob(r.getDistJobCode()));
            }
            // 2) Fallback HOME job code
            if (notBlank(r.getHomeJobCode())) {
                String k = "job:" + r.getHomeJobCode();
                return mapCache.computeIfAbsent(k, kk -> mapByJob(r.getHomeJobCode()));
            }
            // 3) Try distributed/home depts
            if (notBlank(r.getDistributedDepartmentCode())) {
                String k = "dept:" + r.getDistributedDepartmentCode();
                return mapCache.computeIfAbsent(k, kk -> mapByDept(r.getDistributedDepartmentCode(), null));
            }
            if (notBlank(r.getHomeDepartment())) {
                String k = "dept:" + r.getHomeDepartment();
                return mapCache.computeIfAbsent(k, kk -> mapByDept(r.getHomeDepartment(), r.getHomeDepartmentDesc()));
            }
            // 4) Try dist/home department *desc* matching
            if (notBlank(r.getDistDepartmentDesc())) {
                String k = "desc:" + r.getDistDepartmentDesc().toLowerCase();
                return mapCache.computeIfAbsent(k, kk -> mapByDept(null, r.getDistDepartmentDesc()));
            }
            if (notBlank(r.getHomeDepartmentDesc())) {
                String k = "desc:" + r.getHomeDepartmentDesc().toLowerCase();
                return mapCache.computeIfAbsent(k, kk -> mapByDept(null, r.getHomeDepartmentDesc()));
            }
            return null;
        };

        // A) Recency rule (last day with >= 2.0 hours)
        Optional<PaycomTimeReport> mostRecent = rows.stream()
                .filter(r -> r.getEarnHours() != null && r.getEarnHours().doubleValue() >= 2.0)
                .sorted(Comparator
                        .comparing(PaycomTimeReport::getWorkDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .reversed()
                        .thenComparing((PaycomTimeReport r) -> r.getInPunchTime(),
                                Comparator.nullsLast(Comparator.naturalOrder()))
                        .reversed())
                .findFirst();

        String recencyProject = mostRecent.map(mapProject).orElse(null);
        Integer recencyConf = null;
        if (mostRecent.isPresent() && recencyProject != null) {
            long days = Duration.between(mostRecent.get().getWorkDate().atStartOfDay(), LocalDate.now().atStartOfDay())
                    .toDays();
            int freshness = (int) Math.max(40, 100 - days * 5); // decay 5 pts/day
            recencyConf = Math.min(90, freshness);
        }

        // B) Weekly-majority rule (last completed Mon–Sun)
        LocalDate weekEnd = end.with(java.time.DayOfWeek.SUNDAY).minusWeeks(1);
        LocalDate weekStart = weekEnd.minusDays(6);
        var weeklyRows = rows.stream()
                .filter(r -> r.getWorkDate() != null && !r.getWorkDate().isBefore(weekStart)
                        && !r.getWorkDate().isAfter(weekEnd))
                .toList();

        Map<String, Double> hoursByProject = new HashMap<>();
        double total = 0.0;
        for (var r : weeklyRows) {
            String pj = mapProject.apply(r);
            if (pj == null || r.getEarnHours() == null)
                continue;
            hoursByProject.merge(pj, r.getEarnHours().doubleValue(), (a, b) -> a + b);
            total += r.getEarnHours().doubleValue();
        }
        String weeklyProject = null;
        int weeklySharePct = 0;
        if (total > 0.01) {
            var top = hoursByProject.entrySet().stream()
                    .max(Map.Entry.comparingByValue());
            if (top.isPresent()) {
                weeklyProject = top.get().getKey();
                weeklySharePct = (int) Math.round(100.0 * top.get().getValue() / total);
            }
        }
        Integer weeklyConf = weeklyProject == null ? null : Math.min(95, 60 + weeklySharePct / 2);

        // Choose best
        String project;
        int confidence;
        String method;
        String explanation;

        int recencyConfVal = recencyConf != null ? recencyConf.intValue() : 0;
        int weeklyConfVal = weeklyConf != null ? weeklyConf.intValue() : 0;

        if (weeklyProject != null && weeklySharePct >= 60) {
            project = weeklyProject;
            confidence = weeklyConfVal;
            method = "weekly-majority";
            explanation = "Last completed week majority: " + weeklySharePct + "% of hours";
        } else if (recencyProject != null) {
            project = recencyProject;
            confidence = recencyConfVal;
            method = "recency";
            explanation = "Most recent day with >=2.0 hrs";
        } else if (weeklyProject != null) {
            project = weeklyProject;
            confidence = Math.max(50, weeklyConfVal);
            method = "weekly-majority";
            explanation = "Weekly plurality (no strong majority)";
        } else {

            return LastWorkedPredictionDTO.builder()
                    .empCode(empCode).projectKey(null).confidence(0)
                    .method("none").asOf(LocalDateTime.now())
                    .explanation("No mappable rows in window").build();
        }

        // Upsert cache
        EmployeeProjectPrediction pred = EmployeeProjectPrediction.builder()
                .empCode(empCode).projectKey(project).confidence(confidence)
                .method(method).asOf(LocalDateTime.now()).source("timecard")
                .explanation(explanation).expiresAt(LocalDateTime.now().plusDays(7))
                .build();
        predRepo.save(Objects.requireNonNull(pred));

        return LastWorkedPredictionDTO.builder()
                .empCode(empCode).projectKey(project).confidence(confidence)
                .method(method).asOf(pred.getAsOf()).explanation(explanation).build();
    }

    private boolean notBlank(String s) {
        return s != null && !s.trim().isEmpty();
    }

    private String mapByJob(String jobCode) {
        return mapRepo.findByActiveTrueAndJobCode(jobCode).stream()
                .max(Comparator.comparingInt(JobToProjectMap::getConfidenceBoost))
                .map(JobToProjectMap::getProjectKey).orElse(null);
    }

    private String mapByDept(String deptCode, String deptDesc) {
        if (notBlank(deptCode)) {
            String viaCode = mapRepo.findByActiveTrueAndDepartmentCode(deptCode).stream()
                    .max(Comparator.comparingInt(JobToProjectMap::getConfidenceBoost))
                    .map(JobToProjectMap::getProjectKey).orElse(null);
            if (viaCode != null)
                return viaCode;
        }
        if (notBlank(deptDesc)) {
            return mapRepo.findByActiveTrueAndDepartmentDescIgnoreCase(deptDesc).stream()
                    .max(Comparator.comparingInt(JobToProjectMap::getConfidenceBoost))
                    .map(JobToProjectMap::getProjectKey).orElse(null);
        }
        return null;
    }

    public Map<String, LastWorkedPredictionDTO> predictForEmpList(Collection<String> empCodes) {
        Map<String, LastWorkedPredictionDTO> out = new HashMap<>();
        if (empCodes == null)
            return out;
        for (String code : empCodes) {
            if (code == null || code.isBlank())
                continue;
            out.put(code, predictForEmp(code.trim()));
        }
        return out;
    }

    public int rebuildAllPredictions(int windowDays) {
        // default to a 28-day lookback if caller passes 0/negative
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(windowDays > 0 ? windowDays : 28);
        return rebuildAllPredictions(start, end);
    }

    private int rebuildAllPredictions(LocalDate start, LocalDate end) {
        List<String> codes = paycomRepo.findDistinctEmpCodesInWindow(start, end);
        int wrote = 0;
        for (String code : codes) {
            var dto = predictForEmp(code);
            if (dto.getProjectKey() != null && dto.getConfidence() > 0) {
                wrote++;
            }
        }
        return wrote;
    }
}
