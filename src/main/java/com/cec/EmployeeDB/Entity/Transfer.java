package com.cec.EmployeeDB.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "transfers_v2")
@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class Transfer {

    public enum RateType {
        hourly,
        salary,
        unknown
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "transfer_id")
    @JsonProperty("transfer_id")
    private Long transferId;

    @Column(name = "emp_code")
    @JsonProperty("emp_code")
    private String empCode;

    @Column(name = "xid")
    @JsonProperty("xid")
    private String xid;

    @Column(name = "emp_name")
    @JsonProperty("emp_name")
    private String empName;

    @Column(name = "classification")
    @JsonProperty("classification")
    private String classification;

    @Column(name = "from_jobsite")
    @JsonProperty("from_jobsite")
    private String fromJobsite;

    @Column(name = "to_jobsite")
    @JsonProperty("to_jobsite")
    private String toJobsite;

    @Column(name = "effective_date")
    @JsonProperty("effective_date")
    private LocalDate effectiveDate;

    @Column(name = "rate_hourly")
    @JsonProperty("rate_hourly")
    private BigDecimal rateHourly;

    @Enumerated(EnumType.STRING)
    @Column(name = "rate_type")
    @JsonProperty("rate_type")
    private RateType rateType;

    @Column(name = "evaluation_score")
    @JsonProperty("evaluation_score")
    private BigDecimal evaluationScore;

    @Column(name = "notes", columnDefinition = "TEXT")
    @JsonProperty("notes")
    private String notes;

    @Column(name = "email")
    @JsonProperty("email")
    private String email;

    @Column(name = "license_1")
    @JsonProperty("license_1")
    private String license1;

    @Column(name = "license_2")
    @JsonProperty("license_2")
    private String license2;

    @Column(name = "license_3")
    @JsonProperty("license_3")
    private String license3;

    @Column(name = "license_4")
    @JsonProperty("license_4")
    private String license4;

    @Column(name = "contact_phone", length = 25)
    @JsonProperty("contact_phone")
    private String contactPhone;

    @Column(name = "location_city")
    @JsonProperty("location_city")
    private String locationCity;

    @Column(name = "location_state")
    @JsonProperty("location_state")
    private String locationState;

    @Column(name = "sheet_date")
    @JsonProperty("sheet_date")
    private LocalDate sheetDate;

    @Column(name = "last_pay_change")
    @JsonProperty("last_pay_change")
    private LocalDate lastPayChange;

    @Column(name = "hire_date")
    @JsonProperty("hire_date")
    private LocalDate hireDate;

    @Column(name = "badging")
    @JsonProperty("badging")
    private String badging;

    @Column(name = "level1_status")
    @JsonProperty("level1_status")
    private String level1Status;

    @Column(name = "scissor_lift_status")
    @JsonProperty("scissor_lift_status")
    private String scissorLiftStatus;

    @Column(name = "corrective_action", columnDefinition = "TEXT")
    @JsonProperty("corrective_action")
    private String correctiveAction;

    @Column(name = "language")
    @JsonProperty("language")
    private String language;

    @Column(name = "`group`")
    @JsonProperty("group")
    private String group;

    @Column(name = "new_group")
    @JsonProperty("new_group")
    private String newGroup;

    @Column(name = "jobsites_of_interest", columnDefinition = "TEXT")
    @JsonProperty("jobsites_of_interest")
    private String jobsitesOfInterest;

    @Column(name = "updates", columnDefinition = "TEXT")
    @JsonProperty("updates")
    private String updates;

    @Column(name = "new_hire_follow_up", columnDefinition = "TEXT")
    @JsonProperty("new_hire_follow_up")
    private String newHireFollowUp;

    @Column(name = "osha_10_date")
    @JsonProperty("osha_10_date")
    private LocalDate osha10Date;

    @Column(name = "osha_30_date")
    @JsonProperty("osha_30_date")
    private LocalDate osha30Date;

    @Column(name = "transfer_status")
    @JsonProperty("transfer_status")
    private String transferStatus;

    @Column(name = "term")
    @JsonProperty("term")
    private String term;

    @Column(name = "per_diem")
    @JsonProperty("per_diem")
    private BigDecimal perDiem;

    @Column(name = "travel_preference")
    @JsonProperty("travel_preference")
    private Integer travelPreference;

    @Column(name = "travel_notes", columnDefinition = "TEXT")
    @JsonProperty("travel_notes")
    private String travelNotes;

    @Column(name = "source_file")
    @JsonProperty("source_file")
    private String sourceFile;

    @Column(name = "is_archived", nullable = false)
    @JsonProperty("is_archived")
    private Boolean isArchived = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // GENERATED columns – DB owns them
    @Column(name = "emp_code_norm_key", insertable = false, updatable = false)
    @JsonProperty("emp_code_norm_key")
    private String empCodeNormKey;

    @Column(name = "eff_key", insertable = false, updatable = false)
    private java.time.LocalDate effKey;

    @Column(name = "from_jobsite_key", insertable = false, updatable = false)
    @JsonProperty("from_jobsite_key")
    private String fromJobsiteKey;

    @Column(name = "to_jobsite_key", insertable = false, updatable = false)
    @JsonProperty("to_jobsite_key")
    private String toJobsiteKey;


  public Long getTransferId() {
    return transferId;
  }

  public void setTransferId(Long transferId) {
    this.transferId = transferId;
  }

  public String getEmpCode() {
    return empCode;
}

public void setEmpCode(String empCode) {
    this.empCode = empCode;
}

public String getXid() {
    return xid;
}

public void setXid(String xid) {
    this.xid = xid;
}

public String getEmpName() {
    return empName;
}

public void setEmpName(String empName) {
    this.empName = empName;
}

public String getClassification() {
    return classification;
}

public void setClassification(String classification) {
    this.classification = classification;
}

public String getFromJobsite() {
    return fromJobsite;
}

public void setFromJobsite(String fromJobsite) {
    this.fromJobsite = fromJobsite;
}

public String getToJobsite() {
    return toJobsite;
}

public void setToJobsite(String toJobsite) {
    this.toJobsite = toJobsite;
}

public LocalDate getEffectiveDate() {
    return effectiveDate;
}

public void setEffectiveDate(LocalDate effectiveDate) {
    this.effectiveDate = effectiveDate;
}

public BigDecimal getRateHourly() {
    return rateHourly;
}

public void setRateHourly(BigDecimal rateHourly) {
    this.rateHourly = rateHourly;
}

public RateType getRateType() {
    return rateType;
}

public void setRateType(RateType rateType) {
    this.rateType = rateType;
}

public BigDecimal getEvaluationScore() {
    return evaluationScore;
}

public void setEvaluationScore(BigDecimal evaluationScore) {
    this.evaluationScore = evaluationScore;
}

public String getNotes() {
    return notes;
}

public void setNotes(String notes) {
    this.notes = notes;
}

public String getEmail() {
    return email;
}

public void setEmail(String email) {
    this.email = email;
}

public String getLicense1() {
    return license1;
}

public void setLicense1(String license1) {
    this.license1 = license1;
}

public String getLicense2() {
    return license2;
}

public void setLicense2(String license2) {
    this.license2 = license2;
}

public String getLicense3() {
    return license3;
}

public void setLicense3(String license3) {
    this.license3 = license3;
}

public String getLicense4() {
    return license4;
}

public void setLicense4(String license4) {
    this.license4 = license4;
}

public String getContactPhone() {
    return contactPhone;
}

public void setContactPhone(String contactPhone) {
    this.contactPhone = contactPhone;
}

public String getLocationCity() {
    return locationCity;
}

public void setLocationCity(String locationCity) {
    this.locationCity = locationCity;
}

public String getLocationState() {
    return locationState;
}

public void setLocationState(String locationState) {
    this.locationState = locationState;
}

public LocalDate getSheetDate() {
    return sheetDate;
}

public void setSheetDate(LocalDate sheetDate) {
    this.sheetDate = sheetDate;
}


public LocalDate getLastPayChange() {
    return lastPayChange;
}

public void setLastPayChange(LocalDate lastPayChange) {
    this.lastPayChange = lastPayChange;
}

public LocalDate getHireDate() {
    return hireDate;
}

public void setHireDate(LocalDate hireDate) {
    this.hireDate = hireDate;
}

public String getBadging() {
    return badging;
}

public void setBadging(String badging) {
    this.badging = badging;
}

public String getLevel1Status() {
    return level1Status;
}

public void setLevel1Status(String level1Status) {
    this.level1Status = level1Status;
}

public String getScissorLiftStatus() {
    return scissorLiftStatus;
}

public void setScissorLiftStatus(String scissorLiftStatus) {
    this.scissorLiftStatus = scissorLiftStatus;
}

public String getCorrectiveAction() {
    return correctiveAction;
}

public void setCorrectiveAction(String correctiveAction) {
    this.correctiveAction = correctiveAction;
}

public String getLanguage() {
    return language;
}

public void setLanguage(String language) {
    this.language = language;
}

public String getUpdates() {
    return updates;
}

public void setUpdates(String updates) {
    this.updates = updates;
}

public String getNewHireFollowUp() {
    return newHireFollowUp;
}

public void setNewHireFollowUp(String newHireFollowUp) {
    this.newHireFollowUp = newHireFollowUp;
}

public LocalDate getOsha10Date() {
    return osha10Date;
}

public void setOsha10Date(LocalDate osha10Date) {
    this.osha10Date = osha10Date;
}

public LocalDate getOsha30Date() {
    return osha30Date;
}

public void setOsha30Date(LocalDate osha30Date) {
    this.osha30Date = osha30Date;
}

public String getTransferStatus() {
    return transferStatus;
}

public void setTransferStatus(String transferStatus) {
    this.transferStatus = transferStatus;
}

public String getTerm() {
    return term;
}

public void setTerm(String term) {
    this.term = term;
}

public BigDecimal getPerDiem() {
    return perDiem;
}

    public void setPerDiem(BigDecimal perDiem) {
        this.perDiem = perDiem;
    }

    public Integer getTravelPreference() {
        return travelPreference;
    }

    public void setTravelPreference(Integer travelPreference) {
        this.travelPreference = travelPreference;
    }

    public String getTravelNotes() {
        return travelNotes;
    }

    public void setTravelNotes(String travelNotes) {
        this.travelNotes = travelNotes;
    }

    public String getSourceFile() {
        return sourceFile;
    }public void setSourceFile(String sourceFile) {
    this.sourceFile = sourceFile;
}

public LocalDateTime getCreatedAt() {
    return createdAt;
}

public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
}

public LocalDateTime getUpdatedAt() {
    return updatedAt;
}

public void setUpdatedAt(LocalDateTime updatedAt) {
    this.updatedAt = updatedAt;
}

public String getEmpCodeNormKey() {
    return empCodeNormKey;
}

public void setEmpCodeNormKey(String empCodeNormKey) {
    this.empCodeNormKey = empCodeNormKey;
}

public LocalDate getEffKey() {
    return effKey;
}

public void setEffKey(LocalDate effKey) {
    this.effKey = effKey;
}

public String getFromJobsiteKey() {
    return fromJobsiteKey;
}

public void setFromJobsiteKey(String fromJobsiteKey) {
    this.fromJobsiteKey = fromJobsiteKey;
}

public String getToJobsiteKey() {
    return toJobsiteKey;
}

public void setToJobsiteKey(String toJobsiteKey) {
    this.toJobsiteKey = toJobsiteKey;
}


}
