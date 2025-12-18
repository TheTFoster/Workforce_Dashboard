// front-end/src/components/Home.jsx
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useNavigate,
  useSearchParams,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import api from "../api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { List as FixedSizeList } from "react-window";
import styles from "../stylesheets/Home.module.css";
import dbIcon from "../assets/database.svg";
import Footer from "./Footer";
import footerStyles from "../stylesheets/Footer.module.css";
import NotificationBell from "./NotificationBell";
import AlertsDrawer from "./AlertsDrawer";
import { useAlerts } from "../context/AlertsContext";
import { CgAirplane } from "react-icons/cg";
import { FaCarSide, FaArrowUp, FaHouseUser } from "react-icons/fa6";
import { LuNotepadText } from "react-icons/lu";
import MultiSelect from "./MultiSelect";

// Import vendor configuration from shared utility
import {
  CANONICAL,
  VENDOR_ALIASES,
  STOP_WORDS,
  KEY_PATCHES,
} from "../utils/vendorConfig.js";

// --- constants for batch endpoints ---
const PREVIEW_URL = "/api/v1/batch-sync/preview";
const APPLY_URL = "/api/v1/batch-sync/apply";
const UPLOAD_URL = "/api/v1/field-import/upload";
const ITEM_HEIGHT = 120;
const GUTTER = 16;

// read CSRF cookie Spring sets
const getXsrfToken = () =>
  document.cookie
    .split("; ")
    .find((c) => c.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];

// Mint the XSRF cookie if it's missing (best-effort, silent)
async function ensureXsrf() {
  if (getXsrfToken()) return true;
  try {
    await api.get("/csrf-token", { withCredentials: true });
  } catch {}
  return !!getXsrfToken();
}

// POST with XSRF header + credentials
async function postWithXsrf(url, body = {}, extraHeaders = {}) {
  await ensureXsrf(); // make sure cookie exists before we POST
  const xsrf = getXsrfToken();
  const headers = {
    ...(xsrf ? { "X-XSRF-TOKEN": decodeURIComponent(xsrf) } : {}),
    ...extraHeaders,
  };
  const res = await api.post(url, body, { withCredentials: true, headers });
  return res?.data;
}

/* =========================
   Rank sort helpers
   ========================= */
const parseRank = (label) => {
  const s = (label || "").trim().toUpperCase();
  const norm = s;

  const mMonthsOnly = s.match(/^(\d+)\s*MONTHS?$/);
  if (mMonthsOnly)
    return { base: "", weight: parseInt(mMonthsOnly[1], 10) / 12, norm };

  const mHalfOnly = s.match(/^(\d+)\s*1\/2\s*YR(?:S)?$/);
  if (mHalfOnly)
    return { base: "", weight: parseInt(mHalfOnly[1], 10) + 0.5, norm };

  const mYearsOnly = s.match(/^(\d+)\s*YR(?:S)?$/);
  if (mYearsOnly)
    return { base: "", weight: parseInt(mYearsOnly[1], 10), norm };

  if (s.includes("-")) {
    const [left, ...rest] = s.split("-");
    const base = left.trim();
    const after = rest.join("-").trim();

    let weight = Number.POSITIVE_INFINITY;
    const mHalf = after.match(/^(\d+)\s*1\/2\s*YR(?:S)?\b/);
    const mYears = after.match(/^(\d+)\s*YR(?:S)?\b/);
    const mMonths = after.match(/^(\d+)\s*MONTHS?\b/);

    if (mHalf) weight = parseInt(mHalf[1], 10) + 0.5;
    else if (mYears) weight = parseInt(mYears[1], 10);
    else if (mMonths) weight = parseInt(mMonths[1], 10) / 12;

    return { base, weight, norm };
  }

  return { base: s, weight: Number.POSITIVE_INFINITY, norm };
};

const truthy = (...vals) => {
  for (const v of vals)
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  return null;
};
const normKey = (s) => (s ? String(s).trim().toUpperCase() : "UNKNOWN");

// Derive the single project key we use for grouping/filtering on Home
function projectKeyForEmployee(e, assignMap) {
  const code = (e?.emp_code || e?.employeeCode || e?.code || e?.cec_id || "")
    .toString()
    .trim()
    .toUpperCase();
  const overlay = code ? assignMap.get(code) : null;

  const cleanedOverlayProject = prettifyProject(overlay?.project);
  const cleanedDbProject = prettifyProject(e?.project);

  const key = truthy(
    overlay?.jobNumber,
    cleanedOverlayProject,
    e?.home_allocation, 
    e?.allocation_code,
    cleanedDbProject
  );

  return normKey(key);
}

/* =========================
   Travel helpers (tolerant)
========================= */
const TRAVEL_LABEL = {
  0: "—",
  1: "Willing to Travel",
  2: "Willing to Travel Within State",
  3: "Prefers to Stay Local",
};

const Row = memo(function Row({ index, style, data }) {
  const { employees, selectedId, onSelect, navigate } = data || {};
  const employee = employees?.[index];
  if (!employee) return <div style={style} />;

  const isSelected = selectedId === employee.employeeid;
  const phone = employee._phone;
  const travelPref = employee._travelPref;
  const travelNotes = employee._travelNotes;
  const groupProject = employee._groupProject;
  const last = employee._lastSeen;
  const leaseInfo = getLeaseInfo(employee);
  const isLeased = leaseInfo.leased;
  const vendorName = leaseInfo.leased && leaseInfo.normalizedVendor ? leaseInfo.normalizedVendor : null;
  const title = last
    ? `Last seen ${formatRelative(last)} (${formatAbsolute(last)})`
    : undefined;

  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(
    (e) => {
      e.stopPropagation();
      navigator.clipboard
        .writeText(phone.text)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
        .catch(() => {});
    },
    [phone]
  );

  return (
    <div style={style}>
      <div className={styles.rowWrapper}>
        <div className={`${styles.rowInner} ${styles.rowFixedHeight}`}>
          <div
            className={`${styles.employeeItem} ${isSelected ? styles.selected : ''}`}
            onClick={() => onSelect(employee)}
          >
            {/* LEFT: info */}
            <div className={styles.employeeInfo}>
              <p className={styles.employeeName} title={getDisplayNameLF(employee)}>
                {getDisplayNameLF(employee)}
                <span className={styles.nameSeparator}>- </span>
                <span
                  className={
                    isLeased ? styles.badgeLeased : styles.badgeCec
                  }
                >
                  {isLeased ? 'Leased Labor' : 'CEC'}
                </span>
                {isLeased && vendorName && (
                  <span className={styles.vendorTag}>
                    ({vendorName})
                  </span>
                )}
              </p>

              <p className={styles.employeeGroup} title={title}>
                {groupProject}
                {last && (
                  <>
                    <span className={styles.groupMeta}>- Date Last Worked: {ymd(last)}</span>
                    <span className={styles.seenMeta}>• seen {formatRelative(last)}</span>
                  </>
                )}
              </p>

              <p className={styles.employeeRank}>
                {employee.ranked || 'Rank not available'}
                <span className={styles.payRateMeta}>
                  - Pay Rate:{' '}
                  {(() => {
                    const possibleFields = [
                      'rate_1',
                      'rate1',
                      'rate',
                      'payRate',
                      'wage',
                      'hourlyRate',
                      'hourly_rate',
                      'baseRate',
                      'base_rate',
                      'salary',
                      'employeeRate',
                      'employee_rate',
                    ];
                    for (const field of possibleFields) {
                      const val = employee[field];
                      if (val !== undefined && val !== null && val !== '') {
                        const numVal = Number(val);
                        if (!isNaN(numVal)) {
                          return new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                          }).format(numVal);
                        }
                        return val;
                      }
                    }
                    return 'N/A';
                  })()}
                  {'  '} - Pay Type:{' '}
                  {employee.pay_type || employee.payType || employee.paytype || 'N/A'}
                </span>
              </p>
              <p className={styles.employeePhoneNumber}>
                {phone.href ? (
                  <a
                    href={phone.href}
                    onClick={(e) => e.stopPropagation()}
                    title={`Call ${getDisplayNameLF(employee)}`}
                  >
                    {phone.text}
                  </a>
                ) : (
                  phone.text
                )}
                {phone.text && phone.text !== 'No Number Entered.' && (
                  <button
                    type='button'
                    className={
                      copied
                        ? `${styles.copyPhoneBtn} ${styles.copied}`
                        : styles.copyPhoneBtn
                    }
                    onClick={handleCopy}
                    title={copied ? 'Copied!' : 'Copy phone'}
                    aria-label='Copy phone'
                  >
                    {copied ? 'Copied' : <LuNotepadText size={16} />}
                  </button>
                )}
              </p>
            </div>

            {/* RIGHT: icons + Details button */}
            <div className={styles.rightControls} onClick={(e) => e.stopPropagation()}>
              <div
                className={styles.travelIcons}
                title={`${TRAVEL_LABEL[travelPref] || '-'}${
                  travelNotes ? ` • ${travelNotes}` : ''
                }`}
              >
                {travelPref === 1 && (
                  <span
                    className={`${styles.travelIcon} ${styles.airIcon}`}
                    aria-label={TRAVEL_LABEL[1]}
                  >
                    <CgAirplane size={30} aria-hidden='true' focusable='false' />
                  </span>
                )}

                {travelPref === 2 && (
                  <span
                    className={`${styles.travelIcon} ${styles.carIcon}`}
                    aria-label={TRAVEL_LABEL[2]}
                  >
                    <FaCarSide size={24} aria-hidden='true' focusable='false' />
                  </span>
                )}

                {travelPref === 3 && (
                  <span
                    className={`${styles.travelIcon} ${styles.houseIcon}`}
                    aria-label={TRAVEL_LABEL[3]}
                  >
                    <FaHouseUser size={24} aria-hidden='true' focusable='false' />
                  </span>
                )}

                {!!travelNotes && (
                  <span
                    className={`${styles.travelIcon} ${styles.noteIcon}`}
                    aria-label='Travel notes'
                    tabIndex={0}
                  >
                    <NoteIcon />
                  </span>
                )}

                {travelPref === 0 && !travelNotes && (
                  <span className={styles.travelProbe} aria-hidden='true'>
                    Enter Travel Preference
                  </span>
                )}
              </div>

              <button
                type='button'
                className={styles.detailsButton}
                onClick={() =>
                  navigate(`/employee-details/${employee.employeeid}`, {
                    state: { employee },
                  })
                }
              >
                Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

function coerceBool(v) {
  if (v === true) return true;
  if (v === false) return false;
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return ["1", "y", "yes", "true", "t"].includes(s);
}

const getTravelPref = (e) => {
  // accept a bunch of possible keys
  const raw =
    e?.travelPref ??
    e?.travel_pref ??
    e?.travelPreference ??
    e?.travel_preference ??
    e?.travel ??
    e?.willingToTravel ??
    e?.willing_to_travel ??
    e?.prefersLocal ??
    e?.prefers_local ??
    e?.localOnly;

  const prefersLocal =
    coerceBool(e?.prefersLocal) ||
    coerceBool(e?.prefers_local) ||
    coerceBool(e?.localOnly);

  if (prefersLocal) return 3;

  const n = Number(raw);
  if (Number.isFinite(n) && (n === 1 || n === 2 || n === 3)) return n;

  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    if (/(local|stay\s*local|no\s*travel|local-only)/.test(s)) return 3;
    if (/(within\s*state|state\s*only)/.test(s)) return 2;
    if (/(willing|travel|yes|y|true)/.test(s)) return 1;
  }

  if (raw === true) return 1;
  return 0;
};

