// src/pages/LeasedLabor.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsHouse } from "react-icons/bs";
import styles from "../stylesheets/LeasedLabor.module.css";
import api from "../api";
import { toast } from "react-toastify";
import Footer from "../components/Footer";
import {
  CANONICAL,
  VENDOR_ALIASES,
  ADDRESS_VENDOR_HINTS,
  KEY_PATCHES,
  STOP_WORDS,
} from "../utils/vendorConfig";

/** ──────────────────────────────────────────────────────────────────────────
 *  Config
 *  ──────────────────────────────────────────────────────────────────────────
 */
const DETAILS_ROUTE_BASE = "/employee-details";

// Status options (declare ONCE to avoid HMR duplicate identifier errors)
const ALL_STATUSES = Object.freeze([
  "active",
  "inactive",
  "terminated",
  "other",
]);

const EMPLOYEE_ENDPOINTS = [
  { url: "/api/v1/employee/list", params: {} },
  { url: "/api/v1/employee/all", params: {} },
  { url: "/api/v1/employee/getAll", params: {} },
  { url: "/api/v1/employee/get-all", params: {} },
  { url: "/api/v1/employee", params: { page: 0, size: 10000 } },
  { url: "/api/v1/employees", params: { page: 0, size: 10000 } },
];

// Timecards endpoints — REAL data, not predictions
const TIME_BATCH_URL = "/api/v1/timecards/latest-by-emp";
const TIME_SINGLE_URL = (code) =>
  `/api/v1/timecards/latest/${encodeURIComponent(code)}`;
const TIME_BATCH_SIZE = 400;
const TIME_FALLBACK_PROBE = 30; // safety probe if batch maps 0
const EMP_DETAILS_BATCH_URL = "/api/v1/employee/details-by-emp";

const LABEL_DIRECT = "Direct (Not Leased)";
const LABEL_UNKNOWN = "Unknown Vendor";

/** ──────────────────────────────────────────────────────────────────────────
 *  Utils
 *  ──────────────────────────────────────────────────────────────────────────
 */
const nz = (v) => (v == null ? "" : String(v));
const lc = (v) => nz(v).trim().toLowerCase();
const pick = (...vals) => {
  for (const v of vals) {
    const s = nz(v).trim();
    if (s) return s;
  }
  return "";
};
const isTruthy = (v) =>
  typeof v === "boolean"
    ? v
    : typeof v === "number"
    ? v > 0
    : typeof v === "string"
    ? /^(true|yes|y|1)$/i.test(v.trim())
    : false;

const cleanCode = (v) => {
  const s = nz(v).trim();
  return s && !/^n\/a$/i.test(s) ? s : "";
};
const normCode = (v) => cleanCode(v).toUpperCase();

