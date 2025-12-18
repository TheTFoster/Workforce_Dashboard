package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.Dto.ImportResultDTO;
import com.cec.EmployeeDB.Entity.PaycomTimeReport;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

@Service
@RequiredArgsConstructor
public class TimecardImportService {
  private final JdbcTemplate jdbcTemplate;

  // Defensive alias map for your 44+ headers (case/space tolerant)
  private static final Map<String, String> ALIAS = Map.ofEntries(
    // Employee identification
    entry("EE Code","ee_code"), entry("EECode","ee_code"), entry("Employee Code","ee_code"),
    entry("Last Name","last_name"), entry("Lastname","last_name"), 
    entry("First Name","first_name"), entry("Firstname","first_name"),
    
    // Department and allocation
    entry("Home Department","home_department"), entry("HomeDepartment","home_department"),
    entry("Home Allocation","home_allocation"), entry("HomeAllocation","home_allocation"),
    entry("Pay Class","pay_class"), entry("PayClass","pay_class"),
    entry("Badge","badge"),
    
    // Punch times
    entry("In Punch Time","in_punch_time"), entry("InPunchTime","in_punch_time"), entry("In Punch","in_punch_time"),
    entry("Out Punch Time","out_punch_time"), entry("OutPunchTime","out_punch_time"), entry("Out Punch","out_punch_time"),
    
    // Allocation and earnings
    entry("Allocation","allocation_code"), entry("Allocation Code","allocation_code"),
    entry("Earn Code","earn_code"), entry("EarnCode","earn_code"),
    entry("Earn Hours","earn_hours"), entry("EarnHours","earn_hours"), entry("Hours","earn_hours"),
    entry("Dollars","dollars"), entry("Amount","dollars"),
    
    // Approval status
    entry("Employee Approved","employee_approved"), entry("EmployeeApproved","employee_approved"),
    entry("Supervisor Approved","supervisor_approved"), entry("SupervisorApproved","supervisor_approved"),
    entry("Tax Profile","tax_profile"), entry("TaxProfile","tax_profile"),
    
    // Home department details
    entry("Home Department Desc","home_department_desc"), entry("Home Dept Desc","home_department_desc"),
    entry("Home Payroll Profile Code","home_payroll_profile_code"),
    entry("Home Payroll Profile Desc","home_payroll_profile_desc"),
    entry("Home Job Code","home_job_code"), entry("Home Job Desc","home_job_desc"),
    entry("Home Section Code","home_section_code"), entry("Home Section Desc","home_section_desc"),
    entry("Home Activity Code","home_activity_code"), entry("Home Activity Desc","home_activity_desc"),
    entry("Home User Access Code","home_user_access_code"), entry("Home User Access Desc","home_user_access_desc"),
    entry("Home Sub Department Code","home_sub_department_code"), 
    entry("Home Sub Department Desc","home_sub_department_desc"),
    
    // Distributed department details
    entry("Dist Department Desc","dist_department_desc"), entry("Distributed Dept Desc","dist_department_desc"),
    entry("Dist Payroll Profile Code","dist_payroll_profile_code"),
    entry("Dist Payroll Profile Desc","dist_payroll_profile_desc"),
    entry("Dist Job Code","dist_job_code"), entry("Dist Job Desc","dist_job_desc"),
    entry("Dist Section Code","dist_section_code"), entry("Dist Section Desc","dist_section_desc"),
    entry("Dist Activity Code","dist_activity_code"), entry("Dist Activity Desc","dist_activity_desc"),
    entry("Dist User Access Code","dist_user_access_code"), entry("Dist User Access Desc","dist_user_access_desc"),
    entry("Dist Sub Department Code","dist_sub_department_code"), 
    entry("Dist Sub Department Desc","dist_sub_department_desc"),
    entry("Distributed Department Code","distributed_department_code"), 
    entry("Distributed Department","distributed_department_code"),
    
    // Additional fields
    entry("Units","units"),
    entry("Work Location","work_location"), entry("WorkLocation","work_location"),
    entry("Dist Allocation Code","dist_allocation_code"), entry("Distributed Allocation","dist_allocation_code")
    // Note: work_date and work_date_effective are GENERATED columns in MySQL - do not map/import them
  );

