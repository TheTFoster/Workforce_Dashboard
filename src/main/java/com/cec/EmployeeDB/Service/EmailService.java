package com.cec.EmployeeDB.Service;

public interface EmailService {
    void send(String to, String subject, String body);
}
