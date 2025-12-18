package com.cec.EmployeeDB.util;

import com.cec.EmployeeDB.Entity.Employee;

import java.time.LocalDate;
import java.util.Map;

import static com.cec.EmployeeDB.util.CsvImportUtils.*;

public final class CsvEmployeeExtensions {
    private CsvEmployeeExtensions() {
    }

    /**
     * Apply CSV columns to the Employee entity, without overwriting with
     * empty/sentinel values.
     * Only maps to fields that currently exist on the Employee entity.
     */
    public static void applyNewColumns(Employee e, Map<String, String> row) {
        // ---- Dates (existing DB columns) ----
        LocalDate lastWorked = parseDate(firstMeaningful(row, "Last_Worked_Date"));
        LocalDate termination = parseDate(firstMeaningful(row, "Termination_Date"));
        LocalDate transfer = parseDate(firstMeaningful(row, "Transfer_Date"));

        if (lastWorked != null)
            e.setLastWorkedDate(lastWorked);
        if (termination != null)
            e.setTerminationDate(termination);
        if (transfer != null)
            e.setTransferDate(transfer);

        // NOTE: You don't have terminationDate1/2 on the entity. If you add them later:
        // LocalDate term1 = parseDate(firstMeaningful(row, "TerminationDate1",
        // "Termination_Date_1"));
        // LocalDate term2 = parseDate(firstMeaningful(row, "TerminationDate2",
        // "Termination_Date_2"));
        // if (term1 != null) e.setTerminationDate1(term1);
        // if (term2 != null) e.setTerminationDate2(term2);

        // ---- Devices ----
        // Your entity has no ipad/laptop fields. Skip for now.
        // String ipad = firstMeaningful(row, "Ipad", "iPad", "IPad");
        // String laptop = firstMeaningful(row, "Laptop");
        // if (ipad != null) e.setIpad(ipad);
        // if (laptop != null) e.setLaptop(laptop);

        // ---- Hire date (don’t clobber if you already have a value) ----
        LocalDate hire = parseDate(firstMeaningful(row, "Hire_Date", "Start_Date", "StartDate"));
        if (hire != null && e.getHireDate() == null) {
            e.setHireDate(hire);
        }
    }
}
