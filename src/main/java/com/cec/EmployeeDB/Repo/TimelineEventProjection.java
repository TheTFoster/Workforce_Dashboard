package com.cec.EmployeeDB.Repo;

import java.time.LocalDate;

public interface TimelineEventProjection {
    String getEvent_type();  // column alias from view
    LocalDate getEvent_date();
}
