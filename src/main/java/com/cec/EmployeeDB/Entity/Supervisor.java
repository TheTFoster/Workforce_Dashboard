// src/main/java/com/cec/EmployeeDB/Entity/Supervisor.java
package com.cec.EmployeeDB.Entity;

import jakarta.persistence.*;

@Entity
@Table(name = "supervision")
public class Supervisor {

    @Id
    @Column(name = "Id", nullable = false)
    private Integer employeeid;

    @Column(name = "Name")
    private String employeename;

    @Column(name = "cec id")
    private String employeeCode;

    @Column(name = "password")
    private String password;

    @Column(name = "must_change_password")
    private Boolean mustChangePassword;

    @Column(name = "is_admin")
    private Boolean isAdmin;

    @Column(name = "password_changed_at")
    private java.time.LocalDateTime passwordChangedAt;

    public Integer getEmployeeid() { return employeeid; }
    public void setEmployeeid(Integer employeeid) { this.employeeid = employeeid; }

    public String getEmployeename() { return employeename; }
    public void setEmployeename(String employeename) { this.employeename = employeename; }

    public String getEmployeeCode() { return employeeCode; }
    public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public Boolean getMustChangePassword() { return mustChangePassword == null ? Boolean.FALSE : mustChangePassword; }
    public void setMustChangePassword(Boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }

    public Boolean getIsAdmin() { return isAdmin == null ? Boolean.FALSE : isAdmin; }
    public void setIsAdmin(Boolean isAdmin) { this.isAdmin = isAdmin; }

    public java.time.LocalDateTime getPasswordChangedAt() { return passwordChangedAt; }
    public void setPasswordChangedAt(java.time.LocalDateTime passwordChangedAt) { this.passwordChangedAt = passwordChangedAt; }

    @Override
    public String toString() {
        return "Supervisor{" +
                "employeeid=" + employeeid +
                ", employeename='" + employeename + '\'' +
                ", employeeCode='" + employeeCode + '\'' +
                ", password='***'" +
                '}';
    }
}