const getTravelNotes = (e) =>
  String(
    e?.travelNotes ??
      e?.travel_notes ??
      e?.travelNote ??
      e?.notesTravel ??
      e?.notes_travel ??
      ""
  ).trim();

/* =========================
   Tiny inline icons (SVG)
========================= */
const NoteIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M6 3h9l3 3v13a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2zm8 1.5V7h2.5L14 4.5zM8 9h8v1.5H8V9zm0 3h8v1.5H8V12zm0 3h5v1.5H8V15z"
    />
  </svg>
);

function indexCurrentAssignments(resp) {
  // Accept { items: [...] } or raw array
  const arr = Array.isArray(resp) ? resp : resp?.items || [];
  return indexAssignments(arr); // reuses your existing builder
}

function collectEmpCodes(list) {
  return (Array.isArray(list) ? list : [])
    .map((e) =>
      String(getCecId(e) || "")
        .trim()
        .toUpperCase()
    )
    .filter(Boolean);
}

/* ============================================================
   PROJECT/JOB MAPPING — single source of truth for both feeds
   ============================================================ */

// --- Project/Group prettifiers + scope composer ---
function prettifyWorkGroup(raw) {
  if (!raw) return "";
  // drop company tails like " - CEC FACILITIES LLC ..."
  return String(raw)
    .replace(/\s*-\s*CEC\s+FACILITIES.*$/i, "")
    .trim();
}

function prettifyProject(raw) {
  if (!raw) return "";
  let t = String(raw).trim();

  // remove common noisy prefixes
  t = t.replace(/^electrical[-:\s]*/i, "");
  t = t.replace(/^cec\s+facilities\s+llc[-:\s]*/i, "");
  t = t.replace(/^electrical\s*-\s*cec\s+facilities\s+llc[-:\s]*/i, "");

  // if a job number appears at the start, strip it and keep the name
  // e.g. "23-25025 Galaxy Helios Light Speed - Labor - Unassigned"
  t = t.replace(/^[A-Z]*\d{2}-\d{2,6}\s*/i, "");

  // trim noisy trailing categories
  t = t.replace(
    /\b(-\s*)?(labor|support|raceways|unassigned|service|mechanical(\s*team)?)\b.*$/i,
    ""
  );

  // flatten hyphens & excess spaces
  t = t
    .replace(/\s*-\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return t;
}

function composeScope(assign, fallback) {
  const wg = prettifyWorkGroup(assign?.workGroup || fallback?.workGroup || "");
  const job = (assign?.jobNumber || fallback?.jobNumber || "").trim();
  const proj = prettifyProject(assign?.project || fallback?.project || "");

  // Prefer "WorkGroup – JobNumber ProjectName" (JobNumber optional)
  const right = [job, proj].filter(Boolean).join(" ");
  return [wg, right].filter(Boolean).join(" – ");
}

// Build Map<empCode, assignment> for /current-assignments* payloads
function indexAssignments(payload) {
  const arr = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
    ? payload.items
    : [];

  const by = new Map();
  for (const row of arr) {
    // Some APIs put the code on the row and the data under row.assignment
    const code =
      getEmpCodeFromRow(row) || getEmpCodeFromRow(row.assignment || {});
    if (!code) continue;

    const src = row.assignment || row; // normalize shape
    by.set(code, buildAssignmentFromRow(src));
  }
  return by;
}

// Robust server datetime parser
function parseServerDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  const s = String(v).trim();
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(s)) return new Date(s);
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

const getEmpCodeFromRow = (r) =>
  String(
    r.employeeCode ??
      r.empCode ??
      r.emp_code ??
      r.ee_code ??
      r.empid ??
      r.emp_id ??
      ""
  )
    .trim()
    .toUpperCase();

const buildAssignmentFromRow = (r) => {
  const pickTime = (x) => {
    const candidates = [
      x.lastSeenAt,
      x.last_seen_at,
      x.lastSeen,
      x.last_seen,
      x.max_out_punch_time,
      x.maxOutPunchTime,
      x.last_out_punch_time,
      x.lastOutPunchTime,
      x.out_punch_time,
      x.in_punch_time,
      x.outPunchTime,
      x.inPunchTime,
      x.timestamp,
      x.punch_time,
      x.punchtime,
      x.last_seen_time,
      x.latest,
      x.dayKey,
    ]
      .map(parseServerDate)
      .filter(Boolean);
    return candidates.length
      ? new Date(Math.max(...candidates.map((d) => d.getTime())))
      : null;
  };

  // Prefer allocation/job code, then job number, then explicit project name, then descriptors
  const project =
    r.allocation_code ??
    r.allocationCode ??
    r.jobNumber ??
    r.job_number ??
    r.job ??
    r.project ??
    r.projectName ??
    r.job_desc ??
    r.home_job_desc ??
    null;

  const jobNumber =
    r.jobNumber ??
    r.job_number ??
    r.job ??
    r.allocation_code ??
    r.allocationCode ??
    null;

  const workGroup =
    r.workGroup ??
    r.work_group ??
    r.home_department_desc ??
    r.home_department ??
    r.department_desc ??
    null;

  return {
    workGroup,
    project,
    jobNumber,
    lastSeenAt: pickTime(r),
  };
};

// Build a "latest assignment by employee" map from raw timecard rows
function latestByEmpFromTimecards(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const best = new Map();
  for (const r of list) {
    const code = getEmpCodeFromRow(r);
    if (!code) continue;
    const cur = buildAssignmentFromRow(r);
    const curTs = cur.lastSeenAt ? cur.lastSeenAt.getTime() : -Infinity;
    const prev = best.get(code);
    const prevTs = prev?.lastSeenAt ? prev.lastSeenAt.getTime() : -Infinity;
    if (curTs >= prevTs) best.set(code, cur);
  }
  return best;
}

/* =========================
   Timecard "current assignment" overlay
   ========================= */

// Normalize payloads from POST /api/v1/timecards/latest-by-emp
function indexLatestByEmp(resp) {
  if (!resp) return new Map();
  const arr = Array.isArray(resp)
    ? resp
    : Array.isArray(resp?.items)
    ? resp.items
    : resp?.predictions && typeof resp.predictions === "object"
    ? Object.entries(resp.predictions).map(([employeeCode, v]) => ({
        employeeCode,
        ...v,
      }))
    : [];

  const by = new Map();
  (Array.isArray(arr) ? arr : []).forEach((row) => {
    const code = getEmpCodeFromRow(row);
    if (!code) return;
    by.set(code, buildAssignmentFromRow(row)); // <- same mapping as /recent
  });
  return by;
}

const compareRanks = (a, b) => {
  const pa = parseRank(a),
    pb = parseRank(b);
  const baseCmp = pa.base.localeCompare(pb.base);
  if (baseCmp !== 0) return baseCmp;
  if (pa.weight !== pb.weight) return pa.weight - pb.weight;
  return pa.norm.localeCompare(pb.norm);
};

const USE_ACTIVE_ONLY = true;

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

/* =========================
   Last-updated chip helpers
   ========================= */
function readChipFromSession() {
  try {
    const raw = sessionStorage.getItem("home-lastUpdated");
    if (!raw) return null;
    const t = new Date(raw);
    return isNaN(t.getTime()) ? null : t;
  } catch {
    return null;
  }
}
function writeChipToSession(dt) {
  try {
    if (dt) sessionStorage.setItem("home-lastUpdated", dt.toISOString());
    else sessionStorage.removeItem("home-lastUpdated");
  } catch {}
}

function parseLastSyncedPossiblyFakeUTC(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(s)) {
    return parseServerDate(s.slice(0, -1));
  }
  return parseServerDate(v);
}

function deriveMaxUpdatedFromRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const times = rows
    .map((e) => e?.updatedAt || e?.updated_at || e?.updated_at_ts || null)
    .map((v) => parseServerDate(v)?.getTime())
    .filter((n) => Number.isFinite(n));
  if (!times.length) return null;
  return new Date(Math.max(...times));
}

