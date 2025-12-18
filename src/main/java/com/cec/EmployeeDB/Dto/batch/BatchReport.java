package com.cec.EmployeeDB.Dto.batch;

public class BatchReport {
    private long inserted;
    private long updated;
    private long unchanged;
    private long deactivated;
    private long terminated;
    private long errors;
    private boolean dryRun;
    private String message;

    public long getInserted() { return inserted; }
    public void setInserted(long inserted) { this.inserted = inserted; }
    public long getUpdated() { return updated; }
    public void setUpdated(long updated) { this.updated = updated; }
    public long getUnchanged() { return unchanged; }
    public void setUnchanged(long unchanged) { this.unchanged = unchanged; }
    public long getDeactivated() { return deactivated; }
    public void setDeactivated(long deactivated) { this.deactivated = deactivated; }
    public long getTerminated() { return terminated; }
    public void setTerminated(long terminated) { this.terminated = terminated; }
    public long getErrors() { return errors; }
    public void setErrors(long errors) { this.errors = errors; }
    public boolean isDryRun() { return dryRun; }
    public void setDryRun(boolean dryRun) { this.dryRun = dryRun; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
