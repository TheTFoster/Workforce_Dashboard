package com.cec.EmployeeDB.batch;

import com.cec.EmployeeDB.batch.dto.BatchApplyRequest;
import com.cec.EmployeeDB.batch.dto.BatchReport;
import com.cec.EmployeeDB.batch.dto.BatchTotals;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

@Service
public class BatchSyncServiceImpl implements BatchSyncService {

    private final JdbcTemplate jdbc;

    public BatchSyncServiceImpl(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ---------- small helper to kill the NPE warnings ----------
    private long countOrZero(String sql) {
        Long v = jdbc.queryForObject(Objects.requireNonNull(sql, "sql cannot be null"), Long.class);
        return (v != null) ? v : 0L;
    }
    // -----------------------------------------------------------

    @Override
    @Transactional
    public void ingest(MultipartFile file) {
        jdbc.update("TRUNCATE TABLE field_import");

        Path tmp;
        try {
            tmp = Files.createTempFile("field-import-", ".csv");
            Files.copy(file.getInputStream(), tmp, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Failed to persist uploaded file for LOAD DATA", e);
        }

        String abs = tmp.toAbsolutePath().toString().replace("\\", "\\\\");

        String sql = """
                LOAD DATA LOCAL INFILE '%s'
                INTO TABLE field_import
                CHARACTER SET utf8mb4
                FIELDS TERMINATED BY ',' ENCLOSED BY '"' ESCAPED BY ''
                LINES TERMINATED BY '\\r\\n'
                IGNORE 1 LINES
                (
                  @employee_code,
                  @tixid,
                  @employee_name,
                  @legal_firstname,
                  @legal_lastname,
                  @nickname,
                  @legal_middle_name,
                  @department,
                  @department_desc,
                  @department_gl_code,
                  @preferred_firstname,
                  @legal_employee_name,
                  @payroll_profile_code,
                  @payroll_profile_desc,
                  @payroll_profile_gl_code,
                  @job_code,
                  @job_desc,
                  @job_gl_code,
                  @section_code,
                  @sub_department_code,
                  @sub_department_desc,
                  @sub_department_gl_code,
                  @position,
                  @work_location,
                  @labor_allocation_details,
                  @employee_status,
                  @position_code,
                  @position_family_code,
                  @primary_address_line_1,
                  @primary_address_line_2,
                  @primary_city_municipality,
                  @primary_state_province
                )
                SET
                  employee_code             = NULLIF(TRIM(@employee_code),''),
                  tixid                     = NULLIF(TRIM(@tixid),''),
                  employee_name             = NULLIF(TRIM(@employee_name),''),
                  legal_firstname           = NULLIF(TRIM(@legal_firstname),''),
                  legal_lastname            = NULLIF(TRIM(@legal_lastname),''),
                  nickname                  = NULLIF(TRIM(@nickname),''),
                  legal_middle_name         = NULLIF(TRIM(@legal_middle_name),''),
                  department                = NULLIF(TRIM(@department),''),
                  department_desc           = NULLIF(TRIM(@department_desc),''),
                  department_gl_code        = NULLIF(TRIM(@department_gl_code),''),
                  preferred_firstname       = NULLIF(TRIM(@preferred_firstname),''),
                  legal_employee_name       = NULLIF(TRIM(@legal_employee_name),''),
                  payroll_profile_code      = NULLIF(TRIM(@payroll_profile_code),''),
                  payroll_profile_desc      = NULLIF(TRIM(@payroll_profile_desc),''),
                  payroll_profile_gl_code   = NULLIF(TRIM(@payroll_profile_gl_code),''),
                  job_code                  = NULLIF(TRIM(@job_code),''),
                  job_desc                  = NULLIF(TRIM(@job_desc),''),
                  job_gl_code               = NULLIF(TRIM(@job_gl_code),''),
                  section_code              = NULLIF(TRIM(@section_code),''),
                  sub_department_code       = NULLIF(TRIM(@sub_department_code),''),
                  sub_department_desc       = NULLIF(TRIM(@sub_department_desc),''),
                  sub_department_gl_code    = NULLIF(TRIM(@sub_department_gl_code),''),
                  position                  = NULLIF(TRIM(@position),''),
                  work_location             = NULLIF(TRIM(@work_location),''),
                  labor_allocation_details  = NULLIF(TRIM(@labor_allocation_details),''),
                  employee_status           = NULLIF(TRIM(@employee_status),''),
                  position_code             = NULLIF(TRIM(@position_code),''),
                  position_family_code      = NULLIF(TRIM(@position_family_code),''),
                  primary_address_line_1    = NULLIF(TRIM(@primary_address_line_1),''),
                  primary_address_line_2    = NULLIF(TRIM(@primary_address_line_2),''),
                  primary_city_municipality = NULLIF(TRIM(@primary_city_municipality),''),
                  primary_state_province    = NULLIF(TRIM(@primary_state_province),'')
                """.formatted(abs);

        jdbc.update(Objects.requireNonNull(sql, "sql cannot be null"));

        try {
            Files.deleteIfExists(tmp);
        } catch (IOException ignore) {
        }
    }

    @Override
    @Transactional(readOnly = true)
    public BatchReport preview() {
        long staged = countOrZero("SELECT COUNT(*) FROM field_import");

        long matched = countOrZero("""
                SELECT COUNT(*)
                FROM field_import fi
                JOIN field f
                  ON UPPER(TRIM(fi.employee_code)) = UPPER(TRIM(f.emp_code))
                """);

        long newOnes = staged - matched;
        if (newOnes < 0) newOnes = 0;

        BatchTotals totals = new BatchTotals(
          (int) staged,
          (int) matched,
          (int) newOnes,
          0,
          0,
          0,
          0,
          0,
          0
        );

        return new BatchReport(
                Instant.now(),
                true,
                totals,
                List.of(),
                List.of()
        );
    }

    @Override
    @Transactional
    public BatchReport apply(BatchApplyRequest request) {
        int updated = jdbc.update("""
                UPDATE employee_database.field f
                JOIN employee_database.v_field_import_mapped s
                  ON s.emp_code_norm_in = f.emp_code_norm2
                SET
                  f.work_group = LEFT(TRIM(s.department_desc), 255),
                  f.updated_at = NOW()
                WHERE NULLIF(TRIM(s.department_desc),'') IS NOT NULL
                  AND NULLIF(TRIM(f.work_group),'') <> NULLIF(TRIM(s.department_desc),'')
                """);

        long staged = countOrZero("SELECT COUNT(*) FROM field_import");

        long matched = countOrZero("""
                SELECT COUNT(*)
                FROM field_import fi
                JOIN field f
                  ON UPPER(TRIM(fi.employee_code)) = UPPER(TRIM(f.emp_code))
                """);

        long newOnes = staged - matched;
        if (newOnes < 0) newOnes = 0;

        BatchTotals totals = new BatchTotals(
          (int) staged,
          (int) matched,
          (int) newOnes,
          updated,
          0,
          0,
          0,
          0,
          0
        );

        return new BatchReport(
                Instant.now(),
                false,
                totals,
                List.of(),
                List.of()
        );
    }
}