function getAgeCategory(dt) {
  if (!dt) return "unknown";
  const diffMs = Date.now() - dt.getTime();
  const days = diffMs / (1000 * 60 * 60 * 24);
  if (days < 3) return "fresh";
  if (days < 7) return "aging";
  return "stale";
}
function formatAbsolute(dt) {
  if (!dt) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(dt);
  } catch {
    return dt.toLocaleString();
  }
}
function formatRelative(dt) {
  if (!dt) return "";
  const ms = Date.now() - dt.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
function chipAria(dt) {
  return dt
    ? `Last updated ${formatRelative(dt)} (${formatAbsolute(dt)})`
    : "Last updated time unknown";
}

function ymd(d) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (!dt || isNaN(dt)) return "";
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* =========================
   Name + CEC ID helpers
   ========================= */
const getCecId = (e) =>
  e?.employeeCode || e?.empCode || e?.emp_code || e?.cec_id || "";

// Canonical display name coming from the backend
// (DB column display_name, or projections exposing getEmpName())
const getRawDisplayName = (e) => {
  const raw =
    e?.display_name ?? // snake_case, if you ever use it
    e?.displayName ?? // direct entity getter
    e?.empName ?? // projection using getEmpName()
    e?.emp_name ?? // snake_case variant
    e?.employeeName ?? // older DTOs
    e?.employeename ?? // legacy spelling
    null;

  return typeof raw === "string" ? raw.trim() : "";
};

function getDisplayNameLF(e) {
  const code = getCecId(e);

  // 1) If DB is sending display_name already in "LAST, FIRST MIDDLE" order,
  //    use that directly (just prettified) and don't reshuffle it.
  const disp = getRawDisplayName(e);
  if (disp) {
    const pretty = titleCaseName(disp);
    if (!code) return pretty || "";
    if (!pretty) return `— ${code}`;
    return nameHasCode(pretty, code) ? pretty : `${pretty} — ${code}`;
  }

  // 2) Fallback: old behaviour using first/last and other name fields
  const fn = String(
    e?.firstName || e?.firstname || e?.first_name || e?.first || ""
  ).trim();
  const ln = String(
    e?.lastName || e?.lastname || e?.last_name || e?.last || ""
  ).trim();

  // Build "Last, First" from available data, with robust fallbacks
  let lastFirst = "";
  if (ln || fn) {
    lastFirst = [ln, fn].filter(Boolean).join(", ");
  } else {
    const raw = resolveName(e) || "";
    if (raw.includes(",")) {
      const [l, f = ""] = raw.split(",").map((s) => s.trim());
      lastFirst = [l, f].filter(Boolean).join(", ");
    } else if (raw) {
      const parts = raw.trim().split(/\s+/);
      const l = parts.pop() || "";
      const f = parts.join(" ");
      lastFirst = [l, f].filter(Boolean).join(", ");
    }
  }

  const pretty = titleCaseName(lastFirst);
  if (!code) return pretty || "";
  if (!pretty) return `— ${code}`;
  return nameHasCode(pretty, code) ? pretty : `${pretty} — ${code}`;
}

function resolveName(e) {
  // First choice: whatever DB gave us in display_name
  const disp = getRawDisplayName(e);
  if (disp) return disp;

  const fn = e?.firstName || e?.firstname || e?.first_name || e?.first || "";
  const ln = e?.lastName || e?.lastname || e?.last_name || e?.last || "";
  const combo = `${fn} ${ln}`.trim();
  if (combo) return combo;

  const reads = [
    e?.employeename,
    e?.employeeName,
    e?.name,
    e?.fullName,
    e?.fullname,
    e?.emp_name,
    e?.empName,
  ];
  for (const r of reads) if (typeof r === "string" && r.trim()) return r.trim();
  return "";
}

function splitName(e) {
  const fn = e?.firstName || e?.firstname || e?.first_name || e?.first || "";
  const ln = e?.lastName || e?.lastname || e?.last_name || e?.last || "";
  if (fn || ln) return { fn: fn.trim(), ln: ln.trim() };

  const raw = resolveName(e) || "";
  const s = raw.trim();
  if (!s) return { fn: "", ln: "" };

  if (s.includes(",")) {
    const [last, first = ""] = s.split(",").map((t) => t.trim());
    return { fn: first, ln: last };
  }
  const parts = s.split(/\s+/);
  const last = parts.pop() || "";
  const first = parts.join(" ");
  return { fn: first, ln: last };
}

function titleCaseName(s) {
  if (!s) return s;
  const roman = /^(ii|iii|iv|v)$/i;
  const suffix = /^(jr\.?|sr\.?)$/i;

  const capSeg = (seg) =>
    seg ? seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase() : seg;

  const capPiece = (piece) => {
    const aposParts = piece.split("'");
    let out = aposParts.map(capSeg).join("'");
    out = out.replace(/^Mc([A-Za-z])/, (_, c) => "Mc" + c.toUpperCase());
    return out;
  };

  return s
    .trim()
    .split(/\s+/)
    .map((tok) => {
      if (roman.test(tok)) return tok.toUpperCase();
      if (suffix.test(tok))
        return tok.replace(/jr\.?/i, "Jr.").replace(/sr\.?/i, "Sr.");
      return tok.split("-").map(capPiece).join("-");
    })
    .join(" ");
}

function lastNameKey(full) {
  if (!full) return "";
  let s = full.trim();

  if (s.includes(",")) {
    const [last, rest = ""] = s.split(",").map((t) => t.trim());
    return `${last} ${rest}`.trim();
  }

  const parts = s.split(/\s+/);
  while (
    parts.length > 1 &&
    /^(jr\.?|sr\.?|ii|iii|iv|v)$/i.test(parts[parts.length - 1])
  ) {
    parts.pop();
  }
  const last = parts.pop() || "";
  const firsts = parts.join(" ");
  return `${last} ${firsts}`.trim();
}

const nameHasCode = (name, code) => {
  if (!name || !code) return false;
  const esc = (x) => String(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const n = name.replace(/[()\-—–]/g, " ").toUpperCase();
  const c = String(code).toUpperCase();
  return new RegExp(`\\b${esc(c)}\\b`).test(n);
};

const getDisplayName = (e) => {
  const raw = resolveName(e);
  const pretty = titleCaseName(raw);
  const code = getCecId(e);
  if (!code) return pretty || "";
  if (!pretty) return `— ${code}`;
  return nameHasCode(pretty, code) ? pretty : `${pretty} — ${code}`;
};

const cmpByLastName = (a, b) => {
  const na = resolveName(a);
  const nb = resolveName(b);
  const ka = lastNameKey(na);
  const kb = lastNameKey(nb);
  const lastCmp = ka.localeCompare(kb, undefined, { sensitivity: "base" });
  if (lastCmp !== 0) return lastCmp;
  return na.localeCompare(nb, undefined, { sensitivity: "base" });
};

const getAssignFor = (e, map) => {
  const code = String(getCecId(e) || "")
    .trim()
    .toUpperCase();
  return code ? map.get(code) || null : null;
};

const getEmpName = (e) =>
  String(
    e?.display_name ??
      e?.displayName ??
      e?.empName ?? // <– important
      e?.emp_name ??
      e?.employeename ??
      e?.employeeName ??
      e?.name ??
      ""
  ).trim();

const byNameAsc = (a, b) =>
  getEmpName(a).localeCompare(getEmpName(b), undefined, {
    sensitivity: "base",
  });

/* =========================
   Vendor Normalization (from LeasedLabor logic)
   ========================= */

// Vendor configuration is now imported from utils/vendorConfig.js
// This includes: CANONICAL, VENDOR_ALIASES, STOP_WORDS, KEY_PATCHES

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

const getCI = (obj, ...candidates) => {
  if (!obj || typeof obj !== "object") return null;
  const norm = (s) =>
    String(s)
      .replace(/[\s_\-]/g, "")
      .toLowerCase();
  const index = Object.keys(obj).reduce((m, k) => {
    const nk = norm(k);
    if (!m[nk]) m[nk] = k;
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
};

function vendorKey(s) {
  if (!s) return "";
  let k = String(s).toLowerCase();
  k = k
    .replace(/[.,&\-_/']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [rx, canon] of KEY_PATCHES) k = k.replace(rx, canon);
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
// Cache normalized vendor lookups; without this, we recalc the expensive fuzzy match for every row.
const vendorNormalizeCache = new Map();
const leaseInfoCache = new WeakMap();

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
  const cacheKey = nz(rawName).trim().toLowerCase();
  if (vendorNormalizeCache.has(cacheKey)) {
    return vendorNormalizeCache.get(cacheKey);
  }

  const raw = nz(rawName).trim();
  let normalized = raw;
  if (raw) {
    for (const [rx, canon] of VENDOR_ALIASES) if (rx.test(raw)) normalized = canon;
    const k = vendorKey(raw);
    if (normalized === raw && CANON_KEYS[k]) normalized = CANON_KEYS[k];
    if (normalized === raw) {
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
        normalized = best;
      }
    }
  }

  const result = normalized || "";
  vendorNormalizeCache.set(cacheKey, result);
  return result;
}

function deriveLeaseAndVendor(e) {
  if (!e || typeof e !== "object")
    return { leased: false, normalizedVendor: "", addr1: null, addr2: null, direct: false };

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

  return { leased, normalizedVendor, addr1, addr2, direct };
}

const getLeaseInfo = (emp) => {
  if (!emp || typeof emp !== "object")
    return { leased: false, normalizedVendor: "", addr1: null, addr2: null, direct: false };
  if (leaseInfoCache.has(emp)) return leaseInfoCache.get(emp);
  const info = deriveLeaseAndVendor(emp);
  leaseInfoCache.set(emp, info);
  return info;
};

/* =========================
   Leased Labor detection (uses deriveLeaseAndVendor internally)
   ========================= */
const isLeasedLabor = (emp) => {
  if (!emp || typeof emp !== "object") return false;
  const { leased } = getLeaseInfo(emp);
  return leased;
};

/* =========================
   Get normalized agency vendor name
   ========================= */
const getAgencyFromAllocationDetails = (emp) => {
  if (!emp || typeof emp !== "object") return null;
  const { leased, normalizedVendor } = getLeaseInfo(emp);
  // Only return vendor name if it's actually leased labor
  return leased && normalizedVendor ? normalizedVendor : null;
};

/* =========================
   Phone formatting
   ========================= */
const formatPhone = (raw) => {
  if (!raw || String(raw).trim() === "") {
    return { text: "No Number Entered.", href: null };
  }

  const parts = String(raw)
    .split(/[;,/|]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const pretty = [];
  const hrefs = [];

  for (const part of parts) {
    const extMatch = part.match(/(?:ext\.?|x)\s*:?\.?\s*(\d{1,6})\s*$/i);
    const ext = extMatch ? extMatch[1] : null;

    const digits = part.replace(/\D/g, "");
    let area = "",
      pre = "",
      line = "";

    if (digits.length === 11 && digits.startsWith("1")) {
      area = digits.slice(1, 4);
      pre = digits.slice(4, 7);
      line = digits.slice(7);
    } else if (digits.length === 10) {
      area = digits.slice(0, 3);
      pre = digits.slice(3, 6);
      line = digits.slice(6);
    } else if (digits.length === 7) {
      pre = digits.slice(0, 3);
      line = digits.slice(3);
    } else {
      pretty.push(part);
      hrefs.push(null);
      continue;
    }

    const text = area ? `(${area}) ${pre}-${line}` : `${pre}-${line}`;
    const href =
      `tel:+1${area ? area + pre + line : pre + line}` + (ext ? `,${ext}` : "");

    pretty.push(ext ? `${text} x${ext}` : text);
    hrefs.push(href);
  }

  return {
    text: pretty.join(" • "),
    href: hrefs.find(Boolean) || null,
  };
};

/* ==== Batch summary + gating helpers ==== */
const num = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[^0-9.\-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

function summarizeBatch(report) {
  const sum = {
    hasReport: !!report,
    totals: {
      inserted: report?.totals?.inserted ?? 0,
      updated: report?.totals?.updated ?? 0,
      unchanged: report?.totals?.unchanged ?? 0,
      deactivated: report?.totals?.deactivated ?? 0,
      terminated: report?.totals?.terminated ?? 0,
      errors: report?.totals?.errors ?? 0,
    },
    terminations: 0,
    deactivations: 0,
    reactivations: 0,
    wageDecreases: 0,
    wageIncreases: 0,
    phoneChanges: 0,
    deviceChanges: 0,
    usesFallbackMatches: 0,
    duplicateEmpCodes: 0,
    dupList: [],
  };

  const changes = extractChanges(report); // <-- use extractor
  const empCodeCount = new Map();

  for (const row of changes) {
    const sb = String(row.statusBefore ?? "").toLowerCase();
    const sa = String(row.statusAfter ?? "").toLowerCase();
    if (sb === "active" && sa === "inactive") sum.deactivations++;
    if (sb !== "terminated" && sa === "terminated") sum.terminations++;
    if (sb === "inactive" && sa === "active") sum.reactivations++;

    const wb = num(row.wageBefore);
    const wa = num(row.wageAfter);
    if (wb !== null && wa !== null) {
      if (wa < wb) sum.wageDecreases++;
      if (wa > wb) sum.wageIncreases++;
    }

    const diff = row.changes || {};
    const diffKeys = Object.keys(diff).map((k) => k.toLowerCase());
    if (diffKeys.some((k) => k.includes("phone"))) sum.phoneChanges++;
    if (diffKeys.some((k) => k.includes("ipad") || k.includes("laptop"))) {
      sum.deviceChanges++;
    }

    const code =
      row.employeeCode ?? row.empCode ?? row.emp_id ?? row.empid ?? null;
    const hasCode = !!(code && String(code).trim());
    const hasFallback = !hasCode && (row.tixid || row.xid);
    if (hasFallback) sum.usesFallbackMatches++;

    if (hasCode) {
      const key = String(code).trim().toUpperCase();
      empCodeCount.set(key, (empCodeCount.get(key) || 0) + 1);
    }
  }

  const dups = [];
  empCodeCount.forEach((cnt, k) => {
    if (cnt > 1) dups.push(k);
  });
  sum.duplicateEmpCodes = dups.length;
  sum.dupList = dups;
  return sum;
}

function extractChanges(report) {
  if (!report || typeof report !== "object") return [];

  // 1) Direct array
  if (Array.isArray(report.changes)) return report.changes;
  if (Array.isArray(report.rows)) return report.rows;
  if (Array.isArray(report.items)) return report.items;

  // 2) Object map of empCode -> changeRow
  if (
    report.changes &&
    !Array.isArray(report.changes) &&
    typeof report.changes === "object"
  ) {
    return Object.values(report.changes);
  }

  return [];
}

function filterChangesByScope(changes, scope) {
  if (!Array.isArray(changes)) return [];
  const s = {
    deactivations: true,
    terminations: true,
    reactivations: true,
    updatesOther: true,
    ...scope,
  };
  return changes.filter((row) => {
    const sb = String(row.statusBefore ?? "").toLowerCase();
    const sa = String(row.statusAfter ?? "").toLowerCase();

    if (sb === "active" && sa === "inactive") return !!s.deactivations;
    if (sb !== "terminated" && sa === "terminated") return !!s.terminations;
    if (sb === "inactive" && sa === "active") return !!s.reactivations;
    return !!s.updatesOther;
  });
}

/* =========================
   Component
   ========================= */
function Home({ onExport, onOpenBatch, isExportModalOpen, setIsExportModalOpen, isBatchModalOpen, setIsBatchModalOpen }) {
  const [employees, setEmployees] = useState([]);
  const [firstName, setFirstName] = useState("");
  const [searchNameLive, setSearchNameLive] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [filterRank, setFilterRank] = useState("");
  const [filterProject, setFilterProject] = useState("");
  // Use props if provided, otherwise create local state
  const [localExportModal, setLocalExportModal] = useState(false);
  const [localBatchModal, setLocalBatchModal] = useState(false);
  const exportModalOpen = isExportModalOpen !== undefined ? isExportModalOpen : localExportModal;
  const batchModalOpen = isBatchModalOpen !== undefined ? isBatchModalOpen : localBatchModal;
  const setExportModal = setIsExportModalOpen || setLocalExportModal;
  const setBatchModal = setIsBatchModalOpen || setLocalBatchModal;
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [assignMap, setAssignMap] = useState(() => new Map());

  const [lastUpdated, setLastUpdated] = useState(() => readChipFromSession());
  const ageClass = lastUpdated ? getAgeCategory(lastUpdated) : "unknown";

  const openExportModal = useCallback(
    (emp) => {
      if (emp) setSelectedEmployee(emp);
      setExportModal(true);
      if (onExport) onExport(emp);
    },
    [onExport, setExportModal]
  );

  const [batchLoading, setBatchLoading] = useState(false);
  const [batchApplying, setBatchApplying] = useState(false);
  const [batchError, setBatchError] = useState("");
  const [batchReport, setBatchReport] = useState(null);

  const [batchRules, setBatchRules] = useState({
    allowFallbackMatch: false,
    ackMapping: false,
    ackDeactivations: false,
    ackTerminations: false,
    ackWageDecreases: false,
    scope: {
      deactivations: true,
      terminations: false,
      reactivations: false,
      updatesOther: true,
    },
  });

  const [alertsOpen, setAlertsOpen] = useState(false);
  const { count: alertCount } = useAlerts();
  const [syncBusy, setSyncBusy] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadOk, setUploadOk] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [successPopupOpen, setSuccessPopupOpen] = useState(false);
  const [batchSuccessData, setBatchSuccessData] = useState(null);

  const [showScrollTop, setShowScrollTop] = useState(false);

  // Lock body scroll when batch modal is open
  useEffect(() => {
    if (isBatchModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isBatchModalOpen]);

  // Show scroll-to-top button after scrolling past ~15-20 items
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY || document.documentElement.scrollTop;
      const threshold = ITEM_HEIGHT * 15; // ~15 items
      setShowScrollTop(scrolled > threshold);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    void import("./EmployeeDetails");
    void import("./EditEmployee");
    void import("./InactiveOnLeave");
    void import("./Terminated");
  }, []);

  // 1) Load employees (+ lastUpdated)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const attempts = [
        { url: "/api/v1/employee/list", params: {} },
        { url: "/api/v1/employee", params: {} },
      ];

      let payload = null;
      let lastError = null;

      for (const a of attempts) {
        try {
          const res = await api.get(a.url, {
            params: a.params,
            withCredentials: true,
          });
          payload = res?.data ?? [];
          break;
        } catch (e) {
          lastError = e;
        }
      }

      if (cancelled) return;

      if (!payload) {
        console.error("Failed to fetch employee data", lastError);
        setEmployees([]);
        return;
      }

      const rows = Array.isArray(payload) ? payload : payload?.employees || [];
      const sorted = [...(rows || [])].sort(cmpByLastName);
      setEmployees(sorted);

      const serverTs = payload?.lastSyncedAt
        ? parseLastSyncedPossiblyFakeUTC(payload.lastSyncedAt)
        : null;
      const derivedTs = deriveMaxUpdatedFromRows(sorted);
      const candidates = [serverTs, derivedTs].filter(Boolean);
      const newTs = candidates.length
        ? new Date(Math.max(...candidates.map((d) => d.getTime())))
        : null;

      if (newTs && !isNaN(newTs.getTime())) {
        setLastUpdated(newTs);
        writeChipToSession(newTs);
      } else {
        setLastUpdated(null);
        writeChipToSession(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Timecard overlay with robust CSRF + fallbacks
  useEffect(() => {
    let cancelled = false;
    let idleId = null;

    const run = async () => {
      // Wait until we actually have people on screen
      if (!employees || employees.length === 0) {
        setAssignMap(new Map());
        return;
      }

      const codes = collectEmpCodes(employees);

      // 1) Best path: POST /current-assignments/by-emp
      try {
        const data = await postWithXsrf(
          "/api/v1/timecards/current-assignments/by-emp",
          { empCodes: codes }
        );
        const map = indexCurrentAssignments(data);
        if (!cancelled && map.size > 0) {
          setAssignMap(map);
          return;
        }
      } catch (_e) {
        // 403s are expected if CSRF/session isn’t ready; we’ll fall back.
      }

      // 2) Fallback: POST /latest-by-emp
      try {
        const data = await postWithXsrf("/api/v1/timecards/latest-by-emp", {
          empCodes: codes,
        });
        const map = indexLatestByEmp(data);
        if (!cancelled && map.size > 0) {
          setAssignMap(map);
          return;
        }
      } catch (_e) {}

      // 3) Last-ditch: GET /current-assignments (org-wide window)
      try {
        const { data } = await api.get(
          "/api/v1/timecards/current-assignments",
          { params: { days: 45 }, withCredentials: true }
        );
        const map = indexCurrentAssignments(data);
        if (!cancelled) setAssignMap(map);
      } catch {
        if (!cancelled) setAssignMap(new Map());
      }
    };

    const schedule = () => {
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(run, { timeout: 1500 });
      } else {
        idleId = setTimeout(run, 0);
      }
    };

    schedule();

    return () => {
      cancelled = true;
      if (typeof window.cancelIdleCallback === "function" && idleId) {
        window.cancelIdleCallback(idleId);
      }
      if (typeof idleId === "number") {
        clearTimeout(idleId);
      }
    };
  }, [employees]);

  // Kick off CSRF minting ASAP on mount (no UI dependency)
  useEffect(() => {
    ensureXsrf();
  }, []);

  // Fetch user's first name
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/api/v1/auth/me", { withCredentials: true });
        if (mounted && res?.data?.firstName) {
          setFirstName(res.data.firstName);
        }
      } catch (_e) {
        // silently ignore
      }
    })();
    return () => (mounted = false);
  }, []);

  const batchSummary = useMemo(
    () => summarizeBatch(batchReport),
    [batchReport]
  );

  const visibleChanges = useMemo(
    () => filterChangesByScope(extractChanges(batchReport), batchRules.scope),
    [batchReport, batchRules.scope]
  );

  const applyGate = useMemo(() => {
    if (!batchReport) return { canApply: false, reason: "No preview loaded." };
    if (batchSummary.totals.errors > 0)
      return { canApply: false, reason: "Resolve preview errors first." };

    if (batchSummary.duplicateEmpCodes > 0)
      return {
        canApply: false,
        reason: `Duplicate emp_code in changes: ${batchSummary.dupList.join(
          ", "
        )}`,
      };
    if (batchSummary.usesFallbackMatches > 0 && !batchRules.allowFallbackMatch)
      return {
        canApply: false,
        reason: `${batchSummary.usesFallbackMatches} record(s) require TIXID/XID fallback. Enable 'Allow fallback match'.`,
      };
    if (batchSummary.deactivations > 0 && !batchRules.ackDeactivations)
      return { canApply: false, reason: "Acknowledge deactivations." };
    if (batchSummary.terminations > 0 && !batchRules.ackTerminations)
      return {
        canApply: false,
        reason: "Acknowledge terminations (irreversible).",
      };
    if (batchSummary.wageDecreases > 0 && !batchRules.ackWageDecreases)
      return { canApply: false, reason: "Acknowledge wage decreases." };
    if (!batchRules.ackMapping)
      return { canApply: false, reason: "Confirm field mapping rule." };

    return { canApply: !(batchLoading || batchApplying), reason: "" };
  }, [batchReport, batchSummary, batchRules, batchLoading, batchApplying]);

  const [selectedFields] = useState([
    "321",
    "ID",
    "Group",
    "Employee Verify",
    "Project",
    "Job Number",
    "CEC ID",
    "Name",
    "Ranked",
    "Level One",
    "Level One SS",
    "Level One Material Handling",
    "Level One Ladder Safety",
    "Level One Fall Protection",
    "Level One Spotter Training",
    "Level One Electrical Safety Awareness",
    "Level One LOTO",
    "Level One Energized Steps",
    "Level One Two Men Verify",
    "Level One Jack Stands",
    "Level One Cable Tray Rollers",
    "Level One Cable Cutting",
    "Level One Cable Stripping",
    "Level Two",
    "Level Two Cable Pullies Install",
    "Level Two Cable Sock Selection",
    "Level Two Cable Connector Install",
    "Level Two Cable Labeling",
    "Level Two Megging",
    "Level Two Crimping Procedures",
    "Level Two Drilling Holes",
    "Level Three",
    "Level Three Tool Feeds",
    "Level Three Commissioning",
    "Level Three Torqueing",
    "Level Three Torque Seal",
    "Level Three Breaker Manipulation",
    "Level Three Turn Off Procedure",
    "Level Three Turn On Procedures",
    "Level Three Energize Permit",
    "Level Three QEW",
    "Black Energized Work",
    "Green Turn On Off",
    "Red Troubleshoot",
    "Aqua Cable Pulling",
    "Blue Terminations",
    "Gold Management",
    "Phone Number",
    "Notes",
    "Fab or Energized Work",
    "Incentive",
    "More Notes",
    "Supervisor",
    "From Location",
    "Transfer to Location",
    "Transfer to Date",
    "Transfers",
    "SM One BD Date",
    "SM One Blue Dot Trained",
    "CEC SM1 OB Date",
    "CEC SM1 Onboarding",
    "StartDate",
    "EndDate",
    "Transfer To",
    "Travel Preference",
    "Travel Notes",
  ]);

  const [fieldFilters, setFieldFilters] = useState({
    Groups: [],
    Ranked: [],
    Projects: [],
    JobNumbers: [],
    HireDate: "",
    TerminationDate: "",
  });

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navType = useNavigationType();

  // 2) Restore UI state
  useEffect(() => {
    const fromUrl = {
      q: searchParams.get("q") || "",
      group: searchParams.get("group") || "",
      rank: searchParams.get("rank") || "",
      project: searchParams.get("project") || "",
      sel: searchParams.get("sel") || "",
    };
    const fromState = location.state?.homeUi || null;
    let fromSS = null;
    try {
      fromSS = JSON.parse(sessionStorage.getItem("home-ui") || "null");
    } catch {}
    const hasUrl = Object.values(fromUrl).some(Boolean);
    const src = hasUrl ? fromUrl : fromState || fromSS || null;
    if (src) {
      if (src.q) {
        setSearchNameLive(src.q);
        setSearchName(src.q);
      }
      if (src.group) setFilterGroup(src.group);
      if (src.rank) setFilterRank(src.rank);
      if (src.project) setFilterProject(src.project);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3) Reselect card when employees load and URL has 'sel'
  useEffect(() => {
    const sel = searchParams.get("sel");
    if (sel && employees?.length) {
      const match = employees.find((e) => String(e.employeeid) === String(sel));
      if (match) setSelectedEmployee(match);
    }
  }, [employees, searchParams]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearchName(searchNameLive.trim()), 250);
    return () => clearTimeout(t);
  }, [searchNameLive]);

  // 4) Sync URL + sessionStorage
  const syncTimeout = useRef(null);
  useEffect(() => {
    const doSync = () => {
      const params = new URLSearchParams();
      if (searchName) params.set("q", searchName);
      if (filterGroup) params.set("group", filterGroup);
      if (filterRank) params.set("rank", filterRank);
      if (filterProject) params.set("project", filterProject);
      if (selectedEmployee?.employeeid)
        params.set("sel", selectedEmployee.employeeid);
      setSearchParams(params, { replace: true });

      const homeUi = {
        q: searchName,
        group: filterGroup,
        rank: filterRank,
        project: filterProject,
        sel: selectedEmployee?.employeeid || "",
      };
      try {
        sessionStorage.setItem("home-ui", JSON.stringify(homeUi));
      } catch {}
    };

    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    syncTimeout.current = setTimeout(doSync, 200);
    return () => {
      if (syncTimeout.current) clearTimeout(syncTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchName,
    filterGroup,
    filterRank,
    filterProject,
    selectedEmployee,
    setSearchParams,
  ]);

  // 5) Scroll position persistence
  useEffect(() => {
    if (navType === "POP") {
      const y = Number(sessionStorage.getItem("home-scrollY") || "0");
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        try {
          sessionStorage.setItem("home-scrollY", String(window.scrollY));
        } catch {}
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [navType]);

  const clearAllFilters = () => {
    setSearchNameLive("");
    setSearchName("");
    setFilterGroup("");
    setFilterRank("");
    setFilterProject("");
    setSelectedEmployee(null);
    setSearchParams({}, { replace: true });
    try {
      sessionStorage.removeItem("home-ui");
    } catch {}
  };

  const derivedEmployees = useMemo(() => {
    const list = Array.isArray(employees) ? employees : [];
    return list.map((emp) => {
      const assign = getAssignFor(emp, assignMap);
      const projectKey = projectKeyForEmployee(emp, assignMap);
      const nameLower = (resolveName(emp) || "").toLowerCase();
      const travelPref = getTravelPref(emp);
      const travelNotes = getTravelNotes(emp);
      const phone = formatPhone(emp.phoneNumber);
      const displayGroup = assign?.workGroup || emp.workGroup || "";
      const displayProject =
        assign?.jobNumber || assign?.project || emp.project || "";
      const groupProject =
        displayGroup && displayProject
          ? `${displayGroup} - ${displayProject}`
          : displayGroup || displayProject || "Group / Project not available";
      const rawLast =
        assign?.lastSeenAt ??
        assign?.lastSeen ??
        assign?.last_seen ??
        assign?.dayKey ??
        assign?.out_punch_time ??
        assign?.in_punch_time ??
        null;
      const lastSeen = rawLast ? parseServerDate(rawLast) : null;
      const isActive = statusNorm(emp) === "active";

      return {
        ...emp,
        _assign: assign,
        _projectKey: projectKey,
        _nameLower: nameLower,
        _travelPref: travelPref,
        _travelNotes: travelNotes,
        _phone: phone,
        _groupProject: groupProject,
        _lastSeen: lastSeen,
        _isActive: isActive,
      };
    });
  }, [employees, assignMap]);

  const baseList = useMemo(() => {
    const list = Array.isArray(derivedEmployees) ? derivedEmployees : [];
    if (!USE_ACTIVE_ONLY) return list;
    return list.filter((e) => e._isActive);
  }, [derivedEmployees]);

  // Keep a single sorted copy so filtering doesn’t keep resorting on every keystroke.
  const sortedBaseList = useMemo(() => {
    const list = Array.isArray(baseList) ? baseList : [];
    return list.slice().sort(byNameAsc);
  }, [baseList]);

  // Cascading filter options: each dropdown shows only values from employees matching prior filters
  const cascadingFilteredList = useMemo(() => {
    return sortedBaseList.filter((e) => {
      // Apply Groups filter
      if (fieldFilters.Groups?.length && !fieldFilters.Groups.includes(e.workGroup)) {
        return false;
      }
      // Apply Ranked filter
      if (fieldFilters.Ranked?.length && !fieldFilters.Ranked.includes(e.ranked)) {
        return false;
      }
      // Apply Projects filter
      if (fieldFilters.Projects?.length && !fieldFilters.Projects.includes(e._projectKey)) {
        return false;
      }
      // Apply JobNumbers filter
      if (fieldFilters.JobNumbers?.length && !fieldFilters.JobNumbers.includes(e.jobNumber)) {
        return false;
      }
      return true;
    });
  }, [sortedBaseList, fieldFilters]);

  const uniqueGroups = useMemo(
    () =>
      Array.from(
        new Set(sortedBaseList.map((e) => e.workGroup).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b)),
    [sortedBaseList]
  );

  const uniqueRanks = useMemo(() => {
    // Filter based on selected Groups only
    const filtered = sortedBaseList.filter((e) => {
      if (fieldFilters.Groups?.length && !fieldFilters.Groups.includes(e.workGroup)) {
        return false;
      }
      return true;
    });
    return Array.from(new Set(filtered.map((e) => e.ranked).filter(Boolean))).sort(compareRanks);
  }, [sortedBaseList, fieldFilters.Groups]);

  const uniqueProjects = useMemo(() => {
    // Filter based on selected Groups and Ranked
    const filtered = sortedBaseList.filter((e) => {
      if (fieldFilters.Groups?.length && !fieldFilters.Groups.includes(e.workGroup)) {
        return false;
      }
      if (fieldFilters.Ranked?.length && !fieldFilters.Ranked.includes(e.ranked)) {
        return false;
      }
      return true;
    });
    const s = new Set();
    for (const e of filtered) s.add(e._projectKey);
    const arr = Array.from(s)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    return arr;
  }, [sortedBaseList, fieldFilters.Groups, fieldFilters.Ranked]);

  const uniqueJobNumbers = useMemo(() => {
    // Filter based on selected Groups, Ranked, and Projects
    const filtered = sortedBaseList.filter((e) => {
      if (fieldFilters.Groups?.length && !fieldFilters.Groups.includes(e.workGroup)) {
        return false;
      }
      if (fieldFilters.Ranked?.length && !fieldFilters.Ranked.includes(e.ranked)) {
        return false;
      }
      if (fieldFilters.Projects?.length && !fieldFilters.Projects.includes(e._projectKey)) {
        return false;
      }
      return true;
    });
    return Array.from(
      new Set(filtered.map((e) => e.jobNumber).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [sortedBaseList, fieldFilters.Groups, fieldFilters.Ranked, fieldFilters.Projects]);

  const filteredEmployees = useMemo(() => {
    const q = searchName.toLowerCase();
    const res = sortedBaseList.filter((e) => {
      const n = e._nameLower;
      const g = e.workGroup || "";
      const r = e.ranked || "";
      const code = String(getCecId(e) || "").toLowerCase();
      const matchesName = !q || n.includes(q) || code.includes(q);
      const matchesGroup = !filterGroup || g === filterGroup;
      const matchesRank = !filterRank || r === filterRank;
      const matchesProject = !filterProject || normKey(filterProject) === e._projectKey;
      return matchesName && matchesGroup && matchesRank && matchesProject;
    });
    return res;
  }, [sortedBaseList, searchName, filterGroup, filterRank, filterProject]);

  const exportToExcel = () => {
    const filtered = baseList.filter((employee) => {
      const matchesGroup =
        !fieldFilters.Groups?.length ||
        fieldFilters.Groups.includes(employee.workGroup);
      const matchesRank =
        !fieldFilters.Ranked?.length ||
        fieldFilters.Ranked.includes(employee.ranked);

      const matchesProject =
        !fieldFilters.Projects?.length || fieldFilters.Projects.includes(employee._projectKey);

      const matchesJobNumber =
        !fieldFilters.JobNumbers?.length ||
        fieldFilters.JobNumbers.includes(employee.jobNumber);

      const hireDateFilter = fieldFilters.HireDate
        ? new Date(fieldFilters.HireDate)
        : null;
      const terminationDateFilter = fieldFilters.TerminationDate
        ? new Date(fieldFilters.TerminationDate)
        : null;

      const employeeHireDate = employee.hireDate
        ? parseServerDate(employee.hireDate)
        : null;
      const employeeTerminationDate = employee.terminationDate
        ? parseServerDate(employee.terminationDate)
        : null;

      const matchesHireDate =
        !hireDateFilter ||
        (employeeHireDate && employeeHireDate >= hireDateFilter);
      const matchesTerminationDate =
        !terminationDateFilter ||
        (employeeTerminationDate && employeeTerminationDate <= terminationDateFilter);

      return (
        matchesGroup &&
        matchesRank &&
        matchesProject &&
        matchesJobNumber &&
        matchesHireDate &&
        matchesTerminationDate
      );
    });

    const exportData = filtered.map((employee) => {
      const flat = {};
      for (const key in employee) {
        if (typeof employee[key] === 'object' && employee[key] !== null) {
          for (const subKey in employee[key]) {
            flat[`${key}_${subKey}`] = employee[key][subKey];
          }
        } else {
          flat[key] = employee[key];
        }
      }
      return flat;
    });

    // Build dynamic filename from selected filters
    const filenameParts = [];
    
    if (fieldFilters.Groups?.length) {
      filenameParts.push(fieldFilters.Groups.join('_'));
    }
    if (fieldFilters.Ranked?.length) {
      filenameParts.push(fieldFilters.Ranked.join('_'));
    }
    if (fieldFilters.Projects?.length) {
      filenameParts.push(fieldFilters.Projects.join('_'));
    }
    if (fieldFilters.JobNumbers?.length) {
      filenameParts.push(fieldFilters.JobNumbers.join('_'));
    }
    if (fieldFilters.HireDate) {
      filenameParts.push(fieldFilters.HireDate);
    }
    if (fieldFilters.TerminationDate) {
      filenameParts.push(fieldFilters.TerminationDate);
    }
    
    // Sanitize filename (remove special characters that are invalid in filenames)
    const sanitizedParts = filenameParts.map(part => 
      part.replace(/[<>:"/\\|?*]/g, '_')
    );
    
    const filename = sanitizedParts.length > 0 
      ? `${sanitizedParts.join('_')}_WF_Export.xlsx`
      : 'WF_Export.xlsx';

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], { type: "application/octet-stream" });
    saveAs(blob, filename);
  };

  // --------- Batch helpers ----------

  async function uploadImportFile(file) {
    if (!file) throw new Error("No file selected");
    const form = new FormData();
    form.append("file", file);
    const xsrf = getXsrfToken();
    const headers = {
      "Content-Type": "multipart/form-data",
      ...(xsrf ? { "X-XSRF-TOKEN": decodeURIComponent(xsrf) } : {}),
    };
    const res = await api.post(UPLOAD_URL, form, {
      withCredentials: true,
      headers,
    });
    return res?.data;
  }

  // auto-preview when modal opens (reset + optional preview)
  useEffect(() => {
    if (!isBatchModalOpen) return;

    setBatchError("");
    setUploadError("");
    setUploadOk(false);
    setBatchReport(null);

    (async () => {
      setBatchLoading(true);
      try {
        // If field_import already has data, this will show it.
        const data = await postWithXsrf(PREVIEW_URL, {});
        setBatchReport(data || {});
      } catch (e) {
        console.error(e);
        setBatchError("Preview failed. Check server logs/endpoints.");
      } finally {
        setBatchLoading(false);
      }
    })();
  }, [isBatchModalOpen]);

  // Helper function to get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const pageSubtitle = "Employees";

  const handleSelect = useCallback(
    (emp) => {
      setSelectedEmployee((prev) =>
        prev?.employeeid === emp.employeeid ? null : emp
      );
    },
    [setSelectedEmployee]
  );

  const rowData = useMemo(
    () => ({
      employees: filteredEmployees,
      selectedId: selectedEmployee?.employeeid ?? null,
      onSelect: handleSelect,
      openExportModal,
      navigate,
    }),
    [filteredEmployees, selectedEmployee?.employeeid, handleSelect, openExportModal, navigate]
  );

  const rowRenderer = useCallback(
    ({ index, style }) => <Row index={index} style={style} data={rowData} />,
    [rowData]
  );



  useEffect(() => {
    writeChipToSession(lastUpdated);
  }, [lastUpdated]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <img src={dbIcon} alt="Database Icon" className={styles.icon} />
          <h1 className={styles.title}>
            {firstName ? `${getGreeting()}, ${firstName}` : "Employee Database"}
          </h1>
        </div>
        <div className={styles.headerCenter}>
          <input
            type="text"
            placeholder="Search by name"
            value={searchNameLive}
            onChange={(e) => setSearchNameLive(e.target.value)}
            className={styles.filterInput}
          />
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className={styles.filterDropdown}
          >
            <option value="">All Groups</option>
            {uniqueGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
          <select
            value={filterRank}
            onChange={(e) => setFilterRank(e.target.value)}
            className={styles.filterDropdown}
          >
            <option value="">All Ranks</option>
            {uniqueRanks.map((rank) => (
              <option key={rank} value={rank}>
                {rank}
              </option>
            ))}
          </select>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className={styles.filterDropdown}
          >
            <option value="">All Projects</option>
            {uniqueProjects.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
        </div>
        {/* Notification badge lives here */}
        <div className={styles.headerRight}>
          <div style={{ marginRight: 8 }}>
            <NotificationBell onOpen={() => setAlertsOpen(true)} />
          </div>
          <button
            type="button"
            className={styles.timecardButton}
            onClick={() => navigate("/admin/timecards")}
            title="Upload Paycom timecards"
          >
            Import Timecards
          </button>
          <button
            type="button"
            className={styles.clearFiltersButton}
            onClick={clearAllFilters}
            title="Reset search and all filters"
          >
            Clear Filters
          </button>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.contentWrapper}>
          <div className={styles.subtitleRow}>
            <h2 className={styles.subtitle}>{pageSubtitle}</h2>

            <span
              className={`${styles.lastUpdatedChip} ${
                ageClass === "fresh"
                  ? styles.chipFresh
                  : ageClass === "aging"
                  ? styles.chipAging
                  : ageClass === "stale"
                  ? styles.chipStale
                  : styles.chipUnknown
              }`}
              title={
                lastUpdated
                  ? `Last updated: ${formatAbsolute(lastUpdated)}`
                  : "Last updated: unknown"
              }
              aria-label={chipAria(lastUpdated)}
              role="status"
            >
              {lastUpdated
                ? `Updated ${formatRelative(lastUpdated)}`
                : "Updated —"}
            </span>

            {alertCount > 0 && (
              <button
                onClick={() => setAlertsOpen(true)}
                title="View alerts"
                style={{
                  marginLeft: 8,
                  padding: "4px 8px",
                  borderRadius: 12,
                  border: "1px solid #333",
                  background: "rgba(217,48,37,0.15)",
                  color: "#ffd7d4",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Alerts: <b>{alertCount}</b>
              </button>
            )}
          </div>
          {filteredEmployees.length === 0 ? (
            <p className={styles.noData}>No employees found.</p>
          ) : FixedSizeList ? (
            <FixedSizeList
              className={styles.employeeList}
              height={650}
              rowCount={filteredEmployees.length}
              rowHeight={ITEM_HEIGHT + GUTTER}
              width={"100%"}
              rowComponent={Row}
              rowProps={{ data: rowData }}
            />
          ) : (
            <div className={styles.employeeList}>
              {filteredEmployees.map((emp, idx) => (
                <div key={emp?.employeeid ?? idx}>
                  <Row index={idx} style={{}} data={rowData} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.actionButtons}>
          {/* <button
            type="button"
            className={styles.addButton}
            onClick={() => navigate("/employee/new")}
          >
            Add Employee
          </button> */}
          <button
            type="button"
            className={styles.editButton}
            disabled={!selectedEmployee}
            onClick={() => {
              if (!selectedEmployee) return;
              navigate(`/employee/${selectedEmployee.employeeid}/edit`, {
                state: { employee: selectedEmployee },
              });
            }}
          >
            Edit Employee
          </button>
          <button
            type="button"
            className={styles.viewButton}
            disabled={!selectedEmployee}
            onClick={() =>
              selectedEmployee &&
              navigate(`/employee-details/${selectedEmployee.employeeid}`)
            }
          >
            View Details
          </button>
          {/* <button
            type="button"
            className={styles.reportsButton}
            onClick={() => navigate("/reports")}
          >
            Reports
          </button> */}
          <button
            type="button"
            className={styles.reportsButton}
            onClick={() => navigate("/transfers")}
          >
            Transfers
          </button>
          <button
            type="button"
            className={styles.reportsButton}
            onClick={() => navigate("/new-hires")}
          >
            New Hires
          </button>
          <button
            type="button"
            className={styles.reportsButton}
            onClick={() => navigate("/mandown")}
          >
            Mandown
          </button>
          {/* <button
            type="button"
            className={styles.reportsButton}
            onClick={() => navigate("/gantt")}
          >
            Gantt View
          </button>
          <button
            type="button"
            className={styles.reportsButton}
            onClick={() => navigate("/leased-labor")}
          >
            Leased Labor
          </button> */}
          <button
            type="button"
            className={styles.reportsButton}
            onClick={() => navigate("/inactive-on-leave")}
          >
            Inactive / On Leave
          </button>
          <button
            type="button"
            className={styles.reportsButton}
            onClick={() => navigate("/terminated")}
          >
            Terminated
          </button>

          <button
            type="button"
            className={styles.terminateEmployeeButton}
            disabled={!selectedEmployee}
            onClick={async () => {
              if (!selectedEmployee) return;
              if (
                !window.confirm(`Terminate ${selectedEmployee.employeename}?`)
              )
                return;
              try {
                const d = new Date();
                const endDate = `${d.getFullYear()}-${String(
                  d.getMonth() + 1
                ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

                const xsrf = getXsrfToken();
                await api.patch(
                  `/api/v1/employee/id/${selectedEmployee.employeeid}`,
                  { endDate },
                  {
                    withCredentials: true,
                    headers: xsrf
                      ? { "X-XSRF-TOKEN": decodeURIComponent(xsrf) }
                      : {},
                  }
                );
                setEmployees((prev) => {
                  const next = prev.map((e) =>
                    e.employeeid === selectedEmployee.employeeid
                      ? { ...e, endDate }
                      : e
                  );
                  return next.slice().sort(byNameAsc);
                });
                setSelectedEmployee(null);
                setLastUpdated(new Date());
                alert("Employee terminated successfully!");
              } catch (error) {
                console.error("Failed to terminate employee", error);
                alert("Failed to terminate employee. Please try again.");
              }
            }}
          >
            Terminate Employee
          </button>

          <button

            type="button"
            className={styles.deactivateEmployeeButton}
            disabled={!selectedEmployee}
            onClick={async () => {
              if (!selectedEmployee) return;
              if (
                !window.confirm(`Deactivate ${selectedEmployee.employeename}?`)
              )
                return;
              try {
                const xsrf = getXsrfToken();
                await api.patch(
                  `/api/v1/employee/id/${selectedEmployee.employeeid}`,
                  { employeeStatus: "Inactive" },
                  {
                    withCredentials: true,
                    headers: xsrf
                      ? { "X-XSRF-TOKEN": decodeURIComponent(xsrf) }
                      : {},
                  }
                );
                setEmployees((prev) => {
                  const next = prev.map((e) =>
                    e.employeeid === selectedEmployee.employeeid
                      ? { ...e, employeeStatus: "Inactive" }
                      : e
                  );
                  return next.slice().sort(byNameAsc);
                });
                setSelectedEmployee(null);
                setLastUpdated(new Date());
                alert("Employee deactivated successfully!");
              } catch (error) {
                console.error("Failed to deactivate employee", error);
                alert("Failed to deactivate employee. Please try again.");
              }
            }}
          >
            Deactivate Employee
          </button>

          <button
            type="button"
            className={styles.reportsButton}
            onClick={() => setIsBatchModalOpen(true)}
            title="Run batch update from field_import"
          >
            Batch Update
          </button>

          <button
            type="button"
            onClick={() => setExportModal(true)}
            className={styles.exportButton}
          >
            Export to Excel
          </button>
        </div>
      </main>
      <Footer
        showBackToTop={true}
        rightSlot={
          <div className={footerStyles.linkRow}>
            <button
              type="button"
              className={footerStyles.footerLink}
              onClick={() => navigate("/terms")}
            >
              Terms of Use
            </button>
            <span className={footerStyles.sep}>|</span>
            <button
              type="button"
              className={footerStyles.footerLink}
              onClick={() => navigate("/privacy")}
            >
              Privacy Policy
            </button>
            <span className={footerStyles.pageTag}>Home View</span>
          </div>
        }
      />
      <AlertsDrawer open={alertsOpen} onClose={() => setAlertsOpen(false)} />

      {/* ===== Existing Export Modal ===== */}
      {exportModalOpen && (
        <div className={styles.modalWrapper}>
          <div
            className={styles.modalOverlay}
            onClick={() => setExportModal(false)}
          />
          <div className={styles.exportModal} style={{ maxWidth: '650px', padding: '10px 14px', maxHeight: '70vh', overflowY: 'auto', position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.1rem' }}>Export Filters</h2>
            <div className={styles.fields} style={{ gap: '4px', marginBottom: '6px' }}>
              <div className={styles.fieldGroup} style={{ marginBottom: '3px' }}>
                <label style={{ fontSize: '0.9rem', marginBottom: '1px', display: 'block' }}>Groups</label>
                <MultiSelect
                  options={uniqueGroups}
                  value={fieldFilters.Groups || []}
                  onChange={(arr) =>
                    setFieldFilters((prev) => ({ ...prev, Groups: arr }))
                  }
                  placeholder="Search groups..."
                />
              </div>

              <div className={styles.fieldGroup} style={{ marginBottom: '3px' }}>
                <label style={{ fontSize: '0.9rem', marginBottom: '1px', display: 'block' }}>Ranked</label>
                <MultiSelect
                  options={uniqueRanks}
                  value={fieldFilters.Ranked || []}
                  onChange={(arr) =>
                    setFieldFilters((prev) => ({ ...prev, Ranked: arr }))
                  }
                  placeholder="Search ranks..."
                />
              </div>

              <div className={styles.fieldGroup} style={{ marginBottom: '3px' }}>
                <label style={{ fontSize: '0.9rem', marginBottom: '1px', display: 'block' }}>Projects</label>
                <MultiSelect
                  options={uniqueProjects}
                  value={fieldFilters.Projects || []}
                  onChange={(arr) =>
                    setFieldFilters((prev) => ({ ...prev, Projects: arr }))
                  }
                  placeholder="Search projects..."
                />
              </div>

              <div className={styles.fieldGroup} style={{ marginBottom: '3px' }}>
                <label style={{ fontSize: '0.9rem', marginBottom: '1px', display: 'block' }}>Job Numbers</label>
                <MultiSelect
                  options={uniqueJobNumbers}
                  value={fieldFilters.JobNumbers || []}
                  onChange={(arr) =>
                    setFieldFilters((prev) => ({ ...prev, JobNumbers: arr }))
                  }
                  placeholder="Search job numbers..."
                />
              </div>

              <div className={styles.fieldGroup} style={{ marginBottom: '3px' }}>
                <label style={{ fontSize: '0.9rem', marginBottom: '1px', display: 'block' }}>Hire Date (From)</label>
                <input
                  type="date"
                  value={fieldFilters.HireDate || ""}
                  onChange={(e) =>
                    setFieldFilters((prev) => ({
                      ...prev,
                      HireDate: e.target.value,
                    }))
                  }
                  style={{ padding: '3px 5px', fontSize: '0.9rem' }}
                />
              </div>

              <div className={styles.fieldGroup} style={{ marginBottom: '3px' }}>
                <label style={{ fontSize: '0.9rem', marginBottom: '1px', display: 'block' }}>Termination Date (Through)</label>
                <input
                  type="date"
                  value={fieldFilters.TerminationDate || ""}
                  onChange={(e) =>
                    setFieldFilters((prev) => ({
                      ...prev,
                      TerminationDate: e.target.value,
                    }))
                  }
                  style={{ padding: '3px 5px', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <div className={styles.modalActions} style={{ marginTop: '6px', gap: '5px' }}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setExportModal(false)}
                style={{ padding: '4px 10px', fontSize: '0.95rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setFieldFilters({
                  Groups: [],
                  Ranked: [],
                  Projects: [],
                  JobNumbers: [],
                  HireDate: "",
                  TerminationDate: "",
                })}
                style={{ padding: '4px 10px', fontSize: '0.95rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Clear
              </button>
              <button
                type="button"
                className={styles.exportButton}
                style={{ padding: '4px 10px', fontSize: '0.95rem' }}
                onClick={() => {
                  exportToExcel();
                  setExportModal(false);
                }}
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== NEW: Batch Update Modal ===== */}
      {isBatchModalOpen && (
        <div className={styles.modalWrapper}>
          <div
            className={styles.modalOverlay}
            onClick={() => !batchApplying && setIsBatchModalOpen(false)}
          />
          <div className={styles.batchModal}>
            <h2>Batch Update (field_import)</h2>

            {/* Upload box */}
            <div
              style={{
                border: "1px dashed #3a3a3a",
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <div style={{ display: "grid", gap: 8 }}>
                <label>
                  <b>Import file</b> (CSV or XLSX)
                </label>
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={(e) => {
                    setUploadFile(e.target.files?.[0] || null);
                    setUploadError("");
                    setUploadOk(false);
                  }}
                  disabled={batchLoading || batchApplying || uploading}
                />
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className={styles.reportsButton}
                    disabled={!uploadFile || uploading || batchApplying}
                    onClick={async () => {
                      try {
                        setUploadError("");
                        setUploading(true);
                        await uploadImportFile(uploadFile);
                        setUploadOk(true);

                        setBatchRules({
                          allowFallbackMatch: false,
                          ackMapping: false,
                          ackDeactivations: false,
                          ackTerminations: false,
                          ackWageDecreases: false,
                          scope: {
                            deactivations: true,
                            terminations: false,
                            reactivations: false,
                            updatesOther: true,
                          },
                        });

                        setBatchLoading(true);
                        const data = await postWithXsrf(PREVIEW_URL, {});
                        setBatchReport(data || {});
                      } catch (e) {
                        console.error(e);
                        setUploadOk(false);
                        setUploadError(
                          "Upload failed. Check server route / parser."
                        );
                      } finally {
                        setUploading(false);
                        setBatchLoading(false);
                      }
                    }}
                  >
                    {uploading ? "Uploading…" : "Upload & Refresh Preview"}
                  </button>

                  {uploadOk && (
                    <span style={{ color: "#7ddc7d" }}>File ingested ✔</span>
                  )}
                  {uploadError && (
                    <span style={{ color: "#ff6b6b" }}>{uploadError}</span>
                  )}

                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => {
                      setUploadFile(null);
                      setUploadOk(false);
                      setUploadError("");
                      setBatchError("");
                      setBatchReport(null);
                      setBatchRules({
                        allowFallbackMatch: false,
                        ackMapping: false,
                        ackDeactivations: false,
                        ackTerminations: false,
                        ackWageDecreases: false,
                        scope: {
                          deactivations: true,
                          terminations: false,
                          reactivations: false,
                          updatesOther: true,
                        },
                      });
                    }}
                    title="Clear current preview and start a new batch"
                  >
                    Start New Batch
                  </button>
                </div>
                <small style={{ opacity: 0.8 }}>
                  Server parses to <code>field_import</code>. Preview compares{" "}
                  <code>field</code> vs <code>field_import</code>.
                </small>
              </div>
            </div>

            {batchLoading && <p>Loading preview…</p>}
            {batchError && <p style={{ color: "#ff6b6b" }}>{batchError}</p>}

            {/* Summary + Warnings */}
            {batchReport && (
              <div style={{ borderTop: "1px solid #333", paddingTop: 8 }}>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <b>Started:</b> {batchReport.startedAt || "—"}
                  </div>
                  <div>
                    <b>Dry Run:</b> {String(batchReport.dryRun ?? true)}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(8, minmax(0,1fr))",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <div>
                    <small>Inserted</small>
                    <div>
                      <b>{batchSummary.totals.inserted}</b>
                    </div>
                  </div>
                  <div>
                    <small>Updated</small>
                    <div>
                      <b>{batchSummary.totals.updated}</b>
                    </div>
                  </div>
                  <div>
                    <small>Unchanged</small>
                    <div>
                      <b>{batchSummary.totals.unchanged}</b>
                    </div>
                  </div>
                  <div>
                    <small>Deactivated</small>
                    <div>
                      <b>{batchSummary.totals.deactivated}</b>
                    </div>
                  </div>
                  <div>
                    <small>Terminated</small>
                    <div>
                      <b>{batchSummary.totals.terminated}</b>
                    </div>
                  </div>
                  <div>
                    <small>Reactivated</small>
                    <div>
                      <b>{batchSummary.reactivations}</b>
                    </div>
                  </div>
                  <div>
                    <small>Errors</small>
                    <div>
                      <b>{batchSummary.totals.errors}</b>
                    </div>
                  </div>
                  <div>
                    <small>Wage ↓</small>
                    <div>
                      <b>{batchSummary.wageDecreases}</b>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  {batchSummary.duplicateEmpCodes > 0 && (
                    <div style={{ color: "#ff8b8b", marginBottom: 6 }}>
                      ⚠ Duplicate <b>emp_code</b> in change set:{" "}
                      {batchSummary.dupList.join(", ")}. Fix upstream; Apply is
                      blocked.
                    </div>
                  )}
                  {batchSummary.usesFallbackMatches > 0 &&
                    !batchRules.allowFallbackMatch && (
                      <div style={{ color: "#ffd27f", marginBottom: 6 }}>
                        ⚠ {batchSummary.usesFallbackMatches} record(s) would
                        match via <b>TIXID/XID</b> fallback. Enable "Allow
                        fallback match" to proceed.
                      </div>
                    )}
                </div>

                {/* Rules & Acks */}
                <fieldset
                  style={{
                    border: "1px solid #333",
                    borderRadius: 8,
                    padding: 10,
                    marginTop: 10,
                  }}
                >
                  <legend>Rules & Safety Checks</legend>
                  <label style={{ display: "block", marginBottom: 6 }}>
                    <input
                      type="checkbox"
                      checked={batchRules.allowFallbackMatch}
                      onChange={(e) =>
                        setBatchRules((r) => ({
                          ...r,
                          allowFallbackMatch: e.target.checked,
                        }))
                      }
                    />{" "}
                    Allow fallback matching by <b>TIXID/XID</b> when{" "}
                    <code>emp_code</code> is missing.
                  </label>

                  <label style={{ display: "block", marginBottom: 6 }}>
                    <input
                      type="checkbox"
                      checked={batchRules.ackMapping}
                      onChange={(e) =>
                        setBatchRules((r) => ({
                          ...r,
                          ackMapping: e.target.checked,
                        }))
                      }
                    />{" "}
                    I confirm field mapping rules (e.g.{" "}
                    <b>work_group ← department_desc</b>, project & job number
                    sources).
                  </label>

                  {batchSummary.deactivations > 0 && (
                    <label style={{ display: "block", marginBottom: 6 }}>
                      <input
                        type="checkbox"
                        checked={batchRules.ackDeactivations}
                        onChange={(e) =>
                          setBatchRules((r) => ({
                            ...r,
                            ackDeactivations: e.target.checked,
                          }))
                        }
                      />{" "}
                      Acknowledge <b>{batchSummary.deactivations}</b>{" "}
                      deactivation(s).
                    </label>
                  )}

                  {batchSummary.terminations > 0 && (
                    <label style={{ display: "block", marginBottom: 6 }}>
                      <input
                        type="checkbox"
                        checked={batchRules.ackTerminations}
                        onChange={(e) =>
                          setBatchRules((r) => ({
                            ...r,
                            ackTerminations: e.target.checked,
                          }))
                        }
                      />{" "}
                      Acknowledge <b>{batchSummary.terminations}</b>{" "}
                      termination(s) (irreversible move to Terminated).
                    </label>
                  )}

                  {batchSummary.wageDecreases > 0 && (
                    <label style={{ display: "block", marginBottom: 6 }}>
                      <input
                        type="checkbox"
                        checked={batchRules.ackWageDecreases}
                        onChange={(e) =>
                          setBatchRules((r) => ({
                            ...r,
                            ackWageDecreases: e.target.checked,
                          }))
                        }
                      />{" "}
                      Acknowledge <b>{batchSummary.wageDecreases}</b> wage
                      decrease(s).
                    </label>
                  )}
                </fieldset>

                {/* Scope */}
                <fieldset
                  style={{
                    border: "1px solid #333",
                    borderRadius: 8,
                    padding: 10,
                    marginTop: 10,
                  }}
                >
                  <legend>Scope (preview filter)</legend>
                  <label style={{ marginRight: 14 }}>
                    <input
                      type="checkbox"
                      checked={batchRules.scope.updatesOther}
                      onChange={(e) =>
                        setBatchRules((r) => ({
                          ...r,
                          scope: { ...r.scope, updatesOther: e.target.checked },
                        }))
                      }
                    />{" "}
                    Other updates (name, phone, wage, etc.)
                  </label>
                  <label style={{ marginRight: 14 }}>
                    <input
                      type="checkbox"
                      checked={batchRules.scope.deactivations}
                      onChange={(e) =>
                        setBatchRules((r) => ({
                          ...r,
                          scope: {
                            ...r.scope,
                            deactivations: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Deactivations
                  </label>
                  <label style={{ marginRight: 14 }}>
                    <input
                      type="checkbox"
                      checked={batchRules.scope.terminations}
                      onChange={(e) =>
                        setBatchRules((r) => ({
                          ...r,
                          scope: { ...r.scope, terminations: e.target.checked },
                        }))
                      }
                    />{" "}
                    Terminations
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={batchRules.scope.reactivations}
                      onChange={(e) =>
                        setBatchRules((r) => ({
                          ...r,
                          scope: {
                            ...r.scope,
                            reactivations: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Reactivations
                  </label>
                </fieldset>
              </div>
            )}

            {/* Changes Table */}
            {visibleChanges.length > 0 && (
              <>
                <h3 style={{ marginTop: 12 }}>Changes</h3>
                <div
                  style={{
                    maxHeight: 360,
                    overflow: "auto",
                    border: "1px solid #333",
                    borderRadius: 8,
                  }}
                >
                  <table
                    className={styles.batchTable || ""}
                    style={{ width: "100%", borderCollapse: "collapse" }}
                  >
                    <thead>
                      <tr>
                        <th>Emp Code</th>
                        <th>Name (Before → After)</th>
                        <th>Key Changes</th>
                        <th>Status (Before → After)</th>
                        <th>Wage (Before → After)</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleChanges.map((row, i) => {
                        const eb = row.nameBefore ?? "";
                        const ea = row.nameAfter ?? "";
                        const sb = row.statusBefore ?? "";
                        const sa = row.statusAfter ?? "";
                        const wb = row.wageBefore ?? "";
                        const wa = row.wageAfter ?? "";

                        const changeList = row.changes
                          ? Object.entries(row.changes).map(([k, v]) => {
                              let beforeVal = "";
                              let afterVal = "";
                              if (v && typeof v === "object") {
                                beforeVal = v.before ?? "";
                                afterVal = v.after ?? "";
                              } else if (
                                typeof v === "string" &&
                                v.includes("->")
                              ) {
                                const [b, a] = v.split("->");
                                beforeVal = (b || "").trim();
                                afterVal = (a || "").trim();
                              } else {
                                afterVal = String(v ?? "");
                              }
                              const changed =
                                (beforeVal ?? "") !== (afterVal ?? "");
                              return (
                                <div
                                  key={k}
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 6px",
                                    margin: "2px 4px 2px 0",
                                    borderRadius: 6,
                                    border: changed
                                      ? "1px dashed rgba(255,200,0,.35)"
                                      : "1px solid transparent",
                                    background: changed
                                      ? "rgba(255,200,0,.12)"
                                      : "transparent",
                                  }}
                                >
                                  <code style={{ opacity: 0.9 }}>{k}</code>{" "}
                                  {changed ? (
                                    <span>
                                      <span
                                        style={{
                                          opacity: 0.8,
                                          textDecoration: "line-through",
                                        }}
                                      >
                                        {String(beforeVal)}
                                      </span>{" "}
                                      <span style={{ opacity: 0.7 }}>→</span>{" "}
                                      <span style={{ fontWeight: 600 }}>
                                        {String(afterVal)}
                                      </span>
                                    </span>
                                  ) : (
                                    <span style={{ opacity: 0.8 }}>
                                      {String(afterVal)}
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          : null;

                        return (
                          <tr key={i}>
                            <td
                              style={{
                                borderBottom: "1px solid #333",
                                padding: 8,
                              }}
                            >
                              {row.employeeCode ??
                                row.empCode ??
                                row.emp_id ??
                                "—"}
                            </td>
                            <td
                              style={{
                                borderBottom: "1px solid #333",
                                padding: 8,
                              }}
                            >
                              <span
                                style={{
                                  background:
                                    eb !== ea
                                      ? "rgba(255,200,0,.12)"
                                      : "transparent",
                                  border:
                                    eb !== ea
                                      ? "1px dashed rgba(255,200,0,.35)"
                                      : "1px solid transparent",
                                  borderRadius: 6,
                                  padding: "2px 6px",
                                  display: "inline-block",
                                }}
                              >
                                {eb || "—"}{" "}
                                <span style={{ opacity: 0.7 }}>→</span>{" "}
                                {ea || "—"}
                              </span>
                            </td>
                            <td
                              style={{
                                borderBottom: "1px solid #333",
                                padding: 8,
                                minWidth: 260,
                              }}
                            >
                              {changeList && changeList.length ? (
                                changeList
                              ) : (
                                <em>No field diffs</em>
                              )}
                            </td>
                            <td
                              style={{
                                borderBottom: "1px solid #333",
                                padding: 8,
                              }}
                            >
                              <span
                                style={{
                                  background:
                                    (row.statusBefore ?? "") !==
                                    (row.statusAfter ?? "")
                                      ? "rgba(255,200,0,.12)"
                                      : "transparent",
                                  border:
                                    (row.statusBefore ?? "") !==
                                    (row.statusAfter ?? "")
                                      ? "1px dashed rgba(255,200,0,.35)"
                                      : "1px solid transparent",
                                  borderRadius: 6,
                                  padding: "2px 6px",
                                  display: "inline-block",
                                }}
                              >
                                {sb || "—"}{" "}
                                <span style={{ opacity: 0.7 }}>→</span>{" "}
                                {sa || "—"}
                              </span>
                            </td>
                            <td
                              style={{
                                borderBottom: "1px solid #333",
                                padding: 8,
                              }}
                            >
                              <span
                                style={{
                                  background:
                                    wb !== wa
                                      ? "rgba(255,200,0,.12)"
                                      : "transparent",
                                  border:
                                    wb !== wa
                                      ? "1px dashed rgba(255,200,0,.35)"
                                      : "1px solid transparent",
                                  borderRadius: 6,
                                  padding: "2px 6px",
                                  display: "inline-block",
                                }}
                              >
                                {wb || "—"}{" "}
                                <span style={{ opacity: 0.7 }}>→</span>{" "}
                                {wa || "—"}
                              </span>
                            </td>
                            <td
                              style={{
                                borderBottom: "1px solid #333",
                                padding: 8,
                              }}
                            >
                              {row.reason || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Footer actions */}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                disabled={batchApplying}
                onClick={() => setIsBatchModalOpen(false)}
              >
                Close
              </button>

              <button
                type="button"
                className={styles.reportsButton}
                disabled={batchLoading || batchApplying}
                onClick={async () => {
                  setBatchError("");
                  setBatchLoading(true);
                  try {
                    const data = await postWithXsrf(PREVIEW_URL, {});
                    setBatchReport(data || {});
                  } catch (e) {
                    console.error(e);
                    setBatchError(
                      "Preview failed. Check server logs/endpoints."
                    );
                  } finally {
                    setBatchLoading(false);
                  }
                }}
              >
                Refresh Preview
              </button>

              <button
                type="button"
                className={styles.exportButton}
                disabled={!applyGate.canApply}
                title={applyGate.reason || ""}
                onClick={async () => {
                  if (
                    !window.confirm(
                      "Apply updates from field_import now? This writes to Employee records."
                    )
                  ) {
                    return;
                  }
                  setBatchError("");
                  setBatchApplying(true);
                  try {
                    const data = await postWithXsrf(APPLY_URL, {
                      rules: {
                        allowFallbackMatch: batchRules.allowFallbackMatch,
                        ackMapping: batchRules.ackMapping,
                        ackDeactivations: batchRules.ackDeactivations,
                        ackTerminations: batchRules.ackTerminations,
                        ackWageDecreases: batchRules.ackWageDecreases,
                      },
                      scope: batchRules.scope,
                    });
                    setBatchReport(data || {});
                    try {
                      const { data: fresh } = await api.get(
                        "/api/v1/employee/list"
                      );
                      const rows = Array.isArray(fresh)
                        ? fresh
                        : fresh?.employees || [];
                      const sorted = [...(rows || [])].sort(cmpByLastName);
                      setEmployees(sorted);
                      const now = new Date();
                      setLastUpdated(now);
                      writeChipToSession(now);
                    } catch (e) {
                      console.warn("List refresh failed after apply", e);
                      const now = new Date();
                      setLastUpdated(now);
                      writeChipToSession(now);
                    }
                    
                    // Show success popup and close batch modal
                    setBatchSuccessData(data || {});
                    setSuccessPopupOpen(true);
                    setIsBatchModalOpen(false);
                  } catch (e) {
                    console.error(e);
                    setBatchError("Apply failed. Nothing was updated.");
                  } finally {
                    setBatchApplying(false);
                  }
                }}
              >
                {batchApplying ? "Applying…" : "Apply Updates"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          className={styles.scrollToTop}
          onClick={scrollToTop}
          title="Scroll to top"
        >
          <FaArrowUp />
        </button>
      )}

      {/* ===== Success Popup Modal ===== */}
      {successPopupOpen && (
        <div className={styles.modalWrapper}>
          <div
            className={styles.modalOverlay}
            onClick={() => setSuccessPopupOpen(false)}
          />
          <div
            className={styles.exportModal}
            style={{
              maxWidth: '600px',
              width: '90%',
              maxHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '32px',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                }}
              >
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ marginRight: '12px' }}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="11"
                    stroke="#4caf50"
                    strokeWidth="2"
                  />
                  <path
                    d="M7 12l3 3 7-7"
                    stroke="#4caf50"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <h2 style={{ margin: 0, color: '#4caf50', fontSize: '1.8rem' }}>
                  Batch Update Successful
                </h2>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '16px' }}>
                  The batch update has been applied successfully.
                </p>
                {batchSuccessData && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '12px',
                      marginTop: '20px',
                      padding: '16px',
                      background: 'rgba(76, 175, 80, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(76, 175, 80, 0.3)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                        Inserted
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#4caf50' }}>
                        {batchSuccessData.totals?.inserted ?? 0}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                        Updated
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#4caf50' }}>
                        {batchSuccessData.totals?.updated ?? 0}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                        Deactivated
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ff9800' }}>
                        {batchSuccessData.totals?.deactivated ?? 0}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                        Reactivated
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#81c784' }}>
                        {batchSuccessData.totals?.reactivated ?? 0}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.exportButton}
                onClick={() => {
                  setSuccessPopupOpen(false);
                  setBatchSuccessData(null);
                }}
                style={{
                  padding: '12px 32px',
                  fontSize: '1.1rem',
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
