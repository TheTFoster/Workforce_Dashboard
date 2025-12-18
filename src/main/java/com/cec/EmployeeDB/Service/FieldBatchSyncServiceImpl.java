package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.batch.dto.BatchChangeRow;
import com.cec.EmployeeDB.batch.dto.BatchReport;
import com.cec.EmployeeDB.batch.dto.BatchTotals;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class FieldBatchSyncServiceImpl implements FieldBatchSyncService {

    private final JdbcTemplate jdbc;

    // ---------------------------
    // PREVIEW (DIFF ONLY)
    // ---------------------------
    @Override
    @Transactional(readOnly = true)
    public BatchReport preview() {

    // 1. Find new employees (in field_import but not in field)
    String newEmployeesSql = """
          SELECT i.*, 'INSERT' as operation
          FROM field_import i
          LEFT JOIN field f ON f.employee_code_norm = i.employee_code_norm
          WHERE f.employee_code_norm IS NULL
            AND i.employee_code_norm IS NOT NULL
            AND i.employee_code_norm != ''
        """;

    List<BatchChangeRow> newEmployees = jdbc.query(newEmployeesSql, (ResultSet rs) -> {
      List<BatchChangeRow> list = new ArrayList<>();
      while (rs.next()) {
        BatchChangeRow row = new BatchChangeRow();
        row.setEmpCode(rs.getString("employee_code"));
        row.setDisplayName(rs.getString("employee_name"));
        row.setReason("NEW");
        List<BatchChangeRow.FieldDiff> fd = new ArrayList<>();
        fd.add(new BatchChangeRow.FieldDiff("Status", null, "New Employee"));
        row.setFieldDiffs(fd);
        list.add(row);
      }
      return list;
    });

    // 2. Find existing employees with changes
        String sql = """
                    SELECT *
                    FROM field f
                    JOIN field_import i
                      ON f.employee_code_norm = i.employee_code_norm
                """;

        List<BatchChangeRow> diffs = jdbc.query(sql, (ResultSet rs) -> {
            List<BatchChangeRow> list = new ArrayList<>();
          int[] statusCounters = new int[]{0, 0}; // [deactivated, terminated]

            while (rs.next()) {

                List<BatchChangeRow.FieldDiff> fd = new ArrayList<>();

                // helper
                java.util.function.BiConsumer<String, String> cmp = (fieldName, col) -> {
                    try {
                        String oldVal = rs.getString("f." + col);
                        String newVal = rs.getString("i." + col);
                        if (!Objects.equals(o(oldVal), o(newVal))) {
                            fd.add(new BatchChangeRow.FieldDiff(fieldName, oldVal, newVal));
                        }
                    } catch (Exception ignore) {
                    }
                };

                // actual compare fields

                cmp.accept("Employee Code", "employee_code");
                cmp.accept("TIXID", "tixid");
                cmp.accept("Display Name", "employee_name");
                cmp.accept("Legal Firstname", "legal_firstname");
                cmp.accept("Legal Lastname", "legal_lastname");
                cmp.accept("Nickname", "nickname");
                cmp.accept("Preferred Firstname", "preferred_firstname");
                cmp.accept("Legal Middle Name", "legal_middle_name");

                cmp.accept("Department", "department");
                cmp.accept("Department Desc", "department_desc");
                cmp.accept("Department GL Code", "department_gl_code");

                cmp.accept("Payroll Profile Code", "payroll_profile_code");
                cmp.accept("Payroll Profile Desc", "payroll_profile_desc");
                cmp.accept("Payroll Profile GL Code", "payroll_profile_gl_code");

                cmp.accept("Job Code", "job_code");
                cmp.accept("Job Desc", "job_desc");
                cmp.accept("Job GL Code", "job_gl_code");

                cmp.accept("Section Code", "section_code");
                cmp.accept("Sub Department Code", "sub_department_code");
                cmp.accept("Sub Department Desc", "sub_department_desc");
                cmp.accept("Sub Department GL Code", "sub_department_gl_code");

                cmp.accept("Position", "position");
                cmp.accept("Position Code", "position_code");
                cmp.accept("Position Family Code", "position_family_code");
                cmp.accept("Work Location", "work_location");

                cmp.accept("Labor Allocation Details", "labor_allocation_details");
                // Capture status change specially to count transitions
                try {
                  String oldVal = o(rs.getString("f.employee_status"));
                  String newVal = o(rs.getString("i.employee_status"));
                  if (!Objects.equals(oldVal, newVal)) {
                    fd.add(new BatchChangeRow.FieldDiff("Employee Status", oldVal, newVal));
                    String nv = newVal == null ? null : newVal.trim().toLowerCase();
                    String ov = oldVal == null ? null : oldVal.trim().toLowerCase();
                    if (nv != null) {
                      if ("inactive".equals(nv)) statusCounters[0]++;
                      if ("terminated".equals(nv)) statusCounters[1]++;
                    }
                    // Reactivation: moved to Active from Inactive/Terminated
                    if (nv != null && "active".equals(nv) && ov != null && ("inactive".equals(ov) || "terminated".equals(ov))) {
                      // piggyback using negative deact slot as temp marker; we'll rescan below
                      // (we'll compute precise counts from field diffs after loop)
                    }
                  }
                } catch (Exception ignore) {}

                cmp.accept("Primary Address 1", "primary_address_line_1");
                cmp.accept("Primary Address 2", "primary_address_line_2");
                cmp.accept("Primary City/Municipality", "primary_city_municipality");
                cmp.accept("Primary State/Province", "primary_state_province");
                cmp.accept("Primary Zip/Postal Code", "primary_zip_postal_code");
                cmp.accept("Primary Country Code", "primary_country_code");

                cmp.accept("Primary Phone", "primary_phone");
                cmp.accept("Primary Phone Type", "primary_phone_type");
                cmp.accept("Work Email", "work_email");
                cmp.accept("Personal Email", "personal_email");
                cmp.accept("Time In Position", "time_in_position");
                cmp.accept("Manager Level", "manager_level");

                cmp.accept("Work Address", "work_location_address");
                cmp.accept("Work City", "work_location_city");
                cmp.accept("Work State", "work_location_state");
                cmp.accept("Work Zip", "work_location_zip");
                cmp.accept("Work Country", "work_location_country");

                cmp.accept("Annual Salary", "annual_salary");
                cmp.accept("Pay Type", "pay_type");
                cmp.accept("Rate 1", "rate_1");
                cmp.accept("Salary Grade Code", "salary_grade_code");
                cmp.accept("Salary Grade Desc", "salary_grade_desc");
                cmp.accept("Salary Max", "salary_max");
                cmp.accept("Salary Mid", "salary_mid");
                cmp.accept("Salary Min", "salary_min");

                cmp.accept("Badge Num", "badge_num");
                cmp.accept("Time Zone Code", "time_zone_code");
                cmp.accept("Time Zone Desc", "time_zone_description");

                cmp.accept("Birth Date", "birth_date_mm_dd_yyyy");

                cmp.accept("Supervisor Primary", "supervisor_primary");
                cmp.accept("Supervisor Secondary", "supervisor_secondary");
                cmp.accept("Business Title", "business_title");
                cmp.accept("Position Title", "position_title");
                cmp.accept("Position Type", "position_type");

                cmp.accept("Hire Date", "hire_date");
                cmp.accept("Last Worked Date", "last_worked_date");
                cmp.accept("Termination Date", "termination_date");
                cmp.accept("TerminationDate1", "termination_date_1");
                cmp.accept("TerminationDate2", "termination_date_2");
                cmp.accept("Transfer Date", "transfer_date");

                cmp.accept("Ipad", "ipad");
                cmp.accept("Laptop", "laptop");
                cmp.accept("ShirtSize", "shirtsize");
                cmp.accept("Last Pay Change", "last_pay_change");
                cmp.accept("Last Position Change", "last_position_change_date");
                cmp.accept("Leave Start", "leave_start");
                cmp.accept("Leave End", "leave_end");
                cmp.accept("Most Recent Hire", "most_recent_hire_date");

                cmp.accept("Language Spoken", "ess_language_preference");

                // only add if there are diffs
                if (!fd.isEmpty()) {
                    BatchChangeRow row = new BatchChangeRow();
                    row.setEmpCode(rs.getString("employee_code"));
                    row.setDisplayName(rs.getString("employee_name"));
                                        row.setReason("UPDATE");
                    row.setFieldDiffs(fd);
                    list.add(row);
                }
            }

            return list;
        });

        if (diffs == null) {
            diffs = Collections.emptyList();
        }
    if (newEmployees == null) {
      newEmployees = Collections.emptyList();
    }

    // Combine lists
    List<BatchChangeRow> allChanges = new ArrayList<>();
    allChanges.addAll(newEmployees);
    allChanges.addAll(diffs);

        BatchTotals totals = new BatchTotals();
    totals.setInserted(newEmployees.size());
        totals.setUpdated(diffs.size());
        totals.setUnchanged(0);
        // best-effort status counters by scanning change rows
        int deact = 0, term = 0, react = 0;
        for (BatchChangeRow r : diffs) {
          if (r.getFieldDiffs() != null) {
            for (BatchChangeRow.FieldDiff f : r.getFieldDiffs()) {
              if ("Employee Status".equalsIgnoreCase(f.getField())) {
                String nv = o(f.getNewValue());
                String ov = o(f.getOldValue());
                if (nv != null) {
                  String s = nv.toLowerCase();
                  if ("inactive".equals(s)) deact++;
                  if ("terminated".equals(s)) term++;
                  if ("active".equals(s) && ov != null) {
                    String so = ov.toLowerCase();
                    if ("inactive".equals(so) || "terminated".equals(so)) react++;
                  }
                }
              }
            }
          }
        }
        totals.setDeactivated(deact);
        totals.setTerminated(term);
        totals.setReactivated(react);

        BatchReport br = new BatchReport(
                Instant.now(),
                true,
                totals,
                allChanges,
                Collections.emptyList());

        return br;
    }

    private String o(String s) {
        if (s == null)
            return null;
        if (s.trim().isEmpty())
            return null;
        return s.trim();
    }

    // ---------------------------
    // APPLY (RUN UPDATE)
    // ---------------------------
    @Override
    @Transactional
    public BatchReport apply() {

        // 1. Insert new employees from field_import that don't exist in field
        // Wrapped in try-catch to allow apply to proceed even if INSERT fails
        int inserted = 0;
        try {
            String insertSql = """
                    INSERT INTO field (
                      employee_code, tixid,
                      legal_firstname, legal_lastname, legal_middle_name,
                      preferred_firstname, nickname,
                      department, department_desc, department_gl_code,
                      payroll_profile_code, payroll_profile_desc, payroll_profile_gl_code,
                      job_code, job_desc, job_gl_code,
                      section_code, sub_department_code, sub_department_desc, sub_department_gl_code,
                      position, work_location, labor_allocation_details, employee_status,
                      position_code, position_family_code,
                      primary_address_line_1, primary_address_line_2,
                      primary_city_municipality, primary_state_province,
                      primary_zip_postal_code, primary_country_code,
                      primary_phone, primary_phone_type, work_email, personal_email,
                      time_in_position, manager_level,
                      work_location_address, work_location_city, work_location_state,
                      work_location_zip, work_location_country,
                      annual_salary, pay_type, rate_1,
                      salary_grade_code, salary_grade_desc,
                      salary_max, salary_mid, salary_min,
                      badge_num, time_zone_code, time_zone_description,
                      supervisor_primary, supervisor_secondary,
                      business_title, position_title, position_type,
                      shirt_size, ipad, laptop,
                      birth_date,
                      hire_date, last_worked_date, termination_date,
                      termination_date_1, termination_date_2, transfer_date,
                      last_pay_change, last_position_change_date,
                      leave_start, leave_end, most_recent_hire_date,
                      language_spoken, ess_language_preference,
                      created_at, updated_at, last_source
                    )
                    SELECT
                      i.employee_code, i.tixid,
                      i.legal_firstname, i.legal_lastname, i.legal_middle_name,
                      i.preferred_firstname, i.nickname,
                      i.department, i.department_desc, i.department_gl_code,
                      i.payroll_profile_code, i.payroll_profile_desc, i.payroll_profile_gl_code,
                      i.job_code, i.job_desc, i.job_gl_code,
                      i.section_code, i.sub_department_code, i.sub_department_desc, i.sub_department_gl_code,
                      i.position, i.work_location, i.labor_allocation_details, i.employee_status,
                      i.position_code, i.position_family_code,
                      i.primary_address_line_1, i.primary_address_line_2,
                      i.primary_city_municipality, i.primary_state_province,
                      i.primary_zip_postal_code, i.primary_country_code,
                      i.primary_phone, i.primary_phone_type, i.work_email, i.personal_email,
                      i.time_in_position, i.manager_level,
                      i.work_location_address, i.work_location_city, i.work_location_state,
                      i.work_location_zip, i.work_location_country,
                      i.annual_salary, i.pay_type, i.rate_1,
                      i.salary_grade_code, i.salary_grade_desc,
                      i.salary_max, i.salary_mid, i.salary_min,
                      i.badge_num, i.time_zone_code, i.time_zone_description,
                      i.supervisor_primary, i.supervisor_secondary,
                      i.business_title, i.position_title, i.position_type,
                      i.shirtsize, i.ipad, i.laptop,
                      i.birth_date_mm_dd_yyyy,
                      i.hire_date, i.last_worked_date, i.termination_date,
                      i.termination_date_1, i.termination_date_2, i.transfer_date,
                      CASE
                        WHEN i.last_pay_change IS NULL OR i.last_pay_change = ''
                             OR i.last_pay_change REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'
                          THEN NULL
                        ELSE COALESCE(
                               STR_TO_DATE(i.last_pay_change, '%m/%d/%Y'),
                               STR_TO_DATE(i.last_pay_change, '%Y-%m-%d')
                             )
                      END,
                      CASE
                        WHEN i.last_position_change_date IS NULL OR i.last_position_change_date = ''
                             OR i.last_position_change_date REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'
                          THEN NULL
                        ELSE COALESCE(
                               STR_TO_DATE(i.last_position_change_date, '%m/%d/%Y'),
                               STR_TO_DATE(i.last_position_change_date, '%Y-%m-%d')
                             )
                      END,
                      CASE
                        WHEN i.leave_start IS NULL OR i.leave_start = ''
                             OR i.leave_start REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'
                          THEN NULL
                        ELSE COALESCE(
                               STR_TO_DATE(i.leave_start, '%m/%d/%Y'),
                               STR_TO_DATE(i.leave_start, '%Y-%m-%d')
                             )
                      END,
                      CASE
                        WHEN i.leave_end IS NULL OR i.leave_end = ''
                             OR i.leave_end REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'
                          THEN NULL
                        ELSE COALESCE(
                               STR_TO_DATE(i.leave_end, '%m/%d/%Y'),
                               STR_TO_DATE(i.leave_end, '%Y-%m-%d')
                             )
                      END,
                      CASE
                        WHEN i.most_recent_hire_date IS NULL OR i.most_recent_hire_date = ''
                             OR i.most_recent_hire_date REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'
                          THEN NULL
                        ELSE COALESCE(
                               STR_TO_DATE(i.most_recent_hire_date, '%m/%d/%Y'),
                               STR_TO_DATE(i.most_recent_hire_date, '%Y-%m-%d')
                             )
                      END,
                      COALESCE(i.ess_language_preference, ''),
                      i.ess_language_preference,
                      NOW(), NOW(), 'field_import'
                    FROM field_import i
                    LEFT JOIN field f ON f.employee_code_norm = i.employee_code_norm
                    WHERE f.employee_code_norm IS NULL
                      AND i.employee_code_norm IS NOT NULL
                      AND i.employee_code_norm != ''
                    """;
            inserted = jdbc.update(insertSql);
            System.out.println("INSERT statement executed. Rows inserted: " + inserted);
        } catch (Exception e) {
            // INSERT failed but continue with UPDATE
            System.err.println("INSERT failed: " + e.getMessage());
            inserted = 0;
        }

        // 2. Update existing employees
        String sql = """
                UPDATE field f
                JOIN field_import fi
                  ON f.employee_code_norm = fi.employee_code_norm
                SET
                  -- identifiers / name
                  f.employee_code    = fi.employee_code,
                  f.tixid            = fi.tixid,
                  -- f.display_name     = fi.employee_name,  -- DO NOT set: generated column

                  f.legal_firstname     = fi.legal_firstname,
                  f.legal_lastname      = fi.legal_lastname,
                  f.legal_middle_name   = fi.legal_middle_name,
                  f.preferred_firstname = fi.preferred_firstname,
                  f.nickname            = fi.nickname,

                  -- org / dept
                  f.department         = fi.department,
                  f.department_desc    = fi.department_desc,
                  f.department_gl_code = fi.department_gl_code,

                  f.payroll_profile_code    = fi.payroll_profile_code,
                  f.payroll_profile_desc    = fi.payroll_profile_desc,
                  f.payroll_profile_gl_code = fi.payroll_profile_gl_code,

                  f.job_code    = fi.job_code,
                  f.job_desc    = fi.job_desc,
                  f.job_gl_code = fi.job_gl_code,

                  f.section_code           = fi.section_code,
                  f.sub_department_code    = fi.sub_department_code,
                  f.sub_department_desc    = fi.sub_department_desc,
                  f.sub_department_gl_code = fi.sub_department_gl_code,

                  f.position             = fi.position,
                  f.work_location        = fi.work_location,
                  f.labor_allocation_details = fi.labor_allocation_details,
                  f.employee_status      = fi.employee_status,
                  f.position_code        = fi.position_code,
                  f.position_family_code = fi.position_family_code,

                  -- primary address
                  f.primary_address_line_1    = fi.primary_address_line_1,
                  f.primary_address_line_2    = fi.primary_address_line_2,
                  f.primary_city_municipality = fi.primary_city_municipality,
                  f.primary_state_province    = fi.primary_state_province,
                  f.primary_zip_postal_code   = fi.primary_zip_postal_code,
                  f.primary_country_code      = fi.primary_country_code,

                  -- contact
                  f.primary_phone      = fi.primary_phone,
                  f.primary_phone_type = fi.primary_phone_type,
                  f.work_email         = fi.work_email,
                  f.personal_email     = fi.personal_email,

                  -- position / manager
                  f.time_in_position = fi.time_in_position,
                  f.manager_level    = fi.manager_level,

                  -- work location details
                  f.work_location_address = fi.work_location_address,
                  f.work_location_city    = fi.work_location_city,
                  f.work_location_state   = fi.work_location_state,
                  f.work_location_zip     = fi.work_location_zip,
                  f.work_location_country = fi.work_location_country,

                  -- compensation
                  f.annual_salary = fi.annual_salary,
                  f.pay_type      = fi.pay_type,
                  f.rate_1        = fi.rate_1,

                  f.salary_grade_code = fi.salary_grade_code,
                  f.salary_grade_desc = fi.salary_grade_desc,
                  f.salary_max        = fi.salary_max,
                  f.salary_mid        = fi.salary_mid,
                  f.salary_min        = fi.salary_min,

                  -- time zone / badge
                  f.badge_num             = fi.badge_num,
                  f.time_zone_code        = fi.time_zone_code,
                  f.time_zone_description = fi.time_zone_description,

                  -- supervisors / titles
                  f.supervisor_primary   = fi.supervisor_primary,
                  f.supervisor_secondary = fi.supervisor_secondary,
                  f.business_title       = fi.business_title,
                  f.position_title       = fi.position_title,
                  f.position_type        = fi.position_type,

                  -- gear
                  f.shirt_size = fi.shirtsize,
                  f.ipad       = fi.ipad,
                  f.laptop     = fi.laptop,

                  -- birthdate: just copy over; parsing should have happened at import
                  f.birth_date = fi.birth_date_mm_dd_yyyy,

                  -- core employment dates (already dates in fi)
                  f.hire_date         = fi.hire_date,
                  f.last_worked_date  = fi.last_worked_date,
                  f.termination_date  = fi.termination_date,
                  f.termination_date_1= fi.termination_date_1,
                  f.termination_date_2= fi.termination_date_2,
                  f.transfer_date     = fi.transfer_date,

                  -- new pay/position/leave dates (these are still text, so parse defensively)
                  f.last_pay_change = CASE
                    WHEN fi.last_pay_change IS NULL
                         OR fi.last_pay_change = ''
                         OR fi.last_pay_change REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'
                      THEN NULL
                    ELSE COALESCE(
                           STR_TO_DATE(fi.last_pay_change, '%m/%d/%Y'),
                           STR_TO_DATE(fi.last_pay_change, '%Y-%m-%d')
                         )
                  END,

                  f.last_position_change_date = CASE
                    WHEN fi.last_position_change_date IS NULL
                         OR fi.last_position_change_date = ''
                         OR fi.last_position_change_date REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'
                      THEN NULL
                    ELSE COALESCE(
                           STR_TO_DATE(fi.last_position_change_date, '%m/%d/%Y'),
                           STR_TO_DATE(fi.last_position_change_date, '%Y-%m-%d')
                         )
                  END,

                  f.leave_start = CASE
                    WHEN fi.leave_start IS NULL
                         OR fi.leave_start = ''
                         OR fi.leave_start REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'
                      THEN NULL
                    ELSE COALESCE(
                           STR_TO_DATE(fi.leave_start, '%m/%d/%Y'),
                           STR_TO_DATE(fi.leave_start, '%Y-%m-%d')
                         )
                  END,

                  f.leave_end = CASE
                    WHEN fi.leave_end IS NULL
                         OR fi.leave_end = ''
                         OR fi.leave_end REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'
                      THEN NULL
                    ELSE COALESCE(
                           STR_TO_DATE(fi.leave_end, '%m/%d/%Y'),
                           STR_TO_DATE(fi.leave_end, '%Y-%m-%d')
                         )
                  END,

                  f.most_recent_hire_date = CASE
                    WHEN fi.most_recent_hire_date IS NULL
                         OR fi.most_recent_hire_date = ''
                         OR fi.most_recent_hire_date REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'
                      THEN NULL
                    ELSE COALESCE(
                           STR_TO_DATE(fi.most_recent_hire_date, '%m/%d/%Y'),
                           STR_TO_DATE(fi.most_recent_hire_date, '%Y-%m-%d')
                         )
                  END,

                  -- language mapping
                  f.language_spoken         = COALESCE(fi.ess_language_preference, f.language_spoken),
                  f.ess_language_preference = fi.ess_language_preference,

                  -- audit
                  f.updated_at = NOW(),
                  f.last_source = 'field_import'
                """;

        int updated = jdbc.update(sql);

        // Best-effort counts for status transitions using import data vs existing
        int deactivated = 0;
        int terminated = 0;
        int reactivated = 0;

        try {
            String deactCountSql = """
                SELECT COUNT(*)
                FROM field f
                JOIN field_import fi ON f.employee_code_norm = fi.employee_code_norm
                WHERE COALESCE(f.employee_status, '') <> COALESCE(fi.employee_status, '')
                  AND LOWER(fi.employee_status) = 'inactive'
            """;
            Integer deactResult = jdbc.queryForObject(deactCountSql, Integer.class);
            deactivated = deactResult == null ? 0 : deactResult;
        } catch (Exception e) {
            // Silently skip if query fails (e.g., column doesn't exist)
        }

        try {
            String termCountSql = """
                SELECT COUNT(*)
                FROM field f
                JOIN field_import fi ON f.employee_code_norm = fi.employee_code_norm
                WHERE COALESCE(f.employee_status, '') <> COALESCE(fi.employee_status, '')
                  AND LOWER(fi.employee_status) = 'terminated'
            """;
            Integer termResult = jdbc.queryForObject(termCountSql, Integer.class);
            terminated = termResult == null ? 0 : termResult;
        } catch (Exception e) {
            // Silently skip if query fails
        }

        try {
            String reactCountSql = """
                SELECT COUNT(*)
                FROM field f
                JOIN field_import fi ON f.employee_code_norm = fi.employee_code_norm
                WHERE COALESCE(f.employee_status, '') <> COALESCE(fi.employee_status, '')
                  AND LOWER(fi.employee_status) = 'active'
                  AND LOWER(COALESCE(f.employee_status,'')) IN ('inactive','terminated')
            """;
            Integer reactResult = jdbc.queryForObject(reactCountSql, Integer.class);
            reactivated = reactResult == null ? 0 : reactResult;
        } catch (Exception e) {
            // Silently skip if query fails
        }

        BatchTotals totals = new BatchTotals();
  totals.setInserted(inserted);
        totals.setUpdated(updated);
        totals.setDeactivated(deactivated);
        totals.setTerminated(terminated);
        totals.setReactivated(reactivated);
        totals.setUnchanged(0);
        // other counters default to 0

        return new BatchReport(
                Instant.now(),
                false,
                totals,
                Collections.emptyList(),
                Collections.emptyList());
    }

}
