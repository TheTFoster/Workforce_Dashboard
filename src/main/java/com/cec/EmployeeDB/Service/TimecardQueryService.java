package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.Dto.LatestWorkedDTO;
import com.cec.EmployeeDB.Dto.TimecardSpanDTO;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface TimecardQueryService {

    List<TimecardSpanDTO> fetchSpans(LocalDate start, LocalDate end, String emp, int limit);

    default List<TimecardSpanDTO> fetchSpans(LocalDate start, LocalDate end, String emp) {
        return fetchSpans(start, end, emp, 5000);
    }

    Map<String, LatestWorkedDTO> latestByEmpCodes(List<String> eeCodes, int windowDays);

    LatestWorkedDTO latestForEmp(String eeCode, int windowDays);
}
