// src/utils/buildAssignmentsFromTimecards.js
// Build Gantt assignments from timecard data (span rows or daily rows).
const DAY = 24 * 60 * 60 * 1000;

/* ---------------- helpers ---------------- */
function truthyPick() {
  for (let i = 0; i < arguments.length; i++) {
    const v = arguments[i];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
}

// Cache for normalized keys to avoid repeated string operations
const keyNormCache = new Map();
const norm = (s) => {
  const key = String(s);
  if (keyNormCache.has(key)) return keyNormCache.get(key);
  const normalized = key.replace(/[\s_\-]/g, "").toLowerCase();
  keyNormCache.set(key, normalized);
  return normalized;
};

// Case/format-insensitive getter: handles Lastname/Firstname, first_name, "First name", etc.
function getCI(obj, ...candidates) {
  if (!obj) return null;

  // Direct property access first (fastest path)
  for (const c of candidates) {
    if (obj[c] !== undefined && obj[c] !== null && String(obj[c]).trim() !== "") {
      return obj[c];
    }
  }

  // Fallback to normalized lookup only if direct access failed
  const keys = Object.keys(obj);
  const index = {};
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const nk = norm(k);
    if (!index[nk]) index[nk] = k;
  }

  for (const c of candidates) {
    const nk = norm(c);
    if (nk in index) {
      const v = obj[index[nk]];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
  }
  return null;
}

// Robust local-date parser (handles ISO and plain dates)
function parseDateLoose(v) {
  if (!v) return null;
  const d = v instanceof Date ? new Date(v) : new Date(String(v));
  if (isNaN(d)) return null;
  // snap to local midnight so we’re merging by day
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d, n) {
  return new Date(d.getTime() + n * DAY);
}

/* ---------------- field resolvers ---------------- */

// include camelCase eeCode from DTO, plus common aliases
function empCodeOf(row) {
  return truthyPick(
    getCI(row, "eeCode", "ee_code", "employeeCode", "employee_code", "emp_code", "code", "cec_id", "cecId")
  );
}

function empIdOf(emp) {
  return truthyPick(getCI(emp, "employeeid", "employeeId", "empId", "id"));
}

// NEW: understands Lastname / Firstname (exact capitalization) and many variants
function empNameOf(emp, row) {
  // Single-field names if present
  const single =
    truthyPick(
      getCI(emp, "employee_name", "employeename", "name", "displayName"),
      getCI(row, "employee_name", "employeename", "employeeName", "name", "displayName")
    ) || null;
  if (single) return String(single);

  // First + Last with case/format-insensitive lookup
  const last =
    truthyPick(
      getCI(emp, "lastName", "lastname", "last_name", "surname", "last"),
      getCI(row, "lastName", "lastname", "last_name", "surname", "last"),
      getCI(emp, "Lastname"), // CSV header exactly as provided
      getCI(row, "Lastname")
    ) || "";

  const first =
    truthyPick(
      getCI(emp, "firstName", "firstname", "first_name", "givenName", "first"),
      getCI(row, "firstName", "firstname", "first_name", "givenName", "first"),
      getCI(emp, "Firstname"), // CSV header exactly as provided
      getCI(row, "Firstname")
    ) || "";

  const combo = [last, first].filter(Boolean).join(", ");
  return combo || "—";
}

// include camelCase + DTO project fields
function projectKeyOf(row) {
  const job = truthyPick(getCI(row, "distJobCode", "dist_job_code"));
  const alloc = truthyPick(getCI(row, "allocationCode", "allocation_code"));
  const home = truthyPick(getCI(row, "homeAllocation", "home_allocation"));
  const proj = truthyPick(getCI(row, "projectKey", "project"));
  return truthyPick(proj, job, alloc, home) || "Unknown";
}

// Merge adjacent/overlapping spans per (employeeCode, project).
function mergeAdjacentSpans(spans) {
  const byKey = new Map();
  for (const s of spans) {
    const key = (s.employeeCode || s.employee || "") + "||" + (s.project || "Unknown");
    const list = byKey.get(key) || [];
    list.push(s);
    byKey.set(key, list);
  }

  const merged = [];
  for (const [, list] of byKey.entries()) {
    list.sort((a, b) => a.start - b.start);

    let cur = null;
    for (const s of list) {
      if (!cur) {
        cur = { ...s };
        continue;
      }
      // end is exclusive; equality means "touching"
      if (s.start.getTime() <= cur.end.getTime()) {
        if (s.end.getTime() > cur.end.getTime()) cur.end = new Date(s.end);
        const h1 = Number(cur.meta?.total_hours ?? 0),
          h2 = Number(s.meta?.total_hours ?? 0);
        if (!cur.meta) cur.meta = {};
        if (h1 || h2) cur.meta.total_hours = (h1 || 0) + (h2 || 0);
      } else {
        merged.push(cur);
        cur = { ...s };
      }
    }
    if (cur) merged.push(cur);
  }
  return merged;
}

export function makeSpansFromTimecards(rows = []) {
  if (!Array.isArray(rows)) return [];

  const coerceDate = (v) => (v ? new Date(v) : null);
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // We keep a stable per-row id so nothing coalesces accidentally
  return rows
    .filter((r) => r) // sanity
    .map((r) => {
      const start = coerceDate(r.in_punch_time || r.start || r.in);
      const end   = coerceDate(r.out_punch_time || r.end || r.out);

      // prefer Paycom's work_date if you send it; otherwise derive from the punch
      const workDate =
        r.work_date ||
        (start ? start.toISOString().slice(0, 10) :
         end   ? end.toISOString().slice(0, 10) : null);

      return {
        // use raw_row_hash when available; otherwise a composite fallback
        id:
          r.raw_row_hash ||
          [
            r.ee_code ?? "",
            start ? start.toISOString() : "",
            end ? end.toISOString() : "",
            r.allocation_code ?? "",
            r.earn_code ?? "",
            r.earn_hours ?? "",
            r.dist_allocation_code ?? "",
          ].join("|"),

        eeCode: r.ee_code ?? r.eeCode ?? null,
        start,
        end,
        workDate, // "YYYY-MM-DD" (used for day grouping)
        jobCode: r.home_job_code || r.dist_job_code || r.job_code || r.jobCode || null,
        jobDesc: r.home_job_desc || r.dist_job_desc || r.job_desc || r.jobDesc || null,
        activity: r.dist_activity_desc || r.activity || null,
        hours: num(r.earn_hours ?? r.hours),
      };
    })
    // toss rows with no date and no hours
    .filter((s) => s.workDate || s.start || s.end);
}


/* ---------------- main ---------------- */
export default function buildAssignmentsFromTimecards(timecards, empIndexByCode) {
  const src = Array.isArray(timecards) ? timecards : [];
  const empIdx = empIndexByCode instanceof Map ? empIndexByCode : new Map();
  if (src.length === 0) return [];

  // detect span rows (includes DTO start/end)
  let looksLikeSpans = false;
  for (let i = 0; i < src.length; i++) {
    const r = src[i];
    if (
      r &&
      (r.start !== undefined ||
        r.end !== undefined ||
        r.start_date !== undefined ||
        r.startDate !== undefined ||
        r.end_date_excl !== undefined ||
        r.endDateExcl !== undefined ||
        r.endExclusive !== undefined)
    ) {
      looksLikeSpans = true;
      break;
    }
  }

  const out = [];

  if (looksLikeSpans) {
    // ---------- spans path ----------
    const spans = [];
    for (let i = 0; i < src.length; i++) {
      const r = src[i];
      const code = empCodeOf(r);
      if (!code) continue;

      const start = parseDateLoose(truthyPick(getCI(r, "startDate", "start_date", "start")));
      let endExcl = parseDateLoose(
        truthyPick(getCI(r, "endDateExcl", "end_date_excl", "endExclusive", "end"))
      );
      if (!start) continue;
      if (!endExcl || endExcl.getTime() <= start.getTime()) endExcl = addDays(start, 1);

      const emp = empIdx.get(code);
      const employee = emp ? empNameOf(emp, r) : empNameOf(null, r);
      const employeeId = emp ? empIdOf(emp) : null;
      const proj = projectKeyOf(r);

      spans.push({
        employee,
        employeeId,
        employeeCode: code,
        project: proj,
        projectRaw: proj,
        start,
        end: endExcl, // exclusive end
        meta: {
          dist_job_code: truthyPick(getCI(r, "distJobCode", "dist_job_code")) || null,
          dist_job_desc: truthyPick(getCI(r, "distJobDesc", "dist_job_desc")) || null,
          dist_activity_code: truthyPick(getCI(r, "distActivityCode", "dist_activity_code")) || null,
          dist_activity_desc: truthyPick(getCI(r, "distActivityDesc", "dist_activity_desc")) || null,
          allocation_code: truthyPick(getCI(r, "allocationCode", "allocation_code")) || null,
          home_allocation: truthyPick(getCI(r, "homeAllocation", "home_allocation")) || null,
          total_hours:
            r?.totalHours !== undefined
              ? r.totalHours
              : r?.total_hours !== undefined
              ? r.total_hours
              : r?.earn_hours !== undefined
              ? r.earn_hours
              : null,
        },
      });
    }
    return mergeAdjacentSpans(spans); // merge 1-day spans into multi-day spans
  }

  // ---------- daily rows path ----------
  const SEP = "__SEP__";
  const buckets = new Map(); // key → Set(epochDays)
  const rowMeta = new Map(); // key → meta

  for (let i = 0; i < src.length; i++) {
    const r = src[i];
    const code = empCodeOf(r);
    if (!code) continue;

    const day =
      parseDateLoose(getCI(r, "work_date")) ||
      parseDateLoose(getCI(r, "in_punch_time", "inPunchTime")) ||
      parseDateLoose(getCI(r, "out_punch_time", "outPunchTime")) ||
      parseDateLoose(getCI(r, "start")) ||
      parseDateLoose(getCI(r, "end"));
    if (!day) continue;

    const proj = projectKeyOf(r);
    const key = String(code) + SEP + String(proj);

    let set = buckets.get(key);
    if (!set) {
      set = new Set();
      buckets.set(key, set);
    }
    set.add(day.getTime());

    rowMeta.set(key, {
      dist_job_code: truthyPick(getCI(r, "distJobCode", "dist_job_code")) || null,
      dist_job_desc: truthyPick(getCI(r, "distJobDesc", "dist_job_desc")) || null,
      dist_activity_code: truthyPick(getCI(r, "distActivityCode", "dist_activity_code")) || null,
      dist_activity_desc: truthyPick(getCI(r, "distActivityDesc", "dist_activity_desc")) || null,
      allocation_code: truthyPick(getCI(r, "allocationCode", "allocation_code")) || null,
      home_allocation: truthyPick(getCI(r, "homeAllocation", "home_allocation")) || null,
    });
  }

  for (const [key, daySet] of buckets.entries()) {
    const sepIdx = key.indexOf(SEP);
    const code = key.slice(0, sepIdx);
    const proj = key.slice(sepIdx + SEP.length);

    const emp = empIdx.get(code);
    const employee = emp ? empNameOf(emp) : "Unknown";
    const employeeId = emp ? empIdOf(emp) : null;

    const days = Array.from(daySet).sort((a, b) => a - b);
    if (days.length === 0) continue;

    let spanStart = new Date(days[0]);
    let prev = new Date(days[0]);

    for (let i = 1; i <= days.length; i++) {
      const cur = i < days.length ? new Date(days[i]) : null;
      const isContiguous = !!cur && cur.getTime() - prev.getTime() === DAY;

      if (!isContiguous) {
        out.push({
          employee,
          employeeId,
          employeeCode: code,
          project: proj,
          projectRaw: proj,
          start: spanStart,
          end: addDays(prev, 1), // exclusive end
          meta: rowMeta.get(key) || {},
        });
        if (cur) spanStart = cur;
      }
      if (cur) prev = cur;
    }
  }

  return out;
}
