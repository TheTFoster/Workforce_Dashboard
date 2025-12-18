package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.Dto.EmployeeDTO;
import com.cec.EmployeeDB.Dto.EmployeeFilterCriteria;
import com.cec.EmployeeDB.Dto.LoginDTO;
import com.cec.EmployeeDB.Dto.TimelineEventDTO;
import com.cec.EmployeeDB.payloadresponse.LoginMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDateTime;

public interface EmployeeService {
    String addEmployee(EmployeeDTO employeeDTO);

    List<EmployeeDTO> getAllEmployees();

    Optional<EmployeeDTO> findByEmployeeId(Integer id);

    String updateEmployee(EmployeeDTO employeeDTO);

    void deleteEmployee(Integer employeeId);

    LoginMessage loginEmployee(LoginDTO loginDTO);

    // filtering
    List<EmployeeDTO> getEmployeesWithCriteria(EmployeeFilterCriteria criteria);

    Page<EmployeeDTO> getEmployeesWithCustomCriteria(Map<String, Object> filters, Pageable pageable);

    // IDs
    Integer getLatestEmployeeId();

    EmployeeDTO getEmployeeById(Integer employeeId);

    // aggregates / summaries
    List<Map<String, Object>> getProjectsSummary();

    long countBySupervisor(String supervisor);

    long countByWorkGroup(String workGroup);

    List<EmployeeDTO> getEmployeesByStatus(String status);


    // reports page data
    List<EmployeeDTO> getEmployeesByProject(String project, boolean activeOnly);

    List<EmployeeDTO> getEmployeesByJobNumber(String jobNumber, boolean activeOnly);

    List<EmployeeDTO> getEmployeesByGroup(String group, boolean activeOnly);

    default Integer createEmployee(EmployeeDTO dto, List<MultipartFile> files) {
        // Delegate to your existing addEmployee(dto). Ignore 'files' for now.
        addEmployee(dto);
        // Return the id if your add method sets it; otherwise return null or a lookup.
        return dto.getEmployeeid();
    }

    default void updateEmployee(Integer id, EmployeeDTO dto, List<MultipartFile> files) {
        
        // Aligns with controller's PUT method; keep your original update path.
        updateEmployee(dto);
    }

    LocalDateTime getMaxUpdatedAt();

    List<TimelineEventDTO> getTimeline(Long empId);

    com.cec.EmployeeDB.Dto.EmployeeDetailsBatchResponse getEmployeeDetailsByCodes(List<String> empCodes);

}
