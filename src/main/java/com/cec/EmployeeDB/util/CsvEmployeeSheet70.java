package com.cec.EmployeeDB.util;

import com.cec.EmployeeDB.Entity.Employee;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.Map;
import java.util.function.Consumer;

import static com.cec.EmployeeDB.util.CsvImportUtils.*;

public final class CsvEmployeeSheet70 {
    private CsvEmployeeSheet70() {
    }

    public static void apply(Employee e, Map<String, String> rawRow) {
        Map<String, String> row = canonicalizeRow(rawRow);

        // ---- identity & core keys ----
        String empName = firstMeaningful(row, "Employee_Name", "Legal_Employee_Name");
        if (empName != null)
            e.setDisplayName(empName);

        String code = firstMeaningful(row, "Employee_Code");
        if (code != null)
            e.setEmployeeCode(code); // removed setEmployeeCodeNew()

        String xidOrTix = firstMeaningful(row, "TIXID", "XID");
        if (xidOrTix != null) {
            // safest: only set XID (some models don't have setTixid)
            e.setXid(xidOrTix);
        }

        // ---- contact info ----
        setIfPresent(row, "Work_Email", e::setWorkEmail);
        setIfPresent(row, "Personal_Email", e::setPersonalEmail);
        // Primary phone -> map to your canonical phoneNumber
        setIfPresent(row, new String[] { "Primary_Phone", "PrimaryPhone", "Primary Phone" }, e::setPhoneNumber);
        // Primary_Phone_Type not present on entity -> skip

        // ---- employee work location (keep only fields you actually have) ----
        setIfPresent(row, "Work_Location", e::setWorkLocation);
        setIfPresent(row, "Work_Location_Address", e::setWorkLocationAddress);
        setIfPresent(row, "Work_Location_City", e::setWorkLocationCity);
        setIfPresent(row, "Work_Location_State", e::setWorkLocationState);
        setIfPresent(row, "Work_Location_Zip", e::setWorkLocationZip);
        setIfPresent(row, "Work_Location_Country", e::setWorkLocationCountry);

        // Time zone, primary/home address, department/sub-department,
        // business/position,
        // manager level, time in position, job desc — not on the entity -> skip

        // ---- supervisors ----
        // Map Supervisor_Primary to your canonical 'supervisor' field if it's unset
        setIfPresent(row, "Supervisor_Primary", (String v) -> {
            if (e.getSupervisor() == null || e.getSupervisor().isBlank())
                e.setSupervisor(v);
        });
        // Supervisor_Secondary not present -> skip

        // ---- pay & grade ----
        BigDecimal annualSalary = parseMoney(firstMeaningful(row, "Annual_Salary"));
        if (annualSalary != null)
            e.setAnnualSalary(annualSalary);
        setIfPresent(row, "Pay_Type", e::setPayType);
        // rate1 / salary grade / min-mid-max not on entity -> skip

        // ---- devices ----
        // iPad/Laptop not on entity -> skip

        // ---- dates ----
        setDateIfPresent(row, new String[] { "Hire_Date", "Start_Date" }, e::setHireDate);
        setDateIfPresent(row, "Last_Worked_Date", e::setLastWorkedDate);
        setDateIfPresent(row, "Transfer_Date", e::setTransferDate);
        setDateIfPresent(row, "Termination_Date", e::setTerminationDate);
        // TerminationDate1/2 not on entity -> skip
    }

    // ---- small helpers (typed to match your existing setters) ----
    private static void setIfPresent(Map<String, String> row, String key, Consumer<String> setter) {
        String v = firstMeaningful(row, key);
        if (v != null)
            setter.accept(v);
    }

    private static void setIfPresent(Map<String, String> row, String[] keys, Consumer<String> setter) {
        String v = firstMeaningful(row, keys);
        if (v != null)
            setter.accept(v);
    }

    private static void setDateIfPresent(Map<String, String> row, String key, Consumer<LocalDate> setter) {
        LocalDate d = parseDate(firstMeaningful(row, key));
        if (d != null)
            setter.accept(d);
    }

    private static void setDateIfPresent(Map<String, String> row, String[] keys, Consumer<LocalDate> setter) {
        LocalDate d = parseDate(firstMeaningful(row, keys));
        if (d != null)
            setter.accept(d);
    }
}
