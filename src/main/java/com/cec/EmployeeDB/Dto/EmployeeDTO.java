package com.cec.EmployeeDB.Dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class EmployeeDTO {
    // -------- identity / core --------
    private Integer employeeid;

    @JsonProperty("employeeCode")
    @JsonAlias({ "emp_code", "employee_code" })
    private String employeeCode;

    private String EmployeeName;
    private String firstName; // transient intent
    private String lastName; // transient intent
    private String empName;
    private String workGroup;
    private String ranked;
    private String project;
    private String jobNumber;

    // contact
    private String phoneNumber;
    private String workEmail;
    private String personalEmail;

    // IDs
    @JsonProperty("xid")
    @JsonAlias({ "tixid", "TIXID", "XID" })
    private String xid;

    private String badgeNum;

    // dates (canonical)
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate hireDate;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate birthDate;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate lastWorkedDate;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate transferDate;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate terminationDate;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate terminationDateCanonical; // read-only-ish, filled server-side if you compute it

    // work location
    private String workLocation;
    private String workLocationAddress;
    private String workLocationCity;
    private String workLocationState;
    private String workLocationZip;
    private String workLocationCountry;

    // supervisor (kept; UI/export uses it)
    private String supervisor;

    // capability scores (kept by design)
    private Boolean blackEnergizedWork;
    private Boolean greenTurnOnOff;
    private Boolean redTroubleshoot;
    private Boolean aquaCablePulling;
    private Boolean blueTerminations;
    private Boolean goldManagement;
    private String employeeCodeNew;
    // leased labor & vendor
    private Boolean leasedLabor;
    private String vendorName;
    private String vendorAddressLine1;
    private String vendorAddressLine2;

    // travel
    private Byte travelPref;
    private String travelNotes;

    // status & misc HR/pay
    @JsonProperty("employeeStatus")
    @JsonAlias({ "status" })
    private String employeeStatus;

    private String payType;
    private BigDecimal annualSalary;

    // audit / lineage
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime createdAt;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime updatedAt;

    private String lastSource;
    private String lastBatchId;

    // files (your controller writes into this on upload)
    private byte[] filesForEmployee;

    private String businessTitle;

    private String positionTitle;

    private String positionType;

    private String timeInPosition;

    private String managerLevel;

    private String departmentDesc;

    private String subDepartmentDesc;

    // --- time zone ---
    private String timeZoneCode;

    private String timeZoneDescription;

    // --- job description (site helper) ---
    private String jobDesc;

    // --- GWA tag ---
    private String gwaTagNum;

    // --- transfer “to” pointers used by UI ---
    private String transferTo;

    private LocalDate transferToDate;

    // --- pay (hourly) in addition to annual_salary/pay_type ---
    private BigDecimal rate1;

    // canonicalKey: the canonical employee code (upper-case) for this DTO
    private String canonicalKey;

    // --- driver license (UI expects both names; we’ll expose the “friendly” ones)
    private String carLicenseNum;

    private String licenseType;

    private LocalDate licenseExpiration;

    // --- optional supervisor split (UI shows them if present) ---
    private String supervisorPrimary;

    private String supervisorSecondary;

    private String essLanguagePreference;
    private String primaryAddressLine1;
    private String primaryAddressLine2;

    private String trainingLevelOne;
    private String trainingLevelTwo;
    private String trainingLevelThree;
    private String onboardingStatus;

    private Boolean independentContractor;
    private String smithTraining;
    private String travelPolicyCc;
    private Boolean travelers;
    private java.math.BigDecimal travelAllowance;

    private java.time.LocalDate lastWorkDate;
    private String lastJobCode;
    private String lastJobDesc;
    private java.time.LocalDate transferEffectiveDate;
    private java.time.LocalDate terminationLatest;
    private java.time.LocalDate endDateResolved;

    // Fields present on Entity but previously missing from DTO
    private String personXidNorm;
    private String badgeNumNorm;

    private LocalDate lastPayChange;
    private LocalDate lastPositionChangeDate;
    private LocalDate mostRecentHireDate;
    private LocalDate rehireDate;
    private LocalDate leaveStart;
    private LocalDate leaveEnd;
    private LocalDate previousTerminationDate;

    private String ipad;
    private String laptop;

    private LocalDate terminationDate1;
    private LocalDate terminationDate2;

    private String employeeVerify;

    private LocalDate startDate;
    private LocalDate endDate;

    private BigDecimal evaluationScore;

    private LocalDate osha10;
    private LocalDate osha30;

    private String preferredFirstName;
    private String nickname;

    // -------- getters/setters --------
    public Integer getEmployeeid() {
        return employeeid;
    }

    public void setEmployeeid(Integer employeeid) {
        this.employeeid = employeeid;
    }

    public String getEmployeeCode() {
        return employeeCode;
    }

    public void setEmployeeCode(String employeeCode) {
        this.employeeCode = employeeCode;
    }

    public String getEmployeeName() {
        return EmployeeName;
    }

    public void setEmployeeName(String EmployeeName) {
        this.EmployeeName = EmployeeName;
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

    public String getWorkGroup() {
        return workGroup;
    }

    public void setWorkGroup(String workGroup) {
        this.workGroup = workGroup;
    }

    public String getRanked() {
        return ranked;
    }

    public void setRanked(String ranked) {
        this.ranked = ranked;
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

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
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

    public String getXid() {
        return xid;
    }

    public void setXid(String xid) {
        this.xid = xid;
    }

    public String getTixid() {
        return xid;
    }

    public void setTixid(String tixid) {
        this.xid = tixid;
    }

    public String getBadgeNum() {
        return badgeNum;
    }

    public void setBadgeNum(String badgeNum) {
        this.badgeNum = badgeNum;
    }

    public LocalDate getHireDate() {
        return hireDate;
    }

    public void setHireDate(LocalDate hireDate) {
        this.hireDate = hireDate;
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

    public void setTerminationDateCanonical(LocalDate terminationDateCanonical) {
        this.terminationDateCanonical = terminationDateCanonical;
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

    public String getSupervisor() {
        return supervisor;
    }

    public void setSupervisor(String supervisor) {
        this.supervisor = supervisor;
    }

    public Boolean getBlackEnergizedWork() {
        return blackEnergizedWork;
    }

    public void setBlackEnergizedWork(Boolean blackEnergizedWork) {
        this.blackEnergizedWork = blackEnergizedWork;
    }

    public Boolean getGreenTurnOnOff() {
        return greenTurnOnOff;
    }

    public void setGreenTurnOnOff(Boolean greenTurnOnOff) {
        this.greenTurnOnOff = greenTurnOnOff;
    }

    public Boolean getRedTroubleshoot() {
        return redTroubleshoot;
    }

    public void setRedTroubleshoot(Boolean redTroubleshoot) {
        this.redTroubleshoot = redTroubleshoot;
    }

    public Boolean getAquaCablePulling() {
        return aquaCablePulling;
    }

    public void setAquaCablePulling(Boolean aquaCablePulling) {
        this.aquaCablePulling = aquaCablePulling;
    }

    public Boolean getBlueTerminations() {
        return blueTerminations;
    }

    public void setBlueTerminations(Boolean blueTerminations) {
        this.blueTerminations = blueTerminations;
    }

    public Boolean getGoldManagement() {
        return goldManagement;
    }

    public void setGoldManagement(Boolean goldManagement) {
        this.goldManagement = goldManagement;
    }

    public Boolean getLeasedLabor() {
        return leasedLabor;
    }

    public void setLeasedLabor(Boolean leasedLabor) {
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

    public void setVendorAddressLine1(String vendorAddressLine1) {
        this.vendorAddressLine1 = vendorAddressLine1;
    }

    public String getVendorAddressLine2() {
        return vendorAddressLine2;
    }

    public void setVendorAddressLine2(String vendorAddressLine2) {
        this.vendorAddressLine2 = vendorAddressLine2;
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

    public String getEmployeeStatus() {
        return employeeStatus;
    }

    public void setEmployeeStatus(String employeeStatus) {
        this.employeeStatus = employeeStatus;
    }

    public String getPayType() {
        return payType;
    }

    public void setPayType(String payType) {
        this.payType = payType;
    }

    public BigDecimal getAnnualSalary() {
        return annualSalary;
    }

    public void setAnnualSalary(BigDecimal annualSalary) {
        this.annualSalary = annualSalary;
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

    public String getLastSource() {
        return lastSource;
    }

    public void setLastSource(String lastSource) {
        this.lastSource = lastSource;
    }

    public String getLastBatchId() {
        return lastBatchId;
    }

    public void setLastBatchId(String lastBatchId) {
        this.lastBatchId = lastBatchId;
    }

    public byte[] getFilesForEmployee() {
        return filesForEmployee;
    }

    public void setFilesForEmployee(byte[] filesForEmployee) {
        this.filesForEmployee = filesForEmployee;
    }

    public String getEmployeeCodeNew() {
        return employeeCodeNew;
    }

    public void setEmployeeCodeNew(String employeeCodeNew) {
        this.employeeCodeNew = employeeCodeNew;
    }

    public String getEmpName() {
        return empName;
    }

    public void setEmpName(String empName) {
        this.empName = empName;
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

    public String getCanonicalKey() {
        return canonicalKey;
    }

    public void setCanonicalKey(String canonicalKey) {
        this.canonicalKey = canonicalKey;
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

    public String getPersonXidNorm() {
        return personXidNorm;
    }

    public void setPersonXidNorm(String personXidNorm) {
        this.personXidNorm = personXidNorm;
    }

    public String getBadgeNumNorm() {
        return badgeNumNorm;
    }

    public void setBadgeNumNorm(String badgeNumNorm) {
        this.badgeNumNorm = badgeNumNorm;
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

    public void setTerminationDate1(LocalDate terminationDate1) {
        this.terminationDate1 = terminationDate1;
    }

    public LocalDate getTerminationDate2() {
        return terminationDate2;
    }

    public void setTerminationDate2(LocalDate terminationDate2) {
        this.terminationDate2 = terminationDate2;
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