  private static Map.Entry<String,String> entry(String k, String v){ return Map.entry(k.toLowerCase(), v); }

  private final List<DateTimeFormatter> DATE_TIME_FORMATS = List.of(
    DateTimeFormatter.ofPattern("M/d/yyyy H:mm"),
    DateTimeFormatter.ofPattern("M/d/yyyy h:mm a"),
    DateTimeFormatter.ofPattern("M/d/uuuu H:mm"),
    DateTimeFormatter.ISO_LOCAL_DATE_TIME
  );

  private static final String LOAD_STAGE_COLUMNS = """
                (
                  ee_code,
                  last_name,
                  first_name,
                  home_department,
                  home_allocation,
                  pay_class,
                  badge,
                  in_punch_time,
                  out_punch_time,
                  allocation_code,
                  earn_code,
                  earn_hours,
                  dollars,
                  employee_approved,
                  supervisor_approved,
                  tax_profile,
                  home_department_desc,
                  home_payroll_profile_code,
                  home_payroll_profile_desc,
                  home_job_code,
                  home_job_desc,
                  home_section_code,
                  home_section_desc,
                  home_activity_code,
                  home_activity_desc,
                  home_user_access_code,
                  home_user_access_desc,
                  home_sub_department_code,
                  home_sub_department_desc,
                  dist_department_desc,
                  dist_payroll_profile_code,
                  dist_payroll_profile_desc,
                  dist_job_code,
                  dist_job_desc,
                  dist_section_code,
                  dist_section_desc,
                  dist_activity_code,
                  dist_activity_desc,
                  dist_user_access_code,
                  dist_user_access_desc,
                  dist_sub_department_code,
                  dist_sub_department_desc,
                  work_location,
                  dist_allocation_code
                )
      """;

