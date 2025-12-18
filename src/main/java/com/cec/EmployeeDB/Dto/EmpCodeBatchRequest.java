package com.cec.EmployeeDB.Dto;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EmpCodeBatchRequest {
  private List<String> empCodes;

   public List<String> getEmpCodes() {
        return empCodes;
    }

    public void setEmpCodes(List<String> empCodes) {
        this.empCodes = empCodes;
    }
}