// Case/underscore-insensitive getter
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
  }, {});

  for (const c of candidates) {
    const k = index[norm(c)];
    if (k != null) {
      const v = obj[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
  }
  return null;
}

// Prefer ee_code (CEC ID) but fall back if missing
function rawCode(e) {
  return (
    e?.ee_code ??
    e?.eeCode ??
    e?.employeeCode ??
    e?.emp_code ??
    e?.empCode ??
    e?.Employee_Code ??
    e?.code ??
    ""
  );
}

function addrSig(a1, a2) {
  const s = `${nz(a1)} ${nz(a2)}`.toLowerCase();
  return s
    .replace(/[\.,#\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function vendorKey(s) {
  if (!s) return "";
  let k = String(s).toLowerCase();
  k = k
    .replace(/[.,&\-_/']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [rx, repl] of KEY_PATCHES) k = k.replace(rx, repl);
  return k
    .split(" ")
    .filter((t) => t && !STOP_WORDS.has(t))
    .join(" ");
}

function jaroWinkler(a, b) {
  if (a === b) return 1;
  const s1 = a,
    s2 = b;
  const len1 = s1.length,
    len2 = s2.length;
  if (!len1 || !len2) return 0;
  const matchDistance = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  let matches = 0,
    transpositions = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  const m = matches;
  const jaro = (m / len1 + m / len2 + (m - transpositions / 2) / m) / 3;
  let prefix = 0;
  for (
    ;
    prefix < Math.min(4, len1, len2) && s1[prefix] === s2[prefix];
    prefix++
  );
  return jaro + prefix * 0.1 * (1 - jaro);
}

const CANON_KEYS = CANONICAL.reduce(
  (acc, c) => ((acc[vendorKey(c)] = c), acc),
  {}
);
const DIRECT_VENDOR_RX = [
  /^cec(?:\s+facilities)?(?:\s+group)?$/i,
  /^cec$/i,
  /^c\.?e\.?c\.?$/i,
];

function looksCEC(text) {
  const s = lc(text);
  return !!s && /(^|\b)cec(\b|$)|cec\s*facilities/.test(s);
}
function isDirectHire(e) {
  return (
    DIRECT_VENDOR_RX.some((rx) =>
      rx.test(pick(e?.employer, e?.company, e?.companyName))
    ) ||
    looksCEC(e?.department) ||
    looksCEC(e?.departmentDesc) ||
    looksCEC(e?.department_desc) ||
    looksCEC(e?.payrollProfileDesc) ||
    looksCEC(e?.payroll_profile_desc) ||
    looksCEC(e?.workGroup)
  );
}

function normalizeVendorName(rawName, addr1, addr2) {
  const raw = nz(rawName).trim();
  if (raw) {
    for (const [rx, canon] of VENDOR_ALIASES) if (rx.test(raw)) return canon;
    const k = vendorKey(raw);
    if (CANON_KEYS[k]) return CANON_KEYS[k];
    let best = null,
      bestScore = 0;
    for (const c of CANONICAL) {
      const score = jaroWinkler(k, vendorKey(c));
      if (score > bestScore) {
        best = c;
        bestScore = score;
      }
    }
    if (
      best &&
      (bestScore >= 0.93 ||
        (bestScore >= 0.88 &&
          (vendorKey(best).startsWith(k) || k.startsWith(vendorKey(best)))))
    ) {
      return best;
    }
  }
  const sig = addrSig(addr1, addr2);
  if (sig)
    for (const [frag, canon] of Object.entries(ADDRESS_VENDOR_HINTS))
      if (sig.includes(frag)) return canon;
  return raw || "";
}

function deriveLeaseAndVendor(e) {
  const addr1 = pick(
    e?.vendorAddressLine1,
    e?.vendor_address_line1,
    e?.work_location_address
  );
  const addr2 = pick(e?.vendorAddressLine2, e?.vendor_address_line2);
  const normalizedVendor = normalizeVendorName(
    pick(e?.vendorName, e?.vendor_name),
    addr1,
    addr2
  );
  const explicit =
    e?.leasedLabor ?? e?.leased_labor ?? e?.isLeased ?? e?.leased ?? null;
  const direct =
    isDirectHire(e) ||
    (normalizedVendor &&
      DIRECT_VENDOR_RX.some((rx) => rx.test(normalizedVendor)));
  const leased =
    explicit != null
      ? isTruthy(explicit) && !direct
      : !!normalizedVendor && !direct;
  const contractor = leased ? normalizedVendor || LABEL_UNKNOWN : LABEL_DIRECT;
  return { leased, contractor, normalizedVendor, addr1, addr2, direct };
}

// Details page expects a stable numeric employeeid
function getEmployeeId(e) {
  const id =
    e?.employeeid ?? e?.emp_id ?? e?.id ?? e?.employeeId ?? e?.empId ?? null;
  return id != null && String(id).trim() !== "" ? id : null;
}

function formatUSD(v) {
  const n = Number(v);
  const num = Number.isFinite(n)
    ? n
    : Number.parseFloat(String(v).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(num)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(num);
}
function getPayRate(e) {
  // use normalized merged rate from Employee + timecards
  const raw = e?.__rateFromEmp ?? null;

  if (raw == null || String(raw).trim() === "") return null;

  const amt = formatUSD(raw);
  // Always show as hourly
  return amt ? `${amt}/hr` : String(raw);
}

/** Prefer CEC ID; fallback to XID */
function getCodeThenXid(e) {
  const code = rawCode(e);
  const xid =
    e?.xid ?? e?.XID ?? e?.employeeXid ?? e?.employee_xid ?? e?.XId ?? null;
  const cCode = cleanCode(code);
  if (cCode) return { label: "CEC ID", value: cCode };
  const cXid = cleanCode(xid);
  if (cXid) return { label: "XID", value: cXid };
  return { label: "CEC ID", value: "N/A" };
}

/** Status helpers */
function statusNorm(e) {
  const fromServer = (e?.status_norm ?? e?.statusNorm ?? "")
    .toString()
    .trim()
    .toLowerCase();
  if (fromServer) return fromServer;
  const s = (e?.employeeStatus ?? e?.employee_status ?? "")
    .toString()
    .trim()
    .toLowerCase();
  if (e?.endDate || e?.end_date) return "terminated";
  if (["terminated", "term", "termed", "separated", "fired"].includes(s))
    return "terminated";
  if (["inactive", "on leave", "on_leave", "leave"].includes(s))
    return "inactive";
  if (s === "active") return "active";
  return "other";
}
function statusText(e) {
  const t = e?.employeeStatus ?? e?.employee_status ?? "";
  return t || statusNorm(e);
}
function statusClassFor(e) {
  const s = statusNorm(e);
  return s === "active"
    ? "statusActive"
    : s === "inactive"
    ? "statusInactive"
    : s === "terminated"
    ? "statusTerminated"
    : "statusOther";
}

/** Robust timestamp parse */
function parseTs(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  const s = String(v).trim();
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(s)) {
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }
  const m = s.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (m) {
    const [, Y, M, D, h, mn, ss = "0"] = m;
    return new Date(
      Number(Y),
      Number(M) - 1,
      Number(D),
      Number(h),
      Number(mn),
      Number(ss)
    );
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}
const relTime = (dt) => {
  if (!dt) return "—";
  const ms = Date.now() - dt.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

function extractRows(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const keys = [
      "employees",
      "content",
      "data",
      "items",
      "rows",
      "results",
      "list",
      "employeesList",
      "predictions",
    ];
    for (const k of keys) {
      const v = data[k];
      if (Array.isArray(v)) return v;
    }
    // handle predictions as an object keyed by code
    if (data.predictions && typeof data.predictions === "object") {
      const values = Object.values(data.predictions);
      if (values.length && typeof values[0] === "object") return values;
    }
    // deep sniff
    let best = [];
    const seen = new Set();
    const walk = (o, d = 0) => {
      if (!o || typeof o !== "object" || d > 3 || seen.has(o)) return;
      seen.add(o);
      if (Array.isArray(o)) {
        if (o.length > best.length && typeof o[0] === "object") best = o;
        return;
      }
      for (const v of Object.values(o)) walk(v, d + 1);
    };
    walk(data);
    return best;
  }
  return [];
}

/** Build map from LatestWorkedDTO payload (array OR object map) */
function buildLatestFromLatestDTO(predsOrObj) {
  const out = {};

  const ingest = (p, keyFromObj = null) => {
    const code = normCode(
      pick(
        p?.eeCode,
        p?.ee_code,
        p?.empCode,
        p?.employeeCode,
        p?.employee_code,
        p?.emp_code_norm2,
        p?.emp_code_norm,
        p?.emp_code,
        p?.code,
        keyFromObj
      )
    );
    if (!code) return;

    const project = pick(
      p?.project,
      p?.projectName,
      p?.project_name,
      p?.work_project,
      p?.dist_department_desc,
      p?.home_department_desc,
      p?.dist_job_desc,
      p?.home_job_desc
    );

    const jobNum = pick(p?.jobNumber, p?.job_num, p?.job_code, p?.job);

    const loc = pick(
      p?.workLocation,
      p?.work_location,
      p?.location,
      p?.site,
      p?.dist_job_desc
    );

    const ts = parseTs(
      pick(
        p?.lastWorkDate,
        p?.lastWorkedAt,
        p?.last_worked_at,
        p?.lastDate,
        p?.max_ts,
        p?.updated_at,
        p?.last_work_date
      )
    );

    const supervisorLatest =
      getCI(
        p,
        "supervisorPrimary",
        "supervisor_primary",
        "supervisor",
        "supervisorName"
      ) || null;

    const rateLatest =
      getCI(
        p,
        "rate_1",
        "rate1",
        "hourlyRate",
        "hourly_rate",
        "payRate",
        "pay_rate",
        "wage",
        "wage_hourly",
        "rate"
      ) ?? null;

    out[code] = {
      project: project || "",
      jobNumber: jobNum || "",
      workLoc: loc || "",
      lastWorkedAt: ts || null,
      supervisor: supervisorLatest,
      rate: rateLatest,
    };
  };

  if (Array.isArray(predsOrObj)) {
    for (const p of predsOrObj) ingest(p);
  } else if (predsOrObj && typeof predsOrObj === "object") {
    for (const [k, v] of Object.entries(predsOrObj)) ingest(v, k);
  }
  return out;
}

/** ──────────────────────────────────────────────────────────────────────────
 *  Component
 *  ──────────────────────────────────────────────────────────────────────────
 */
export default function LeasedLabor() {
  const [employees, setEmployees] = useState([]);
  const [attemptsEmp, setAttemptsEmp] = useState([]);
  const [attemptsTime, setAttemptsTime] = useState([]);
  const [sourceUsed, setSourceUsed] = useState("");
  const [timeSourceUsed, setTimeSourceUsed] = useState("");
  const [timeByCode, setTimeByCode] = useState({}); // { CECID -> {project,jobNumber,workLoc,lastWorkedAt,supervisor,rate} }
  const [empDetailsByCode, setEmpDetailsByCode] = useState({});
  const [openKeys, setOpenKeys] = useState(() => new Set());
  const [query, setQuery] = useState("");
  const [view, setView] = useState("leased"); // leased | direct | all
  const [statusFilter, setStatusFilter] = useState(() => new Set(["active"])); // default Only Active

  const [addrDiagOpen, setAddrDiagOpen] = useState(false);
  const navigate = useNavigate();

  /** Load employees from first working endpoint */
  useEffect(() => {
    (async () => {
      const logs = [];
      let loaded = false;
      for (const c of EMPLOYEE_ENDPOINTS) {
        try {
          const { data, status } = await api.get(c.url, {
            params: c.params,
            withCredentials: true,
          });
          const rows = extractRows(data);
          logs.push({
            url: c.url + (Object.keys(c.params).length ? " (paged)" : ""),
            status,
            count: rows.length ?? 0,
            keys:
              data && typeof data === "object"
                ? Object.keys(data).slice(0, 8).join(", ")
                : Array.isArray(data)
                ? "[array]"
                : typeof data,
          });
          if (rows.length > 0) {
            setEmployees(rows);
            setSourceUsed(logs[logs.length - 1].url);
            loaded = true;
            break;
          }
        } catch (err) {
          logs.push({
            url: c.url + (Object.keys(c.params).length ? " (paged)" : ""),
            status: err?.response?.status ?? "ERR",
            count: 0,
            keys: "-",
          });
        }
      }
      setAttemptsEmp(logs);
      if (!loaded)
        toast.warn(
          "No employees returned by any endpoint. See diagnostics for details."
        );
    })();
  }, []);

  /** Batch-hit /api/v1/timecards/latest-by-emp using CEC IDs from employees */
  useEffect(() => {
    (async () => {
      if (!employees.length) return;

      const codes = Array.from(
        new Set(employees.map((e) => normCode(rawCode(e))).filter(Boolean))
      );
      if (!codes.length) {
        setAttemptsTime([
          {
            url: TIME_BATCH_URL,
            status: "SKIP",
            kind: "batch",
            count: 0,
            note: "no CEC IDs (ee_code)",
          },
        ]);
        return;
      }

      const logs = [];
      const accum = {};

      const firstKeys = (arrOrObj) => {
        try {
          if (Array.isArray(arrOrObj))
            return Object.keys(arrOrObj[0] || {})
              .slice(0, 10)
              .join(", ");
          if (arrOrObj && typeof arrOrObj === "object")
            return Object.keys(arrOrObj).slice(0, 10).join(", ");
        } catch {}
        return "";
      };

      try {
        for (let i = 0; i < codes.length; i += TIME_BATCH_SIZE) {
          const chunk = codes.slice(i, i + TIME_BATCH_SIZE);
          const { data, status } = await api.post(
            TIME_BATCH_URL,
            { empCodes: chunk },
            {
              withCredentials: true,
              headers: { "Content-Type": "application/json" },
            }
          );

          const raw = data?.predictions ?? data ?? {};
          const predsArray = extractRows({ predictions: raw }) || [];
          const map = Array.isArray(raw)
            ? buildLatestFromLatestDTO(predsArray)
            : buildLatestFromLatestDTO(raw);

          Object.assign(accum, map);

          logs.push({
            url: TIME_BATCH_URL,
            status,
            kind: "batch",
            count: Object.keys(map).length,
            respCount: Array.isArray(raw)
              ? raw.length
              : Object.keys(raw || {}).length,
            predKeys: Array.isArray(raw) ? firstKeys(raw) : firstKeys(raw),
          });
        }

        if (Object.keys(accum).length === 0) {
          const probe = codes.slice(0, TIME_FALLBACK_PROBE);
          let probeMapped = 0;
          for (const c of probe) {
            try {
              const { data, status } = await api.get(TIME_SINGLE_URL(c), {
                withCredentials: true,
              });
              const raw = data ?? {};
              const map = buildLatestFromLatestDTO(
                Array.isArray(raw) ? raw : [raw]
              );
              Object.assign(accum, map);
              probeMapped += Object.keys(map).length;
              logs.push({
                url: TIME_SINGLE_URL(c),
                status,
                kind: "probe",
                count: Object.keys(map).length,
                predKeys: Object.keys(raw || {})
                  .slice(0, 10)
                  .join(", "),
              });
            } catch (e) {
              logs.push({
                url: TIME_SINGLE_URL(c),
                status: e?.response?.status ?? "ERR",
                kind: "probe",
                count: 0,
              });
            }
          }
          if (probeMapped === 0) {
            toast.info(
              "Timecard batch returned 0 mapped; verify LatestWorkedDTO field names in /latest endpoints (see Diagnostics)."
            );
          }
        }

        setTimeByCode(accum);
        setTimeSourceUsed(
          `${TIME_BATCH_URL} (${Object.keys(accum).length} mapped)`
        );
      } catch (err) {
        logs.push({
          url: TIME_BATCH_URL,
          status: err?.response?.status ?? "ERR",
          kind: "batch",
          count: 0,
        });
      }

      setAttemptsTime(logs);
    })();
  }, [employees]);

  // Batch-hit EmployeeDTO by employee_code so we can show Supervisor + Rate
  useEffect(() => {
    (async () => {
      if (!employees.length) return;

      const codes = Array.from(
        new Set(employees.map((e) => normCode(rawCode(e))).filter(Boolean))
      );
      if (!codes.length) return;

      try {
        const { data } = await api.post(
          EMP_DETAILS_BATCH_URL,
          { empCodes: codes },
          {
            withCredentials: true,
            headers: { "Content-Type": "application/json" },
          }
        );

        // Support new wrapper response { results: {...}, unmatchedRequested: [...] }
        const results = data && data.results ? data.results : data || {};
        const unmatched = data && Array.isArray(data.unmatchedRequested) ? data.unmatchedRequested : [];

        if (process.env.NODE_ENV !== "production") {
          console.log("[LeasedLabor] emp details response (results):", results);
          if (unmatched && unmatched.length) {
            console.log("[LeasedLabor] emp details unmatchedRequested:", unmatched.slice(0, 20));
          }
        }

        const map = {};
        Object.entries(results || {}).forEach(([rawCode, dto]) => {
          const code = normCode(rawCode);
          if (!code) return;
          map[code] = dto;
        });

        setEmpDetailsByCode(map);
      } catch (err) {
        console.error("Failed to load EmployeeDTOs for leased labor", err);
        toast.error("Failed to load pay/supervisor details for leased labor.");
      }
    })();
  }, [employees]);

  /** Enrich employees with vendor + timecard-derived project/info + supervisor/rate */
  const enriched = useMemo(
    () =>
      employees.map((e) => {
        const d = deriveLeaseAndVendor(e);
        const code = normCode(rawCode(e));
        const time = code ? timeByCode[code] : null;
        const details = code ? empDetailsByCode[code] : null;

        // Prefer EmployeeDTO for supervisor / rate, fall back to LatestWorkedDTO
        const supervisorFromEmp =
          getCI(
            details || e,
            "supervisorPrimary",
            "supervisor_primary",
            "supervisor",
            "supervisorName"
          ) || null;

        const rateFromEmp =
          getCI(
            details || e,
            "rate_1",
            "rate1",
            "hourlyRate",
            "hourly_rate",
            "payRate",
            "pay_rate",
            "wage",
            "wage_hourly"
          ) ?? null;

        const supervisorFromTime =
          (time && time.supervisor) ||
          getCI(
            time || {},
            "supervisorPrimary",
            "supervisor_primary",
            "supervisor",
            "supervisorName"
          ) ||
          null;

        const rateFromTime =
          (time && time.rate) ||
          getCI(
            time || {},
            "rate_1",
            "rate1",
            "hourlyRate",
            "hourly_rate",
            "payRate",
            "pay_rate",
            "wage",
            "wage_hourly"
          ) ||
          null;

        const supervisorFinal = supervisorFromEmp || supervisorFromTime || "—";

        const rateFinal =
          rateFromEmp != null && String(rateFromEmp).trim() !== ""
            ? rateFromEmp
            : rateFromTime;

        return {
          ...e,
          __leased: d.leased,
          __contractor: d.contractor,
          __vendorName: d.normalizedVendor,
          __vendorAddressLine1: pick(
            e?.vendorAddressLine1,
            e?.vendor_address_line1
          ),
          __vendorAddressLine2: pick(
            e?.vendorAddressLine2,
            e?.vendor_address_line2
          ),

          // from timecards (LatestWorkedDTO) – for project / last worked
          __projectFromTime: time?.project || "",
          __jobFromTime: time?.jobNumber || "",
          __workLocFromTime: time?.workLoc || "",
          __lastWorkedAt: time?.lastWorkedAt || null,

          // final supervisor + rate
          __supervisorFromEmp: supervisorFinal,
          __rateFromEmp: rateFinal,
        };
      }),
    [employees, timeByCode, empDetailsByCode]
  );

  const totals = useMemo(() => {
    let leased = 0,
      direct = 0;
    for (const e of enriched) e?.__leased ? leased++ : direct++;
    return { leased, direct, all: enriched.length };
  }, [enriched]);

  const filteredByView = useMemo(() => {
    if (view === "leased") return enriched.filter((e) => e.__leased);
    if (view === "direct") return enriched.filter((e) => !e.__leased);
    return enriched;
  }, [enriched, view]);

  const filteredByStatus = useMemo(
    () => filteredByView.filter((e) => statusFilter.has(statusNorm(e))),
    [filteredByView, statusFilter]
  );

  const searchFilter = (e) => {
    const q = lc(query);
    if (!q) return true;
    const fields = [
      e.employeename,
      e.firstName,
      e.lastName,
      e.ee_code,
      e.eeCode,
      e.employeeCode,
      e.emp_code,
      e.code,
      e.xid,
      e.XID,
      e.workGroup,
      e.project,
      e.__projectFromTime,
      e.__workLocFromTime,
      e.jobNumber,
      e.__jobFromTime,
      e.supervisor,
      e.supervisorPrimary,
      e.supervisor_primary,
      e.__contractor,
      e.__vendorName,
      e.__vendorAddressLine1,
      e.__vendorAddressLine2,
      e.workLocation,
      e.departmentDesc,
      e.department_desc,
      e.home_department_desc,
      e.dist_department_desc,
      e.home_job_desc,
      e.dist_job_desc,
    ];
    return fields.some((f) => lc(f).includes(q));
  };

  const groups = useMemo(() => {
    const map = new Map();
    for (const e of filteredByStatus) {
      if (!searchFilter(e)) continue;
      const key = e.__contractor || LABEL_DIRECT;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    const sorted = [...map.entries()].sort((a, b) => {
      const aDirect = a[0] === LABEL_DIRECT,
        bDirect = b[0] === LABEL_DIRECT;
      if (aDirect && !bDirect) return 1;
      if (!aDirect && bDirect) return -1;
      return a[0].localeCompare(b[0]);
    });
    return sorted;
  }, [filteredByStatus, query]);

  const topUnknownAddr = useMemo(() => {
    const counts = new Map();
    for (const e of enriched) {
      if (e.__leased && (e.__contractor === LABEL_UNKNOWN || !e.__vendorName)) {
        const sig = addrSig(e.__vendorAddressLine1, e.__vendorAddressLine2);
        if (sig) counts.set(sig, (counts.get(sig) || 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [enriched]);

  const toggle = (key) => {
    const next = new Set(openKeys);
    next.has(key) ? next.delete(key) : next.add(key);
    setOpenKeys(next);
  };
  const expandAll = () => setOpenKeys(new Set(groups.map(([k]) => k)));
  const collapseAll = () => setOpenKeys(new Set());
  const goHome = () => {
    try {
      navigate("/home");
    } catch {
      navigate("/");
    }
  };

  const openDetails = (e) => {
    const id = getEmployeeId(e);
    if (!id) {
      toast.info("No employeeid on this row — can’t open details.");
      return;
    }
    navigate(`${DETAILS_ROUTE_BASE}/${encodeURIComponent(id)}`);
  };

  const setOnlyActive = () => setStatusFilter(new Set(["active"]));
  const setAllStatuses = () => setStatusFilter(new Set(ALL_STATUSES));
  const toggleStatus = (s) =>
    setStatusFilter((prev) => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      if (n.size === 0) n.add("active");
      return n;
    });
  const label = (s) =>
    s === "active"
      ? "Active"
      : s === "inactive"
      ? "Inactive"
      : s === "terminated"
      ? "Terminated"
      : "Other";

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button
          className={styles.btnHome}
          onClick={goHome}
          aria-label="Go to Home"
          title="Go to Home"
        >
          <BsHouse className={styles.homeIcon} aria-hidden />
          <span className={styles.homeText}>Home</span>
        </button>

        <h1 className={styles.title}>Leased Labor</h1>

        <div className={styles.row}>
          <div className={styles.badges}>
            <span className={styles.badge}>Total: {totals.all}</span>
            <span className={styles.badgeOk}>Leased: {totals.leased}</span>
            <span className={styles.badgeMuted}>Direct: {totals.direct}</span>
          </div>

          <div
            className={styles.viewTabs}
            role="tablist"
            aria-label="View filter"
          >
            <button
              role="tab"
              aria-selected={view === "all"}
              className={`${styles.tab} ${
                view === "all" ? styles.tabActive : ""
              }`}
              onClick={() => setView("all")}
            >
              All
            </button>
            <button
              role="tab"
              aria-selected={view === "leased"}
              className={`${styles.tab} ${
                view === "leased" ? styles.tabActive : ""
              }`}
              onClick={() => setView("leased")}
            >
              Leased
            </button>
            <button
              role="tab"
              aria-selected={view === "direct"}
              className={`${styles.tab} ${
                view === "direct" ? styles.tabActive : ""
              }`}
              onClick={() => setView("direct")}
            >
              Direct
            </button>
          </div>
        </div>

        <div className={styles.toolbar} style={{ flexWrap: "wrap" }}>
          <input
            className={styles.search}
            placeholder="Search name, CEC ID, group, project, vendor, address…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className={styles.spacer} />

          {/* Status filter */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span className={styles.key}>Status:</span>
            {ALL_STATUSES.map((s) => (
              <label
                key={s}
                style={{
                  display: "inline-flex",
                  gap: 6,
                  alignItems: "center",
                  fontSize: ".9rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={statusFilter.has(s)}
                  onChange={() => toggleStatus(s)}
                />
                {label(s)}
              </label>
            ))}
            <button
              className={styles.btnGhost}
              onClick={setOnlyActive}
              title="Show only Active"
            >
              Only Active
            </button>
            <button
              className={styles.btnGhost}
              onClick={setAllStatuses}
              title="Show all statuses"
            >
              All
            </button>
          </div>

          <div className={styles.spacer} />
          <button className={styles.btnGhost} onClick={expandAll}>
            Expand all
          </button>
          <button className={styles.btnGhost} onClick={collapseAll}>
            Collapse all
          </button>
        </div>

        <div className={styles.hint}>
          Grouping by <code>vendorName</code> (normalized). Primary flag:
          <code> leasedLabor / leased_labor / isLeased / leased</code> → else
          vendor presence.
          <span style={{ marginLeft: 12, opacity: 0.7 }}>
            employees: <code>{sourceUsed || "(no data)"}</code>
            {timeSourceUsed ? (
              <>
                {" "}
                · timecards: <code>{timeSourceUsed}</code>
              </>
            ) : null}
            {Object.keys(empDetailsByCode).length > 0 ? (
              <>
                {" "}
                · details:{" "}
                <code>
                  {EMP_DETAILS_BATCH_URL} (
                  {Object.keys(empDetailsByCode).length} mapped)
                </code>
              </>
            ) : null}
          </span>
        </div>
      </header>

      <main className={styles.main}>
        {groups.length === 0 ? (
          <div className={styles.empty}>No employees match your filters.</div>
        ) : (
          groups.map(([contractor, list]) => {
            const isOpen = openKeys.has(contractor);
            return (
              <section key={contractor} className={styles.group}>
                <button
                  className={styles.groupHeader}
                  onClick={() => toggle(contractor)}
                  aria-expanded={isOpen}
                >
                  <span className={styles.groupTitle}>{contractor}</span>
                  <span className={styles.countChip}>{list.length}</span>
                  <span className={styles.chevron} aria-hidden>
                    {isOpen ? "▾" : "▸"}
                  </span>
                </button>

                {isOpen && (
                  <ul className={styles.employeeList}>
                    {list
                      .slice()
                      .sort((a, b) =>
                        String(a.employeename || "").localeCompare(
                          String(b.employeename || "")
                        )
                      )
                      .map((e) => {
                        const idPref = getCodeThenXid(e);
                        const addr = pick(
                          e.__vendorAddressLine1,
                          e.vendorAddressLine1
                        );
                        const rate = getPayRate(e);
                        const supervisorPrimary =
                          e.__supervisorFromEmp ??
                          e.supervisorPrimary ??
                          e.supervisor ??
                          e.supervisorSecondary ??
                          "—";
                        const sClass = statusClassFor(e);
                        const sText = statusText(e);

                        const proj = e.__projectFromTime || e.project || "—";
                        const jobN = e.__jobFromTime || e.jobNumber || "";
                        const wLoc =
                          e.__workLocFromTime || e.workLocation || "";
                        const ts = e.__lastWorkedAt;
                        const projLine = jobN ? `${proj} (${jobN})` : proj;

                        return (
                          <li
                            key={
                              e.employeeid ||
                              `${e.firstName}-${e.lastName}-${rawCode(e)}`
                            }
                            className={styles.employeeItem}
                          >
                            <div className={styles.empLeft}>
                              <div className={styles.empName}>
                                {e.employeename ||
                                  `${e.firstName || ""} ${
                                    e.lastName || ""
                                  }`.trim()}
                              </div>
                              <div className={styles.empSub}>
                                {idPref.label}: {idPref.value}
                              </div>

                              {/* Status chip */}
                              <div className={styles.chipsRow}>
                                <span
                                  className={`${styles.statusChip || ""} ${
                                    styles[sClass] || ""
                                  }`}
                                  title={sText}
                                >
                                  {sText}
                                </span>
                              </div>

                              {e.__leased && (
                                <div className={styles.empSubMuted}>
                                  Vendor: {e.__vendorName || LABEL_UNKNOWN}
                                  {addr ? ` • ${addr}` : ""}
                                </div>
                              )}
                            </div>

                            <div className={styles.empRight}>
                              <div className={styles.kv}>
                                <span className={styles.key}>Group</span>
                                <span className={styles.val}>
                                  {e.workGroup || "—"}
                                </span>
                              </div>

                              <div className={styles.kv}>
                                <span className={styles.key}>Project</span>
                                <span className={styles.val}>
                                  {projLine}
                                  {e.__projectFromTime && (
                                    <span
                                      style={{
                                        marginLeft: 8,
                                        fontSize: "0.75rem",
                                        opacity: 0.8,
                                      }}
                                    >
                                      (from timecards)
                                    </span>
                                  )}
                                </span>
                              </div>

                              <div className={styles.kv}>
                                <span className={styles.key}>
                                  Work Location
                                </span>
                                <span className={styles.val}>
                                  {wLoc || "—"}
                                </span>
                              </div>

                              <div className={styles.kv}>
                                <span className={styles.key}>Last Worked</span>
                                <span className={styles.val}>
                                  {ts ? `${relTime(ts)}` : "—"}
                                </span>
                              </div>

                              <div className={styles.kv}>
                                <span className={styles.key}>Supervisor</span>
                                <span className={styles.val}>
                                  {supervisorPrimary}
                                </span>
                              </div>

                              <div className={styles.kv}>
                                <span className={styles.key}>Rate</span>
                                <span className={styles.val}>
                                  {rate || "—"}
                                </span>
                              </div>

                              <div className={styles.actions}>
                                <button
                                  type="button"
                                  className={styles.linkBtn}
                                  onClick={() => openDetails(e)}
                                  title="Open employee details"
                                >
                                  View details →
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </section>
            );
          })
        )}
      </main>

      <Footer rightSlot={<span>Leased Labor View</span>} />
    </div>
  );
}
