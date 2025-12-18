package com.cec.EmployeeDB.Repo;

import com.cec.EmployeeDB.Config.BatchSyncConfig;
import com.cec.EmployeeDB.model.RowMap;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class SqlAdapter {
  private final JdbcTemplate jdbc;
  private final BatchSyncConfig cfg;

  public Map<String, RowMap> readLiveByEmpCode() {
    var c = cfg.getLive();
    String sql = String.format(
      "SELECT %s AS id,%s AS empCode,%s AS tixId,%s AS badge,%s AS badgeNorm," +
      "%s AS name,%s AS status,%s AS phone,%s AS workEmail,%s AS personalEmail," +
      "%s AS annualSalary,%s AS rate1,%s AS payType,%s AS department,%s AS workLocation,%s AS jobCode " +
      "FROM %s",
      c.getId(), c.getEmpCode(), c.getTixId(), c.getBadge(), c.getBadgeNorm(),
      c.getName(), c.getStatus(), c.getPhone(), c.getWorkEmail(), c.getPersonalEmail(),
      c.getAnnualSalary(), c.getRate1(), c.getPayType(), c.getDepartment(), c.getWorkLocation(), c.getJobCode(),
      c.getTable()
    );
    return jdbc.query(Objects.requireNonNull(sql, "sql cannot be null"), (rs, i) -> map(rs)).stream()
      .filter(r -> notBlank(r.getEmpCode()))
      .collect(Collectors.toMap(RowMap::getEmpCode, r -> r, (a,b)->a));
  }

  public Map<String, RowMap> readLiveByTixId() {
    var c = cfg.getLive();
    String sql = String.format(
      "SELECT %s AS id,%s AS empCode,%s AS tixId,%s AS badge,%s AS badgeNorm," +
      "%s AS name,%s AS status,%s AS phone,%s AS workEmail,%s AS personalEmail," +
      "%s AS annualSalary,%s AS rate1,%s AS payType,%s AS department,%s AS workLocation,%s AS jobCode " +
      "FROM %s",
      c.getId(), c.getEmpCode(), c.getTixId(), c.getBadge(), c.getBadgeNorm(),
      c.getName(), c.getStatus(), c.getPhone(), c.getWorkEmail(), c.getPersonalEmail(),
      c.getAnnualSalary(), c.getRate1(), c.getPayType(), c.getDepartment(), c.getWorkLocation(), c.getJobCode(),
      c.getTable()
    );
    return jdbc.query(Objects.requireNonNull(sql, "sql cannot be null"), (rs, i) -> map(rs)).stream()
      .filter(r -> notBlank(r.getTixId()))
      .collect(Collectors.toMap(RowMap::getTixId, r -> r, (a,b)->a));
  }

  public Map<String, RowMap> readLiveByBadgeNorm() {
    var c = cfg.getLive();
    String sql = String.format(
      "SELECT %s AS id,%s AS empCode,%s AS tixId,%s AS badge,%s AS badgeNorm," +
      "%s AS name,%s AS status,%s AS phone,%s AS workEmail,%s AS personalEmail," +
      "%s AS annualSalary,%s AS rate1,%s AS payType,%s AS department,%s AS workLocation,%s AS jobCode " +
      "FROM %s WHERE %s IS NOT NULL",
      c.getId(), c.getEmpCode(), c.getTixId(), c.getBadge(), c.getBadgeNorm(),
      c.getName(), c.getStatus(), c.getPhone(), c.getWorkEmail(), c.getPersonalEmail(),
      c.getAnnualSalary(), c.getRate1(), c.getPayType(), c.getDepartment(), c.getWorkLocation(), c.getJobCode(),
      c.getTable(), c.getBadgeNorm()
    );
    return jdbc.query(Objects.requireNonNull(sql, "sql cannot be null"), (rs, i) -> map(rs)).stream()
      .filter(r -> notBlank(r.getBadgeNorm()))
      .collect(Collectors.toMap(RowMap::getBadgeNorm, r -> r, (a,b)->a));
  }

  public List<RowMap> readImportAll() {
    var c = cfg.getImport();
    String sql = String.format(
      "SELECT %s AS empCode,%s AS tixId,%s AS badge,%s AS name,%s AS status,%s AS phone," +
      "%s AS workEmail,%s AS personalEmail,%s AS annualSalary,%s AS rate1,%s AS payType," +
      "%s AS department,%s AS workLocation,%s AS jobCode FROM %s",
      c.getEmpCode(), c.getTixId(), c.getBadge(), c.getName(), c.getStatus(), c.getPhone(),
      c.getWorkEmail(), c.getPersonalEmail(), c.getAnnualSalary(), c.getRate1(), c.getPayType(),
      c.getDepartment(), c.getWorkLocation(), c.getJobCode(), c.getTable()
    );
    return jdbc.query(Objects.requireNonNull(sql, "sql cannot be null"), (rs, i) -> map(rs));
  }

  public void truncateImport() {
    jdbc.execute("TRUNCATE TABLE " + cfg.getImport().getTable());
  }

  /** UPDATE by emp_code → by xid → by badge_norm; INSERT if none match. */
  public int upsertLive(RowMap in, String batchId, String source) {
    var c = cfg.getLive();

    // 1) UPDATE by emp_code
    String updByEmp = String.format(
      "UPDATE %s SET %s=?,%s=?,%s=?,%s=?,%s=?,%s=?,%s=?,%s=?,%s=?," +
      "%s=?,%s=?,%s=?,%s=?,%s=?,%s=NOW(),%s=?,%s=? WHERE %s=?",
      c.getTable(),
      c.getName(), c.getStatus(), c.getPhone(), c.getWorkEmail(), c.getPersonalEmail(),
      c.getAnnualSalary(), c.getRate1(), c.getPayType(), c.getDepartment(), c.getWorkLocation(), c.getJobCode(),
      c.getUpdatedAt(), c.getLastBatchId(), c.getLastSource(), c.getEmpCode()
    );
    int n = jdbc.update(Objects.requireNonNull(updByEmp, "sql cannot be null"),
      in.getName(), in.getStatus(), in.getPhone(), in.getWorkEmail(), in.getPersonalEmail(),
      in.getAnnualSalary(), in.getRate1(), in.getPayType(), in.getDepartment(), in.getWorkLocation(), in.getJobCode(),
      batchId, source, in.getEmpCode()
    );
    if (n > 0) return n;

    // 2) UPDATE by xid (tixid) where emp_code is null/blank
    String updByTix = String.format(
      "UPDATE %s SET %s=?,%s=?,%s=?,%s=?,%s=?,%s=?,%s=?,%s=?,%s=?," +
      "%s=?,%s=?,%s=?,%s=?,%s=?,%s=NOW(),%s=?,%s=? " +
      "WHERE (%s IS NULL OR %s='') AND %s=?",
      c.getTable(),
      c.getName(), c.getStatus(), c.getPhone(), c.getWorkEmail(), c.getPersonalEmail(),
      c.getAnnualSalary(), c.getRate1(), c.getPayType(), c.getDepartment(), c.getWorkLocation(), c.getJobCode(),
      c.getUpdatedAt(), c.getLastBatchId(), c.getLastSource(),
      c.getEmpCode(), c.getEmpCode(), c.getTixId()
    );
    n = jdbc.update(Objects.requireNonNull(updByTix, "sql cannot be null"),
      in.getName(), in.getStatus(), in.getPhone(), in.getWorkEmail(), in.getPersonalEmail(),
      in.getAnnualSalary(), in.getRate1(), in.getPayType(), in.getDepartment(), in.getWorkLocation(), in.getJobCode(),
      batchId, source, in.getTixId()
    );
    if (n > 0) return n;

    // 3) UPDATE by normalized badge where both keys are blank
    String updByBadge = String.format(
      "UPDATE %s SET %s=?,%s=?,%s=?,%s=?,%s=?,%s=?,%s=?,%s=?,%s=?," +
      "%s=?,%s=?,%s=?,%s=?,%s=?,%s=NOW(),%s=?,%s=? " +
      "WHERE (%s IS NULL OR %s='') AND (%s IS NULL OR %s='') AND %s=REPLACE(UPPER(TRIM(?)),' ','')",
      c.getTable(),
      c.getName(), c.getStatus(), c.getPhone(), c.getWorkEmail(), c.getPersonalEmail(),
      c.getAnnualSalary(), c.getRate1(), c.getPayType(), c.getDepartment(), c.getWorkLocation(), c.getJobCode(),
      c.getUpdatedAt(), c.getLastBatchId(), c.getLastSource(),
      c.getEmpCode(), c.getEmpCode(), c.getTixId(), c.getTixId(), c.getBadgeNorm()
    );
    n = jdbc.update(Objects.requireNonNull(updByBadge, "sql cannot be null"),
      in.getName(), in.getStatus(), in.getPhone(), in.getWorkEmail(), in.getPersonalEmail(),
      in.getAnnualSalary(), in.getRate1(), in.getPayType(), in.getDepartment(), in.getWorkLocation(), in.getJobCode(),
      batchId, source, in.getBadge()
    );
    if (n > 0) return n;

    // 4) INSERT
    String ins = String.format(
      "INSERT INTO %s (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      c.getTable(),
      c.getEmpCode(), c.getTixId(), c.getBadge(),
      c.getName(), c.getStatus(), c.getPhone(), c.getWorkEmail(), c.getPersonalEmail(),
      c.getAnnualSalary(), c.getRate1(), c.getPayType(),
      c.getDepartment(), c.getWorkLocation(), c.getJobCode(),
      c.getUpdatedAt(), c.getLastBatchId(), c.getLastSource()
    );
    return jdbc.update(Objects.requireNonNull(ins, "sql cannot be null"),
      blankToNull(in.getEmpCode()), blankToNull(in.getTixId()), blankToNull(in.getBadge()),
      in.getName(), in.getStatus(), in.getPhone(), in.getWorkEmail(), in.getPersonalEmail(),
      in.getAnnualSalary(), in.getRate1(), in.getPayType(),
      in.getDepartment(), in.getWorkLocation(), in.getJobCode(),
      new java.sql.Timestamp(System.currentTimeMillis()), batchId, source
    );
  }

  // ---------- helpers ----------
  private static RowMap map(ResultSet rs) throws SQLException {
    return RowMap.builder()
      .id(optLong(rs, "id"))
      .empCode(opt(rs, "empCode"))
      .tixId(opt(rs, "tixId"))
      .badge(opt(rs, "badge"))
      .badgeNorm(opt(rs, "badgeNorm"))
      .name(opt(rs, "name"))
      .status(opt(rs, "status"))
      .phone(opt(rs, "phone"))
      .workEmail(opt(rs, "workEmail"))
      .personalEmail(opt(rs, "personalEmail"))
      .annualSalary(optBig(rs, "annualSalary"))
      .rate1(optBig(rs, "rate1"))
      .payType(opt(rs, "payType"))
      .department(opt(rs, "department"))
      .workLocation(opt(rs, "workLocation"))
      .jobCode(opt(rs, "jobCode"))
      .build();
  }

  private static String opt(ResultSet rs, String col) { try { return rs.getString(col); } catch (SQLException e){ return null; } }
  private static Long optLong(ResultSet rs, String col) { try { long v = rs.getLong(col); return rs.wasNull()? null : v; } catch (SQLException e){ return null; } }
  private static BigDecimal optBig(ResultSet rs, String col) { try { return rs.getBigDecimal(col); } catch (SQLException e){ return null; } }
  private static boolean notBlank(String s){ return s != null && !s.isBlank(); }
  private static String blankToNull(String s){ return notBlank(s) ? s : null; }
}