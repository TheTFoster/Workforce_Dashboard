package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.Entity.Employee;
import com.cec.EmployeeDB.Entity.Transfer;
import com.cec.EmployeeDB.Repo.EmployeeRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Service to synchronize Transfer changes back to the Employee entity.
 * This ensures employee timelines and current information stay up-to-date
 * based on transfer records.
 */
@Service
public class TransferSyncService {

    private final EmployeeRepo employeeRepo;

    public TransferSyncService(EmployeeRepo employeeRepo) {
        this.employeeRepo = employeeRepo;
    }

    /**
     * Updates the Employee entity based on transfer data.
     * Called when a transfer is created or updated.
     * 
     * @param transfer The transfer record (saved or about to be saved)
     * @param isCompleted Whether the transfer status is "completed" (determines scope of updates)
     */
    @Transactional
    public void syncTransferToEmployee(Transfer transfer, boolean isCompleted) {
        if (transfer == null || transfer.getEmpCode() == null || transfer.getEmpCode().isBlank()) {
            return;
        }

        // Find employee by employee code (case-insensitive normalized lookup)
        Optional<Employee> employeeOpt = employeeRepo.findByEmployeeCodeIgnoreCase(transfer.getEmpCode());
        
        if (employeeOpt.isEmpty()) {
            // Try alternative lookup by XID if employee code doesn't match
            if (transfer.getXid() != null && !transfer.getXid().isBlank()) {
                employeeOpt = employeeRepo.findByXidIgnoreCase(transfer.getXid());
            }
        }

        if (employeeOpt.isEmpty()) {
            // No matching employee found - cannot sync
            return;
        }

        Employee employee = employeeOpt.get();
        boolean updated = false;

        // ALWAYS update these fields regardless of transfer status:
        // These are informational/training fields that should be tracked
        
        // OSHA 10 Date
        if (transfer.getOsha10Date() != null) {
            // Update if employee doesn't have a date, or transfer date is more recent
            if (employee.getOsha10() == null || 
                transfer.getOsha10Date().isAfter(employee.getOsha10())) {
                employee.setOsha10(transfer.getOsha10Date());
                updated = true;
            }
        }

        // OSHA 30 Date
        if (transfer.getOsha30Date() != null) {
            if (employee.getOsha30() == null || 
                transfer.getOsha30Date().isAfter(employee.getOsha30())) {
                employee.setOsha30(transfer.getOsha30Date());
                updated = true;
            }
        }

        // Evaluation Score - always take most recent
        if (transfer.getEvaluationScore() != null) {
            employee.setEvaluationScore(transfer.getEvaluationScore());
            updated = true;
        }

        // Travel Preference - only update when transfer explicitly sends a value
        if (transfer.getTravelPreference() != null) {
            byte incomingPreference = transfer.getTravelPreference().byteValue();
            Byte currentPreference = employee.getTravelPref();
            if (currentPreference == null || currentPreference.byteValue() != incomingPreference) {
                employee.setTravelPref(incomingPreference);
                updated = true;
            }
        }

        // Travel Notes - append with timestamp instead of overwriting
        if (transfer.getTravelNotes() != null && !transfer.getTravelNotes().trim().isEmpty()) {
            String timestamp = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            String newNote = "[" + timestamp + "] " + transfer.getTravelNotes().trim();
            
            if (employee.getTravelNotes() != null && !employee.getTravelNotes().trim().isEmpty()) {
                employee.setTravelNotes(employee.getTravelNotes() + "\n" + newNote);
            } else {
                employee.setTravelNotes(newNote);
            }
            updated = true;
        }

        // Hire Date tracking
        if (transfer.getHireDate() != null) {
            // Update hire date if employee doesn't have one
            if (employee.getHireDate() == null) {
                employee.setHireDate(transfer.getHireDate());
                updated = true;
            }
            // Also update most recent hire date if transfer date is newer
            if (employee.getMostRecentHireDate() == null ||
                transfer.getHireDate().isAfter(employee.getMostRecentHireDate())) {
                employee.setMostRecentHireDate(transfer.getHireDate());
                updated = true;
            }
        }

        // Last Pay Change tracking
        if (transfer.getLastPayChange() != null) {
            if (employee.getLastPayChange() == null ||
                transfer.getLastPayChange().isAfter(employee.getLastPayChange())) {
                employee.setLastPayChange(transfer.getLastPayChange());
                updated = true;
            }
        }

        // If transfer is COMPLETED, update current assignment fields:
        if (isCompleted && transfer.getEffectiveDate() != null) {
            
            // Update current project/jobsite
            if (transfer.getToJobsite() != null && !transfer.getToJobsite().isBlank()) {
                employee.setProject(transfer.getToJobsite());
                employee.setTransferTo(transfer.getToJobsite());
                employee.setTransferToDate(transfer.getEffectiveDate());
                employee.setTransferDate(transfer.getEffectiveDate());
                updated = true;
            }

            // Update work group
            if (transfer.getGroup() != null && !transfer.getGroup().isBlank()) {
                employee.setWorkGroup(transfer.getGroup());
                updated = true;
            }

            // Update classification/rank
            if (transfer.getClassification() != null && !transfer.getClassification().isBlank()) {
                employee.setRanked(transfer.getClassification());
                employee.setBusinessTitle(transfer.getClassification());
                updated = true;
            }

            // Update pay rate (only if transfer has a rate)
            if (transfer.getRateHourly() != null) {
                employee.setRate1(transfer.getRateHourly());
                // Update last position change date to effective date
                if (employee.getLastPositionChangeDate() == null ||
                    transfer.getEffectiveDate().isAfter(employee.getLastPositionChangeDate())) {
                    employee.setLastPositionChangeDate(transfer.getEffectiveDate());
                }
                updated = true;
            }

            // Update contact information (if provided in transfer)
            if (transfer.getEmail() != null && !transfer.getEmail().isBlank()) {
                employee.setWorkEmail(transfer.getEmail());
                updated = true;
            }

            if (transfer.getContactPhone() != null && !transfer.getContactPhone().isBlank()) {
                employee.setPhoneNumber(transfer.getContactPhone());
                updated = true;
            }

            // Update location (if provided)
            if (transfer.getLocationCity() != null && !transfer.getLocationCity().isBlank()) {
                employee.setWorkLocationCity(transfer.getLocationCity());
                updated = true;
            }

            if (transfer.getLocationState() != null && !transfer.getLocationState().isBlank()) {
                employee.setWorkLocationState(transfer.getLocationState());
                updated = true;
            }
        }

        // Save if any updates were made
        if (updated) {
            employee.setUpdatedAt(LocalDateTime.now());
            employeeRepo.save(employee);
        }
    }

    /**
     * Helper to determine if a transfer status indicates completion.
     */
    public boolean isTransferCompleted(String status) {
        if (status == null) {
            return false;
        }
        String normalized = status.toLowerCase().trim();
        return "completed".equals(normalized) || "confirmed".equals(normalized);
    }
}
