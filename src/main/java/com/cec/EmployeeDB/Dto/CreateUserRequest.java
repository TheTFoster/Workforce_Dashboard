package com.cec.EmployeeDB.Dto;

public class CreateUserRequest {
    private Integer id;
    private String name;
    private String employeeCode;
    private String password;
    private Boolean mustChangePassword = Boolean.TRUE;
    private Boolean isAdmin = Boolean.FALSE;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmployeeCode() { return employeeCode; }
    public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public Boolean getMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(Boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }

    public Boolean getIsAdmin() { return isAdmin; }
    public void setIsAdmin(Boolean isAdmin) { this.isAdmin = isAdmin; }
}
