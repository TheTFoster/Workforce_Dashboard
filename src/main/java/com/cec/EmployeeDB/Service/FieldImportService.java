package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.Dto.FieldImportResult;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

@Service
@RequiredArgsConstructor
public class FieldImportService {

    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public FieldImportResult importCsv(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("CSV file is required");
        }

        // 1) Save upload to a temp file (name can be anything from Paycom)
        Path tempFile = Files.createTempFile("field_import_", ".csv");
        file.transferTo(Objects.requireNonNull(tempFile.toFile()));

        // Path for MySQL (escape backslashes for Windows paths)
        String mysqlPath = tempFile.toAbsolutePath().toString().replace("\\", "\\\\");

        String originalName = file.getOriginalFilename();
        if (originalName == null)
            originalName = tempFile.getFileName().toString();

        long rowsLoaded = 0L;
        int rowsUpdated = 0;
        int rowsInserted = 0;
        List<Map<String, Object>> updatedEmployees = new java.util.ArrayList<>();
        List<Map<String, Object>> insertedEmployees = new java.util.ArrayList<>();

        try {
            // 2) Session prep (same as your manual script)
            jdbcTemplate.execute("SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci");
            jdbcTemplate.execute("SET @old_sql_mode := @@SESSION.sql_mode");
            jdbcTemplate.execute("SET SESSION sql_mode = REPLACE(@@SESSION.sql_mode, 'STRICT_TRANS_TABLES', '')");
            jdbcTemplate.execute("SET SESSION sql_mode = REPLACE(@@SESSION.sql_mode, 'STRICT_ALL_TABLES', '')");

            jdbcTemplate.update("TRUNCATE TABLE field_import");

            // 3) LOAD DATA LOCAL INFILE – **dynamic path**, columns fixed
            String loadSql = "LOAD DATA LOCAL INFILE '" + mysqlPath + "'\n" +
                    "INTO TABLE field_import\n" +
                    "CHARACTER SET utf8mb4\n" +
                    "FIELDS TERMINATED BY ',' ENCLOSED BY '\"' ESCAPED BY ''\n" +
                    "LINES TERMINATED BY '\\r\\n'\n" +
                    "IGNORE 1 LINES\n" +
                    "(\n" +
                    "  @employee_code,\n" +
                    "  @tixid,\n" +
                    "  @employee_name,\n" +
                    "  @legal_firstname,\n" +
                    "  @legal_lastname,\n" +
                    "  @nickname,\n" +
                    "  @legal_middle_name,\n" +
                    "  @department,\n" +
                    "  @department_desc,\n" +
                    "  @department_gl_code,\n" +
                    "  @preferred_firstname,\n" +
                    "  @legal_employee_name,\n" +
                    "  @payroll_profile_code,\n" +
                    "  @payroll_profile_desc,\n" +
                    "  @payroll_profile_gl_code,\n" +
                    "  @job_code,\n" +
                    "  @job_desc,\n" +
                    "  @job_gl_code,\n" +
                    "  @section_code,\n" +
                    "  @sub_department_code,\n" +
                    "  @sub_department_desc,\n" +
                    "  @sub_department_gl_code,\n" +
                    "  @position,\n" +
                    "  @work_location,\n" +
                    "  @labor_allocation_details,\n" +
                    "  @employee_status,\n" +
                    "  @position_code,\n" +
                    "  @position_family_code,\n" +
                    "  @primary_address_line_1,\n" +
                    "  @primary_address_line_2,\n" +
                    "  @primary_city_municipality,\n" +
                    "  @primary_state_province,\n" +
                    "  @primary_zip_postal_code,\n" +
                    "  @primary_country_code,\n" +
                    "  @primary_phone,\n" +
                    "  @primary_phone_type,\n" +
                    "  @work_email,\n" +
                    "  @personal_email,\n" +
                    "  @time_in_position,\n" +
                    "  @manager_level,\n" +
                    "  @work_location_address,\n" +
                    "  @work_location_city,\n" +
                    "  @work_location_state,\n" +
                    "  @work_location_zip,\n" +
                    "  @work_location_country,\n" +
                    "  @annual_salary,\n" +
                    "  @pay_type,\n" +
                    "  @rate_1,\n" +
                    "  @salary_grade_code,\n" +
                    "  @salary_grade_desc,\n" +
                    "  @salary_max,\n" +
                    "  @salary_mid,\n" +
                    "  @salary_min,\n" +
                    "  @badge_num,\n" +
                    "  @time_zone_code,\n" +
                    "  @time_zone_description,\n" +
                    "  @birth_date_mm_dd_yyyy,\n" +
                    "  @supervisor_primary,\n" +
                    "  @supervisor_secondary,\n" +
                    "  @business_title,\n" +
                    "  @position_title,\n" +
                    "  @position_type,\n" +
                    "  @hire_date,\n" +
                    "  @last_worked_date_str,\n" +
                    "  @termination_date_str,\n" +
                    "  @termination_date1_str,\n" +
                    "  @termination_date2_str,\n" +
                    "  @transfer_date_str,\n" +
                    "  @ipad,\n" +
                    "  @laptop,\n" +
                    "  @shirtsize,\n" +
                    "  @last_pay_change_str,\n" +
                    "  @last_position_change_date_str,\n" +
                    "  @leave_start_str,\n" +
                    "  @leave_end_str,\n" +
                    "  @most_recent_hire_date_str,\n" +
                    "  @ess_language_preference_raw\n" +
                    ")\n" +
                    "SET\n" +
                    "  -- text cleansing\n" +
                    "  employee_code = NULLIF(TRIM(REPLACE(REPLACE(@employee_code, CHAR(194,160), ' '), CHAR(226,128,175), ' ')), ''),\n"
                    +
                    "  tixid         = NULLIF(TRIM(REPLACE(REPLACE(@tixid,         CHAR(194,160), ' '), CHAR(226,128,175), ' ')), ''),\n"
                    +
                    "  employee_name = NULLIF(TRIM(REPLACE(REPLACE(@employee_name, CHAR(194,160), ' '), CHAR(226,128,175), ' ')), ''),\n"
                    +
                    "\n" +
                    "  legal_firstname   = NULLIF(TRIM(REPLACE(REPLACE(@legal_firstname,   CHAR(194,160), ' '), CHAR(226,128,175), ' ')), ''),\n"
                    +
                    "  legal_lastname    = NULLIF(TRIM(REPLACE(REPLACE(@legal_lastname,    CHAR(194,160), ' '), CHAR(226,128,175), ' ')), ''),\n"
                    +
                    "  nickname          = NULLIF(TRIM(REPLACE(REPLACE(@nickname,          CHAR(194,160), ' '), CHAR(226,128,175), ' ')), ''),\n"
                    +
                    "  legal_middle_name = NULLIF(TRIM(REPLACE(REPLACE(@legal_middle_name, CHAR(194,160), ' '), CHAR(226,128,175), ' ')), ''),\n"
                    +
                    "\n" +
                    "  department          = NULLIF(TRIM(REPLACE(REPLACE(@department,      CHAR(194,160), ' '), CHAR(226,128,175), ' ')), ''),\n"
                    +
                    "  department_desc     = NULLIF(TRIM(REPLACE(REPLACE(@department_desc, CHAR(194,160), ' '), CHAR(226,128,175), ' ')), ''),\n"
                    +
                    "  department_gl_code  = NULLIF(TRIM(@department_gl_code), ''),\n" +
                    "\n" +
                    "  preferred_firstname = NULLIF(TRIM(@preferred_firstname), ''),\n" +
                    "  legal_employee_name = NULLIF(TRIM(@legal_employee_name), ''),\n" +
                    "\n" +
                    "  payroll_profile_code    = NULLIF(TRIM(@payroll_profile_code), ''),\n" +
                    "  payroll_profile_desc    = NULLIF(TRIM(@payroll_profile_desc), ''),\n" +
                    "  payroll_profile_gl_code = NULLIF(TRIM(@payroll_profile_gl_code), ''),\n" +
                    "\n" +
                    "  job_code   = NULLIF(TRIM(@job_code), ''),\n" +
                    "  job_desc   = NULLIF(TRIM(@job_desc), ''),\n" +
                    "  job_gl_code= NULLIF(TRIM(@job_gl_code), ''),\n" +
                    "\n" +
                    "  section_code           = NULLIF(TRIM(@section_code), ''),\n" +
                    "  sub_department_code    = NULLIF(TRIM(@sub_department_code), ''),\n" +
                    "  sub_department_desc    = NULLIF(TRIM(@sub_department_desc), ''),\n" +
                    "  sub_department_gl_code = NULLIF(TRIM(@sub_department_gl_code), ''),\n" +
                    "\n" +
                    "  position        = NULLIF(TRIM(@position), ''),\n" +
                    "  work_location   = NULLIF(TRIM(REPLACE(REPLACE(@work_location, CHAR(194,160), ' '), CHAR(226,128,175), ' ')), ''),\n"
                    +
                    "  labor_allocation_details = NULLIF(TRIM(@labor_allocation_details), ''),\n" +
                    "  employee_status = NULLIF(TRIM(@employee_status), ''),\n" +
                    "  position_code   = NULLIF(TRIM(@position_code), ''),\n" +
                    "  position_family_code = NULLIF(TRIM(@position_family_code), ''),\n" +
                    "\n" +
                    "  primary_address_line_1    = NULLIF(TRIM(@primary_address_line_1), ''),\n" +
                    "  primary_address_line_2    = NULLIF(TRIM(@primary_address_line_2), ''),\n" +
                    "  primary_city_municipality = NULLIF(TRIM(@primary_city_municipality), ''),\n" +
                    "  primary_state_province    = NULLIF(TRIM(@primary_state_province), ''),\n" +
                    "  primary_zip_postal_code   = NULLIF(TRIM(@primary_zip_postal_code), ''),\n" +
                    "  primary_country_code      = NULLIF(TRIM(@primary_country_code), ''),\n" +
                    "\n" +
                    "  primary_phone = NULLIF(TRIM(REPLACE(REPLACE(@primary_phone, CHAR(194,160), ''), CHAR(226,128,175), '')), ''),\n"
                    +
                    "  primary_phone_type = NULLIF(TRIM(@primary_phone_type), ''),\n" +
                    "  work_email         = NULLIF(TRIM(@work_email), ''),\n" +
                    "  personal_email     = NULLIF(TRIM(@personal_email), ''),\n" +
                    "\n" +
                    "  time_in_position = NULLIF(TRIM(@time_in_position), ''),\n" +
                    "  manager_level    = NULLIF(TRIM(@manager_level), ''),\n" +
                    "\n" +
                    "  work_location_address = NULLIF(TRIM(@work_location_address), ''),\n" +
                    "  work_location_city    = NULLIF(TRIM(@work_location_city), ''),\n" +
                    "  work_location_state   = NULLIF(TRIM(@work_location_state), ''),\n" +
                    "  work_location_zip     = NULLIF(TRIM(@work_location_zip), ''),\n" +
                    "  work_location_country = NULLIF(TRIM(@work_location_country), ''),\n" +
                    "\n" +
                    "  annual_salary = NULLIF(REPLACE(REPLACE(TRIM(@annual_salary), ',', ''), '$', ''), ''),\n" +
                    "  pay_type      = NULLIF(TRIM(@pay_type), ''),\n" +
                    "  rate_1        = NULLIF(REPLACE(REPLACE(TRIM(@rate_1), ',', ''), '$', ''), ''),\n" +
                    "\n" +
                    "  salary_grade_code = NULLIF(TRIM(@salary_grade_code), ''),\n" +
                    "  salary_grade_desc = NULLIF(TRIM(@salary_grade_desc), ''),\n" +
                    "  salary_max = NULLIF(REPLACE(REPLACE(TRIM(@salary_max), ',', ''), '$', ''), ''),\n" +
                    "  salary_mid = NULLIF(REPLACE(REPLACE(TRIM(@salary_mid), ',', ''), '$', ''), ''),\n" +
                    "  salary_min = NULLIF(REPLACE(REPLACE(TRIM(@salary_min), ',', ''), '$', ''), ''),\n" +
                    "\n" +
                    "  badge_num = NULLIF(TRIM(@badge_num), ''),\n" +
                    "  time_zone_code = NULLIF(TRIM(@time_zone_code), ''),\n" +
                    "  time_zone_description = NULLIF(TRIM(@time_zone_description), ''),\n" +
                    "\n" +
                    "  supervisor_primary   = NULLIF(TRIM(@supervisor_primary), ''),\n" +
                    "  supervisor_secondary = NULLIF(TRIM(@supervisor_secondary), ''),\n" +
                    "  business_title       = NULLIF(TRIM(@business_title), ''),\n" +
                    "  position_title       = NULLIF(TRIM(@position_title), ''),\n" +
                    "  position_type        = NULLIF(TRIM(@position_type), ''),\n" +
                    "\n" +
                    "  shirtsize = NULLIF(TRIM(@shirtsize), ''),\n" +
                    "  ipad      = NULLIF(TRIM(@ipad), ''),\n" +
                    "  laptop    = NULLIF(TRIM(@laptop), ''),\n" +
                    "\n" +
                    "  birth_date_mm_dd_yyyy = CASE\n" +
                    "    WHEN TRIM(@birth_date_mm_dd_yyyy) = ''\n" +
                    "      OR TRIM(@birth_date_mm_dd_yyyy) REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'\n" +
                    "    THEN NULL\n" +
                    "    ELSE COALESCE(\n" +
                    "      STR_TO_DATE(@birth_date_mm_dd_yyyy, '%m/%d/%Y'),\n" +
                    "      STR_TO_DATE(@birth_date_mm_dd_yyyy, '%Y-%m-%d')\n" +
                    "    )\n" +
                    "  END,\n" +
                    "\n" +
                    "  hire_date = CASE\n" +
                    "    WHEN TRIM(@hire_date) = ''\n" +
                    "      OR TRIM(@hire_date) REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'\n" +
                    "    THEN NULL\n" +
                    "    ELSE COALESCE(\n" +
                    "      STR_TO_DATE(@hire_date, '%m/%d/%Y'),\n" +
                    "      STR_TO_DATE(@hire_date, '%Y-%m-%d')\n" +
                    "    )\n" +
                    "  END,\n" +
                    "\n" +
                    "  last_worked_date = CASE\n" +
                    "    WHEN TRIM(@last_worked_date_str) = ''\n" +
                    "      OR TRIM(@last_worked_date_str) REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'\n" +
                    "    THEN NULL\n" +
                    "    ELSE COALESCE(\n" +
                    "      STR_TO_DATE(@last_worked_date_str, '%m/%d/%Y'),\n" +
                    "      STR_TO_DATE(@last_worked_date_str, '%Y-%m-%d')\n" +
                    "    )\n" +
                    "  END,\n" +
                    "\n" +
                    "  termination_date = CASE\n" +
                    "    WHEN TRIM(@termination_date_str) = ''\n" +
                    "      OR TRIM(@termination_date_str) REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'\n" +
                    "    THEN NULL\n" +
                    "    ELSE COALESCE(\n" +
                    "      STR_TO_DATE(@termination_date_str, '%m/%d/%Y'),\n" +
                    "      STR_TO_DATE(@termination_date_str, '%Y-%m-%d')\n" +
                    "    )\n" +
                    "  END,\n" +
                    "\n" +
                    "  termination_date_1 = CASE\n" +
                    "    WHEN TRIM(@termination_date1_str) = ''\n" +
                    "      OR TRIM(@termination_date1_str) REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'\n" +
                    "    THEN NULL\n" +
                    "    ELSE COALESCE(\n" +
                    "      STR_TO_DATE(@termination_date1_str, '%m/%d/%Y'),\n" +
                    "      STR_TO_DATE(@termination_date1_str, '%Y-%m-%d')\n" +
                    "    )\n" +
                    "  END,\n" +
                    "\n" +
                    "  termination_date_2 = CASE\n" +
                    "    WHEN TRIM(@termination_date2_str) = ''\n" +
                    "      OR TRIM(@termination_date2_str) REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'\n" +
                    "    THEN NULL\n" +
                    "    ELSE COALESCE(\n" +
                    "      STR_TO_DATE(@termination_date2_str, '%m/%d/%Y'),\n" +
                    "      STR_TO_DATE(@termination_date2_str, '%Y-%m-%d')\n" +
                    "    )\n" +
                    "  END,\n" +
                    "\n" +
                    "  transfer_date = CASE\n" +
                    "    WHEN TRIM(@transfer_date_str) = ''\n" +
                    "      OR TRIM(@transfer_date_str) REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'\n" +
                    "    THEN NULL\n" +
                    "    ELSE COALESCE(\n" +
                    "      STR_TO_DATE(@transfer_date_str, '%m/%d/%Y'),\n" +
                    "      STR_TO_DATE(@transfer_date_str, '%Y-%m-%d')\n" +
                    "    )\n" +
                    "  END,\n" +
                    "\n" +
                    "  last_pay_change = NULLIF(TRIM(@last_pay_change_str), ''),\n" + // raw; parsed in UPDATE
                    "  last_position_change_date = NULLIF(TRIM(@last_position_change_date_str), ''),\n" +
                    "  leave_start = NULLIF(TRIM(@leave_start_str), ''),\n" +
                    "  leave_end = NULLIF(TRIM(@leave_end_str), ''),\n" +
                    "  most_recent_hire_date = NULLIF(TRIM(@most_recent_hire_date_str), ''),\n" +
                    "\n" +
                    "  ess_language_preference = NULLIF(TRIM(@ess_language_preference_raw), ''),\n" +
                    "\n" +
                    "  employee_code_norm = UPPER(REPLACE(REPLACE(COALESCE(@employee_code,''), '-', ''), ' ', '')),\n" +
                    "  badge_num_norm     = UPPER(REPLACE(REPLACE(COALESCE(@badge_num,''),   '-', ''), ' ', '')),\n" +
                    "  tixid_norm         = UPPER(REPLACE(REPLACE(COALESCE(@tixid,''),       '-', ''), ' ', ''))\n" +
                    ";";

            jdbcTemplate.update(loadSql);

            // 4) Count rows loaded into staging
            Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM field_import", Long.class);
            if (count != null) {
                rowsLoaded = count;
            }

            // 4.5) Identify employees to be inserted (NEW employees not in field table)
            insertedEmployees = jdbcTemplate.query(
                "SELECT fi.employee_code, fi.employee_name, fi.position_title, fi.department_desc, fi.employee_status " +
                "FROM field_import fi " +
                "LEFT JOIN field f ON f.employee_code_norm = fi.employee_code_norm " +
                "WHERE f.employee_code_norm IS NULL " +
                "  AND fi.employee_code_norm IS NOT NULL " +
                "  AND fi.employee_code_norm != ''",
                (rs, rowNum) -> {
                    Map<String, Object> emp = new LinkedHashMap<>();
                    emp.put("employeeCode", rs.getString("employee_code"));
                    emp.put("name", rs.getString("employee_name"));
                    emp.put("position", rs.getString("position_title"));
                    emp.put("department", rs.getString("department_desc"));
                    emp.put("status", rs.getString("employee_status"));
                    return emp;
                }
            );

            // 4.6) Identify employees to be updated (show all matched employees with their changes)
            updatedEmployees = jdbcTemplate.query(
                "SELECT " +
                "  f.employee_code, " +
                "  COALESCE(fi.employee_name, '') AS new_name, " +
                "  COALESCE(fi.job_code, '') AS new_job_code, " +
                "  COALESCE(fi.department_desc, '') AS new_department, " +
                "  COALESCE(fi.employee_status, '') AS new_status, " +
                "  COALESCE(fi.work_location, '') AS new_work_location, " +
                "  COALESCE(fi.work_email, '') AS new_work_email, " +
                "  COALESCE(fi.personal_email, '') AS new_personal_email, " +
                "  COALESCE(fi.primary_phone, '') AS new_primary_phone, " +
                "  COALESCE(fi.badge_num, '') AS new_badge_num, " +
                "  COALESCE(fi.tixid, '') AS new_tixid, " +
                "  COALESCE(fi.position_title, '') AS new_position_title, " +
                "  fi.hire_date AS new_hire_date, " +
                "  fi.last_worked_date AS new_last_worked_date, " +
                "  fi.termination_date AS new_termination_date, " +
                "  COALESCE(f.display_name, '') AS old_name, " +
                "  COALESCE(f.job_code, '') AS old_job_code, " +
                "  COALESCE(f.department_desc, '') AS old_department, " +
                "  COALESCE(f.employee_status, '') AS old_status, " +
                "  COALESCE(f.work_location, '') AS old_work_location, " +
                "  COALESCE(f.work_email, '') AS old_work_email, " +
                "  COALESCE(f.personal_email, '') AS old_personal_email, " +
                "  COALESCE(f.primary_phone, '') AS old_primary_phone, " +
                "  COALESCE(f.badge_num, '') AS old_badge_num, " +
                "  COALESCE(f.tixid, '') AS old_tixid, " +
                "  COALESCE(f.position_title, '') AS old_position_title, " +
                "  f.hire_date AS old_hire_date, " +
                "  f.last_worked_date AS old_last_worked_date, " +
                "  f.termination_date AS old_termination_date " +
                "FROM field f " +
                "JOIN field_import fi ON f.employee_code_norm = fi.employee_code_norm",
                (rs, rowNum) -> {
                    Map<String, Object> emp = new LinkedHashMap<>();
                    emp.put("employeeCode", rs.getString("employee_code"));
                    
                    List<String> changes = new ArrayList<>();
                    
                    // COALESCE in SELECT ensures these are never null, just compare directly
                    String oldName = rs.getString("old_name");
                    String newName = rs.getString("new_name");
                    if (!oldName.equals(newName)) {
                        changes.add("Name: '" + oldName + "' → '" + newName + "'");
                    }
                    
                    String oldJob = rs.getString("old_job_code");
                    String newJob = rs.getString("new_job_code");
                    if (!oldJob.equals(newJob)) {
                        changes.add("Job Code: '" + oldJob + "' → '" + newJob + "'");
                    }
                    
                    String oldDept = rs.getString("old_department");
                    String newDept = rs.getString("new_department");
                    if (!oldDept.equals(newDept)) {
                        changes.add("Department: '" + oldDept + "' → '" + newDept + "'");
                    }
                    
                    String oldPosition = rs.getString("old_position_title");
                    String newPosition = rs.getString("new_position_title");
                    if (!oldPosition.equals(newPosition)) {
                        changes.add("Position: '" + oldPosition + "' → '" + newPosition + "'");
                    }
                    
                    String oldStatus = rs.getString("old_status");
                    String newStatus = rs.getString("new_status");
                    if (!oldStatus.equals(newStatus)) {
                        changes.add("Status: '" + oldStatus + "' → '" + newStatus + "'");
                    }
                    
                    String oldLoc = rs.getString("old_work_location");
                    String newLoc = rs.getString("new_work_location");
                    if (!oldLoc.equals(newLoc)) {
                        changes.add("Work Location: '" + oldLoc + "' → '" + newLoc + "'");
                    }
                    
                    String oldEmail = rs.getString("old_work_email");
                    String newEmail = rs.getString("new_work_email");
                    if (!oldEmail.equals(newEmail)) {
                        changes.add("Work Email: '" + oldEmail + "' → '" + newEmail + "'");
                    }
                    
                    String oldPersonal = rs.getString("old_personal_email");
                    String newPersonal = rs.getString("new_personal_email");
                    if (!oldPersonal.equals(newPersonal)) {
                        changes.add("Personal Email: '" + oldPersonal + "' → '" + newPersonal + "'");
                    }
                    
                    String oldPhone = rs.getString("old_primary_phone");
                    String newPhone = rs.getString("new_primary_phone");
                    if (!oldPhone.equals(newPhone)) {
                        changes.add("Phone: '" + oldPhone + "' → '" + newPhone + "'");
                    }
                    
                    String oldBadge = rs.getString("old_badge_num");
                    String newBadge = rs.getString("new_badge_num");
                    if (!oldBadge.equals(newBadge)) {
                        changes.add("Badge #: '" + oldBadge + "' → '" + newBadge + "'");
                    }
                    
                    String oldTixid = rs.getString("old_tixid");
                    String newTixid = rs.getString("new_tixid");
                    if (!oldTixid.equals(newTixid)) {
                        changes.add("TixID: '" + oldTixid + "' → '" + newTixid + "'");
                    }
                    
                    java.sql.Date oldHire = rs.getDate("old_hire_date");
                    java.sql.Date newHire = rs.getDate("new_hire_date");
                    if (!Objects.equals(oldHire, newHire)) {
                        changes.add("Hire Date: '" + (oldHire != null ? oldHire : "") + "' → '" + (newHire != null ? newHire : "") + "'");
                    }
                    
                    java.sql.Date oldLastWorked = rs.getDate("old_last_worked_date");
                    java.sql.Date newLastWorked = rs.getDate("new_last_worked_date");
                    if (!Objects.equals(oldLastWorked, newLastWorked)) {
                        changes.add("Last Worked: '" + (oldLastWorked != null ? oldLastWorked : "") + "' → '" + (newLastWorked != null ? newLastWorked : "") + "'");
                    }
                    
                    java.sql.Date oldTerm = rs.getDate("old_termination_date");
                    java.sql.Date newTerm = rs.getDate("new_termination_date");
                    if (!Objects.equals(oldTerm, newTerm)) {
                        changes.add("Termination Date: '" + (oldTerm != null ? oldTerm : "") + "' → '" + (newTerm != null ? newTerm : "") + "'");
                    }
                    
                    emp.put("changes", changes);
                    emp.put("name", !newName.isEmpty() ? newName : oldName);
                    return emp;
                }
            );

            // 5) Merge into field (same UPDATE that just worked for you)
            String updateSql = "UPDATE field f\n" +
                    "JOIN field_import fi ON f.employee_code_norm = fi.employee_code_norm\n" +
                    "SET\n" +
                    "  f.employee_code    = fi.employee_code,\n" +
                    "  f.tixid            = fi.tixid,\n" +
                    "  f.display_name     = fi.employee_name,\n" +
                    "\n" +
                    "  f.legal_firstname   = fi.legal_firstname,\n" +
                    "  f.legal_lastname    = fi.legal_lastname,\n" +
                    "  f.legal_middle_name = fi.legal_middle_name,\n" +
                    "  f.preferred_firstname = fi.preferred_firstname,\n" +
                    "  f.nickname            = fi.nickname,\n" +
                    "\n" +
                    "  f.department         = fi.department,\n" +
                    "  f.department_desc    = fi.department_desc,\n" +
                    "  f.department_gl_code = fi.department_gl_code,\n" +
                    "\n" +
                    "  f.payroll_profile_code    = fi.payroll_profile_code,\n" +
                    "  f.payroll_profile_desc    = fi.payroll_profile_desc,\n" +
                    "  f.payroll_profile_gl_code = fi.payroll_profile_gl_code,\n" +
                    "\n" +
                    "  f.job_code    = fi.job_code,\n" +
                    "  f.job_desc    = fi.job_desc,\n" +
                    "  f.job_gl_code = fi.job_gl_code,\n" +
                    "\n" +
                    "  f.section_code           = fi.section_code,\n" +
                    "  f.sub_department_code    = fi.sub_department_code,\n" +
                    "  f.sub_department_desc    = fi.sub_department_desc,\n" +
                    "  f.sub_department_gl_code = fi.sub_department_gl_code,\n" +
                    "\n" +
                    "  f.position             = fi.position,\n" +
                    "  f.work_location        = fi.work_location,\n" +
                    "  f.labor_allocation_details = fi.labor_allocation_details,\n" +
                    "  f.employee_status      = fi.employee_status,\n" +
                    "  f.position_code        = fi.position_code,\n" +
                    "  f.position_family_code = fi.position_family_code,\n" +
                    "\n" +
                    "  f.primary_address_line_1    = fi.primary_address_line_1,\n" +
                    "  f.primary_address_line_2    = fi.primary_address_line_2,\n" +
                    "  f.primary_city_municipality = fi.primary_city_municipality,\n" +
                    "  f.primary_state_province    = fi.primary_state_province,\n" +
                    "  f.primary_zip_postal_code   = fi.primary_zip_postal_code,\n" +
                    "  f.primary_country_code      = fi.primary_country_code,\n" +
                    "\n" +
                    "  f.primary_phone      = fi.primary_phone,\n" +
                    "  f.primary_phone_type = fi.primary_phone_type,\n" +
                    "  f.work_email         = fi.work_email,\n" +
                    "  f.personal_email     = fi.personal_email,\n" +
                    "\n" +
                    "  f.time_in_position = fi.time_in_position,\n" +
                    "  f.manager_level    = fi.manager_level,\n" +
                    "\n" +
                    "  f.work_location_address = fi.work_location_address,\n" +
                    "  f.work_location_city    = fi.work_location_city,\n" +
                    "  f.work_location_state   = fi.work_location_state,\n" +
                    "  f.work_location_zip     = fi.work_location_zip,\n" +
                    "  f.work_location_country = fi.work_location_country,\n" +
                    "\n" +
                    "  f.annual_salary = fi.annual_salary,\n" +
                    "  f.pay_type      = fi.pay_type,\n" +
                    "  f.rate_1        = fi.rate_1,\n" +
                    "\n" +
                    "  f.salary_grade_code = fi.salary_grade_code,\n" +
                    "  f.salary_grade_desc = fi.salary_grade_desc,\n" +
                    "  f.salary_max        = fi.salary_max,\n" +
                    "  f.salary_mid        = fi.salary_mid,\n" +
                    "  f.salary_min        = fi.salary_min,\n" +
                    "\n" +
                    "  f.badge_num            = fi.badge_num,\n" +
                    "  f.time_zone_code       = fi.time_zone_code,\n" +
                    "  f.time_zone_description= fi.time_zone_description,\n" +
                    "\n" +
                    "  f.supervisor_primary   = fi.supervisor_primary,\n" +
                    "  f.supervisor_secondary = fi.supervisor_secondary,\n" +
                    "  f.business_title       = fi.business_title,\n" +
                    "  f.position_title       = fi.position_title,\n" +
                    "  f.position_type        = fi.position_type,\n" +
                    "\n" +
                    "  f.shirt_size = fi.shirtsize,\n" +
                    "  f.ipad       = fi.ipad,\n" +
                    "  f.laptop     = fi.laptop,\n" +
                    "\n" +
                    "  f.birth_date = fi.birth_date_mm_dd_yyyy,\n" +
                    "\n" +
                    "  f.hire_date         = fi.hire_date,\n" +
                    "  f.last_worked_date  = fi.last_worked_date,\n" +
                    "  f.termination_date  = fi.termination_date,\n" +
                    "  f.termination_date_1= fi.termination_date_1,\n" +
                    "  f.termination_date_2= fi.termination_date_2,\n" +
                    "  f.transfer_date     = fi.transfer_date,\n" +
                    "\n" +
                    "  f.last_pay_change = CASE\n" +
                    "    WHEN fi.last_pay_change IS NULL\n" +
                    "         OR fi.last_pay_change = ''\n" +
                    "         OR fi.last_pay_change REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'\n" +
                    "      THEN NULL\n" +
                    "    ELSE COALESCE(\n" +
                    "           STR_TO_DATE(fi.last_pay_change, '%m/%d/%Y'),\n" +
                    "           STR_TO_DATE(fi.last_pay_change, '%Y-%m-%d')\n" +
                    "         )\n" +
                    "  END,\n" +
                    "\n" +
                    "  f.last_position_change_date = CASE\n" +
                    "    WHEN fi.last_position_change_date IS NULL\n" +
                    "         OR fi.last_position_change_date = ''\n" +
                    "         OR fi.last_position_change_date REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'\n" +
                    "      THEN NULL\n" +
                    "    ELSE COALESCE(\n" +
                    "           STR_TO_DATE(fi.last_position_change_date, '%m/%d/%Y'),\n" +
                    "           STR_TO_DATE(fi.last_position_change_date, '%Y-%m-%d')\n" +
                    "         )\n" +
                    "  END,\n" +
                    "\n" +
                    "  f.leave_start = CASE\n" +
                    "    WHEN fi.leave_start IS NULL\n" +
                    "         OR fi.leave_start = ''\n" +
                    "         OR fi.leave_start REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'\n" +
                    "      THEN NULL\n" +
                    "    ELSE COALESCE(\n" +
                    "           STR_TO_DATE(fi.leave_start, '%m/%d/%Y'),\n" +
                    "           STR_TO_DATE(fi.leave_start, '%Y-%m-%d')\n" +
                    "         )\n" +
                    "  END,\n" +
                    "\n" +
                    "  f.leave_end = CASE\n" +
                    "    WHEN fi.leave_end IS NULL\n" +
                    "         OR fi.leave_end = ''\n" +
                    "         OR fi.leave_end REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'\n" +
                    "      THEN NULL\n" +
                    "    ELSE COALESCE(\n" +
                    "           STR_TO_DATE(fi.leave_end, '%m/%d/%Y'),\n" +
                    "           STR_TO_DATE(fi.leave_end, '%Y-%m-%d')\n" +
                    "         )\n" +
                    "  END,\n" +
                    "\n" +
                    "  f.most_recent_hire_date = CASE\n" +
                    "    WHEN fi.most_recent_hire_date IS NULL\n" +
                    "         OR fi.most_recent_hire_date = ''\n" +
                    "         OR fi.most_recent_hire_date REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'\n" +
                    "      THEN NULL\n" +
                    "    ELSE COALESCE(\n" +
                    "           STR_TO_DATE(fi.most_recent_hire_date, '%m/%d/%Y'),\n" +
                    "           STR_TO_DATE(fi.most_recent_hire_date, '%Y-%m-%d')\n" +
                    "         )\n" +
                    "  END,\n" +
                    "\n" +
                    "  f.language_spoken         = COALESCE(fi.ess_language_preference, f.language_spoken),\n" +
                    "  f.ess_language_preference = fi.ess_language_preference\n" +
                    ";";

            rowsUpdated = jdbcTemplate.update(updateSql);

            // 6) INSERT new employees not already in field table
            // Note: employee_code_norm, badge_num_norm, tixid_norm are GENERATED columns - MySQL computes them
            String insertSql = "INSERT INTO field (\n" +
                    "  employee_code, tixid, display_name,\n" +
                    "  legal_firstname, legal_lastname, legal_middle_name, preferred_firstname, nickname,\n" +
                    "  department, department_desc, department_gl_code,\n" +
                    "  payroll_profile_code, payroll_profile_desc, payroll_profile_gl_code,\n" +
                    "  job_code, job_desc, job_gl_code,\n" +
                    "  section_code, sub_department_code, sub_department_desc, sub_department_gl_code,\n" +
                    "  position, work_location, labor_allocation_details, employee_status,\n" +
                    "  position_code, position_family_code,\n" +
                    "  primary_address_line_1, primary_address_line_2, primary_city_municipality,\n" +
                    "  primary_state_province, primary_zip_postal_code, primary_country_code,\n" +
                    "  primary_phone, primary_phone_type, work_email, personal_email,\n" +
                    "  time_in_position, manager_level,\n" +
                    "  work_location_address, work_location_city, work_location_state,\n" +
                    "  work_location_zip, work_location_country,\n" +
                    "  annual_salary, pay_type, rate_1,\n" +
                    "  salary_grade_code, salary_grade_desc, salary_max, salary_mid, salary_min,\n" +
                    "  badge_num, time_zone_code, time_zone_description,\n" +
                    "  supervisor_primary, supervisor_secondary, business_title, position_title, position_type,\n" +
                    "  shirt_size, ipad, laptop,\n" +
                    "  birth_date, hire_date, last_worked_date,\n" +
                    "  termination_date, termination_date_1, termination_date_2, transfer_date,\n" +
                    "  last_pay_change, last_position_change_date, leave_start, leave_end,\n" +
                    "  most_recent_hire_date, language_spoken, ess_language_preference\n" +
                    ")\n" +
                    "SELECT\n" +
                    "  fi.employee_code, fi.tixid, fi.employee_name,\n" +
                    "  fi.legal_firstname, fi.legal_lastname, fi.legal_middle_name, fi.preferred_firstname, fi.nickname,\n" +
                    "  fi.department, fi.department_desc, fi.department_gl_code,\n" +
                    "  fi.payroll_profile_code, fi.payroll_profile_desc, fi.payroll_profile_gl_code,\n" +
                    "  fi.job_code, fi.job_desc, fi.job_gl_code,\n" +
                    "  fi.section_code, fi.sub_department_code, fi.sub_department_desc, fi.sub_department_gl_code,\n" +
                    "  fi.position, fi.work_location, fi.labor_allocation_details, fi.employee_status,\n" +
                    "  fi.position_code, fi.position_family_code,\n" +
                    "  fi.primary_address_line_1, fi.primary_address_line_2, fi.primary_city_municipality,\n" +
                    "  fi.primary_state_province, fi.primary_zip_postal_code, fi.primary_country_code,\n" +
                    "  fi.primary_phone, fi.primary_phone_type, fi.work_email, fi.personal_email,\n" +
                    "  fi.time_in_position, fi.manager_level,\n" +
                    "  fi.work_location_address, fi.work_location_city, fi.work_location_state,\n" +
                    "  fi.work_location_zip, fi.work_location_country,\n" +
                    "  fi.annual_salary, fi.pay_type, fi.rate_1,\n" +
                    "  fi.salary_grade_code, fi.salary_grade_desc, fi.salary_max, fi.salary_mid, fi.salary_min,\n" +
                    "  fi.badge_num, fi.time_zone_code, fi.time_zone_description,\n" +
                    "  fi.supervisor_primary, fi.supervisor_secondary, fi.business_title, fi.position_title, fi.position_type,\n" +
                    "  fi.shirtsize, fi.ipad, fi.laptop,\n" +
                    "  fi.birth_date_mm_dd_yyyy,\n" +
                    "  fi.hire_date, fi.last_worked_date,\n" +
                    "  fi.termination_date, fi.termination_date_1, fi.termination_date_2, fi.transfer_date,\n" +
                    "  CASE\n" +
                    "    WHEN fi.last_pay_change IS NULL OR fi.last_pay_change = '' OR fi.last_pay_change REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'\n" +
                    "      THEN NULL\n" +
                    "    ELSE COALESCE(STR_TO_DATE(fi.last_pay_change, '%m/%d/%Y'), STR_TO_DATE(fi.last_pay_change, '%Y-%m-%d'))\n" +
                    "  END,\n" +
                    "  CASE\n" +
                    "    WHEN fi.last_position_change_date IS NULL OR fi.last_position_change_date = '' OR fi.last_position_change_date REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'\n" +
                    "      THEN NULL\n" +
                    "    ELSE COALESCE(STR_TO_DATE(fi.last_position_change_date, '%m/%d/%Y'), STR_TO_DATE(fi.last_position_change_date, '%Y-%m-%d'))\n" +
                    "  END,\n" +
                    "  CASE\n" +
                    "    WHEN fi.leave_start IS NULL OR fi.leave_start = '' OR fi.leave_start REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'\n" +
                    "      THEN NULL\n" +
                    "    ELSE COALESCE(STR_TO_DATE(fi.leave_start, '%m/%d/%Y'), STR_TO_DATE(fi.leave_start, '%Y-%m-%d'))\n" +
                    "  END,\n" +
                    "  CASE\n" +
                    "    WHEN fi.leave_end IS NULL OR fi.leave_end = '' OR fi.leave_end REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'\n" +
                    "      THEN NULL\n" +
                    "    ELSE COALESCE(STR_TO_DATE(fi.leave_end, '%m/%d/%Y'), STR_TO_DATE(fi.leave_end, '%Y-%m-%d'))\n" +
                    "  END,\n" +
                    "  CASE\n" +
                    "    WHEN fi.most_recent_hire_date IS NULL OR fi.most_recent_hire_date = '' OR fi.most_recent_hire_date REGEXP '^(0{1,2}/0{1,2}/0{2,4}|0000-00-00)$'\n" +
                    "      THEN NULL\n" +
                    "    ELSE COALESCE(STR_TO_DATE(fi.most_recent_hire_date, '%m/%d/%Y'), STR_TO_DATE(fi.most_recent_hire_date, '%Y-%m-%d'))\n" +
                    "  END,\n" +
                    "  fi.ess_language_preference,\n" +
                    "  fi.ess_language_preference\n" +
                    "FROM field_import fi\n" +
                    "LEFT JOIN field f ON f.employee_code_norm = fi.employee_code_norm\n" +
                    "WHERE f.employee_code_norm IS NULL\n" +
                    "  AND fi.employee_code_norm IS NOT NULL\n" +
                    "  AND fi.employee_code_norm != ''\n" +
                    ";";

            rowsInserted = jdbcTemplate.update(insertSql);

            // 7) restore sql_mode
            // 7) restore sql_mode
            jdbcTemplate.execute("SET SESSION sql_mode = @old_sql_mode");

        } finally {
            try {
                Files.deleteIfExists(tempFile);
            } catch (IOException ignore) {
            }
        }

        FieldImportResult result = new FieldImportResult();
        result.setFileName(originalName);
        result.setRowsLoaded(rowsLoaded);
        result.setRowsUpdated(rowsUpdated);
        result.setRowsInserted(rowsInserted);
        result.setUpdatedEmployees(updatedEmployees);
        result.setInsertedEmployees(insertedEmployees);
        result.setMessage(
                "Loaded " + rowsLoaded + " rows into field_import; updated " + rowsUpdated + 
                " employees, inserted " + rowsInserted + " new employees in field.");

        return result;
    }
}
