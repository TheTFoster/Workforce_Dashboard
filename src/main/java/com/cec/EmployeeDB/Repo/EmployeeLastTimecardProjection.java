package com.cec.EmployeeDB.Repo;

import java.time.LocalDate;

public interface EmployeeLastTimecardProjection {
    String getEmployeeCode();

    LocalDate getLastWorkDate();

    String getLastJobCode();

    String getLastJobDesc();

    String getLocationText();
}
