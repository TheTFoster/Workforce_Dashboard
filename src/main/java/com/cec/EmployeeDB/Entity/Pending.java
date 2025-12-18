package com.cec.EmployeeDB.Entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

@Entity
@Table(
    name = "pending",
    indexes = {
        @Index(name = "idx_pending_employee_code", columnList = "employee_code"),
        @Index(name = "idx_pending_job_number",   columnList = "job_number"),
        @Index(name = "idx_pending_supervisor",   columnList = "supervisor")
    }
)
public class Pending {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pending_id", nullable = false)
    private Integer pendingId;

    @Column(name = "legacy_id", length = 128)
    private String legacyId;

    @Column(name = "work_group", length = 100)
    private String workGroup;

    @Column(name = "project", length = 255)
    private String project;

    @Column(name = "job_number", length = 50)
    private String jobNumber;

    @Column(name = "employee_code", length = 50)
    private String employeeCode;

    @Column(name = "emp_name", length = 255)
    private String employeeName;

    @Column(name = "name", length = 200)
    private String name;

    @Column(name = "ranked", length = 50)
    private String ranked;

    @Column(name = "level_one", columnDefinition = "TINYINT")
    private Boolean levelOne;

    @Column(name = "level_two", columnDefinition = "TINYINT")
    private Boolean levelTwo;

    @Column(name = "level_three", columnDefinition = "TINYINT")
    private Boolean levelThree;

    @Column(name = "lvl1_ss", columnDefinition = "TINYINT")
    private Boolean lvl1Ss;

    @Column(name = "lvl1_material_handling", columnDefinition = "TINYINT")
    private Boolean lvl1MaterialHandling;

    @Column(name = "lvl1_ladder_safety", columnDefinition = "TINYINT")
    private Boolean lvl1LadderSafety;

    @Column(name = "lvl1_fall_protection", columnDefinition = "TINYINT")
    private Boolean lvl1FallProtection;

    @Column(name = "lvl1_spotter_training", columnDefinition = "TINYINT")
    private Boolean lvl1SpotterTraining;

    @Column(name = "lvl1_electrical_safety_awareness", columnDefinition = "TINYINT")
    private Boolean lvl1ElectricalSafetyAwareness;

    @Column(name = "lvl1_loto", columnDefinition = "TINYINT")
    private Boolean lvl1Loto;

    @Column(name = "lvl1_energized_steps", columnDefinition = "TINYINT")
    private Boolean lvl1EnergizedSteps;

    @Column(name = "lvl1_two_men_verify", columnDefinition = "TINYINT")
    private Boolean lvl1TwoMenVerify;

    @Column(name = "lvl1_jack_stands", columnDefinition = "TINYINT")
    private Boolean lvl1JackStands;

    @Column(name = "lvl1_cable_tray_rollers", columnDefinition = "TINYINT")
    private Boolean lvl1CableTrayRollers;

    @Column(name = "lvl1_cable_cutting", columnDefinition = "TINYINT")
    private Boolean lvl1CableCutting;

    @Column(name = "lvl1_cable_stripping", columnDefinition = "TINYINT")
    private Boolean lvl1CableStripping;

    @Column(name = "lvl2_cable_pullies_install", columnDefinition = "TINYINT")
    private Boolean lvl2CablePulliesInstall;

    @Column(name = "lvl2_cable_sock_selection", columnDefinition = "TINYINT")
    private Boolean lvl2CableSockSelection;

    @Column(name = "lvl2_cable_connector_install", columnDefinition = "TINYINT")
    private Boolean lvl2CableConnectorInstall;

    @Column(name = "lvl2_cable_labeling", columnDefinition = "TINYINT")
    private Boolean lvl2CableLabeling;

    @Column(name = "lvl2_megging", columnDefinition = "TINYINT")
    private Boolean lvl2Megging;

    @Column(name = "lvl2_crimping_procedures", columnDefinition = "TINYINT")
    private Boolean lvl2CrimpingProcedures;

