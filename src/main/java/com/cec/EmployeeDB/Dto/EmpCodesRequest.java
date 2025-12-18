package com.cec.EmployeeDB.Dto;

import java.util.List;

public class EmpCodesRequest {
    private List<String> empCodes;
    private Integer days; // optional; default 45

    public List<String> getEmpCodes() {
        return empCodes;
    }

    public void setEmpCodes(List<String> empCodes) {
        this.empCodes = empCodes;
    }

    public Integer getDays() {
        return days;
    }

    public void setDays(Integer days) {
        this.days = days;
    }
}