  private static final String INSERT_FROM_STAGE_SQL = """
        INSERT IGNORE INTO paycom_time_report (
            ee_code,
            last_name,
            first_name,
            home_department,
            home_allocation,
            pay_class,
            badge,
            in_punch_time,
            out_punch_time,
            work_date_csv,
            allocation_code,
            earn_code,
            earn_hours,
            dollars,
            employee_approved,
            supervisor_approved,
            tax_profile,
            home_department_desc,
            home_payroll_profile_code,
            home_payroll_profile_desc,
            home_job_code,
            home_job_desc,
            home_section_code,
            home_section_desc,
            home_activity_code,
            home_activity_desc,
            home_user_access_code,
            home_user_access_desc,
            home_sub_department_code,
            home_sub_department_desc,
            dist_department_desc,
            dist_payroll_profile_code,
            dist_payroll_profile_desc,
            dist_job_code,
            dist_job_desc,
            dist_section_code,
            dist_section_desc,
            dist_activity_code,
            dist_activity_desc,
            dist_user_access_code,
            dist_user_access_desc,
            dist_sub_department_code,
            dist_sub_department_desc,
            distributed_department_code,
            units,
            import_batch_id,
            raw_row_hash
        )
        SELECT
            TRIM(pts.ee_code),
            NULLIF(TRIM(pts.last_name), ''),
            NULLIF(TRIM(pts.first_name), ''),
            NULLIF(TRIM(pts.home_department), ''),
            NULLIF(TRIM(pts.home_allocation), ''),
            NULLIF(TRIM(pts.pay_class), ''),
            NULLIF(TRIM(pts.badge), ''),
            CASE
                WHEN TRIM(pts.in_punch_time) IN ('', '0000-00-00 00:00:00') THEN NULL
                ELSE STR_TO_DATE(TRIM(pts.in_punch_time), '%Y-%m-%d %H:%i:%s')
            END AS in_punch_time,
            CASE
                WHEN TRIM(pts.out_punch_time) IN ('', '0000-00-00 00:00:00') THEN NULL
                ELSE STR_TO_DATE(TRIM(pts.out_punch_time), '%Y-%m-%d %H:%i:%s')
            END AS out_punch_time,
            NULL AS work_date_csv,
            NULLIF(TRIM(pts.allocation_code), ''),
            NULLIF(TRIM(pts.earn_code), ''),
            CAST(NULLIF(TRIM(pts.earn_hours), '') AS DECIMAL(10,2)),
            CAST(NULLIF(TRIM(pts.dollars), '')    AS DECIMAL(12,2)),
            CASE
                WHEN pts.employee_approved IS NULL OR TRIM(pts.employee_approved) = '' THEN 0
                ELSE 1
            END AS employee_approved,
            CASE
                WHEN pts.supervisor_approved IS NULL OR TRIM(pts.supervisor_approved) = '' THEN 0
                ELSE 1
            END AS supervisor_approved,
            NULLIF(TRIM(pts.tax_profile), ''),
            NULLIF(TRIM(pts.home_department_desc), ''),
            NULLIF(TRIM(pts.home_payroll_profile_code), ''),
            NULLIF(TRIM(pts.home_payroll_profile_desc), ''),
            NULLIF(TRIM(pts.home_job_code), ''),
            NULLIF(TRIM(pts.home_job_desc), ''),
            NULLIF(TRIM(pts.home_section_code), ''),
            NULLIF(TRIM(pts.home_section_desc), ''),
            NULLIF(TRIM(pts.home_activity_code), ''),
            NULLIF(TRIM(pts.home_activity_desc), ''),
            NULLIF(TRIM(pts.home_user_access_code), ''),
            NULLIF(TRIM(pts.home_user_access_desc), ''),
            NULLIF(TRIM(pts.home_sub_department_code), ''),
            NULLIF(TRIM(pts.home_sub_department_desc), ''),
            NULLIF(TRIM(pts.dist_department_desc), ''),
            NULLIF(TRIM(pts.dist_payroll_profile_code), ''),
            NULLIF(TRIM(pts.dist_payroll_profile_desc), ''),
            NULLIF(TRIM(pts.dist_job_code), ''),
            NULLIF(TRIM(pts.dist_job_desc), ''),
            NULLIF(TRIM(pts.dist_section_code), ''),
            NULLIF(TRIM(pts.dist_section_desc), ''),
            NULLIF(TRIM(pts.dist_activity_code), ''),
            NULLIF(TRIM(pts.dist_activity_desc), ''),
            NULLIF(TRIM(pts.dist_user_access_code), ''),
            NULLIF(TRIM(pts.dist_user_access_desc), ''),
            NULLIF(TRIM(pts.dist_sub_department_code), ''),
            NULLIF(TRIM(pts.dist_sub_department_desc), ''),
            NULLIF(TRIM(pts.work_location), '') AS distributed_department_code,
            CAST(NULLIF(TRIM(pts.dist_allocation_code), '') AS DECIMAL(10,2)) AS units,
            @batch_id AS import_batch_id,
            SHA1(
                CONCAT_WS(
                    '|',
                    COALESCE(TRIM(pts.ee_code), ''),
                    COALESCE(TRIM(pts.last_name), ''),
                    COALESCE(TRIM(pts.first_name), ''),
                    COALESCE(TRIM(pts.home_department), ''),
                    COALESCE(TRIM(pts.home_allocation), ''),
                    COALESCE(TRIM(pts.pay_class), ''),
                    COALESCE(TRIM(pts.badge), ''),
                    COALESCE(TRIM(pts.in_punch_time), ''),
                    COALESCE(TRIM(pts.out_punch_time), ''),
                    COALESCE(TRIM(pts.allocation_code), ''),
                    COALESCE(TRIM(pts.earn_code), ''),
                    COALESCE(TRIM(pts.earn_hours), ''),
                    COALESCE(TRIM(pts.dollars), ''),
                    COALESCE(TRIM(pts.employee_approved), ''),
                    COALESCE(TRIM(pts.supervisor_approved), ''),
                    COALESCE(TRIM(pts.tax_profile), ''),
                    COALESCE(TRIM(pts.home_department_desc), ''),
                    COALESCE(TRIM(pts.home_payroll_profile_code), ''),
                    COALESCE(TRIM(pts.home_payroll_profile_desc), ''),
                    COALESCE(TRIM(pts.home_job_code), ''),
                    COALESCE(TRIM(pts.home_job_desc), ''),
                    COALESCE(TRIM(pts.home_section_code), ''),
                    COALESCE(TRIM(pts.home_section_desc), ''),
                    COALESCE(TRIM(pts.home_activity_code), ''),
                    COALESCE(TRIM(pts.home_activity_desc), ''),
                    COALESCE(TRIM(pts.home_user_access_code), ''),
                    COALESCE(TRIM(pts.home_user_access_desc), ''),
                    COALESCE(TRIM(pts.home_sub_department_code), ''),
                    COALESCE(TRIM(pts.home_sub_department_desc), ''),
                    COALESCE(TRIM(pts.dist_department_desc), ''),
                    COALESCE(TRIM(pts.dist_payroll_profile_code), ''),
                    COALESCE(TRIM(pts.dist_payroll_profile_desc), ''),
                    COALESCE(TRIM(pts.dist_job_code), ''),
                    COALESCE(TRIM(pts.dist_job_desc), ''),
                    COALESCE(TRIM(pts.dist_section_code), ''),
                    COALESCE(TRIM(pts.dist_section_desc), ''),
                    COALESCE(TRIM(pts.dist_activity_code), ''),
                    COALESCE(TRIM(pts.dist_activity_desc), ''),
                    COALESCE(TRIM(pts.dist_user_access_code), ''),
                    COALESCE(TRIM(pts.dist_user_access_desc), ''),
                    COALESCE(TRIM(pts.dist_sub_department_code), ''),
                    COALESCE(TRIM(pts.dist_sub_department_desc), ''),
                    COALESCE(TRIM(pts.work_location), ''),
                    COALESCE(TRIM(pts.dist_allocation_code), '')
                )
            ) AS raw_row_hash
        FROM paycom_time_report_stage pts
      """;
  /**
   * Main import method that handles both CSV and XLSX files
   * @param file The file to import
   * @param replaceAll If true, truncates the table before import
   */
  @Transactional
  public ImportResultDTO importCsv(MultipartFile file, boolean replaceAll) throws Exception {
    String filename = file.getOriginalFilename();
    if (filename != null && filename.toLowerCase().endsWith(".xlsx")) {
      return importXlsx(file);
    }

    long batchId = System.currentTimeMillis();
    if (replaceAll) {
      jdbcTemplate.execute("TRUNCATE TABLE paycom_time_report");
    }

    int staged = loadCsvIntoStage(file);
    normalizeZeroDatesInStage();
    jdbcTemplate.update("SET @batch_id := ?", batchId);
    int inserted = jdbcTemplate.update(INSERT_FROM_STAGE_SQL);
    int duplicates = Math.max(staged - inserted, 0);

    return ImportResultDTO.builder()
        .batchId(batchId)
        .total(staged)
        .inserted(inserted)
        .duplicates(duplicates)
        .errors(0)
        .build();
  }
  
