package com.cec.EmployeeDB.Dto;

import java.time.LocalDate;

public class TimelineEventDTO {
    private String eventType;   // hire | last_worked | transfer | termination
    private LocalDate eventDate;

    public TimelineEventDTO() {}
    public TimelineEventDTO(String eventType, LocalDate eventDate) {
        this.eventType = eventType;
        this.eventDate = eventDate;
    }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public LocalDate getEventDate() { return eventDate; }
    public void setEventDate(LocalDate eventDate) { this.eventDate = eventDate; }
}
