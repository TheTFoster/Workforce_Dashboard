// src/main/java/com/cec/EmployeeDB/auth/ForgotPasswordRequest.java
package com.cec.EmployeeDB.auth;

import jakarta.validation.constraints.NotBlank;

public class ForgotPasswordRequest {
    @NotBlank
    private String employeeCode;
    public String getEmployeeCode() { return employeeCode; }
    public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }
}
