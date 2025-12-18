package com.cec.EmployeeDB.Entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.format.annotation.DateTimeFormat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY;

@Entity
@Table(name = "field")
public class Employee {

    // -------- core identity --------
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "emp_id")
    private Integer id;

    @Column(name = "work_group")
    private String workGroup;

    // canonical person code (Paycom/etc)
    @Column(name = "employee_code")
    private String employeeCode;

    // Canonical person display name (DB: display_name)
    @Column(name = "display_name")
    private String displayName;

    // optional structured names (when present, we’ll auto-build emp_name on create)
    @Transient
    private String firstName;
    @Transient
    private String lastName;

    // -------- project/job context --------
    @Column(name = "work_project")
    private String project;
    @Column(name = "job_num")
    private String jobNumber;
    @Column(name = "emp_rank")
    private String ranked;

    // -------- external IDs (normalized in DB) --------
    @Column(name = "xid", length = 64)
    private String xid; // primary inbound ID
    @Column(name = "tixid", length = 64)
    private String tixid; // mirrored by DB trigger
    @JsonProperty(access = READ_ONLY)
    @Column(name = "person_xid_norm", insertable = false, updatable = false)
    private String personXidNorm; // generated/stored column in DB
    @Column(name = "badge_num", length = 64)
    private String badgeNum;
    @JsonProperty(access = READ_ONLY)
    @Column(name = "badge_num_norm", insertable = false, updatable = false)
    private String badgeNumNorm;

    // -------- contact & HR basics --------
    @Column(name = "work_email")
    private String workEmail;
    @Column(name = "personal_email")
    private String personalEmail;
    @Column(name = "primary_phone")
    private String phoneNumber;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "hire_date")
    private LocalDate hireDate;

    // --- NEW: pay/position date tracking from Paycom ---
    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "last_pay_change")
    private LocalDate lastPayChange;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "last_position_change_date")
    private LocalDate lastPositionChangeDate;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "most_recent_hire_date")
    private LocalDate mostRecentHireDate;

    // --- existing dates brought into the entity ---
    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "rehire_date")
    private LocalDate rehireDate;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "leave_start")
    private LocalDate leaveStart;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "leave_end")
    private LocalDate leaveEnd;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "previous_termination_date")
    private LocalDate previousTerminationDate;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "birth_date")
    private LocalDate birthDate;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "last_worked_date")
    private LocalDate lastWorkedDate;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "transfer_date")
    private LocalDate transferDate;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "termination_date")
    private LocalDate terminationDate;

    @JsonProperty(access = READ_ONLY)
    @Column(name = "termination_date_canonical", insertable = false, updatable = false)
    private LocalDate terminationDateCanonical;

    // -------- location --------
    @Column(name = "work_location")
    private String workLocation;
    @Column(name = "work_location_address")
    private String workLocationAddress;
    @Column(name = "work_location_city")
    private String workLocationCity;
    @Column(name = "work_location_state")
    private String workLocationState;
    @Column(name = "work_location_zip")
    private String workLocationZip;
    @Column(name = "work_location_country")
    private String workLocationCountry;

    // -------- skills/flags used by your UI (kept) --------
    @Column(name = "aqua_cable_pulling")
    private Boolean aquaCablePulling;
    @Column(name = "black_energized_work")
    private Boolean blackEnergizedWork;
    @Column(name = "green_turn_on_off")
    private Boolean greenTurnOnOff;
    @Column(name = "red_troubleshoot")
    private Boolean redTroubleshoot;
    @Column(name = "blue_terminations")
    private Boolean blueTerminations;
    @Column(name = "gold_management")
    private Boolean goldManagement;
    @Column(name = "employee_code_new")
    private String employeeCodeNew;

    // -------- vendor / leased labor --------
    @Column(name = "leased_labor", nullable = false)
    private boolean leasedLabor;
    @Column(name = "vendor_name")
    private String vendorName;
    @Column(name = "vendor_address_line1")
    private String vendorAddressLine1;
    @Column(name = "vendor_address_line2")
    private String vendorAddressLine2;

    // -------- travel --------
    @Column(name = "travel_pref", nullable = false, columnDefinition = "TINYINT UNSIGNED DEFAULT 0")
    private Byte travelPref = 0;
    @Lob
    @Column(name = "travel_notes", columnDefinition = "TEXT")
    private String travelNotes;

    // -------- misc HR/pay --------
    @Column(name = "annual_salary", precision = 14, scale = 2)
    private BigDecimal annualSalary;
    @Column(name = "pay_type")
    private String payType;

    // -------- audit --------
    @JsonProperty(access = READ_ONLY)
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @JsonProperty(access = READ_ONLY)
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "last_batch_id", columnDefinition = "CHAR(36)")
    private String lastBatchId;

    @Column(name = "last_source")
    private String lastSource;

    @Column(name = "supervisor")
    private String supervisor;

    @Column(name = "employee_status", length = 64)
    private String employeeStatus;

    @Column(name = "ipad")
    private String ipad;

    @Column(name = "laptop")
    private String laptop;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "termination_date_1")
    private LocalDate terminationDate1;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "termination_date_2")
    private LocalDate terminationDate2;

    @Column(name = "emp_verify")
    private String employeeVerify;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "start_date")
    private java.time.LocalDate startDate;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "end_date")
    private java.time.LocalDate endDate;

    // --- titles / org ---
    @Column(name = "business_title")
    private String businessTitle;

    @Column(name = "position_title")
    private String positionTitle;

    @Column(name = "position_type")
    private String positionType;

    @Column(name = "time_in_position")
    private String timeInPosition;

    @Column(name = "manager_level")
    private String managerLevel;

    @Column(name = "department_desc")
    private String departmentDesc;

    @Column(name = "sub_department_desc")
    private String subDepartmentDesc;

    // --- time zone ---
    @Column(name = "time_zone_code")
    private String timeZoneCode;

    @Column(name = "time_zone_description")
    private String timeZoneDescription;

    // --- job description (site helper) ---
    @Column(name = "job_desc")
    private String jobDesc;

    // --- GWA tag ---
    @Column(name = "gwa_tag_num")
    private String gwaTagNum;

    // --- transfer “to” pointers used by UI ---
    @Column(name = "transfer_to_location")
    private String transferTo;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "transfer_to_date")
    private LocalDate transferToDate;

    // --- pay (hourly) in addition to annual_salary/pay_type ---
    @Column(name = "rate_1", precision = 14, scale = 2)
    private BigDecimal rate1;

    // --- driver license (UI expects both names; we’ll expose the “friendly” ones)
    // ---
    @Column(name = "driver_license_number")
    private String carLicenseNum;

    @Column(name = "driver_license_type")
    private String licenseType;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "driver_license_expiration")
    private LocalDate licenseExpiration;

    // --- optional supervisor split (UI shows them if present) ---
    @Column(name = "supervisor_primary")
    private String supervisorPrimary;

    @Column(name = "supervisor_secondary")
    private String supervisorSecondary;

    @Column(name = "ess_language_preference")
    private String essLanguagePreference;

    @Column(name = "independent_contractor")
    private Boolean independentContractor; // TINYINT(1)

    @JdbcTypeCode(SqlTypes.JSON) // if MariaDB: use @Lob and columnDefinition="LONGTEXT"
    @Column(name = "smith_training", columnDefinition = "JSON")
    private String smithTraining;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "travel_policy_cc", columnDefinition = "JSON")
    private String travelPolicyCc;

    @Column(name = "travelers")
    private Boolean travelers; // TINYINT(1)

    @Column(name = "travel_allowance", precision = 10, scale = 2)
    private java.math.BigDecimal travelAllowance;

    @Column(name = "evaluation_score", precision = 3, scale = 2)
    private BigDecimal evaluationScore;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "osha_10")
    private LocalDate osha10;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "osha_30")
    private LocalDate osha30;

    @Column(name = "preferred_firstname")
    private String preferredFirstName;

    @Column(name = "nickname")
    private String nickname;

    // ---------- NEW: primary address lines ----------
    @Column(name = "primary_address_line_1")
    private String primaryAddressLine1;

    @Column(name = "primary_address_line_2")
    private String primaryAddressLine2;

    // ---------- NEW: training / onboarding JSON ----------
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "training_level_one", columnDefinition = "JSON")
    private String trainingLevelOne;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "training_level_two", columnDefinition = "JSON")
    private String trainingLevelTwo;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "training_level_three", columnDefinition = "JSON")
    private String trainingLevelThree;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "onboarding_status", columnDefinition = "JSON")
    private String onboardingStatus;

    // ---------- NEW: transient fields fed from views (for FE convenience)
    // ----------
    @Transient
    private java.time.LocalDate lastWorkDate; // vw_employee_last_timecard.last_work_date
    @Transient
    private String lastJobCode; // vw_employee_last_timecard.last_job_code
    @Transient
    private String lastJobDesc; // vw_employee_last_timecard.last_job_desc (also "Site")
    @Transient
    private java.time.LocalDate transferEffectiveDate; // vw_employee_latest_transfer.transfer_effective_date
    @Transient
    private java.time.LocalDate terminationLatest; // max(termination_date, _1, _2)
    @Transient
    private java.time.LocalDate endDateResolved; // terminationLatest or lastWorkDate

    // -------- lifecycle hooks --------
    @PrePersist
    private void _onCreate() {
        var now = LocalDateTime.now(ZoneOffset.UTC);
        if (createdAt == null)
            createdAt = now;
        if (updatedAt == null)
            updatedAt = now;

        if ((displayName == null || displayName.isBlank()) && (firstName != null || lastName != null)) {
            var fn = firstName == null ? "" : firstName.trim();
            var ln = lastName == null ? "" : lastName.trim();
            var full = (fn + " " + ln).trim();
            if (!full.isBlank())
                displayName = full;
        }
    }

    @PreUpdate
    private void _onUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    // -------- getters/setters (only for the fields we keep) --------
    public Integer getEmployeeid() {
        return id;
    }

    public void setEmployeeid(Integer id) {
        this.id = id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    // public String getEmployeeName() {
    // return EmployeeName;
    // }

    // public void setEmployeeName(String EmployeeName) {
    // this.EmployeeName = EmployeeName;
    // }

    // If you still have getEmpName()/setEmpName() at the bottom, repoint them:
    public String getEmpName() {
        return displayName;
    }

    public void setEmpName(String v) {
        this.displayName = v;
    }

    public String getWorkGroup() {
        return workGroup;
    }

    public void setWorkGroup(String workGroup) {
        this.workGroup = workGroup;
    }

    public String getEmployeeCode() {
        return employeeCode;
    }

    public void setEmployeeCode(String employeeCode) {
        this.employeeCode = employeeCode;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getProject() {
        return project;
    }

    public void setProject(String project) {
        this.project = project;
    }

    public String getJobNumber() {
        return jobNumber;
    }

    public void setJobNumber(String jobNumber) {
        this.jobNumber = jobNumber;
    }

    public String getRanked() {
        return ranked;
    }

    public void setRanked(String ranked) {
        this.ranked = ranked;
    }

    public String getXid() {
        return xid;
    }

    public void setXid(String xid) {
        this.xid = xid;
    }

    public String getTixid() {
        return tixid;
    }

    public void setTixid(String tixid) {
        this.tixid = tixid;
    }

    public String getPersonXidNorm() {
        return personXidNorm;
    }

    public String getBadgeNum() {
        return badgeNum;
    }

    public void setBadgeNum(String badgeNum) {
        this.badgeNum = badgeNum;
    }

    public String getBadgeNumNorm() {
        return badgeNumNorm;
    }

    public String getWorkEmail() {
        return workEmail;
    }

    public void setWorkEmail(String workEmail) {
        this.workEmail = workEmail;
    }

    public String getPersonalEmail() {
        return personalEmail;
    }

    public void setPersonalEmail(String personalEmail) {
        this.personalEmail = personalEmail;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public LocalDate getHireDate() {
        return hireDate;
    }

    public void setHireDate(LocalDate hireDate) {
        this.hireDate = hireDate;
    }

    public LocalDate getLastPayChange() {
        return lastPayChange;
    }

    public void setLastPayChange(LocalDate lastPayChange) {
        this.lastPayChange = lastPayChange;
    }

    public LocalDate getLastPositionChangeDate() {
        return lastPositionChangeDate;
    }

    public void setLastPositionChangeDate(LocalDate lastPositionChangeDate) {
        this.lastPositionChangeDate = lastPositionChangeDate;
    }

    public LocalDate getMostRecentHireDate() {
        return mostRecentHireDate;
    }

    public void setMostRecentHireDate(LocalDate mostRecentHireDate) {
        this.mostRecentHireDate = mostRecentHireDate;
    }

    public LocalDate getRehireDate() {
        return rehireDate;
    }

    public void setRehireDate(LocalDate rehireDate) {
        this.rehireDate = rehireDate;
    }

    public LocalDate getLeaveStart() {
        return leaveStart;
    }

    public void setLeaveStart(LocalDate leaveStart) {
        this.leaveStart = leaveStart;
    }

    public LocalDate getLeaveEnd() {
        return leaveEnd;
    }

    public void setLeaveEnd(LocalDate leaveEnd) {
        this.leaveEnd = leaveEnd;
    }

    public LocalDate getPreviousTerminationDate() {
        return previousTerminationDate;
    }

    public void setPreviousTerminationDate(LocalDate previousTerminationDate) {
        this.previousTerminationDate = previousTerminationDate;
    }

    public LocalDate getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(LocalDate birthDate) {
        this.birthDate = birthDate;
    }

    public LocalDate getLastWorkedDate() {
        return lastWorkedDate;
    }

    public void setLastWorkedDate(LocalDate lastWorkedDate) {
        this.lastWorkedDate = lastWorkedDate;
    }

    public LocalDate getTransferDate() {
        return transferDate;
    }

    public void setTransferDate(LocalDate transferDate) {
        this.transferDate = transferDate;
    }

    public LocalDate getTerminationDate() {
        return terminationDate;
    }

    public void setTerminationDate(LocalDate terminationDate) {
        this.terminationDate = terminationDate;
    }

    public LocalDate getTerminationDateCanonical() {
        return terminationDateCanonical;
    }

    public String getWorkLocation() {
        return workLocation;
    }

    public void setWorkLocation(String workLocation) {
        this.workLocation = workLocation;
    }

    public String getWorkLocationAddress() {
        return workLocationAddress;
    }

    public void setWorkLocationAddress(String workLocationAddress) {
        this.workLocationAddress = workLocationAddress;
    }

    public String getWorkLocationCity() {
        return workLocationCity;
    }

    public void setWorkLocationCity(String workLocationCity) {
        this.workLocationCity = workLocationCity;
    }

    public String getWorkLocationState() {
        return workLocationState;
    }

    public void setWorkLocationState(String workLocationState) {
        this.workLocationState = workLocationState;
    }

    public String getWorkLocationZip() {
        return workLocationZip;
    }

    public void setWorkLocationZip(String workLocationZip) {
        this.workLocationZip = workLocationZip;
    }

    public String getWorkLocationCountry() {
        return workLocationCountry;
    }

    public void setWorkLocationCountry(String workLocationCountry) {
        this.workLocationCountry = workLocationCountry;
    }

    public Boolean getBlackEnergizedWork() {
        return blackEnergizedWork;
    }

    public void setBlackEnergizedWork(Boolean v) {
        this.blackEnergizedWork = v;
    }

    public Boolean getGreenTurnOnOff() {
        return greenTurnOnOff;
    }

    public void setGreenTurnOnOff(Boolean v) {
        this.greenTurnOnOff = v;
    }

    public Boolean getRedTroubleshoot() {
        return redTroubleshoot;
    }

    public void setRedTroubleshoot(Boolean v) {
        this.redTroubleshoot = v;
    }

    public Boolean getAquaCablePulling() {
        return aquaCablePulling;
    }

    public void setAquaCablePulling(Boolean v) {
        this.aquaCablePulling = v;
    }

    public Boolean getBlueTerminations() {
        return blueTerminations;
    }

    public void setBlueTerminations(Boolean v) {
        this.blueTerminations = v;
    }

    public Boolean getGoldManagement() {
        return goldManagement;
    }

    public void setGoldManagement(Boolean v) {
        this.goldManagement = v;
    }

    public boolean isLeasedLabor() {
        return leasedLabor;
    }

    public void setLeasedLabor(boolean leasedLabor) {
        this.leasedLabor = leasedLabor;
    }

    public String getVendorName() {
        return vendorName;
    }

    public void setVendorName(String vendorName) {
        this.vendorName = vendorName;
    }

    public String getVendorAddressLine1() {
        return vendorAddressLine1;
    }

    public void setVendorAddressLine1(String s) {
        this.vendorAddressLine1 = s;
    }

    public String getVendorAddressLine2() {
        return vendorAddressLine2;
    }

    public void setVendorAddressLine2(String s) {
        this.vendorAddressLine2 = s;
    }

    public Byte getTravelPref() {
        return travelPref;
    }

    public void setTravelPref(Byte travelPref) {
        this.travelPref = travelPref;
    }

    public String getTravelNotes() {
        return travelNotes;
    }

    public void setTravelNotes(String travelNotes) {
        this.travelNotes = travelNotes;
    }

    public BigDecimal getAnnualSalary() {
        return annualSalary;
    }

    public void setAnnualSalary(BigDecimal annualSalary) {
        this.annualSalary = annualSalary;
    }

    public String getPayType() {
        return payType;
    }

    public void setPayType(String payType) {
        this.payType = payType;
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

    public String getLastBatchId() {
        return lastBatchId;
    }

    public void setLastBatchId(String lastBatchId) {
        this.lastBatchId = lastBatchId;
    }

    public String getLastSource() {
        return lastSource;
    }

    public void setLastSource(String lastSource) {
        this.lastSource = lastSource;
    }

    public String getSupervisor() {
        return supervisor;
    }

    public void setSupervisor(String supervisor) {
        this.supervisor = supervisor;
    }

    public String getEmployeeStatus() {
        return employeeStatus;
    }

    public void setEmployeeStatus(String employeeStatus) {
        this.employeeStatus = employeeStatus;
    }

    public String getEmployeeCodeNew() {
        return employeeCodeNew;
    }

    public void setEmployeeCodeNew(String employeeCodeNew) {
        this.employeeCodeNew = employeeCodeNew;
    }

    public void setBadgeNumNorm(String badgeNumNorm) {
        this.badgeNumNorm = badgeNumNorm;
    }

    public void setPersonXidNorm(String personXidNorm) {
        this.personXidNorm = personXidNorm;
    }

    public void setTerminationDateCanonical(LocalDate terminationDateCanonical) {
        this.terminationDateCanonical = terminationDateCanonical;
    }

    public String getIpad() {
        return ipad;
    }

    public void setIpad(String ipad) {
        this.ipad = ipad;
    }

    public String getLaptop() {
        return laptop;
    }

    public void setLaptop(String laptop) {
        this.laptop = laptop;
    }

    public LocalDate getTerminationDate1() {
        return terminationDate1;
    }

    public void setTerminationDate1(LocalDate v) {
        this.terminationDate1 = v;
    }

    public LocalDate getTerminationDate2() {
        return terminationDate2;
    }

    public void setTerminationDate2(LocalDate v) {
        this.terminationDate2 = v;
    }

    public String getEmployeeVerify() {
        return employeeVerify;
    }

    public void setEmployeeVerify(String employeeVerify) {
        this.employeeVerify = employeeVerify;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public String getBusinessTitle() {
        return businessTitle;
    }

    public void setBusinessTitle(String v) {
        this.businessTitle = v;
    }

    public String getPositionTitle() {
        return positionTitle;
    }

    public void setPositionTitle(String v) {
        this.positionTitle = v;
    }

    public String getPositionType() {
        return positionType;
    }

    public void setPositionType(String v) {
        this.positionType = v;
    }

    public String getTimeInPosition() {
        return timeInPosition;
    }

    public void setTimeInPosition(String v) {
        this.timeInPosition = v;
    }

    public String getManagerLevel() {
        return managerLevel;
    }

    public void setManagerLevel(String v) {
        this.managerLevel = v;
    }

    public String getDepartmentDesc() {
        return departmentDesc;
    }

    public void setDepartmentDesc(String v) {
        this.departmentDesc = v;
    }

    public String getSubDepartmentDesc() {
        return subDepartmentDesc;
    }

    public void setSubDepartmentDesc(String v) {
        this.subDepartmentDesc = v;
    }

    public String getTimeZoneCode() {
        return timeZoneCode;
    }

    public void setTimeZoneCode(String v) {
        this.timeZoneCode = v;
    }

    public String getTimeZoneDescription() {
        return timeZoneDescription;
    }

    public void setTimeZoneDescription(String v) {
        this.timeZoneDescription = v;
    }

    public String getJobDesc() {
        return jobDesc;
    }

    public void setJobDesc(String v) {
        this.jobDesc = v;
    }

    public String getGwaTagNum() {
        return gwaTagNum;
    }

    public void setGwaTagNum(String v) {
        this.gwaTagNum = v;
    }

    public String getTransferTo() {
        return transferTo;
    }

    public void setTransferTo(String v) {
        this.transferTo = v;
    }

    public LocalDate getTransferToDate() {
        return transferToDate;
    }

    public void setTransferToDate(LocalDate v) {
        this.transferToDate = v;
    }

    public BigDecimal getRate1() {
        return rate1;
    }

    public void setRate1(BigDecimal v) {
        this.rate1 = v;
    }

    public String getCarLicenseNum() {
        return carLicenseNum;
    }

    public void setCarLicenseNum(String v) {
        this.carLicenseNum = v;
    }

    public String getLicenseType() {
        return licenseType;
    }

    public void setLicenseType(String v) {
        this.licenseType = v;
    }

    public LocalDate getLicenseExpiration() {
        return licenseExpiration;
    }

    public void setLicenseExpiration(LocalDate v) {
        this.licenseExpiration = v;
    }

    public String getSupervisorPrimary() {
        return supervisorPrimary;
    }

    public void setSupervisorPrimary(String v) {
        this.supervisorPrimary = v;
    }

    public String getSupervisorSecondary() {
        return supervisorSecondary;
    }

    public void setSupervisorSecondary(String v) {
        this.supervisorSecondary = v;
    }

    public String getEssLanguagePreference() {
        return essLanguagePreference;
    }

    public void setEssLanguagePreference(String v) {
        this.essLanguagePreference = v;
    }

    public Boolean getIndependentContractor() {
        return independentContractor;
    }

    public void setIndependentContractor(Boolean v) {
        this.independentContractor = v;
    }

    public String getSmithTraining() {
        return smithTraining;
    }

    public void setSmithTraining(String v) {
        this.smithTraining = v;
    }

    public String getTravelPolicyCc() {
        return travelPolicyCc;
    }

    public void setTravelPolicyCc(String v) {
        this.travelPolicyCc = v;
    }

    public Boolean getTravelers() {
        return travelers;
    }

    public void setTravelers(Boolean v) {
        this.travelers = v;
    }

    public java.math.BigDecimal getTravelAllowance() {
        return travelAllowance;
    }

    public void setTravelAllowance(java.math.BigDecimal v) {
        this.travelAllowance = v;
    }

    public BigDecimal getEvaluationScore() {
        return evaluationScore;
    }

    public void setEvaluationScore(BigDecimal evaluationScore) {
        this.evaluationScore = evaluationScore;
    }

    public LocalDate getOsha10() {
        return osha10;
    }

    public void setOsha10(LocalDate osha10) {
        this.osha10 = osha10;
    }

    public LocalDate getOsha30() {
        return osha30;
    }

    public void setOsha30(LocalDate osha30) {
        this.osha30 = osha30;
    }

    public String getPrimaryAddressLine1() {
        return primaryAddressLine1;
    }

    public void setPrimaryAddressLine1(String v) {
        this.primaryAddressLine1 = v;
    }

    public String getPrimaryAddressLine2() {
        return primaryAddressLine2;
    }

    public void setPrimaryAddressLine2(String v) {
        this.primaryAddressLine2 = v;
    }

    public String getTrainingLevelOne() {
        return trainingLevelOne;
    }

    public void setTrainingLevelOne(String v) {
        this.trainingLevelOne = v;
    }

    public String getTrainingLevelTwo() {
        return trainingLevelTwo;
    }

    public void setTrainingLevelTwo(String v) {
        this.trainingLevelTwo = v;
    }

    public String getTrainingLevelThree() {
        return trainingLevelThree;
    }

    public void setTrainingLevelThree(String v) {
        this.trainingLevelThree = v;
    }

    public String getOnboardingStatus() {
        return onboardingStatus;
    }

    public void setOnboardingStatus(String v) {
        this.onboardingStatus = v;
    }

    // --- Transient, computed for FE convenience ---
    public java.time.LocalDate getLastWorkDate() {
        return lastWorkDate;
    }

    public void setLastWorkDate(java.time.LocalDate v) {
        this.lastWorkDate = v;
    }

    public String getLastJobCode() {
        return lastJobCode;
    }

    public void setLastJobCode(String v) {
        this.lastJobCode = v;
    }

    public String getLastJobDesc() {
        return lastJobDesc;
    }

    public void setLastJobDesc(String v) {
        this.lastJobDesc = v;
    }

    public java.time.LocalDate getTransferEffectiveDate() {
        return transferEffectiveDate;
    }

    public void setTransferEffectiveDate(java.time.LocalDate v) {
        this.transferEffectiveDate = v;
    }

    public java.time.LocalDate getTerminationLatest() {
        return terminationLatest;
    }

    public void setTerminationLatest(java.time.LocalDate v) {
        this.terminationLatest = v;
    }

    public java.time.LocalDate getEndDateResolved() {
        return endDateResolved;
    }

    public void setEndDateResolved(java.time.LocalDate v) {
        this.endDateResolved = v;
    }

    public String getPreferredFirstName() {
        return preferredFirstName;
    }

    public void setPreferredFirstName(String preferredFirstName) {
        this.preferredFirstName = preferredFirstName;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

}
