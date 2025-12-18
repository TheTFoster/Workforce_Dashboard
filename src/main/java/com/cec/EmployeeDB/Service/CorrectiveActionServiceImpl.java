// src/main/java/com/cec/EmployeeDB/Service/CorrectiveActionServiceImpl.java
package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.Dto.CorrectiveActionDTO;
import com.cec.EmployeeDB.Entity.CorrectiveAction;
import com.cec.EmployeeDB.Entity.CorrectiveAction.Category;
import com.cec.EmployeeDB.Entity.Employee;
import com.cec.EmployeeDB.Repo.CorrectiveActionRepository;
import com.cec.EmployeeDB.Repo.EmployeeRepo;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
public class CorrectiveActionServiceImpl implements CorrectiveActionService {
    private final CorrectiveActionRepository caRepo;
    private final EmployeeRepo employeeRepo;

    public CorrectiveActionServiceImpl(CorrectiveActionRepository caRepo, EmployeeRepo employeeRepo) {
        this.caRepo = caRepo;
        this.employeeRepo = employeeRepo;
    }

    @Override
    public List<CorrectiveActionDTO> listByEmployee(Integer employeeid, Category categoryOrNull) {
        List<CorrectiveAction> rows = (categoryOrNull == null)
                ? caRepo.findByEmployeeEmployeeidOrderByActionDateDesc(employeeid)
                : caRepo.findByEmployeeEmployeeidAndCategoryOrderByActionDateDesc(employeeid, categoryOrNull);
        return rows.stream().map(ca -> toDTO(Objects.requireNonNull(ca, "ca cannot be null"))).toList();
    }

    @Override
    public CorrectiveActionDTO create(Integer employeeid, CorrectiveActionDTO dto) {
        Employee emp = employeeRepo.findById(Objects.requireNonNull(employeeid, "employeeid cannot be null"))
                .orElseThrow(() -> new EntityNotFoundException("Employee (field) not found: " + employeeid));
        CorrectiveAction ca = new CorrectiveAction();
        ca.setEmployee(emp);
        ca.setCategory(parseCategory(dto.getCategory()));
        ca.setActionDate(dto.getActionDate());
        ca.setSummary(dto.getSummary());
        ca.setDetails(dto.getDetails());
        ca.setIssuedBy(dto.getIssuedBy());
        ca.setSeverity(dto.getSeverity());
        ca.setStatus(dto.getStatus());
        ca = caRepo.save(ca);
        return toDTO(Objects.requireNonNull(ca, "ca cannot be null"));
    }

    @Override
    public CorrectiveActionDTO update(Long id, CorrectiveActionDTO dto) {
        CorrectiveAction ca = caRepo.findById(Objects.requireNonNull(id, "id cannot be null"))
                .orElseThrow(() -> new EntityNotFoundException("Corrective action not found: " + id));
        if (dto.getCategory() != null) ca.setCategory(parseCategory(dto.getCategory()));
        if (dto.getActionDate() != null) ca.setActionDate(dto.getActionDate());
        if (dto.getSummary() != null) ca.setSummary(dto.getSummary());
        if (dto.getDetails() != null) ca.setDetails(dto.getDetails());
        if (dto.getIssuedBy() != null) ca.setIssuedBy(dto.getIssuedBy());
        if (dto.getSeverity() != null) ca.setSeverity(dto.getSeverity());
        if (dto.getStatus() != null) ca.setStatus(dto.getStatus());
        @SuppressWarnings("null")
        CorrectiveAction saved = caRepo.save(ca);
        return toDTO(Objects.requireNonNull(saved, "saved ca cannot be null"));
    }

    @Override
    public void delete(Long id) {
        if (!caRepo.existsById(Objects.requireNonNull(id, "id cannot be null"))) throw new EntityNotFoundException("Corrective action not found: " + id);
        caRepo.deleteById(Objects.requireNonNull(id, "id cannot be null"));
    }

    // ---- helpers ----
    private Category parseCategory(String s) {
        if (s == null) throw new IllegalArgumentException("Category is required");
        try { return Category.valueOf(s.trim().toUpperCase()); }
        catch (Exception ex) { throw new IllegalArgumentException("Invalid category: " + s); }
    }

    private CorrectiveActionDTO toDTO(CorrectiveAction ca) {
        if (ca == null) throw new IllegalArgumentException("CorrectiveAction cannot be null");
        String name = (ca.getEmployee() != null) ? ca.getEmployee().getDisplayName() : null;
        Integer empId = (ca.getEmployee() != null) ? ca.getEmployee().getEmployeeid() : null;
        return new CorrectiveActionDTO(
                Objects.requireNonNull(ca.getId(), "id cannot be null"), empId, name,
                ca.getCategory() != null ? ca.getCategory().name() : null,
                ca.getActionDate(), ca.getSummary(), ca.getDetails(),
                ca.getIssuedBy(), ca.getSeverity(), ca.getStatus(),
                Objects.requireNonNull(ca.getCreatedAt(), "createdAt cannot be null"), Objects.requireNonNull(ca.getUpdatedAt(), "updatedAt cannot be null")
        );
    }
}