    @Column(name = "lvl2_drilling_holes", columnDefinition = "TINYINT")
    private Boolean lvl2DrillingHoles;

    @Column(name = "lvl3_tool_feeds", columnDefinition = "TINYINT")
    private Boolean lvl3ToolFeeds;

    @Column(name = "lvl3_commissioning", columnDefinition = "TINYINT")
    private Boolean lvl3Commissioning;

    @Column(name = "lvl3_torqueing", columnDefinition = "TINYINT")
    private Boolean lvl3Torqueing;

    @Column(name = "lvl3_torque_seal", columnDefinition = "TINYINT")
    private Boolean lvl3TorqueSeal;

    @Column(name = "lvl3_breaker_manipulation", columnDefinition = "TINYINT")
    private Boolean lvl3BreakerManipulation;

    @Column(name = "lvl3_turn_off_procedure", columnDefinition = "TINYINT")
    private Boolean lvl3TurnOffProcedure;

    @Column(name = "lvl3_turn_on_procedures", columnDefinition = "TINYINT")
    private Boolean lvl3TurnOnProcedures;

    @Column(name = "lvl3_energize_permit", columnDefinition = "TINYINT")
    private Boolean lvl3EnergizePermit;

    @Column(name = "lvl3_qew", columnDefinition = "TINYINT")
    private Boolean lvl3Qew;

    @Column(name = "black_energized_work", columnDefinition = "TINYINT")
    private Boolean blackEnergizedWork;

    @Column(name = "green_turn_on_off", columnDefinition = "TINYINT")
    private Boolean greenTurnOnOff;

    @Column(name = "red_troubleshoot", columnDefinition = "TINYINT")
    private Boolean redTroubleshoot;

    @Column(name = "aqua_cable_pulling", columnDefinition = "TINYINT")
    private Boolean aquaCablePulling;

    @Column(name = "blue_terminations", columnDefinition = "TINYINT")
    private Boolean blueTerminations;

