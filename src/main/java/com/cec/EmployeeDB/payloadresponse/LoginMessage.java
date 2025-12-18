package com.cec.EmployeeDB.payloadresponse;

public class LoginMessage {
    private String message;
    private Boolean status;
    private Boolean mustChangePassword = false;
    private String pwChangeToken;
//    private String token; 

    // Constructor with message, status, and token
    public LoginMessage(String message, Boolean status) {
        this.message = message;
        this.status = status;
//        this.token = token;
    }

    // Constructor with just message
    public LoginMessage(String message) {
        this.message = message;
        this.status = false; 
//        this.token = null;   
    }

    // Getters and Setters
    public String getMessage() {
        return message;
    }
    public void setMessage(String message) {
        this.message = message;
    }

    public Boolean getStatus() {
        return status;
    }
    public void setStatus(Boolean status) {
        this.status = status;
    }

    public Boolean getMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(Boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }

    public String getPwChangeToken() { return pwChangeToken; }
    public void setPwChangeToken(String pwChangeToken) { this.pwChangeToken = pwChangeToken; }

//    public String getToken() {
//        return token;
//    }
//    public void setToken(String token) {
//        this.token = token;
//    }
}
