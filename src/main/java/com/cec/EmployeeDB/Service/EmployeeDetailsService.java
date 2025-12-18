package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.Dto.EmployeeDetailsDTO;
import com.cec.EmployeeDB.Entity.Employee;
import com.cec.EmployeeDB.Repo.EmployeeAnalyticsRepo;
import com.cec.EmployeeDB.Repo.EmployeeRepo;
import com.cec.EmployeeDB.Repo.EmployeeLastTimecardProjection;
import com.cec.EmployeeDB.Repo.EmployeeLastTimecardViewRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class EmployeeDetailsService {
    private final EmployeeRepo employees;
    private final EmployeeAnalyticsRepo analytics; // keep if you still use other analytics calls
    private final EmployeeLastTimecardViewRepo lastTimecardRepo;

    public EmployeeDetailsDTO getById(Integer id) {
        Employee e = employees.findById(Objects.requireNonNull(id, "id cannot be null")).orElseThrow();

        // Pull from the view via projection
        EmployeeLastTimecardProjection tc = lastTimecardRepo.findByEmployeeCode(e.getEmployeeCode());

        // (Optional) still fetch latest transfer via analytics if you have that wired
        var tr = analytics.findLatestTransfer(e.getEmployeeCode());

        LocalDate lastWorked = (tc != null && tc.getLastWorkDate() != null)
                ? tc.getLastWorkDate()
                : e.getLastWorkedDate();

        LocalDate termLatest = maxDate(e.getTerminationDate(), e.getTerminationDate1(), e.getTerminationDate2());
        LocalDate endResolved = termLatest != null ? termLatest : lastWorked;

        return EmployeeDetailsDTO.builder()
                .employeeid(e.getEmployeeid())
                .displayName(titleCase(nullToEmpty(e.getDisplayName())))
                .employeeCode(e.getEmployeeCode())
                .tixid(e.getTixid())
                .badgeNum(e.getBadgeNum())
                .gwaTagNum(e.getGwaTagNum())
                .jobNumber(e.getJobNumber())

                .lastJobCode(tc != null ? tc.getLastJobCode() : null)
                .lastJobDesc(tc != null ? tc.getLastJobDesc() : null)
                // You can add tc.getLocationText() into the DTO later if you’ve added it there

                .businessTitle(e.getBusinessTitle())
                .positionTitle(e.getPositionTitle())
                .positionType(e.getPositionType())
                .departmentDesc(e.getDepartmentDesc())
                .subDepartmentDesc(e.getSubDepartmentDesc())
                .supervisorPrimary(e.getSupervisorPrimary())
                .supervisorSecondary(e.getSupervisorSecondary())

                .workEmail(e.getWorkEmail())
                .personalEmail(e.getPersonalEmail())
                .primaryAddressLine1(e.getPrimaryAddressLine1())
                .primaryAddressLine2(e.getPrimaryAddressLine2())
                .timeZoneDescription(e.getTimeZoneDescription())
                .essLanguagePreference(e.getEssLanguagePreference())

                .hireDate(e.getHireDate())
                .lastWorkDate(lastWorked)
                .transferEffectiveDate(tr != null ? tr.getTransferEffectiveDate() : e.getTransferToDate())
                .terminationLatest(termLatest)
                .endDateResolved(endResolved)
                .transferToDate(e.getTransferToDate())

                .employeeStatus(e.getEmployeeStatus())
                .timeInPosition(e.getTimeInPosition())

                .rate1(e.getRate1())
                .payType(e.getPayType())

                .trainingLevelOne(e.getTrainingLevelOne())
                .trainingLevelTwo(e.getTrainingLevelTwo())
                .trainingLevelThree(e.getTrainingLevelThree())
                .onboardingStatus(e.getOnboardingStatus())

                .independentContractor(e.getIndependentContractor())
                .travelers(e.getTravelers())
                .travelAllowance(e.getTravelAllowance())

                .updatedAt(e.getUpdatedAt())
                .lastSource(e.getLastSource())
                .lastBatchId(e.getLastBatchId())
                .build();
    }

    private static LocalDate maxDate(LocalDate... ds) {
        LocalDate m = null;
        for (LocalDate d : ds)
            if (d != null && (m == null || d.isAfter(m)))
                m = d;
        return m;
    }

    private static String titleCase(String s) {
        if (s == null || s.isBlank())
            return s;
        String[] parts = s.toLowerCase(Locale.US).trim().split("\\s+");
        for (int i = 0; i < parts.length; i++) {
            String p = parts[i];
            parts[i] = p.substring(0, 1).toUpperCase(Locale.US) + (p.length() > 1 ? p.substring(1) : "");
        }
        return String.join(" ", parts);
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}
