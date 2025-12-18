// src/main/java/com/cec/EmployeeDB/Dto/LoginResponse.java
package com.cec.EmployeeDB.Dto;

public class LoginResponse {
    private final boolean success;
    private final String message;
    private final String employeeCode;
    public LoginResponse(boolean success, String message, String employeeCode) {
        this.success = success; this.message = message; this.employeeCode = employeeCode;
    }
    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public String getEmployeeCode() { return employeeCode; }
}