  /**
   * Backward compatibility - defaults to not replacing all
   */
  public ImportResultDTO importCsv(MultipartFile file) throws Exception {
    return importCsv(file, false);
  }

  @SuppressWarnings("null")
  private int loadCsvIntoStage(MultipartFile file) throws Exception {
    Path tmp = Files.createTempFile("paycom-timecards-", ".csv");
    try {
      Files.copy(file.getInputStream(), tmp, StandardCopyOption.REPLACE_EXISTING);
      String abs = tmp.toAbsolutePath().toString().replace("\\", "\\\\");

      jdbcTemplate.execute("TRUNCATE TABLE paycom_time_report_stage");

      String sql = String.format("""
          LOAD DATA LOCAL INFILE '%s'
          INTO TABLE paycom_time_report_stage
          CHARACTER SET utf8mb4
          FIELDS TERMINATED BY ',' 
          ENCLOSED BY '"'
          ESCAPED BY ''
          LINES TERMINATED BY '\\r\\n'
          IGNORE 1 LINES
          %s
          """, abs, LOAD_STAGE_COLUMNS);

      return jdbcTemplate.update(sql);
    } finally {
      try { Files.deleteIfExists(tmp); } catch (Exception ignore) {}
    }
  }

  private void normalizeZeroDatesInStage() {
    jdbcTemplate.update("""
        UPDATE paycom_time_report_stage
        SET in_punch_time = NULL
        WHERE in_punch_time = '0000-00-00 00:00:00'
           OR in_punch_time = '0000-00-00'
        """);
    jdbcTemplate.update("""
        UPDATE paycom_time_report_stage
        SET out_punch_time = NULL
        WHERE out_punch_time = '0000-00-00 00:00:00'
           OR out_punch_time = '0000-00-00'
        """);
  }

