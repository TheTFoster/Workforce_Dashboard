package com.cec.EmployeeDB.Service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;
import com.cec.EmployeeDB.Dto.TimecardDTO;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import com.cec.EmployeeDB.Dto.CurrentAssignmentDTO;


public interface TimecardsService {
    Map<String, Object> ingest(MultipartFile file) throws Exception;
    Map<String, Object> normalizeZeroDatesAndNulls();
    Map<String, Object> rebuild(int windowDays);
    List<TimecardDTO> findInRange(LocalDate start, LocalDate end, int limit);
    Page<TimecardDTO> findInRangePaged(LocalDate start, LocalDate end, Pageable pageable);

    List<CurrentAssignmentDTO> currentAssignments(int windowDays);
    // Optional, efficient for Home: only return for specific emp codes
    List<CurrentAssignmentDTO> currentAssignmentsFor(List<String> empCodes, int windowDays);
}
