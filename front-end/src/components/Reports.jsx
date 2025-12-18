// front-end/src/components/Reports.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import styles from "../stylesheets/Reports.module.css";

/* --------------------------------
   small utils
----------------------------------*/
const DAY = 24 * 60 * 60 * 1000;

const pick = (...vals) => {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
};

function getCI(obj, ...candidates) {
  if (!obj || typeof obj !== "object") return null;
  const norm = (s) =>
    String(s)
      .replace(/[\s_\-]/g, "")
      .toLowerCase();
  const index = Object.keys(obj).reduce((m, k) => {
    const nk = norm(k);
    if (!m[nk]) m[nk] = k; // first key wins
    return m;
  }, Object.create(null));

  for (const c of candidates) {
    const k = index[norm(c)];
    if (k !== undefined) {
      const v = obj[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
  }
  return null;
}

// parse Date from various inputs (robust)
function asDate(v) {
  if (v === undefined || v === null) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;

  // Numbers: accept ms or epoch seconds
  if (typeof v === "number") {
    const ms = v < 1e12 ? v * 1000 : v; // treat small numbers as seconds
    const d = new Date(ms);
    return isNaN(d) ? null : d;
  }

  const s = String(v).trim();
  if (!s) return null;

  // ISO with timezone (or trailing Z)
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(s)) {
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }

  // YYYY-MM-DD or YYYY/MM/DD with optional HH:mm[:ss]
  let m = s.match(
    /^(\d{4})[-/](\d{2})[-/](\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (m) {
    const [, Y, M, D, h = "0", mn = "0", ss = "0"] = m;
    const d = new Date(+Y, +M - 1, +D, +h, +mn, +ss);
    return isNaN(d) ? null : d;
  }

  // US: M/D/YYYY [HH:mm[:ss]] [AM/PM]
  m = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i
  );
  if (m) {
    let [, M, D, Y, h = "0", mn = "0", ss = "0", ap] = m;
    let hour = +h;
    if (ap) {
      const AM = ap.toUpperCase() === "AM";
      if (AM && hour === 12) hour = 0;
      if (!AM && hour < 12) hour += 12;
    }
    const d = new Date(+Y, +M - 1, +D, hour, +mn, +ss);
    return isNaN(d) ? null : d;
  }

  // Fallback
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function ymd(d) {
  const dt = asDate(d) || new Date();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${m}-${day}`;
}
function addDays(d, n) {
  const base = asDate(d) || new Date();
  return new Date(base.getTime() + n * DAY);
}

// find the latest valid date among a set
function maxDateOf(...ds) {
  let max = null;
  for (const v of ds) {
    const d = asDate(v);
    if (d && (!max || d > max)) max = d;
  }
  return max;
}

// scan an object for any field that looks like a date/time and return the latest
function scanLatestDate(obj) {
  if (!obj || typeof obj !== "object") return null;
  const candidates = [];
  for (const [k, v] of Object.entries(obj)) {
    if (
      v != null &&
      /date|time|punch|start|end|work/i.test(k) &&
      typeof v !== "object"
    ) {
      const d = asDate(v);
      if (d) candidates.push(d);
    }
  }
  return candidates.length
    ? new Date(Math.max(...candidates.map((d) => +d)))
    : null;
}

/* --------------------------------
   status normalization
----------------------------------*/
function statusNorm(e) {
  const fromServer = (e?.status_norm ?? e?.statusNorm ?? "")
    .toString()
    .trim()
    .toLowerCase();
  if (fromServer) return fromServer;

  const s = (e?.employeeStatus ?? "").toString().trim().toLowerCase();
  if (e?.endDate) return "terminated";
  if (["terminated", "term", "termed", "separated", "fired"].includes(s))
    return "terminated";
  if (["inactive", "on leave", "on_leave", "leave"].includes(s))
    return "inactive";
  if (s === "active") return "active";
  return "other";
}

/* --------------------------------
   vendor/staff parsing
----------------------------------*/
function parseStaffVendor(s) {
  if (!s) return { staffType: "Unknown", vendor: "—" };
  
  const tokens = s
    .split("-")
    .map((t) => t.trim())
    .filter(Boolean);

  const leased = /leased/i.test(s);
  const staffType = leased ? "Leased" : "CEC";

  let vendor = "—";
  
  // If it's leased labor, try to extract vendor
  if (leased) {
    // Find ALL occurrences of "Leased Labor" - we want the LAST one
    let lastLeasedLaborIdx = -1;
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (/^leased\s+labor$/i.test(tokens[i])) {
        lastLeasedLaborIdx = i;
        break;
      }
    }
    
    // Vendor is the token immediately before "Leased Labor"
    if (lastLeasedLaborIdx > 0) {
      vendor = tokens[lastLeasedLaborIdx - 1] || "—";
    }
  }
  
  return { staffType, vendor };
}

/* --------------------------------
   normalize a timecard row
----------------------------------*/
function normTC(r) {
  const eeCode =
    pick(r.eeCode, r.ee_code, r.employeeCode, r.employee_code, r.emp_code) ||
    null;

  // explicit punches / work day
  const outPunch = maxDateOf(
    r.out_punch_time,
    r.out_punch_time2,
    r.last_out_punch_time,
    r.max_out_punch_time,
    r.outPunchTime,
    r.out_punch_datetime,
    r.outPunchDateTime,
    r.clock_out_time,
    r.clockOutTime,
    r.punch_time,
    r.outTime
  );
  const inPunch = maxDateOf(
    r.in_punch_time,
    r.in_punch_time2,
    r.last_in_punch_time,
    r.max_in_punch_time,
    r.inPunchTime,
    r.in_punch_datetime,
    r.inPunchDateTime,
    r.clock_in_time,
    r.clockInTime,
    r.punch_time,
    r.inTime
  );
  const workDay = maxDateOf(
    r.work_date,
    r.work_date_effective,
    r.work_date_csv,
    r.workDate,
    r.punch_date,
    r.punchDate,
    r.date,
    r.day
  );

  // span-style fields (start/end exclusive)
  const spanStart = maxDateOf(r.startDate, r.start_date, r.start);
  const spanEndExcl = maxDateOf(
    r.endDateExcl,
    r.end_date_excl,
    r.endExclusive,
    r.end_date,
    r.end
  );

  // scanned safety net
  const scanned = scanLatestDate(r);

  // last seen: prefer span end - 1 day when present (exclusive)
  const lastSeenSpan = spanEndExcl ? addDays(spanEndExcl, -1) : null;
  const lastSeen =
    maxDateOf(outPunch, inPunch, workDay, scanned, lastSeenSpan) || null;

  // durable single-day key
  const dayKey = lastSeen ? ymd(lastSeen) : null;

  // build days set from span if available, otherwise single day
  const daysSet = new Set();
  if (spanStart && spanEndExcl && spanEndExcl > spanStart) {
    for (let d = new Date(spanStart); d < spanEndExcl; d = addDays(d, 1)) {
      daysSet.add(ymd(d));
    }
  } else if (dayKey) {
    daysSet.add(dayKey);
  }

  // job/desc/section/department/activity
  const jobCode = pick(r.distJobCode, r.dist_job_code) || "Unknown";
  const jobDesc = pick(r.distJobDesc, r.dist_job_desc) || "—";
  const distDepartmentDesc =
    pick(r.distDepartmentDesc, r.dist_department_desc) || "—";
  const distSectionDesc = pick(r.distSectionDesc, r.dist_section_desc) || "—";
  const distActivityDesc =
    pick(r.distActivityDesc, r.dist_activity_desc, r.dist_activity_code) || "—";

  // staff type & vendor
  const homeAlloc = pick(r.homeAllocation, r.home_allocation);
  const alloc = pick(r.allocation, r.Allocation);
  const { staffType, vendor: rawVendor } = parseStaffVendor(homeAlloc || alloc);
  const vendor = rawVendor && String(rawVendor).trim() === "-" ? "—" : rawVendor;

  // names: handle Firstname/Lastname and single-field fallbacks
  const tcFirst =
    pick(
      getCI(r, "firstName", "first_name", "Firstname", "FIRSTNAME", "first"),
      r["First Name"],
      r["Employee First Name"]
    ) || null;

  const tcLast =
    pick(
      getCI(r, "lastName", "last_name", "Lastname", "LASTNAME", "last"),
      r["Last Name"],
      r["Employee Last Name"]
    ) || null;

  const tcSingle =
    pick(
      getCI(
        r,
        "employee_name",
        "employeename",
        "name",
        "displayName",
        "Employee Name",
        "EMPLOYEE_NAME"
      ),
      r["Employee Name"]
    ) || null;

  const tcName =
    (tcSingle && String(tcSingle).trim()) ||
    [tcLast, tcFirst].filter(Boolean).join(", ") ||
    null;

  return {
    eeCode,
    lastSeen, // Date or null
    dayKey, // "YYYY-MM-DD" or null
    daysSet, // Set<YYYY-MM-DD>
    // expose punches and explicit work day for exports
    inPunch,
    outPunch,
    workDayDate: workDay ? ymd(workDay) : null,
    jobCode,
    jobDesc,
    section: distSectionDesc,
    department: distDepartmentDesc,
    activity: distActivityDesc,
    staffType,
    vendor,
    // Keep raw allocation for debugging
    homeAllocation: homeAlloc,
    allocation: alloc,
    tcFirst,
    tcLast,
    tcName,
  };
}

/* =================================================================== */

export default function Reports() {
  const navigate = useNavigate();

  // controls
  const [windowDays, setWindowDays] = useState(30);
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [staffFilter, setStaffFilter] = useState("ALL");
  const [vendorFilter, setVendorFilter] = useState("ALL");
  const [sortMode, setSortMode] = useState("ProjectAZ");

  // scroll helpers
  const panelBodyRef = useRef(null);
  const employeeListRef = useRef(null);
  const rightTopRef = useRef(null);

  // the real toggle (top-right pills)
  const [includeAllPeople, setIncludeAllPeople] = useState(false);

  // data
  const [timecards, setTimecards] = useState([]);
  // CODE -> { name, id, status, raw }
  const [empMap, setEmpMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leftSelKey, setLeftSelKey] = useState(null);

  /* ---------------------------
     EMPLOYEES (driven by toggle)
  -----------------------------*/
  useEffect(() => {
    let cancelled = false;

    async function pull(status) {
      const resp = await api.get("/api/v1/employee/list", {
        params: { size: 100000, status },
      });
      const payload = resp?.data ?? [];
      const rows = Array.isArray(payload)
        ? payload
        : payload?.employees || payload?.content || [];
      return Array.isArray(rows) ? rows : [];
    }

    (async () => {
      try {
        const acc = new Map();

        const desired = includeAllPeople ? "all" : "active";
        let rows = [];
        try {
          rows = await pull(desired);
        } catch {
          rows = [];
        }

        if (rows.length === 0) {
          const buckets = includeAllPeople
            ? ["active", "inactive", "terminated"]
            : ["active"];
          for (const b of buckets) {
            try {
              const part = await pull(b);
              for (const r of part) {
                const code = pick(r.employeeCode, r.employee_code, r.emp_code);
                if (!code) continue;
                const key = String(code).trim().toUpperCase();
                if (!acc.has(key)) {
                  acc.set(key, {
                    name: pick(r.EmployeeName, r.empName, r.employeeName, r.employee_name, r.name) || 
                          (r.firstName && r.lastName ? `${r.lastName}, ${r.firstName}` : null) || "—",
                    id: pick(r.employeeid, r.employeeId, r.empId, r.id) ?? null,
                    status: statusNorm(r),
                    raw: r,
                  });
                }
              }
            } catch {}
          }
        } else {
          for (const r of rows) {
            const code = pick(r.employeeCode, r.employee_code, r.emp_code);
            if (!code) continue;
            const key = String(code).trim().toUpperCase();
            acc.set(key, {
              name: pick(r.EmployeeName, r.empName, r.employeeName, r.employee_name, r.name) || 
                    (r.firstName && r.lastName ? `${r.lastName}, ${r.firstName}` : null) || "—",
              id: pick(r.employeeid, r.employeeId, r.empId, r.id) ?? null,
              status: statusNorm(r),
              raw: r,
            });
          }
        }

        if (!cancelled) setEmpMap(acc);
      } catch {
        if (!cancelled) setEmpMap(new Map());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [includeAllPeople]);

  /* ---------------------------
     Snap right list to top on selection change
  -----------------------------*/
  useEffect(() => {
    if (!leftSelKey) return; // avoid snapping on initial page load or when nothing is selected

    // Run after DOM updates for the new selection
    requestAnimationFrame(() => {
      // Reset any internal scrollers (if they overflow)
      if (panelBodyRef.current) panelBodyRef.current.scrollTop = 0;
      if (employeeListRef.current) employeeListRef.current.scrollTop = 0;

      // Snap the window to the top of the right column
      if (
        rightTopRef.current &&
        typeof rightTopRef.current.scrollIntoView === "function"
      ) {
        try {
          rightTopRef.current.scrollIntoView({
            block: "start",
            behavior: "auto",
          });
        } catch {
          const el = rightTopRef.current;
          const y = window.pageYOffset + el.getBoundingClientRect().top;
          window.scrollTo(0, y);
        }
      }
    });
  }, [leftSelKey]);

  /* ---------------------------
     TIMECARDS
     Loads timecard data from the last N days (windowDays)
     counting backwards from TODAY
  -----------------------------*/
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const end = new Date(); // Today
        const start = addDays(end, -Math.max(1, windowDays)); // windowDays ago from today
        const resp = await api.get("/api/v1/timecards/range", {
          params: { start: ymd(start), end: ymd(end), limit: 20000 },
        });
        const rows = Array.isArray(resp.data) ? resp.data : [];
        const normalized = rows.map(normTC);
        if (!cancelled) {
          setTimecards(normalized);
          setLeftSelKey((prev) => (prev ? prev : null));
        }
      } catch (e) {
        if (!cancelled) {
          setTimecards([]);
          setError(
            e?.response?.data?.message ||
              e?.message ||
              "Failed to load timecards."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [windowDays]);

  /* ---------------------------
     filter options
  -----------------------------*/
  const sectionOptions = useMemo(() => {
    const s = new Set(["ALL"]);
    for (const r of timecards) s.add(r.section || "—");
    return Array.from(s).sort();
  }, [timecards]);

  const deptOptions = useMemo(() => {
    const s = new Set(["ALL"]);
    for (const r of timecards) s.add(r.department || "—");
    return Array.from(s).sort();
  }, [timecards]);

  const vendors = useMemo(() => {
    const s = new Set();
    for (const r of timecards) {
      if (r.vendor && r.vendor !== "—") s.add(r.vendor);
    }
    return ["ALL", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [timecards]);

  /* ---------------------------
     aggregate by jobCode
  -----------------------------*/
  const projects = useMemo(() => {
    const agg = new Map();

    for (const r of timecards) {
      // filters
      if (sectionFilter !== "ALL" && (r.section || "—") !== sectionFilter)
        continue;
      if (deptFilter !== "ALL" && (r.department || "—") !== deptFilter)
        continue;
      if (staffFilter !== "ALL" && (r.staffType || "Unknown") !== staffFilter)
        continue;
      if (vendorFilter !== "ALL" && (r.vendor || "—") !== vendorFilter)
        continue;

      const key = String(r.jobCode || "Unknown").toUpperCase();
      let rec = agg.get(key);
      if (!rec) {
        rec = {
          key,
          jobCode: r.jobCode || "Unknown",
          jobDesc: r.jobDesc || "—",
          section: new Set(),
          department: new Set(),
          staffTypes: new Set(),
          vendors: new Set(),
          // code -> { lastSeen, department, activity, days:Set<YYYY-MM-DD>, tcFirst, tcLast, tcName }
          employees: new Map(),
        };
        agg.set(key, rec);
      }

      rec.section.add(r.section || "—");
      rec.department.add(r.department || "—");
      rec.staffTypes.add(r.staffType || "Unknown");
      if (r.vendor && r.vendor !== "—") rec.vendors.add(r.vendor);

      const codeKey = (r.eeCode || "").toString().trim().toUpperCase();
      if (!codeKey) continue;

      // always compute a dayKey (falls back to lastSeen)
      const dKey = r.dayKey || (r.lastSeen ? ymd(r.lastSeen) : null);
      const dKeys =
        r.daysSet && r.daysSet instanceof Set && r.daysSet.size
          ? Array.from(r.daysSet)
          : dKey
          ? [dKey]
          : [];

      const prev = rec.employees.get(codeKey);
      if (!prev) {
        rec.employees.set(codeKey, {
          lastSeen: r.lastSeen || null,
          department: r.department || "—",
          activity: r.activity || "—",
          days: new Set(dKeys),
          tcFirst: r.tcFirst || null,
          tcLast: r.tcLast || null,
          tcName: r.tcName || null,
          staffType: r.staffType || "Unknown",
          vendor: r.vendor || "—",
        });
      } else {
        const newer =
          r.lastSeen && (!prev.lastSeen || r.lastSeen > prev.lastSeen)
            ? r.lastSeen
            : prev.lastSeen;

        const days = prev.days instanceof Set ? prev.days : new Set();
        for (const k of dKeys) days.add(k);

        rec.employees.set(codeKey, {
          lastSeen: newer,
          department: prev.department ?? r.department ?? "—",
          activity: prev.activity ?? r.activity ?? "—",
          days,
          tcFirst: prev.tcFirst ?? r.tcFirst ?? null,
          tcLast: prev.tcLast ?? r.tcLast ?? null,
          tcName: prev.tcName ?? r.tcName ?? null,
          staffType: prev.staffType ?? r.staffType ?? "Unknown",
          vendor: prev.vendor ?? r.vendor ?? "—",
        });
      }
    }

    // build list, count respects toggle
    let list = Array.from(agg.values()).map((p) => {
      let count = 0;
      for (const code of p.employees.keys()) {
        const info = empMap.get(code);
        const st = info ? statusNorm(info.raw) : "other";
        if (includeAllPeople || st === "active") count++;
      }
      return {
        ...p,
        sectionLabel: Array.from(p.section).sort().join(", "),
        deptLabel: Array.from(p.department).sort().join(", "),
        staffLabel: Array.from(p.staffTypes).sort().join(", "),
        vendorLabel: Array.from(p.vendors).sort().join(", "),
        employeeCount: count,
        __s: (p.jobCode + " " + p.jobDesc).toLowerCase(),
      };
    });

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.__s.includes(q));
    }

    switch (sortMode) {
      case "CountDesc":
        list.sort(
          (a, b) =>
            b.employeeCount - a.employeeCount ||
            a.jobCode.localeCompare(b.jobCode)
        );
        break;
      case "LastSeenDesc":
        list.sort((a, b) => {
          const aMax = maxDate(a.employees);
          const bMax = maxDate(b.employees);
          return (
            (bMax?.getTime() || 0) - (aMax?.getTime() || 0) ||
            a.jobCode.localeCompare(b.jobCode)
          );
        });
        break;
      default:
        list.sort((a, b) => a.jobCode.localeCompare(b.jobCode));
    }

    return list;
  }, [
    timecards,
    search,
    sectionFilter,
    deptFilter,
    staffFilter,
    vendorFilter,
    sortMode,
    empMap,
    includeAllPeople,
  ]);

  function maxDate(mapCodeToObj) {
    let m = null;
    for (const v of mapCodeToObj.values()) {
      const d = v?.lastSeen || null;
      if (d && (!m || d > m)) m = d;
    }
    return m;
  }

  /* ---------------------------
     selected project → rows
  -----------------------------*/
  const selected = useMemo(() => {
    if (!leftSelKey) return null;
    const rec = projects.find((p) => p.key === leftSelKey);
    if (!rec) return null;

    const rows = [];
    for (const [code, val] of rec.employees.entries()) {
      const info = empMap.get(code);
      const st = info ? statusNorm(info.raw) : "other";
      if (!includeAllPeople && st !== "active") continue;

      // Name priority: employee list → timecard (LAST, FIRST) → "—"
      const name = info?.name || val.tcName || "—";

      rows.push({
        code,
        name,
        id: info?.id || null,
        status: info ? st : "not in system",
        lastSeen: val?.lastSeen || null,
        department: val?.department || "—",
        activity: val?.activity || "—",
        // Count of unique calendar days worked on this project (using Set of YYYY-MM-DD keys)
        daysOnProject: val?.days && val.days instanceof Set ? val.days.size : 0,
        staffType: val?.staffType || "Unknown",
        vendor: val?.vendor || "—",
      });
    }

    rows.sort(
      (a, b) =>
        (b.lastSeen?.getTime() || 0) - (a.lastSeen?.getTime() || 0) ||
        a.name.localeCompare(b.name)
    );
    return { ...rec, rows };
  }, [leftSelKey, projects, empMap, includeAllPeople]);

  const onReset = () => {
    setSearch("");
    setSectionFilter("ALL");
    setDeptFilter("ALL");
    setStaffFilter("ALL");
    setVendorFilter("ALL");
    setSortMode("ProjectAZ");
  };
  const goHome = () => navigate("/home");

  const exportCSV = () => {
    if (!selected) return;

    const targetKey = String(selected.key || selected.jobCode || "").toUpperCase();
    const empDayMap = new Map(); // `${code}|${day}` -> aggregated row
    const empToDays = new Map(); // code -> Set<YYYY-MM-DD>

    for (const r of timecards) {
      const rKey = String(r.jobCode || "Unknown").toUpperCase();
      if (rKey !== targetKey) continue;

      const codeKey = (r.eeCode || "").toString().trim().toUpperCase();
      if (!codeKey) continue;

      const info = empMap.get(codeKey);
      const st = info ? statusNorm(info.raw) : "other";
      if (!includeAllPeople && st !== "active") continue;

      const name = info?.name || r.tcName || "—";
      const section = r.section || "—";
      const department = r.department || "—";
      const activity = r.activity || "—";
      const staffType = r.staffType || "Unknown";
      const vendor = r.vendor || "—";
      const dKeys =
        r.daysSet && r.daysSet instanceof Set && r.daysSet.size
          ? Array.from(r.daysSet)
          : r.dayKey
          ? [r.dayKey]
          : r.lastSeen
          ? [ymd(r.lastSeen)]
          : [];

      for (const d of dKeys) {
        const key = `${codeKey}|${d}`;
        const existing = empDayMap.get(key) || {
          code: codeKey,
          name,
          day: d,
          department,
          activity,
          section,
          staffType,
          vendor,
          jobCode: selected.jobCode,
          jobDesc: selected.jobDesc,
        };

        if (!existing.department && department) existing.department = department;
        if (!existing.activity && activity) existing.activity = activity;
        if (!existing.section && section) existing.section = section;
        if (!existing.staffType && staffType) existing.staffType = staffType;
        if (!existing.vendor && vendor) existing.vendor = vendor;

        empDayMap.set(key, existing);

        let set = empToDays.get(codeKey);
        if (!set) {
          set = new Set();
          empToDays.set(codeKey, set);
        }
        set.add(d);
      }
    }

    const rows = Array.from(empDayMap.values());

    // Pre-compute cumulative index per employee (by ascending date)
    const cumulIndexMap = new Map(); // code -> Map<day, idx>
    const totals = new Map(); // code -> total unique days
    for (const [code, set] of empToDays) {
      const sorted = Array.from(set).sort();
      const m = new Map();
      sorted.forEach((d, i) => m.set(d, i + 1));
      cumulIndexMap.set(code, m);
      totals.set(code, sorted.length);
    }

    // Sort rows by name, then day
    rows.sort((a, b) => a.name.localeCompare(b.name) || a.day.localeCompare(b.day));

    const headers = [
      "Name",
      "Employee Code",
      "Day",
      "Cumulative Days On Project",
      "Total Days On Project",
      "Department",
      "Activity",
      "Section",
      "Staff Type",
      "Vendor",
      "Job Code",
      "Job Description",
    ];

    const body = rows.map((r) => {
      const cumul = cumulIndexMap.get(r.code)?.get(r.day) ?? "";
      const total = totals.get(r.code) ?? "";
      return [
        csvEsc(r.name),
        csvEsc(r.code),
        csvEsc(r.day),
        String(cumul),
        String(total),
        csvEsc(r.department),
        csvEsc(r.activity),
        csvEsc(r.section),
        csvEsc(r.staffType),
        csvEsc(r.vendor),
        csvEsc(r.jobCode || ""),
        csvEsc(r.jobDesc || ""),
      ];
    });

    const csv = [headers.join(","), ...body.map((a) => a.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safe = (selected.jobCode + " " + selected.jobDesc).replace(/[^a-z0-9-_]+/gi, "_");
    a.download = `${safe}_timecards.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const csvEsc = (v) => {
    const s = (v ?? "").toString();
    return s.includes('"') || s.includes(",") || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  /* ===========================================
     RENDER
  ============================================*/
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Project Reports</h1>

        <div className={styles.topRight}>
          <button
            type="button"
            className={`${styles.pillBtn} ${
              !includeAllPeople ? styles.pillActive : ""
            }`}
            onClick={() => setIncludeAllPeople(false)}
            title="Show Active only"
          >
            Active only
          </button>
          <button
            type="button"
            className={`${styles.pillBtn} ${
              includeAllPeople ? styles.pillActive : ""
            }`}
            onClick={() => setIncludeAllPeople(true)}
            title="Show all (incl. inactive/terminated)"
          >
            All (incl. inactive/terminated)
          </button>
          <button onClick={goHome} className={styles.homeButton}>
            Home
          </button>
        </div>
      </header>

      <main className={styles.layout}>
        {/* LEFT: controls + projects list */}
        <aside className={styles.leftCol}>
          <div className={styles.leftHeader}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
                Group by <strong>Timecards → dist_job_code</strong> (last{" "}
                {windowDays} days)
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <select
                  value={windowDays}
                  onChange={(e) => setWindowDays(Number(e.target.value))}
                >
                  {[7, 14, 30, 60, 90, 180].map((d) => (
                    <option key={d} value={d}>
                      {d} days
                    </option>
                  ))}
                </select>

                <input
                  placeholder="Find job code / description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 210 }}
                />

                <button className={styles.secondaryButton} onClick={onReset}>
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Section (Dist Section Desc)
              </div>
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
              >
                {sectionOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Department (Dist Dept Desc)
              </div>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                {deptOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Staff</div>
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
              >
                {["ALL", "CEC", "Leased", "Unknown"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Vendor</div>
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
              >
                {vendors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Sort</div>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value)}
              >
                <option value="ProjectAZ">Project A → Z</option>
                <option value="CountDesc">Employees (desc)</option>
                <option value="LastSeenDesc">Last seen (desc)</option>
              </select>
            </div>
          </div>

          {/* Projects list */}
          {loading ? (
            <p className={styles.empty}>Loading timecards…</p>
          ) : error ? (
            <p className={styles.error}>{error}</p>
          ) : projects.length === 0 ? (
            <p className={styles.empty}>
              No projects in this window / filters.
            </p>
          ) : (
            <ul className={styles.projectItems}>
              {projects.map((p) => (
                <li
                  key={p.key}
                  className={`${styles.projectItem} ${
                    leftSelKey === p.key ? styles.selectedProject : ""
                  }`}
                >
                  <button
                    className={styles.projectHeader}
                    onClick={() =>
                      setLeftSelKey((prev) => (prev === p.key ? null : p.key))
                    }
                    title="Show employees on this job"
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <span style={{ fontWeight: 800 }}>{p.jobCode}</span>
                      <span style={{ opacity: 0.8 }}>{p.jobDesc}</span>
                      <span style={{ fontSize: 12, opacity: 0.7 }}>
                        {p.deptLabel} • {p.sectionLabel} • {p.staffLabel}
                        {p.vendorLabel ? ` • ${p.vendorLabel}` : ""}
                      </span>
                    </div>
                    <span className={styles.employeeCount}>
                      {p.employeeCount}{" "}
                      {p.employeeCount === 1 ? "Employee" : "Employees"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* RIGHT: selected job panel */}
        <section className={styles.rightCol}>
          {/* Top anchor for snap-to-top */}
          <div ref={rightTopRef} />

          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>
              {selected ? (
                <>
                  <span className={styles.badge}>{selected.employeeCount}</span>
                  <span className={styles.panelProject}>
                    {selected.jobCode} — {selected.jobDesc}
                  </span>
                </>
              ) : (
                <span className={styles.panelProject}>Select a project</span>
              )}
            </div>

            <div className={styles.toolbar}>
              <span style={{ fontSize: 12, opacity: 0.75 }}>
                Last {windowDays} days •{" "}
                {includeAllPeople ? "All" : "Active only"}
              </span>
              <button
                className={styles.secondaryButton}
                onClick={exportCSV}
                disabled={!selected || selected.employeeCount === 0}
                title="Export CSV"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className={styles.panelBody} ref={panelBodyRef}>
            {!selected ? (
              <p className={styles.empty}>
                Select a project to see who clocked on it.
              </p>
            ) : selected.rows.length === 0 ? (
              <p className={styles.empty}>
                No punches matched for this project.
              </p>
            ) : (
              <ul
                key={leftSelKey || "none"}
                className={styles.employeeItems}
                ref={employeeListRef}
              >
                {selected.rows.map((r, idx) => {
                  // Determine the label to show before status chip
                  let typeLabel = "";
                  if (r.staffType === "Leased") {
                    typeLabel = r.vendor && r.vendor !== "—" ? `(${r.vendor})` : "(Leased Labor)";
                  }
                  
                  return (
                  <li key={r.code + "-" + idx} className={styles.employeeItem}>
                    <div className={styles.employeeCard}>
                      <div className={styles.row}>
                        <span className={styles.label}>Name</span>
                        <span className={`${styles.value} ${styles.nameWrap}`}>
                          <span className={styles.nameText}>{r.name}</span>
                          {typeLabel && (
                            <span style={{ 
                              fontSize: '0.85em', 
                              opacity: 0.7, 
                              marginLeft: '0.5em',
                              fontStyle: 'italic'
                            }}>
                              {typeLabel}
                            </span>
                          )}
                          <span
                            className={`${styles.statusChip} ${
                              r.status === "active"
                                ? styles.statusActive
                                : r.status === "inactive"
                                ? styles.statusInactive
                                : r.status === "terminated"
                                ? styles.statusTerminated
                                : styles.statusOther
                            }`}
                            title={`Status: ${r.status}`}
                          >
                            {r.status === "not in system"
                              ? "NOT IN SYSTEM"
                              : r.status.toUpperCase()}
                          </span>
                        </span>
                      </div>

                      <div className={styles.row}>
                        <span className={styles.label}>Employee Code</span>
                        <span className={styles.value}>{r.code}</span>
                      </div>

                      <div className={styles.row}>
                        <span className={styles.label}>Department</span>
                        <span className={styles.value}>{r.department}</span>
                      </div>

                      <div className={styles.row}>
                        <span className={styles.label}>Activity</span>
                        <span className={styles.value}>{r.activity}</span>
                      </div>

                      <div className={styles.row}>
                        <span className={styles.label}>Days on Project</span>
                        <span className={styles.value}>{r.daysOnProject}</span>
                      </div>

                      <div className={styles.row}>
                        <span className={styles.label}>Last Seen</span>
                        <span className={styles.value}>
                          {r.lastSeen ? ymd(r.lastSeen) : "—"}
                        </span>
                      </div>

                      <div className={styles.row}>
                        <span className={styles.label}>Actions</span>
                        <span className={styles.value}>
                          <button
                            className={styles.smallButton}
                            onClick={() => {
                              if (r.id) navigate(`/employee-details/${r.id}`);
                            }}
                            disabled={!r.id}
                            title={
                              r.id
                                ? "View employee details"
                                : "No employee ID found"
                            }
                          >
                            View Details
                          </button>
                        </span>
                      </div>
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.toTopButton}
          onClick={() => {
            try {
              window.scrollTo({ top: 0, behavior: "smooth" });
            } catch {
              window.scrollTo(0, 0);
            }
          }}
          title="Return to the top"
        >
          ↑ Return to top
        </button>
      </footer>
    </div>
  );
}