  /**
   * Import XLSX file with batch inserts for better performance
   */
  @Transactional
  private ImportResultDTO importXlsx(MultipartFile file) throws Exception {
    long batchId = System.currentTimeMillis();
    int total=0, inserted=0, duplicates=0, errors=0;

    List<PaycomTimeReport> batchBuffer = new ArrayList<>(500); // Batch size 500

    try (var in = file.getInputStream();
         Workbook workbook = new XSSFWorkbook(in)) {
      
      Sheet sheet = workbook.getSheetAt(0);
      Iterator<Row> rowIterator = sheet.iterator();
      
      if (!rowIterator.hasNext()) {
        return ImportResultDTO.builder()
            .batchId(batchId).total(0).inserted(0)
            .duplicates(0).errors(0).build();
      }

      // Read header row
      Row headerRow = rowIterator.next();
      Map<String, Integer> headerMap = buildHeaderMap(headerRow);
      Map<String, String> normalizedHeaders = normalizeHeaderForXlsx(headerMap.keySet());

      // Process data rows
      while (rowIterator.hasNext()) {
        Row row = rowIterator.next();
        total++;
        try {
          PaycomTimeReport e = mapXlsxRow(row, headerMap, normalizedHeaders);
          e.setImportBatchId(batchId);
          e.setRawRowHash(hashRow(e));
          batchBuffer.add(e);
          
          // Save in batches of 500
          if (batchBuffer.size() >= 500) {
            int[] result = saveBatch(batchBuffer);
            inserted += result[0];
            duplicates += result[1];
            batchBuffer.clear();
          }
        } catch (Exception ex) {
          errors++;
        }
      }
      
      // Save remaining records
      if (!batchBuffer.isEmpty()) {
        int[] result = saveBatch(batchBuffer);
        inserted += result[0];
        duplicates += result[1];
      }
    }
    return ImportResultDTO.builder()
        .batchId(batchId).total(total).inserted(inserted)
        .duplicates(duplicates).errors(errors).build();
  }

  /**
   * Save a batch of records using JDBC INSERT IGNORE to handle duplicates efficiently
   * @return [inserted, duplicates]
   */
  private int[] saveBatch(List<PaycomTimeReport> batch) {
    if (batch.isEmpty()) {
      return new int[]{0, 0};
    }
    
    int totalRows = batch.size();
    int inserted = 0;
    
    // Build INSERT IGNORE SQL for MySQL (work_date_effective is a GENERATED COLUMN, not inserted)
    String sql = """
        INSERT IGNORE INTO paycom_time_report (
          ee_code, last_name, first_name, home_department, home_allocation,
          pay_class, badge, in_punch_time, out_punch_time,
          allocation_code, earn_code, earn_hours, dollars,
          employee_approved, supervisor_approved, tax_profile,
          home_department_desc, home_payroll_profile_code, home_payroll_profile_desc,
          home_job_code, home_job_desc, home_section_code, home_section_desc,
          home_activity_code, home_activity_desc, home_user_access_code, home_user_access_desc,
          home_sub_department_code, home_sub_department_desc,
          dist_department_desc, dist_payroll_profile_code, dist_payroll_profile_desc,
          dist_job_code, dist_job_desc, dist_section_code, dist_section_desc,
          dist_activity_code, dist_activity_desc, dist_user_access_code, dist_user_access_desc,
          dist_sub_department_code, dist_sub_department_desc, distributed_department_code,
          units, import_batch_id, raw_row_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """;
    
    // Process each record with INSERT IGNORE (returns 1 if inserted, 0 if duplicate)
    for (PaycomTimeReport record : batch) {
      try {
        int rowsAffected = jdbcTemplate.update(sql,
            record.getEeCode(),
            record.getLastName(),
            record.getFirstName(),
            record.getHomeDepartment(),
            record.getHomeAllocation(),
            record.getPayClass(),
            record.getBadge(),
            record.getInPunchTime(),
            record.getOutPunchTime(),
            record.getAllocationCode(),
            record.getEarnCode(),
            record.getEarnHours(),
            record.getDollars(),
            record.getEmployeeApproved(),
            record.getSupervisorApproved(),
            record.getTaxProfile(),
            record.getHomeDepartmentDesc(),
            record.getHomePayrollProfileCode(),
            record.getHomePayrollProfileDesc(),
            record.getHomeJobCode(),
            record.getHomeJobDesc(),
            record.getHomeSectionCode(),
            record.getHomeSectionDesc(),
            record.getHomeActivityCode(),
            record.getHomeActivityDesc(),
            record.getHomeUserAccessCode(),
            record.getHomeUserAccessDesc(),
            record.getHomeSubDepartmentCode(),
            record.getHomeSubDepartmentDesc(),
            record.getDistDepartmentDesc(),
            record.getDistPayrollProfileCode(),
            record.getDistPayrollProfileDesc(),
            record.getDistJobCode(),
            record.getDistJobDesc(),
            record.getDistSectionCode(),
            record.getDistSectionDesc(),
            record.getDistActivityCode(),
            record.getDistActivityDesc(),
            record.getDistUserAccessCode(),
            record.getDistUserAccessDesc(),
            record.getDistSubDepartmentCode(),
            record.getDistSubDepartmentDesc(),
            record.getDistributedDepartmentCode(),
            record.getUnits(),
            record.getImportBatchId(),
            record.getRawRowHash()
        );
        
        if (rowsAffected > 0) {
          inserted++;
        }
      } catch (Exception e) {
        // Log the error for debugging
        System.err.println("Error inserting record for employee " + record.getEeCode() + ": " + e.getMessage());
        e.printStackTrace();
      }
    }
    int duplicates = totalRows - inserted;
    
    return new int[]{inserted, duplicates};
  }

