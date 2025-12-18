// src/main/java/com/cec/EmployeeDB/Service/CorrectiveActionService.java
package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.Dto.CorrectiveActionDTO;
import com.cec.EmployeeDB.Entity.CorrectiveAction.Category;
import java.util.List;

public interface CorrectiveActionService {
    List<CorrectiveActionDTO> listByEmployee(Integer employeeid, Category categoryOrNull);
    CorrectiveActionDTO create(Integer employeeid, CorrectiveActionDTO dto);
    CorrectiveActionDTO update(Long id, CorrectiveActionDTO dto);
    void delete(Long id);
}
