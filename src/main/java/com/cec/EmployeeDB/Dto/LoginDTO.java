// LoginDTO.java
package com.cec.EmployeeDB.Dto;

public class LoginDTO {
    private String employeeCode;
    private String password;

    // Getters and setters
    public String getEmployeeCode() {
        return employeeCode;
    }

    public void setEmployeeCode(String employeeCode) {
        this.employeeCode = employeeCode;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