  /**
   * Build header map from XLSX header row
   */
  private Map<String, Integer> buildHeaderMap(Row headerRow) {
    Map<String, Integer> map = new HashMap<>();
    for (int i = 0; i < headerRow.getLastCellNum(); i++) {
      Cell cell = headerRow.getCell(i);
      if (cell != null) {
        String header = getCellValueAsString(cell);
        if (header != null && !header.trim().isEmpty()) {
          map.put(header.trim(), i);
        }
      }
    }
    return map;
  }

  /**
   * Normalize headers for XLSX (similar to CSV version)
   */
  private Map<String, String> normalizeHeaderForXlsx(Set<String> cols) {
    Map<String, String> out = new HashMap<>();
    for (String h : cols) {
      String key = h.trim().toLowerCase();
      out.put(ALIAS.getOrDefault(key, key), h);
    }
    return out;
  }

  /**
   * Map XLSX row to PaycomTimeReport entity
   */
  private PaycomTimeReport mapXlsxRow(Row row, Map<String, Integer> headerMap, Map<String, String> normalizedHeaders) {
    PaycomTimeReport e = new PaycomTimeReport();
    e.setEeCode(getXlsx(row, headerMap, normalizedHeaders, "ee_code"));
    e.setLastName(getXlsx(row, headerMap, normalizedHeaders, "last_name"));
    e.setFirstName(getXlsx(row, headerMap, normalizedHeaders, "first_name"));
    e.setHomeDepartment(getXlsx(row, headerMap, normalizedHeaders, "home_department"));
    e.setHomeAllocation(getXlsx(row, headerMap, normalizedHeaders, "home_allocation"));
    e.setPayClass(getXlsx(row, headerMap, normalizedHeaders, "pay_class"));
    e.setBadge(getXlsx(row, headerMap, normalizedHeaders, "badge"));

    e.setInPunchTime(parseDateTime(getXlsx(row, headerMap, normalizedHeaders, "in_punch_time")));
    e.setOutPunchTime(parseDateTime(getXlsx(row, headerMap, normalizedHeaders, "out_punch_time")));

    e.setAllocationCode(getXlsx(row, headerMap, normalizedHeaders, "allocation_code"));
    e.setEarnCode(getXlsx(row, headerMap, normalizedHeaders, "earn_code"));
    e.setEarnHours(parseDecimal(getXlsx(row, headerMap, normalizedHeaders, "earn_hours")));
    e.setDollars(parseDecimal(getXlsx(row, headerMap, normalizedHeaders, "dollars")));
    e.setUnits(parseDecimal(getXlsx(row, headerMap, normalizedHeaders, "units")));

    e.setEmployeeApproved(parseBool(getXlsx(row, headerMap, normalizedHeaders, "employee_approved")));
    e.setSupervisorApproved(parseBool(getXlsx(row, headerMap, normalizedHeaders, "supervisor_approved")));
    e.setTaxProfile(getXlsx(row, headerMap, normalizedHeaders, "tax_profile"));

    e.setHomeDepartmentDesc(getXlsx(row, headerMap, normalizedHeaders, "home_department_desc"));
    e.setHomePayrollProfileCode(getXlsx(row, headerMap, normalizedHeaders, "home_payroll_profile_code"));
    e.setHomePayrollProfileDesc(getXlsx(row, headerMap, normalizedHeaders, "home_payroll_profile_desc"));
    e.setHomeJobCode(getXlsx(row, headerMap, normalizedHeaders, "home_job_code"));
    e.setHomeJobDesc(getXlsx(row, headerMap, normalizedHeaders, "home_job_desc"));
    e.setHomeSectionCode(getXlsx(row, headerMap, normalizedHeaders, "home_section_code"));
    e.setHomeSectionDesc(getXlsx(row, headerMap, normalizedHeaders, "home_section_desc"));
    e.setHomeActivityCode(getXlsx(row, headerMap, normalizedHeaders, "home_activity_code"));
    e.setHomeActivityDesc(getXlsx(row, headerMap, normalizedHeaders, "home_activity_desc"));
    e.setHomeUserAccessCode(getXlsx(row, headerMap, normalizedHeaders, "home_user_access_code"));
    e.setHomeUserAccessDesc(getXlsx(row, headerMap, normalizedHeaders, "home_user_access_desc"));
    e.setHomeSubDepartmentCode(getXlsx(row, headerMap, normalizedHeaders, "home_sub_department_code"));
    e.setHomeSubDepartmentDesc(getXlsx(row, headerMap, normalizedHeaders, "home_sub_department_desc"));

    e.setDistDepartmentDesc(getXlsx(row, headerMap, normalizedHeaders, "dist_department_desc"));
    e.setDistPayrollProfileCode(getXlsx(row, headerMap, normalizedHeaders, "dist_payroll_profile_code"));
    e.setDistPayrollProfileDesc(getXlsx(row, headerMap, normalizedHeaders, "dist_payroll_profile_desc"));
    e.setDistJobCode(getXlsx(row, headerMap, normalizedHeaders, "dist_job_code"));
    e.setDistJobDesc(getXlsx(row, headerMap, normalizedHeaders, "dist_job_desc"));
    e.setDistSectionCode(getXlsx(row, headerMap, normalizedHeaders, "dist_section_code"));
    e.setDistSectionDesc(getXlsx(row, headerMap, normalizedHeaders, "dist_section_desc"));
    e.setDistActivityCode(getXlsx(row, headerMap, normalizedHeaders, "dist_activity_code"));
    e.setDistActivityDesc(getXlsx(row, headerMap, normalizedHeaders, "dist_activity_desc"));
    e.setDistUserAccessCode(getXlsx(row, headerMap, normalizedHeaders, "dist_user_access_code"));
    e.setDistUserAccessDesc(getXlsx(row, headerMap, normalizedHeaders, "dist_user_access_desc"));
    e.setDistSubDepartmentCode(getXlsx(row, headerMap, normalizedHeaders, "dist_sub_department_code"));
    e.setDistSubDepartmentDesc(getXlsx(row, headerMap, normalizedHeaders, "dist_sub_department_desc"));
    e.setDistributedDepartmentCode(getXlsx(row, headerMap, normalizedHeaders, "distributed_department_code"));

    // Map work_date_effective if present (CSV "Work Date" column)
    e.setWorkDateEffective(parseDate(getXlsx(row, headerMap, normalizedHeaders, "work_date_effective")));

    return e;
  }

