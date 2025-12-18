package com.cec.EmployeeDB.Repo;

import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

public interface TimeReportRepository extends Repository<com.cec.EmployeeDB.Entity.PaycomTimeReport, Long> {

  @Query(value = """
      SELECT ee_code,
             COALESCE(dist_department_desc, home_department_desc) AS work_group,
             COALESCE(dist_project, home_job_desc, home_section_desc) AS project,
             home_job_code AS job_number,
             COALESCE(out_punch_time, in_punch_time) AS last_seen
      FROM (
        SELECT t.*,
               ROW_NUMBER() OVER (
                  PARTITION BY t.ee_code
                  ORDER BY COALESCE(t.out_punch_time, t.in_punch_time) DESC
               ) rn
        FROM paycom_time_report t
        WHERE COALESCE(t.out_punch_time, t.in_punch_time) >= NOW() - INTERVAL ?1 DAY
      ) x
      WHERE x.rn = 1
      """, nativeQuery = true)
  List<Object[]> findLatestPerEmployee(int days);
}