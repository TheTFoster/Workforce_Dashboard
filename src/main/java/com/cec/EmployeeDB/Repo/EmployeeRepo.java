// src/main/java/com/cec/EmployeeDB/Repo/EmployeeRepo.java
package com.cec.EmployeeDB.Repo;

import com.cec.EmployeeDB.Entity.Employee;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import org.springframework.data.domain.Pageable;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepo extends JpaRepository<Employee, Integer>, JpaSpecificationExecutor<Employee> {

  // ---------- Back-compat aliases (avoid breaking callers) ----------
  @Deprecated
  default Optional<Employee> findByEmployeeid(Integer employeeid) {
    if (employeeid == null) {
      return Optional.empty();
    }
    return findById(employeeid);
  }

  @Deprecated
  default Optional<Employee> findTopByOrderByEmployeeidDesc() {
    return findTopByOrderByIdDesc();
  }

  @Deprecated
  default List<Employee> findByEmployeeNameContainingIgnoreCase(String name) {
    return findByDisplayNameContainingIgnoreCase(name);
  }

  // ---------- Canonical methods ----------
  Optional<Employee> findTopByOrderByIdDesc();

  @Query("SELECT MAX(e.id) FROM Employee e")
  Integer findMaxEmpId();

  @Query("select max(e.updatedAt) from Employee e")
  LocalDateTime findMaxUpdatedAt();

  List<Employee> findByDisplayNameContainingIgnoreCase(String displayName);

  List<Employee> findByEndDateIsNull();

  List<Employee> findByRanked(String ranked);

  List<Employee> findByStartDateBetween(LocalDate startDate, LocalDate endDate);

  List<Employee> findByWorkGroup(String workGroup);

  long countBySupervisor(String supervisor);

  long countByWorkGroup(String workGroup);

  @Query("""
      SELECT e FROM Employee e
      WHERE UPPER(TRIM(e.project)) = UPPER(TRIM(:project))
      ORDER BY e.displayName ASC
      """)
  List<Employee> findByProjectOrderByEmployeeNameAsc(@Param("project") String project);

  @Query("""
      SELECT e FROM Employee e
      WHERE UPPER(TRIM(e.project)) = UPPER(TRIM(:project))
        AND e.employeeVerify = :status
      ORDER BY e.displayName ASC
      """)
  List<Employee> findByProjectAndEmployeeVerifyOrderByEmployeeNameAsc(
      @Param("project") String project,
      @Param("status") String status);

  @Query("""
      SELECT e FROM Employee e
      WHERE e.workGroup = :workGroup
      ORDER BY e.displayName ASC
      """)
  List<Employee> findByWorkGroupOrderByEmployeeNameAsc(@Param("workGroup") String workGroup);

  @Query("""
      SELECT e FROM Employee e
      WHERE e.workGroup = :workGroup
        AND e.employeeVerify = :employeeVerify
      ORDER BY e.displayName ASC
      """)
  List<Employee> findByWorkGroupAndEmployeeVerifyOrderByEmployeeNameAsc(
      @Param("workGroup") String workGroup,
      @Param("employeeVerify") String employeeVerify);

  @Query("""
      SELECT e FROM Employee e
      WHERE e.jobNumber = :jobNumber
      ORDER BY e.displayName ASC
      """)
  List<Employee> findByJobNumberOrderByEmployeeNameAsc(@Param("jobNumber") String jobNumber);

  @Query("""
      SELECT e FROM Employee e
      WHERE e.jobNumber = :jobNumber
        AND e.employeeVerify = :status
      ORDER BY e.displayName ASC
      """)
  List<Employee> findByJobNumberAndEmployeeVerifyOrderByEmployeeNameAsc(
      @Param("jobNumber") String jobNumber,
      @Param("status") String status);

  // ---------- Aggregations / distincts ----------
  interface ProjectSummaryRow {
    String getProject();

    Long getEmployeeCount();
  }

  @Query("""
      SELECT e.project AS project, COUNT(e) AS employeeCount
      FROM Employee e
      WHERE e.project IS NOT NULL AND TRIM(e.project) <> ''
      GROUP BY e.project
      ORDER BY e.project
      """)
  List<ProjectSummaryRow> findProjectsSummary();

  @Query("select distinct e.workGroup from Employee e where e.workGroup is not null and trim(e.workGroup) <> ''")
  List<String> findDistinctWorkGroup();

  @Query("select distinct e.ranked from Employee e where e.ranked is not null and trim(e.ranked) <> ''")
  List<String> findDistinctRanked();

  @Query("select distinct e.project from Employee e where e.project is not null and trim(e.project) <> ''")
  List<String> findDistinctProject();

  @Query("select distinct e.jobNumber from Employee e where e.jobNumber is not null and trim(e.jobNumber) <> ''")
  List<String> findDistinctJobNumber();

  @Query("select distinct e.supervisor from Employee e where e.supervisor is not null and trim(e.supervisor) <> ''")
  List<String> findDistinctSupervisor();

  // ---------- Identifier lookups ----------
  Optional<Employee> findByEmployeeCodeIgnoreCase(String employeeCode);

  Optional<Employee> findByEmployeeCodeNewIgnoreCase(String employeeCodeNew);

  Optional<Employee> findByBadgeNumIgnoreCase(String badgeNum);

  Optional<Employee> findByBadgeNumNormIgnoreCase(String badgeNumNorm);

  Optional<Employee> findByXidIgnoreCase(String xid);

  Optional<Employee> findByTixidIgnoreCase(String tixid);

  @Query("""
       SELECT e
       FROM Employee e
       WHERE
         (e.employeeCodeNew IS NOT NULL AND e.employeeCodeNew <> '' AND LOWER(e.employeeCodeNew) = LOWER(:code))
      OR (e.employeeCode    IS NOT NULL AND e.employeeCode    <> '' AND LOWER(e.employeeCode)    = LOWER(:code))
      OR (e.xid             IS NOT NULL AND e.xid             <> '' AND LOWER(e.xid)             = LOWER(:code))
      OR (e.tixid           IS NOT NULL AND e.tixid           <> '' AND LOWER(e.tixid)           = LOWER(:code))
      OR (e.badgeNum        IS NOT NULL AND e.badgeNum        <> '' AND LOWER(e.badgeNum)        = LOWER(:code))
      OR (e.badgeNumNorm    IS NOT NULL AND e.badgeNumNorm    <> '' AND LOWER(e.badgeNumNorm)    = LOWER(:code))
       """)
  Optional<Employee> findByAnyIdentifier(@Param("code") String code);

  @Query("select max(e.updatedAt) from Employee e")
  LocalDateTime lastUpdatedRaw();

  // Keep projection local so the method compiles even if not elsewhere
  interface TimelineEventProjection {
    String getEventType();

    java.time.LocalDate getEventDate();
  }

  @Query(value = """
          SELECT event_type, event_date
          FROM v_field_key_dates
          WHERE emp_id = :empId
          ORDER BY event_date
      """, nativeQuery = true)
  List<TimelineEventProjection> findTimeline(@Param("empId") Long empId);

  @Query("""
      SELECT e FROM Employee e
      WHERE (
        (e.employeeCode IS NOT NULL AND LOWER(TRIM(e.employeeCode)) LIKE LOWER(CONCAT('%', TRIM(:pattern), '%')))
     OR (e.employeeCodeNew IS NOT NULL AND LOWER(TRIM(e.employeeCodeNew)) LIKE LOWER(CONCAT('%', TRIM(:pattern), '%')))
     OR (e.xid IS NOT NULL AND LOWER(TRIM(e.xid)) LIKE LOWER(CONCAT('%', TRIM(:pattern), '%')))
     OR (e.tixid IS NOT NULL AND LOWER(TRIM(e.tixid)) LIKE LOWER(CONCAT('%', TRIM(:pattern), '%')))
     OR (e.badgeNum IS NOT NULL AND LOWER(TRIM(e.badgeNum)) LIKE LOWER(CONCAT('%', TRIM(:pattern), '%')))
     OR (e.badgeNumNorm IS NOT NULL AND LOWER(TRIM(e.badgeNumNorm)) LIKE LOWER(CONCAT('%', TRIM(:pattern), '%')))
     OR (e.displayName IS NOT NULL AND LOWER(TRIM(e.displayName)) LIKE LOWER(CONCAT('%', TRIM(:pattern), '%')))
      )
      """)
  List<Employee> findByIdentifierLike(@Param("pattern") String pattern, Pageable pageable);

  List<Employee> findByEmployeeCodeIn(Collection<String> employeeCodes);

}