  /**
   * Get cell value from XLSX row
   */
  private String getXlsx(Row row, Map<String, Integer> headerMap, Map<String, String> normalizedHeaders, String field) {
    String originalHeader = normalizedHeaders.get(field);
    if (originalHeader == null) return "";
    
    Integer colIndex = headerMap.get(originalHeader);
    if (colIndex == null) return "";
    
    Cell cell = row.getCell(colIndex);
    if (cell == null) return "";
    
    String result = safe(getCellValueAsString(cell));
    return result != null ? result : "";
  }

  /**
   * Convert cell value to string based on cell type
   */
  private String getCellValueAsString(Cell cell) {
    if (cell == null) return null;
    
    switch (cell.getCellType()) {
      case STRING:
        return cell.getStringCellValue();
      case NUMERIC:
        if (DateUtil.isCellDateFormatted(cell)) {
          // Handle date/time cells
          LocalDateTime dateTime = cell.getLocalDateTimeCellValue();
          if (dateTime != null) {
            return dateTime.format(DateTimeFormatter.ofPattern("M/d/yyyy H:mm"));
          }
          return null;
        } else {
          // Regular numeric value
          double numValue = cell.getNumericCellValue();
          // If it's a whole number, don't include decimal
          if (numValue == Math.floor(numValue)) {
            return String.valueOf((long) numValue);
          }
          return String.valueOf(numValue);
        }
      case BOOLEAN:
        return cell.getBooleanCellValue() ? "Y" : "N";
      case FORMULA:
        try {
          return cell.getStringCellValue();
        } catch (IllegalStateException e) {
          try {
            return String.valueOf(cell.getNumericCellValue());
          } catch (IllegalStateException e2) {
            return null;
          }
        }
      case BLANK:
      default:
        return null;
    }
  }