    @Column(name = "gold_management", columnDefinition = "TINYINT")
    private Boolean goldManagement;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "supervisor", length = 200)
    private String supervisor;

    @Column(name = "blue_dot_rfab_onboarding", columnDefinition = "TINYINT")
    private Boolean blueDotRfabOnboarding;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "start_date")
    private LocalDate startDate;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "end_date")
    private LocalDate endDate;

    public Integer getPendingId() { return pendingId; }
    public void setPendingId(Integer pendingId) { this.pendingId = pendingId; }

    public String getLegacyId() { return legacyId; }
    public void setLegacyId(String legacyId) { this.legacyId = legacyId; }

    public String getWorkGroup() { return workGroup; }
    public void setWorkGroup(String workGroup) { this.workGroup = workGroup; }

    public String getProject() { return project; }
    public void setProject(String project) { this.project = project; }

    public String getJobNumber() { return jobNumber; }
    public void setJobNumber(String jobNumber) { this.jobNumber = jobNumber; }

    public String getEmployeeCode() { return employeeCode; }
    public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }

    public String getEmployeeName() { return employeeName; }
    public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getRanked() { return ranked; }
    public void setRanked(String ranked) { this.ranked = ranked; }

    public Boolean getLevelOne() { return levelOne; }
    public void setLevelOne(Boolean levelOne) { this.levelOne = levelOne; }

    public Boolean getLevelTwo() { return levelTwo; }
    public void setLevelTwo(Boolean levelTwo) { this.levelTwo = levelTwo; }

    public Boolean getLevelThree() { return levelThree; }
    public void setLevelThree(Boolean levelThree) { this.levelThree = levelThree; }

    public Boolean getLvl1Ss() { return lvl1Ss; }
    public void setLvl1Ss(Boolean lvl1Ss) { this.lvl1Ss = lvl1Ss; }

    public Boolean getLvl1MaterialHandling() { return lvl1MaterialHandling; }
    public void setLvl1MaterialHandling(Boolean lvl1MaterialHandling) { this.lvl1MaterialHandling = lvl1MaterialHandling; }

    public Boolean getLvl1LadderSafety() { return lvl1LadderSafety; }
    public void setLvl1LadderSafety(Boolean lvl1LadderSafety) { this.lvl1LadderSafety = lvl1LadderSafety; }

    public Boolean getLvl1FallProtection() { return lvl1FallProtection; }
    public void setLvl1FallProtection(Boolean lvl1FallProtection) { this.lvl1FallProtection = lvl1FallProtection; }

    public Boolean getLvl1SpotterTraining() { return lvl1SpotterTraining; }
    public void setLvl1SpotterTraining(Boolean lvl1SpotterTraining) { this.lvl1SpotterTraining = lvl1SpotterTraining; }

    public Boolean getLvl1ElectricalSafetyAwareness() { return lvl1ElectricalSafetyAwareness; }
    public void setLvl1ElectricalSafetyAwareness(Boolean lvl1ElectricalSafetyAwareness) { this.lvl1ElectricalSafetyAwareness = lvl1ElectricalSafetyAwareness; }

    public Boolean getLvl1Loto() { return lvl1Loto; }
    public void setLvl1Loto(Boolean lvl1Loto) { this.lvl1Loto = lvl1Loto; }

    public Boolean getLvl1EnergizedSteps() { return lvl1EnergizedSteps; }
    public void setLvl1EnergizedSteps(Boolean lvl1EnergizedSteps) { this.lvl1EnergizedSteps = lvl1EnergizedSteps; }

    public Boolean getLvl1TwoMenVerify() { return lvl1TwoMenVerify; }
    public void setLvl1TwoMenVerify(Boolean lvl1TwoMenVerify) { this.lvl1TwoMenVerify = lvl1TwoMenVerify; }

    public Boolean getLvl1JackStands() { return lvl1JackStands; }
    public void setLvl1JackStands(Boolean lvl1JackStands) { this.lvl1JackStands = lvl1JackStands; }

    public Boolean getLvl1CableTrayRollers() { return lvl1CableTrayRollers; }
    public void setLvl1CableTrayRollers(Boolean lvl1CableTrayRollers) { this.lvl1CableTrayRollers = lvl1CableTrayRollers; }

    public Boolean getLvl1CableCutting() { return lvl1CableCutting; }
    public void setLvl1CableCutting(Boolean lvl1CableCutting) { this.lvl1CableCutting = lvl1CableCutting; }

    public Boolean getLvl1CableStripping() { return lvl1CableStripping; }
    public void setLvl1CableStripping(Boolean lvl1CableStripping) { this.lvl1CableStripping = lvl1CableStripping; }

    public Boolean getLvl2CablePulliesInstall() { return lvl2CablePulliesInstall; }
    public void setLvl2CablePulliesInstall(Boolean lvl2CablePulliesInstall) { this.lvl2CablePulliesInstall = lvl2CablePulliesInstall; }

    public Boolean getLvl2CableSockSelection() { return lvl2CableSockSelection; }
    public void setLvl2CableSockSelection(Boolean lvl2CableSockSelection) { this.lvl2CableSockSelection = lvl2CableSockSelection; }

    public Boolean getLvl2CableConnectorInstall() { return lvl2CableConnectorInstall; }
    public void setLvl2CableConnectorInstall(Boolean lvl2CableConnectorInstall) { this.lvl2CableConnectorInstall = lvl2CableConnectorInstall; }

    public Boolean getLvl2CableLabeling() { return lvl2CableLabeling; }
    public void setLvl2CableLabeling(Boolean lvl2CableLabeling) { this.lvl2CableLabeling = lvl2CableLabeling; }

    public Boolean getLvl2Megging() { return lvl2Megging; }
    public void setLvl2Megging(Boolean lvl2Megging) { this.lvl2Megging = lvl2Megging; }

    public Boolean getLvl2CrimpingProcedures() { return lvl2CrimpingProcedures; }
    public void setLvl2CrimpingProcedures(Boolean lvl2CrimpingProcedures) { this.lvl2CrimpingProcedures = lvl2CrimpingProcedures; }

    public Boolean getLvl2DrillingHoles() { return lvl2DrillingHoles; }
    public void setLvl2DrillingHoles(Boolean lvl2DrillingHoles) { this.lvl2DrillingHoles = lvl2DrillingHoles; }

    public Boolean getLvl3ToolFeeds() { return lvl3ToolFeeds; }
    public void setLvl3ToolFeeds(Boolean lvl3ToolFeeds) { this.lvl3ToolFeeds = lvl3ToolFeeds; }

    public Boolean getLvl3Commissioning() { return lvl3Commissioning; }
    public void setLvl3Commissioning(Boolean lvl3Commissioning) { this.lvl3Commissioning = lvl3Commissioning; }

    public Boolean getLvl3Torqueing() { return lvl3Torqueing; }
    public void setLvl3Torqueing(Boolean lvl3Torqueing) { this.lvl3Torqueing = lvl3Torqueing; }

    public Boolean getLvl3TorqueSeal() { return lvl3TorqueSeal; }
    public void setLvl3TorqueSeal(Boolean lvl3TorqueSeal) { this.lvl3TorqueSeal = lvl3TorqueSeal; }

    public Boolean getLvl3BreakerManipulation() { return lvl3BreakerManipulation; }
    public void setLvl3BreakerManipulation(Boolean lvl3BreakerManipulation) { this.lvl3BreakerManipulation = lvl3BreakerManipulation; }

    public Boolean getLvl3TurnOffProcedure() { return lvl3TurnOffProcedure; }
    public void setLvl3TurnOffProcedure(Boolean lvl3TurnOffProcedure) { this.lvl3TurnOffProcedure = lvl3TurnOffProcedure; }

    public Boolean getLvl3TurnOnProcedures() { return lvl3TurnOnProcedures; }
    public void setLvl3TurnOnProcedures(Boolean lvl3TurnOnProcedures) { this.lvl3TurnOnProcedures = lvl3TurnOnProcedures; }

    public Boolean getLvl3EnergizePermit() { return lvl3EnergizePermit; }
    public void setLvl3EnergizePermit(Boolean lvl3EnergizePermit) { this.lvl3EnergizePermit = lvl3EnergizePermit; }

    public Boolean getLvl3Qew() { return lvl3Qew; }
    public void setLvl3Qew(Boolean lvl3Qew) { this.lvl3Qew = lvl3Qew; }

    public Boolean getBlackEnergizedWork() { return blackEnergizedWork; }
    public void setBlackEnergizedWork(Boolean blackEnergizedWork) { this.blackEnergizedWork = blackEnergizedWork; }

    public Boolean getGreenTurnOnOff() { return greenTurnOnOff; }
    public void setGreenTurnOnOff(Boolean greenTurnOnOff) { this.greenTurnOnOff = greenTurnOnOff; }

    public Boolean getRedTroubleshoot() { return redTroubleshoot; }
    public void setRedTroubleshoot(Boolean redTroubleshoot) { this.redTroubleshoot = redTroubleshoot; }

    public Boolean getAquaCablePulling() { return aquaCablePulling; }
    public void setAquaCablePulling(Boolean aquaCablePulling) { this.aquaCablePulling = aquaCablePulling; }

    public Boolean getBlueTerminations() { return blueTerminations; }
    public void setBlueTerminations(Boolean blueTerminations) { this.blueTerminations = blueTerminations; }

    public Boolean getGoldManagement() { return goldManagement; }
    public void setGoldManagement(Boolean goldManagement) { this.goldManagement = goldManagement; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getSupervisor() { return supervisor; }
    public void setSupervisor(String supervisor) { this.supervisor = supervisor; }

    public Boolean getBlueDotRfabOnboarding() { return blueDotRfabOnboarding; }
    public void setBlueDotRfabOnboarding(Boolean blueDotRfabOnboarding) { this.blueDotRfabOnboarding = blueDotRfabOnboarding; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
}
