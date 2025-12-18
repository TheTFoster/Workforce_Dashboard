package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.Config.BatchSyncConfig;
import com.cec.EmployeeDB.Dto.BatchReport;
import com.cec.EmployeeDB.model.RowMap;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ImportFileService {
  private final JdbcTemplate jdbc;
  private final BatchSyncConfig cfg;

  @Transactional
  public BatchReport ingest(MultipartFile file) {
    var report = BatchReport.start(true);
    String table = cfg.getImport().getTable();
    jdbc.execute("TRUNCATE TABLE " + table);

    int staged = 0;
    try (InputStream is = file.getInputStream()) {
      String name = file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload";
      if (name != null && name.toLowerCase().endsWith(".csv")) {
        staged = loadCsv(is);
      } else {
        staged = loadXlsx(is);
      }
      report.getTotals().setInserted(staged);
    } catch (Exception e) {
      report.getTotals().setErrors(report.getTotals().getErrors() + 1);
      report.getErrors().add(BatchReport.ErrorRow.builder()
        .rowId("-").code("INGEST").message(e.getMessage()).build());
    }
    report.finish();
    return report;
  }

  private int loadCsv(InputStream is) throws Exception {
    var c = cfg.getImport();
    try (CSVParser parser = CSVParser.parse(is, java.nio.charset.StandardCharsets.UTF_8, CSVFormat.DEFAULT)) {
      int n = 0;
      Map<String, Integer> headerMap = new HashMap<>();
      boolean firstRow = true;
      
      for (var r : parser) {
        if (firstRow) {
          // Build header map from first row
          for (int i = 0; i < r.size(); i++) {
            headerMap.put(r.get(i).trim().toLowerCase(), i);
          }
          firstRow = false;
          continue;
        }
        n += insertImportRow(RowMap.builder()
          .empCode(getCsv(r, headerMap, c.getEmpCode(), "employee_code"))
          .tixId(getCsv(r, headerMap, c.getTixId(), "tixid"))
          .badge(getCsv(r, headerMap, c.getBadge(), "badge_num"))
          .name(getCsv(r, headerMap, c.getName(), "employee_name"))
          .status(normStatus(getCsv(r, headerMap, c.getStatus(), "employee_status")))
          .phone(getCsv(r, headerMap, c.getPhone(), "primary_phone"))
          .workEmail(getCsv(r, headerMap, c.getWorkEmail(), "work_email"))
          .personalEmail(getCsv(r, headerMap, c.getPersonalEmail(), "personal_email"))
          .annualSalary(num(getCsv(r, headerMap, c.getAnnualSalary(), "annual_salary")))
          .rate1(num(getCsv(r, headerMap, c.getRate1(), "rate_1")))
          .payType(getCsv(r, headerMap, c.getPayType(), "pay_type"))
          .department(getCsv(r, headerMap, c.getDepartment(), "department"))
          .workLocation(getCsv(r, headerMap, c.getWorkLocation(), "work_location"))
          .jobCode(getCsv(r, headerMap, c.getJobCode(), "job_code"))
          .build());
      }
      return n;
    }
  }

  private int loadXlsx(InputStream is) throws Exception {
    var c = cfg.getImport();
    try (var wb = new XSSFWorkbook(is)) {
      var sh = wb.getSheetAt(0);
      var head = sh.getRow(sh.getFirstRowNum());
      Map<String,Integer> idx = new HashMap<>();
      for (int i = 0; i < head.getLastCellNum(); i++) {
        var cell = head.getCell(i);
        if (cell == null) continue;
        idx.put(cell.toString().trim().toLowerCase(), i);
      }
      int n = 0;
      for (int r = sh.getFirstRowNum() + 1; r <= sh.getLastRowNum(); r++) {
        var row = sh.getRow(r);
        if (row == null) continue;
        n += insertImportRow(RowMap.builder()
          .empCode(cell(row, idx, c.getEmpCode(), "employee_code"))
          .tixId(cell(row, idx, c.getTixId(), "tixid"))
          .badge(cell(row, idx, c.getBadge(), "badge_num"))
          .name(cell(row, idx, c.getName(), "employee_name"))
          .status(normStatus(cell(row, idx, c.getStatus(), "employee_status")))
          .phone(cell(row, idx, c.getPhone(), "primary_phone"))
          .workEmail(cell(row, idx, c.getWorkEmail(), "work_email"))
          .personalEmail(cell(row, idx, c.getPersonalEmail(), "personal_email"))
          .annualSalary(num(cell(row, idx, c.getAnnualSalary(), "annual_salary")))
          .rate1(num(cell(row, idx, c.getRate1(), "rate_1")))
          .payType(cell(row, idx, c.getPayType(), "pay_type"))
          .department(cell(row, idx, c.getDepartment(), "department"))
          .workLocation(cell(row, idx, c.getWorkLocation(), "work_location"))
          .jobCode(cell(row, idx, c.getJobCode(), "job_code"))
          .build());
      }
      return n;
    }
  }

  private int insertImportRow(RowMap r) {
    String sql =
      "INSERT INTO " + cfg.getImport().getTable() +
      "(employee_code,tixid,badge_num,employee_name,employee_status,primary_phone,work_email,personal_email," +
      " annual_salary,rate_1,pay_type,department,work_location,job_code) " +
      "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
    return jdbc.update(sql,
      blank(r.getEmpCode()), blank(r.getTixId()), blank(r.getBadge()),
      blank(r.getName()), blank(r.getStatus()), blank(r.getPhone()),
      blank(r.getWorkEmail()), blank(r.getPersonalEmail()),
      r.getAnnualSalary(), r.getRate1(), blank(r.getPayType()),
      blank(r.getDepartment()), blank(r.getWorkLocation()), blank(r.getJobCode())
    );
  }

  // ---------- helpers ----------
  private static String getCsv(org.apache.commons.csv.CSVRecord r, Map<String, Integer> headerMap, String prefer, String alt) {
    String k = prefer != null ? prefer : alt;
    if (k == null) return null;
    Integer idx = headerMap.get(k.toLowerCase());
    if (idx == null) return null;
    try {
      var v = r.get(idx);
      return (v == null || v.isBlank()) ? null : v.trim();
    } catch (Exception e) {
      return null;
    }
  }
  private static String cell(org.apache.poi.ss.usermodel.Row row, Map<String,Integer> idx, String prefer, String alt) {
    String k = prefer != null ? prefer : alt;
    if (k == null) return null;
    Integer c = idx.get(k.toLowerCase());
    if (c == null) return null;
    var cell = row.getCell(c);
    if (cell == null) return null;
    var v = cell.toString();
    return (v == null || v.isBlank()) ? null : v.trim();
  }
  private static BigDecimal num(String s) {
    if (s == null) return null;
    try { return new BigDecimal(s.replaceAll("[,$]", "")); } catch (Exception e) { return null; }
  }
  private static String normStatus(String s) {
    if (s == null) return null;
    var v = s.trim().toLowerCase();
    if (v.startsWith("act")) return "Active";
    if (v.startsWith("ina")) return "Inactive";
    if (v.startsWith("term")) return "Terminated";
    return Character.toUpperCase(s.charAt(0)) + s.substring(1);
  }
  private static String blank(String s) { return (s != null && !s.isBlank()) ? s : null; }
}