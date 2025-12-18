package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.Dto.BatchReport;
import com.cec.EmployeeDB.model.RowMap;
import com.cec.EmployeeDB.Repo.SqlAdapter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class BatchSyncService {
  private final SqlAdapter db;

  public BatchReport preview() {
    var rpt = BatchReport.start(true);
    doDiff(rpt, false, UUID.randomUUID().toString(), "preview");
    rpt.finish();
    return rpt;
  }

  @Transactional
  public BatchReport apply() {
    var batchId = UUID.randomUUID().toString();
    var rpt = BatchReport.start(false);
    doDiff(rpt, true, batchId, "upload");
    rpt.finish();
    return rpt;
  }

  private void doDiff(BatchReport rpt, boolean persist, String batchId, String source) {
    var totals = rpt.getTotals();

    var liveByEmp   = db.readLiveByEmpCode();
    var liveByTix   = db.readLiveByTixId();
    var liveByBadge = db.readLiveByBadgeNorm();
    var imports     = db.readImportAll();

    for (var in : imports) {
      RowMap ex = null;
      String matchedBy = null;

      if (notBlank(in.getEmpCode())) {
        ex = liveByEmp.get(in.getEmpCode());
        matchedBy = "emp_code";
      }
      if (ex == null && notBlank(in.getTixId())) {
        ex = liveByTix.get(in.getTixId());
        matchedBy = "xid";
      }
      if (ex == null && notBlank(in.getBadge())) {
        var norm = normalizeBadge(in.getBadge());
        ex = liveByBadge.get(norm);
        matchedBy = "badge_num_norm";
      }

      if (ex == null) {
        // INSERT
        var diffs = Map.<String, Map<String,Object>>of(
          "employee_name", Map.of("before", "", "after", toStr(in.getName())),
          "employee_status", Map.of("before", "", "after", nz(in.getStatus(), "Active")),
          "annual_salary", Map.of("before", "", "after", toStr(in.getAnnualSalary())),
          "rate_1", Map.of("before", "", "after", toStr(in.getRate1())),
          "pay_type", Map.of("before", "", "after", nz(in.getPayType(), ""))
        );
        totals.setInserted(totals.getInserted() + 1);
        if (persist) db.upsertLive(in, batchId, source);
        rpt.getChanges().add(changeRow(null, in, "INSERT (no match)", diffs));
        continue;
      }

      // UPDATE
      var diffs = new LinkedHashMap<String, Map<String,Object>>();
      putDiff(diffs, "employee_name", ex.getName(), in.getName());
      putDiff(diffs, "employee_status", ex.getStatus(), in.getStatus());
      putDiff(diffs, "primary_phone", ex.getPhone(), in.getPhone());
      putDiff(diffs, "work_email", ex.getWorkEmail(), in.getWorkEmail());
      putDiff(diffs, "personal_email", ex.getPersonalEmail(), in.getPersonalEmail());
      putDiff(diffs, "annual_salary", toStr(ex.getAnnualSalary()), toStr(in.getAnnualSalary()));
      putDiff(diffs, "rate_1", toStr(ex.getRate1()), toStr(in.getRate1()));
      putDiff(diffs, "pay_type", ex.getPayType(), in.getPayType());
      putDiff(diffs, "department", ex.getDepartment(), in.getDepartment());
      putDiff(diffs, "work_location", ex.getWorkLocation(), in.getWorkLocation());
      putDiff(diffs, "job_code", ex.getJobCode(), in.getJobCode());

      diffs.entrySet().removeIf(e -> Objects.equals(e.getValue().get("before"), e.getValue().get("after")));
      if (diffs.isEmpty()) {
        totals.setUnchanged(totals.getUnchanged() + 1);
        continue;
      }

      var sb = nz(ex.getStatus(), "");
      var sa = nz(in.getStatus(), sb);
      if (!sb.equalsIgnoreCase(sa)) {
        if ("Inactive".equalsIgnoreCase(sa)) totals.setDeactivated(totals.getDeactivated() + 1);
        if ("Terminated".equalsIgnoreCase(sa)) totals.setTerminated(totals.getTerminated() + 1);
      } else {
        totals.setUpdated(totals.getUpdated() + 1);
      }

      if (persist) db.upsertLive(in, batchId, source);
      rpt.getChanges().add(changeRow(ex, in, "UPDATE by " + matchedBy, diffs));
    }
  }

  @SuppressWarnings("unchecked")
  private static BatchReport.ChangeRow changeRow(RowMap ex, RowMap in, String reason, Map<String, Map<String,Object>> diffs) {
    return BatchReport.ChangeRow.builder()
      .empId(ex != null ? ex.getId() : null)
      .employeeCode(in.getEmpCode() != null ? in.getEmpCode() : (ex != null ? ex.getEmpCode() : null))
      .nameBefore(ex != null ? ex.getName() : null)
      .nameAfter(in.getName())
      .statusBefore(ex != null ? ex.getStatus() : null)
      .statusAfter(in.getStatus())
      .wageBefore(anyMoney(ex))
      .wageAfter(anyMoney(in))
      .reason(reason)
      .changes((Map<String, Object>) (Map<?, ?>) diffs)
      .build();
  }

  private static String anyMoney(RowMap r) {
    if (r == null) return null;
    if (r.getAnnualSalary() != null) return strip(r.getAnnualSalary());
    if (r.getRate1() != null) return strip(r.getRate1());
    return null;
  }

  private static String strip(BigDecimal bd) { return bd == null ? null : bd.stripTrailingZeros().toPlainString(); }
  private static void putDiff(Map<String, Map<String,Object>> d, String f, Object b, Object a) { d.put(f, Map.of("before", toStr(b), "after", toStr(a))); }
  private static String toStr(Object o){ return o == null ? null : String.valueOf(o); }
  private static String nz(String s, String def){ return (s == null || s.isBlank()) ? def : s; }
  private static boolean notBlank(String s){ return s != null && !s.isBlank(); }
  private static String normalizeBadge(String s){ return s == null ? null : s.trim().toUpperCase().replace(" ", ""); }
}