  private String safe(String s){ return s==null?null:s.trim().isEmpty()?null:s.trim(); }

  private LocalDateTime parseDateTime(String s){
    if (s==null) return null;
    for (var f : DATE_TIME_FORMATS) {
      try { return LocalDateTime.parse(s, f); } catch(Exception ignore){}
    }
    // Paycom sometimes ships "MM/dd/yyyy HH:mm:ss"
    try { return LocalDateTime.parse(s, DateTimeFormatter.ofPattern("M/d/yyyy H:mm:ss")); } catch(Exception ignore){}
    return null;
  }
  private BigDecimal parseDecimal(String s){
    if (s==null) return null;
    String n = s.replaceAll(",", "");
    try { return new BigDecimal(n); } catch(Exception e){ return null; }
  }
  private Boolean parseBool(String s){
    if (s==null) return null;
    String v = s.trim().toLowerCase();
    if (List.of("y","yes","true","1").contains(v)) return true;
    if (List.of("n","no","false","0").contains(v)) return false;
    return null;
  }
  
  private LocalDate parseDate(String s){
    if (s==null || s.trim().isEmpty()) return null;
    try {
      return LocalDate.parse(s, DateTimeFormatter.ofPattern("M/d/yyyy"));
    } catch(Exception e1) {
      try {
        return LocalDate.parse(s, DateTimeFormatter.ISO_LOCAL_DATE);
      } catch(Exception e2) {
        return null;
      }
    }
  }

  private String hashRow(PaycomTimeReport e) {
    // Use workDateEffective or derive from punch time
    String effectiveDate = "";
    if (e.getWorkDateEffective() != null) {
      effectiveDate = e.getWorkDateEffective().toString();
    } else if (e.getInPunchTime() != null) {
      effectiveDate = e.getInPunchTime().toLocalDate().toString();
    }
    
    String key = String.join("|",
      nz(e.getEeCode()), 
      effectiveDate,
      nz(e.getInPunchTime()==null?null:e.getInPunchTime().toString()),
      nz(e.getOutPunchTime()==null?null:e.getOutPunchTime().toString()),
      nz(e.getEarnCode()), 
      nz(e.getEarnHours()==null?null:e.getEarnHours().toPlainString()),
      nz(e.getHomeJobCode()), 
      nz(e.getDistJobCode()), 
      nz(e.getDistributedDepartmentCode())
    );
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-1");
      byte[] b = md.digest(key.getBytes(java.nio.charset.StandardCharsets.UTF_8));
      StringBuilder sb = new StringBuilder();
      for (byte x : b) sb.append(String.format("%02x", x));
      return sb.toString();
    } catch (Exception ex) {
      throw new RuntimeException(ex);
    }
  }
  private String nz(String s){ return s==null?"":s; }
}
