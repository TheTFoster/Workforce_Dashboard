// src/main/java/com/cec/EmployeeDB/Repo/PaycomTimeReportRepository.java
package com.cec.EmployeeDB.Repo;

import com.cec.EmployeeDB.Entity.PaycomTimeReport;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PaycomTimeReportRepository extends JpaRepository<PaycomTimeReport, Long> {

       // ===== you already have these =====
       @Query("select p from PaycomTimeReport p " +
                     "where p.eeCode = :empCode and p.workDate between :start and :end " +
                     "order by p.workDate desc, p.inPunchTime desc")
       List<PaycomTimeReport> findByEmpAndDateRange(@Param("empCode") String empCode,
                     @Param("start") LocalDate start,
                     @Param("end") LocalDate end);

       List<PaycomTimeReport> findTop50ByEeCodeOrderByWorkDateDescInPunchTimeDesc(String eeCode);

       @Query("select distinct p.eeCode from PaycomTimeReport p " +
                     "where p.workDate between :start and :end")
       List<String> findDistinctEmpCodesInWindow(@Param("start") LocalDate start,
                     @Param("end") LocalDate end);

       // ===== add this projection =====
       interface LatestWorkedProjection {
              String getEeCode();

              LocalDate getLastWorkDate();

              String getProject();

              String getWorkLocation();

              String getJobNumber();
       }

       // ===== add this native window query (MySQL 8+) =====
       @Query(value = """
                       WITH ranked AS (
                         SELECT
                           ee_code,
                           work_date,
                           COALESCE(NULLIF(TRIM(dist_department_desc),''), NULLIF(TRIM(home_department_desc),''))  AS project,
                           COALESCE(NULLIF(TRIM(dist_job_desc),''),        NULLIF(TRIM(home_job_desc),''))         AS workLocation,
                           COALESCE(NULLIF(TRIM(dist_job_code),''),        NULLIF(TRIM(home_job_code),''))         AS jobNumber,
                           COALESCE(out_punch_time, in_punch_time, created_at)                                      AS ts_pref,
                           ROW_NUMBER() OVER (
                             PARTITION BY ee_code
                             ORDER BY work_date DESC, ts_pref DESC, id DESC
                           ) AS rn
                         FROM paycom_time_report
                         WHERE ee_code IN (:codes) AND work_date >= :start
                       )
                       SELECT
                         ee_code        AS eeCode,
                         work_date      AS lastWorkDate,
                         project        AS project,
                         workLocation   AS workLocation,
                         jobNumber      AS jobNumber
                       FROM ranked
                       WHERE rn = 1
                     """, nativeQuery = true)
       List<LatestWorkedProjection> findLatestByEeCodes(
                     @Param("codes") List<String> eeCodes,
                     @Param("start") LocalDate start);
}
