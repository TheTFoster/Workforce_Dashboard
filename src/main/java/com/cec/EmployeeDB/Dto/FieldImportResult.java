package com.cec.EmployeeDB.Dto;

import java.util.List;
import java.util.Map;

public class FieldImportResult {
    private String fileName;
    private long rowsLoaded;
    private int rowsUpdated;
    private int rowsInserted;
    private String message;
    private List<Map<String, Object>> updatedEmployees;
    private List<Map<String, Object>> insertedEmployees;

    public FieldImportResult() {}

    public FieldImportResult(String fileName, long rowsLoaded, int rowsUpdated, int rowsInserted, String message) {
        this.fileName = fileName;
        this.rowsLoaded = rowsLoaded;
        this.rowsUpdated = rowsUpdated;
        this.rowsInserted = rowsInserted;
        this.message = message;
    }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public long getRowsLoaded() { return rowsLoaded; }
    public void setRowsLoaded(long rowsLoaded) { this.rowsLoaded = rowsLoaded; }

    public int getRowsUpdated() { return rowsUpdated; }
    public void setRowsUpdated(int rowsUpdated) { this.rowsUpdated = rowsUpdated; }

    public int getRowsInserted() { return rowsInserted; }
    public void setRowsInserted(int rowsInserted) { this.rowsInserted = rowsInserted; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public List<Map<String, Object>> getUpdatedEmployees() { return updatedEmployees; }
    public void setUpdatedEmployees(List<Map<String, Object>> updatedEmployees) { this.updatedEmployees = updatedEmployees; }

    public List<Map<String, Object>> getInsertedEmployees() { return insertedEmployees; }
    public void setInsertedEmployees(List<Map<String, Object>> insertedEmployees) { this.insertedEmployees = insertedEmployees; }
}
