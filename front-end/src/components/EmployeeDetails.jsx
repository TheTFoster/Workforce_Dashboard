// src/components/EmployeeDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import styles from "../stylesheets/EmployeeDetails.module.css";
import { toast } from "react-toastify";
import profileDefault from "../assets/profile-default.svg";
import homeIcon from "../assets/home.svg";
import dbIcon from "../assets/database.svg";
import { useLoading } from "../context/LoadingContext";

function EmployeeDetails() {
  const { employeeid } = useParams();
  const navigate = useNavigate();
  const { start, stop, setMessage } = useLoading();
  const [employee, setEmployee] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [error, setError] = useState(null);

  const [actions, setActions] = useState([]);
  const [actionCat, setActionCat] = useState(null); // null = all

  // server-side timeline (optional)
  const [timelineEvents, setTimelineEvents] = useState([]); // [{eventType, eventDate}]

  // timecards
  const [tcLatest, setTcLatest] = useState(null); // { last, jobCode, jobDesc, location }
  const [tcSpans, setTcSpans] = useState([]); // [{start,end,jobCode,jobDesc,activity,hours}]
  // Collapsible weeks (true = collapsed). Keyed by weekStart ISO.
  const [collapsedWeeks, setCollapsedWeeks] = useState({});

  /* ------------------------------ helpers ------------------------------ */

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
  const g = (...keys) => (employee ? getCI(employee, ...keys) : null);

  const formatDate = (dateLike) => {
    if (!dateLike) return "—";
    const d = new Date(dateLike);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US");
  };

  const sameDay = (a, b) =>
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const formatDateDow = (dateLike) => {
    if (!dateLike) return "—";
    const d = new Date(dateLike);
    if (isNaN(d)) return "—";
    const dow = d.toLocaleDateString("en-US", { weekday: "short" });
    const dom = d.toLocaleDateString("en-US");
    return `${dow} ${dom}`;
  };

  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return "No Number Entered.";
    const text = String(phoneNumber).trim();
    const extMatch = text.match(/\b(?:ext(?:ension)?\.?|x)\s*(\d+)\b/i);
    const ext = extMatch ? ext[1] : "";
    const digits = text.replace(/\D/g, "");

    let display;
    if (digits.length === 11 && digits.startsWith("1")) {
      const a = digits.slice(1, 4),
        b = digits.slice(4, 7),
        c = digits.slice(7);
      display = `+1 (${a}) ${b}-${c}`;
    } else if (digits.length === 10) {
      const a = digits.slice(0, 3),
        b = digits.slice(3, 6),
        c = digits.slice(6);
      display = `(${a}) ${b}-${c}`;
    } else if (digits.length === 7) {
      display = `${digits.slice(0, 3)}-${digits.slice(3)}`;
    } else if (digits.length > 11) {
      const last10 = digits.slice(-10);
      display = `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(
        6
      )}`;
    } else {
      return text;
    }
    return ext ? `${display} x${ext}` : display;
  };

  const toDateSafe = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d) ? null : d;
  };

  const safeParseArray = (str) => {
    if (!str) return [];
    try {
      const parsed = typeof str === "string" ? JSON.parse(str) : str;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const formatUSD = (v) => {
    if (v == null || v === "") return null;
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
  };

  const titleCase = (s) =>
    !s ? "" : s.toLowerCase().replace(/\b([a-z])/g, (m, c) => c.toUpperCase());

  const getPay = (emp) => {
    const rate =
      getCI(
        emp,
        "rate_1",
        "rate1",
        "hourlyRate",
        "hourly_rate",
        "payRate",
        "pay_rate",
        "wage",
        "wage_hourly"
      ) ?? null;
    const type = (getCI(emp, "payType", "pay_type") ?? "Hourly").toString();
    const effective =
      getCI(emp, "payRateEffectiveDate", "pay_rate_effective_date") ?? null;
    return { rate, type, effective };
  };

  const isLeasedLabor = (emp) => {
    const hay = [
      getCI(emp, "positionType"),
      getCI(emp, "businessTitle"),
      getCI(emp, "departmentDesc", "department_desc"),
      getCI(emp, "workGroup"),
      getCI(emp, "payrollProfileDesc", "payroll_profile_desc"),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return /(leased|lease|temp|contract)/i.test(hay);
  };

  const computeCurrentSite = (emp) => {
    const jobDesc = getCI(emp, "jobDesc", "job_desc");
    const unassigned = jobDesc && /unassigned/i.test(jobDesc);
    const timecard = emp?.timecardLastSite;
    const workLoc =
      getCI(emp, "workLocation", "work_location") ||
      getCI(emp, "workLocationCity", "work_location_city");
    const project = getCI(emp, "project", "work_project");
    const jobNum =
      getCI(emp, "lastJobCode") || getCI(emp, "jobNumber", "job_num");

    if (isLeasedLabor(emp)) {
      if (jobDesc && !unassigned) return jobDesc;
      if (timecard) return timecard;
      return workLoc || project || jobNum || "—";
    }
    return timecard || workLoc || project || jobNum || "—";
  };

  const toggleLevel = (level) => {
    setSelectedLevel((prevLevel) => (prevLevel === level ? null : level));
  };

  // --- timecard helpers ---
  function normalizeLatest(rec) {
    if (!rec) return null;
    return {
      jobCode: rec.jobNumber || rec.job_code || rec.jobCode,
      jobDesc: rec.project || rec.job_desc || rec.jobDesc,
      location:
        rec.locationText ||
        rec.location_text ||
        rec.workLocation ||
        rec.work_location ||
        "",
      last:
        rec.lastWorkedAt ||
        rec.last ||
        rec.ts ||
        rec.last_worked_at ||
        rec.last_work_date,
    };
  }

  // Treat backend timecard timestamps as local wall-clock times.
  // We strip off any 'Z' / timezone and build a Date in local time.
  function parseLocalDateTime(raw, fallbackDate) {
    if (!raw && !fallbackDate) return null;
    if (raw instanceof Date) return raw;

    const s = String(raw ?? "").trim();
    if (!s) return null;

    // 1) Full datetime: 2025-11-10 06:30:00 or 2025-11-10T06:30:00Z
    const m = s.match(
      /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/
    );
    if (m) {
      const [, y, mo, d, hh, mm, ss] = m;
      return new Date(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(hh),
        Number(mm),
        ss ? Number(ss) : 0
      );
    }

    // 2) Time-only, e.g. "1300" or "07:30"; use work_date as the calendar day.
    const t = s.match(/^(\d{1,2})(?::?(\d{2}))$/);
    if (t && fallbackDate) {
      const [, hh, mm] = t;
      const [y, mo, d] = String(fallbackDate)
        .slice(0, 10)
        .split("-")
        .map((n) => parseInt(n, 10));
      if (y && mo && d) {
        return new Date(y, mo - 1, d, Number(hh), Number(mm || 0), 0);
      }
    }

    // 3) Fallback: let JS try; if it fails, give up
    const d2 = new Date(s);
    return isNaN(d2.getTime()) ? null : d2;
  }

  // Normalize each span and tag whether hours came from punches
  function normalizeSpan(s, eeFallback) {
    // normalized employee code
    const ee = s.eeCode ?? s.ee_code ?? s.employeeCode ?? s.emp_code ?? null;

    const startRaw =
      s.in_punch_time ??
      s.start ??
      s.startDate ??
      s.start_date ??
      s.weekStart ??
      s.day ??
      s.date ??
      null;

    const endRaw =
      s.out_punch_time ??
      s.end ??
      s.endDate ??
      s.end_date ??
      s.endDateExcl ??
      s.end_date_excl ??
      s.weekEnd ??
      startRaw ??
      null;

    // Work date (Mon–Sun grouping uses this)
    const workDate = s.work_date ?? s.workDate ?? s.date ?? null;

    // *** KEY CHANGE: parse as local wall-clock ***
    const start = parseLocalDateTime(startRaw, workDate);
    const end = parseLocalDateTime(endRaw, workDate);

    const jobCode =
      s.dist_job_code ??
      s.distJobCode ??
      s.job_code ??
      s.jobCode ??
      s.jobNumber ??
      s.job_number ??
      null;

    const jobDesc =
      s.dist_job_desc ??
      s.distJobDesc ??
      s.job_desc ??
      s.jobDesc ??
      s.project ??
      s.project_desc ??
      null;

    const activity =
      s.dist_activity_desc ??
      s.distActivityDesc ??
      s.activityDesc ??
      s.activity ??
      s.earn_code_desc ??
      s.earnCodeDesc ??
      "";

    // preferred: time-diff when punches exist, else reported
    let hours = null;
    let punchHours = null;

    if (start && end) {
      const diffH = (end.getTime() - start.getTime()) / 36e5;
      if (Number.isFinite(diffH) && diffH >= 0) {
        hours = diffH;
        punchHours = diffH;
      }
    }

    if (hours == null) {
      const raw =
        s.totalHours ??
        s.total_hours ??
        s.hours ??
        s.earn_hours ??
        s.earnHours ??
        s.units;
      if (raw != null && String(raw).trim() !== "") {
        const parsed = Number.parseFloat(String(raw).replace(/[^\d.-]/g, ""));
        if (Number.isFinite(parsed)) hours = parsed;
      }
    }
    if (hours == null) hours = 0;

    return {
      eeCode: ee,
      start,
      end,
      workDate,
      jobCode,
      jobDesc,
      activity,
      hours,
      punchHours, // > 0 only when punches exist
    };
  }

  // GET endpoints
  async function tryFetchLatest(ee) {
    try {
      const { data } = await api.get(
        `/api/v1/timecards/latest/${encodeURIComponent(ee)}`,
        { params: { windowDays: 180 } }
      );
      return normalizeLatest(data);
    } catch (e) {
      try {
        const { data } = await api.post(`/api/v1/timecards/latest-by-emp`, {
          empCodes: [ee],
        });
        const rec =
          data?.predictions?.[ee] ?? data?.result?.[ee] ?? data?.[ee] ?? null;
        return normalizeLatest(rec);
      } catch {
        return null;
      }
    }
  }

  async function tryFetchSpans({ ee, start, end, limit = 200 }) {
    const eeWanted = String(ee || "")
      .trim()
      .toUpperCase();
    if (!eeWanted) return [];

    const params = {
      ee: eeWanted,
      start:
        start instanceof Date ? start.toISOString().slice(0, 10) : undefined,
      end: end instanceof Date ? end.toISOString().slice(0, 10) : undefined,
      limit,
    };

    let rows = [];
    try {
      const { data } = await api.get("/api/v1/timecards/by-emp", { params });
      rows = Array.isArray(data) ? data : data?.rows || [];
    } catch (err) {
      console.error("Failed to fetch timecard spans /by-emp", err);
      rows = [];
    }

    const keep = rows
      .map((r) => normalizeSpan(r, eeWanted))
      .filter(
        (r) =>
          r.eeCode && r.eeCode.toUpperCase() === eeWanted && (r.start || r.end)
      );

    keep.sort(
      (a, b) =>
        (b.start?.getTime() || 0) - (a.start?.getTime() || 0) ||
        (b.end?.getTime() || 0) - (a.end?.getTime() || 0)
    );

    return keep.slice(0, limit);
  }

  /* ------------------------------ data fetch ------------------------------ */

  useEffect(() => {
    if (!employeeid) return;

    let cancelled = false;

    // clear any previous error and show global loading message
    setError(null);
    setMessage("Loading employee details...");
    start();

    api
      // match EmployeeController: @RequestMapping("/api/v1/employee") + @GetMapping("/id/{id}")
      .get(`/api/v1/employee/id/${employeeid}`, {
        // override axios default (30s) for this heavy call
        timeout: 120000, // 2 minutes; bump higher if you need
      })
      .then((res) => {
        if (cancelled) return;
        setEmployee(res.data);
        setMessage(null);
      })
      .catch((err) => {
        if (cancelled) return;

        const status = err?.response?.status;

        // ECONNABORTED = axios client-side timeout
        if (err.code === "ECONNABORTED") {
          console.warn(
            "Employee details request timed out:",
            err.config?.url,
            `(timeout ${err.config?.timeout}ms)`
          );
          setError("Employee details request timed out.");
          setMessage("Employee details request timed out.");
        } else {
          // only scream in console for *real* server/network problems
          if (status !== 404) {
            console.error("Failed to fetch employee details", err);
          }

          if (status === 404) {
            setError("Employee not found.");
          } else {
            setError("Failed to load employee details.");
          }
          setMessage("Failed to load employee details.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          stop();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [employeeid, start, stop, setMessage]);

  useEffect(() => {
    if (!employeeid) return;

    let cancelled = false;
    // tie timeline load into global loader, but don't touch the message
    start();

    const loadTL = async () => {
      try {
        const { data } = await api.get(
          `/api/v1/employee/${employeeid}/timeline`
        );
        if (cancelled) return;
        setTimelineEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        if (cancelled) return;

        const status = err?.response?.status;
        // Timeline is optional – 404 just means "no events" and
        // shouldn't scream in the console.
        if (status && status !== 404) {
          console.error("Failed to fetch employee timeline", err);
        }
        setTimelineEvents([]);
      } finally {
        if (!cancelled) {
          stop();
        }
      }
    };

    loadTL();

    return () => {
      cancelled = true;
    };
  }, [employeeid, start, stop]);

  useEffect(() => {
    let cancelled = false;

    const loadTC = async () => {
      if (!employee) {
        setTcLatest(null);
        setTcSpans([]);
        return;
      }

      const ee = g("employeeCode", "employee_code", "emp_code", "empCode");
      if (!ee) {
        setTcLatest(null);
        setTcSpans([]);
        return;
      }

      // timecards are heavy – keep the global loader up while they load
      start();

      try {
        // latest card
        try {
          const latest = await tryFetchLatest(ee);
          if (!cancelled) setTcLatest(latest);
        } catch {
          if (!cancelled) setTcLatest(null);
        }

        // 90-day window, grouped by week/day
        try {
          const end = new Date();
          const startRange = new Date(end.getTime() - 90 * 86400000); // last 90 days
          const spans = await tryFetchSpans({
            ee,
            start: startRange,
            end,
            limit: 400,
          });
          if (!cancelled) setTcSpans(spans);
        } catch {
          if (!cancelled) setTcSpans([]);
        }
      } finally {
        if (!cancelled) {
          stop();
        }
      }
    };

    loadTC();

    return () => {
      cancelled = true;
    };
  }, [employee, start, stop]);

  // Initialize collapsedWeeks so only the 2 most recent weeks are open
  useEffect(() => {
    if (!tcSpans || tcSpans.length === 0) {
      setCollapsedWeeks({});
      return;
    }

    setCollapsedWeeks((prev) => {
      // If user has already toggled weeks, don't override
      if (prev && Object.keys(prev).length > 0) {
        return prev;
      }

      const iso = (d) => (d ? d.toISOString().slice(0, 10) : "");
      const getMonStart = (date) => {
        if (!date) return null;
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const day = d.getDay(); // 0..6 (Sun..Sat)
        const offset = (day + 6) % 7; // 0 for Mon, 6 for Sun
        d.setDate(d.getDate() - offset);
        return d;
      };

      const weekMap = new Map(); // iso -> Date

      for (const s of tcSpans) {
        const pivot = s.workDate
          ? new Date(s.workDate + "T12:00:00")
          : s.start || s.end;
        if (!pivot) continue;
        const ws = getMonStart(pivot);
        if (!ws) continue;
        const key = iso(ws);
        if (!weekMap.has(key)) {
          weekMap.set(key, ws);
        }
      }

      const sortedWeeks = Array.from(weekMap.entries())
        .map(([isoKey, ws]) => ({ iso: isoKey, weekStart: ws }))
        .sort((a, b) => b.weekStart - a.weekStart); // newest first

      const next = {};
      sortedWeeks.forEach((w, idx) => {
        const key = `wk_${w.iso}`;
        // first two weeks: open (false); others: collapsed (true)
        next[key] = idx >= 2;
      });

      return next;
    });
  }, [tcSpans]);

  /* ------------------------------ actions ------------------------------ */

  const handleDelete = async () => {
    if (!employeeid) {
      console.error("Employee ID is missing.");
      toast.error("Employee ID is missing. Cannot delete.");
      return;
    }
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this employee?"
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/api/v1/employee/id/${employeeid}`);
      toast.success("Employee deleted successfully!");
      navigate("/home");
    } catch (err) {
      console.error("Failed to delete employee", err);
      toast.error("Failed to delete employee. Please try again.");
    }
  };

  const handleEdit = () => {
    const eid = g("employeeid", "id", "emp_id");
    if (eid) navigate(`/employee/${eid}/edit`);
  };
  const handleReturnHome = () => navigate("/home");

  /* ------------------------------ timeline (visual + list) ------------------------------ */

  const getTimelineItems = () => {
    const work = safeParseArray(g("workHistory", "work_history"));
    const transfers = safeParseArray(g("transferHistory", "transfer_history"));

    const items = [];

    for (const w of work) {
      const s = toDateSafe(w.startDate) || toDateSafe(w.endDate);
      const e = toDateSafe(w.endDate) || toDateSafe(w.startDate);
      if (!s && !e) continue;
      items.push({
        kind: "work",
        start: s,
        end: e,
        title: w.project || w.role || "Work",
        role: w.role || "",
        location: w.location || "",
        notes: w.notes || "",
      });
    }

    for (const t of transfers) {
      const d = toDateSafe(t.date);
      if (!d) continue;
      items.push({
        kind: "transfer",
        date: d,
        from: t.from || "",
        to: t.to || "",
        title:
          t.from || t.to
            ? `${t.from || "Unknown"} → ${t.to || "Unknown"}`
            : "Transfer",
        notes: t.notes || "",
      });
    }

    for (const e of timelineEvents) {
      const d = toDateSafe(e.eventDate);
      if (!d) continue;
      const type = String(e.eventType || "").toLowerCase();
      let title = "Event";
      if (type === "hire") title = "Date of Hire";
      else if (type === "last_worked") title = "Last Worked";
      else if (type === "termination") title = "Termination";
      else if (type === "transfer") title = "Transfer";

      items.push({
        kind: "transfer",
        date: d,
        from: "",
        to: "",
        title,
        notes: "",
      });
    }

    const addPoint = (date, title) => {
      const d = toDateSafe(date);
      if (d) items.push({ kind: "transfer", date: d, title, from: "", to: "" });
    };
    if (timelineEvents.length === 0) {
      addPoint(
        g("hireDate", "hire_date", "startDate", "start_date"),
        "Date of Hire"
      );
      addPoint(g("lastWorkedDate", "last_worked_date"), "Last Worked");
      addPoint(g("transferDate", "transfer_date"), "Transfer");
      addPoint(
        g("terminationDateCanonical", "termination_date_canonical"),
        "Termination"
      );
    }

    items.sort((a, b) => {
      const da = a.kind === "work" ? a.start || a.end : a.date;
      const db = b.kind === "work" ? b.start || b.end : b.date;
      return da - db;
    });
    return items;
  };

  const renderTimelineVisual = () => {
    const items = getTimelineItems();
    if (!items.length) return <p>No history captured yet.</p>;

    let minD = null,
      maxD = null;
    for (const it of items) {
      const ds = it.kind === "work" ? it.start || it.end : it.date;
      const de = it.kind === "work" ? it.end || it.start : it.date;
      if (ds) minD = !minD || ds < minD ? ds : minD;
      if (de) maxD = !maxD || de > maxD ? de : maxD;
    }
    if (!minD || !maxD) return <p>No history captured yet.</p>;
    if (minD.getTime() === maxD.getTime()) {
      minD = new Date(minD.getTime() - 15 * 86400000);
      maxD = new Date(maxD.getTime() + 15 * 86400000);
    }

    const VB_W = 1000;
    const VB_H = 180;
    const PAD_L = 60;
    const PAD_R = 30;
    const AXIS_Y = 80;
    const spanY = 62;
    const barH = 18;
    const dotY = 70;

    const domain = maxD.getTime() - minD.getTime();
    const xScale = (d) =>
      PAD_L +
      ((d.getTime() - minD.getTime()) / domain) * (VB_W - PAD_L - PAD_R);

    const TICKS = 5;
    const ticks = Array.from({ length: TICKS + 1 }, (_, i) => {
      const t = new Date(minD.getTime() + (domain * i) / TICKS);
      return { x: xScale(t), label: t.toLocaleDateString("en-US") };
    });

    const EDGE_PAD = 80;
    const anchorForX = (x) => {
      if (x < PAD_L + EDGE_PAD) return { anchor: "start", dx: 6 };
      if (x > VB_W - PAD_R - EDGE_PAD) return { anchor: "end", dx: -6 };
      return { anchor: "middle", dx: 0 };
    };

    const ellipsize = (s, maxChars) => {
      if (!s) return "";
      if (s.length <= maxChars) return s;
      return s.slice(0, Math.max(0, maxChars - 1)) + "…";
    };

    const charsForWidth = (w) => {
      const padding = 12;
      const avail = Math.max(0, w - padding * 2);
      const pxPerChar = 6.5;
      return Math.floor(avail / pxPerChar);
    };

    const legend = [
      { kind: "work", label: "Work (date span)" },
      { kind: "transfer", label: "Transfer / Key Event" },
    ];

    return (
      <div className={styles.timelineContainer}>
        <svg
          className={styles.timelineSvg}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Work and transfer timeline"
        >
          <line
            x1={PAD_L}
            y1={AXIS_Y}
            x2={VB_W - PAD_R}
            y2={AXIS_Y}
            className={styles.tlAxis}
          />

          {ticks.map((t, i) => (
            <g key={`tick-${i}`} transform={`translate(${t.x},0)`}>
              <line y1={AXIS_Y - 6} y2={AXIS_Y + 6} className={styles.tlTick} />
              <text
                y={AXIS_Y + 26}
                className={styles.tlTickLabel}
                textAnchor="middle"
              >
                {t.label}
              </text>
            </g>
          ))}

          {items
            .filter((it) => it.kind === "work")
            .map((it, idx) => {
              const s = it.start || it.end;
              const e = it.end || it.start || s;
              const x1 = xScale(s);
              const x2 = xScale(e);
              const w = Math.max(2, Math.abs(x2 - x1));
              const x = Math.min(x1, x2);
              const mid = x + w / 2;

              const aTop = anchorForX(mid);
              const maxChars = charsForWidth(w);
              const locText =
                maxChars >= 4 ? ellipsize(it.location || "", maxChars) : "";

              return (
                <g key={`w-${idx}`}>
                  <rect
                    x={x}
                    y={spanY}
                    width={w}
                    height={barH}
                    rx={4}
                    className={styles.tlWork}
                  />
                  <text
                    x={mid}
                    y={spanY - 6}
                    dx={aTop.dx}
                    className={`${styles.tlBarLabel} ${styles.tlHalo}`}
                    textAnchor={aTop.anchor}
                  >
                    {it.title}
                  </text>
                  {locText && (
                    <text
                      x={mid}
                      y={spanY + barH / 2 + 4}
                      className={`${styles.tlInBar} ${styles.tlHalo}`}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {locText}
                    </text>
                  )}
                </g>
              );
            })}

          {items
            .filter((it) => it.kind === "transfer")
            .map((it, idx) => {
              const x = xScale(it.date);
              const lineTopY = 36;
              const labelY = lineTopY - 6;
              const aTop = anchorForX(x);
              const route =
                it.title ||
                (it.from || it.to
                  ? `${it.from || "Unknown"} → ${it.to || "Unknown"}`
                  : "Transfer");

              return (
                <g key={`t-${idx}`}>
                  <circle
                    cx={x}
                    cy={dotY}
                    r={5}
                    className={styles.tlTransfer}
                  />
                  <line
                    x1={x}
                    y1={dotY - 12}
                    x2={x}
                    y2={lineTopY}
                    className={styles.tlLeader}
                  />
                  <text
                    x={x}
                    y={labelY}
                    dx={aTop.dx}
                    className={`${styles.tlDotLabel} ${styles.tlHalo}`}
                    textAnchor={aTop.anchor}
                  >
                    {route}
                  </text>
                </g>
              );
            })}
        </svg>

        <div className={styles.timelineLegend} aria-hidden="true">
          {legend.map((l) => (
            <div key={l.kind} className={styles.legendItem}>
              <span
                className={
                  l.kind === "work" ? styles.legendWork : styles.legendTransfer
                }
              />
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTimeline = () => {
    const items = getTimelineItems();
    if (items.length === 0) return <p>No history captured yet.</p>;

    const list = items.map((it) => {
      if (it.kind === "work") {
        return {
          type: "work",
          when: it.start || it.end,
          startDate: it.start,
          endDate: it.end,
          title: it.title,
          location: it.location,
          role: it.role,
          notes: it.notes,
        };
      }
      return {
        type: "transfer",
        when: it.date,
        date: it.date,
        from: it.from,
        to: it.to,
        title:
          it.title ||
          (it.from || it.to
            ? `${it.from || ""} → ${it.to || ""}`.trim()
            : "Transfer"),
        notes: it.notes,
      };
    });

    list.sort((a, b) => a.when - b.when);

    return (
      <div className={styles.levelInfo}>
        {list.map((item, idx) => (
          <div key={`tl-${idx}`} className={styles.infoItem}>
            <div>
              <span className={styles.infoLabel}>
                {item.type === "work" ? "Work" : "Event"}:
              </span>{" "}
              <strong>{item.title}</strong>
            </div>
            <div>
              <span className={styles.infoLabel}>When:</span>{" "}
              {item.type === "work"
                ? `${formatDate(item.startDate)} – ${formatDate(item.endDate)}`
                : formatDate(item.date)}
            </div>
            {item.type === "work" && item.location && (
              <div>
                <span className={styles.infoLabel}>Location:</span>{" "}
                {item.location}
              </div>
            )}
            {item.type === "work" && item.role && (
              <div>
                <span className={styles.infoLabel}>Role:</span> {item.role}
              </div>
            )}
            {item.type === "transfer" && (item.from || item.to) && (
              <div>
                <span className={styles.infoLabel}>Route:</span>{" "}
                {item.from || "Unknown"} → {item.to || "Unknown"}
              </div>
            )}
            {item.notes && (
              <div>
                <span className={styles.infoLabel}>Notes:</span> {item.notes}
              </div>
            )}
            <hr />
          </div>
        ))}
      </div>
    );
  };

  /* ------------------------------ derived display values ------------------------------ */

  /* ------------------------------ derived display values ------------------------------ */

  if (error) {
    return (
      <div className={styles.loadingShell}>
        <div className={styles.loadingCard}>
          <div className={styles.loadingHeaderRow}>
            <img src={dbIcon} alt="DB Icon" className={styles.loadingDbIcon} />
            <div>
              <div className={styles.loadingAppName}>Employee Database</div>
              <div className={styles.loadingTagline}>Something went wrong</div>
            </div>
          </div>

          <div className={styles.loadingBody}>
            <div className={styles.loadingSpinner} />
            <div className={styles.loadingTitle}>Failed to load details</div>
            <div className={styles.loadingSubtitle}>{error}</div>
            <button
              type="button"
              className={styles.loadingButton}
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className={styles.loadingShell}>
        <div className={styles.loadingCard}>
          <div className={styles.loadingHeaderRow}>
            <img src={dbIcon} alt="DB Icon" className={styles.loadingDbIcon} />
            <div>
              <div className={styles.loadingAppName}>Employee Database</div>
              <div className={styles.loadingTagline}>
                Workforce view is warming up…
              </div>
            </div>
          </div>

          <div className={styles.loadingBody}>
            <div className={styles.loadingSpinner} />
            <div className={styles.loadingTitle}>Loading employee details</div>
            <div className={styles.loadingSubtitle}>
              Pulling Paycom + Workforce data for this employee.
            </div>

            <div className={styles.loadingSkeletonGrid}>
              <div className={styles.loadingSkeletonRow} />
              <div className={styles.loadingSkeletonRow} />
              <div className={styles.loadingSkeletonRow} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date();
  const asDate = (v) => (v ? new Date(v) : null);

  const hire =
    asDate(g("hireDate", "hire_date")) || asDate(g("startDate", "start_date"));
  const tenureMonths = hire
    ? Math.floor((today - hire) / (1000 * 60 * 60 * 24 * 30.4))
    : 0;
  const tenureLabel = hire
    ? `${Math.floor(tenureMonths / 12)}y ${tenureMonths % 12}m`
    : "—";

  const status =
    (g("employee_status", "employeeStatus") || "").toString().trim() || "—";
  const hasEnd = !!g("endDate", "end_date");
  const termCanon = g("terminationDateCanonical", "termination_date_canonical");
  const isActive = !hasEnd && !termCanon && /active/i.test(status);

  const jobNumberResolved =
    g("lastJobCode") || g("jobNumber", "job_num") || tcLatest?.jobCode || null;

  const lastWorkedResolved =
    g("lastWorkDate", "last_work_date") ||
    tcLatest?.last ||
    g("lastWorkedDate");

  const transferEffResolved =
    g("transferEffectiveDate", "transfer_effective_date") ||
    g("transferDate", "transfer_date");

  const endDateResolved =
    g("endDateResolved", "end_date_resolved") ||
    g("terminationDateCanonical", "termination_date_canonical") ||
    g("endDate", "end_date");

  const displayNameRaw =
    g(
      "displayName",
      "display_name",
      "empName",
      "emp_name",
      "employee_name",
      "name"
    ) ||
    [g("preferred_firstname"), g("legal_lastname")].filter(Boolean).join(" ") ||
    [g("legal_firstname"), g("legal_lastname")].filter(Boolean).join(" ") ||
    "Name Not Available";

  const displayName = titleCase(displayNameRaw);

  const ranked =
    g(
      "ranked",
      "empRank",
      "emp_rank",
      "positionTitle",
      "position_title",
      "position"
    ) || "Position Not Available";

  const phonePrimary = g(
    "primaryPhone",
    "primary_phone",
    "phoneNumber",
    "phone_num"
  );

  const employeeCodeCI = g(
    "employeeCode",
    "employee_code",
    "employee_code_norm",
    "employeeCodeNew"
  );
  const tixid =
    g("tixid", "tixId", "tixid_norm") || g("xid", "xid_norm") || null;

  const daysUntil = (d) => {
    const x = asDate(d);
    if (!x) return null;
    return Math.ceil((x - today) / (1000 * 60 * 60 * 24));
  };
  const licDays = daysUntil(
    g("licenseExpiration", "license_expiration", "driver_license_expiration")
  );
  const licClass =
    licDays == null
      ? ""
      : licDays < 0
      ? styles.bad
      : licDays < 30
      ? styles.warn
      : styles.ok;

  const deptLabel =
    g("workGroup") ||
    g("departmentDesc", "department_desc", "department") ||
    "Department Not Available";

  const currentSite =
    g("lastJobDesc") || tcLatest?.location || computeCurrentSite(employee);

  /* ------------------------------ render ------------------------------ */

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <img src={dbIcon} alt="DB Icon" style={{ width: 30 }} />
        <h1 className={styles.title}>Employee Database</h1>
        <button onClick={handleReturnHome} className={styles.homeButton}>
          <img src={homeIcon} alt="Home Icon" />
        </button>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.detailsCard}>
          <h2 className={styles.sectionTitle}>
            Employee Details{" - "}
            <span className={styles.department}>{deptLabel}</span>
          </h2>

          {/* Header profile */}
          <div className={styles.profileSection}>
            <img
              src={profileDefault}
              alt="Employee"
              className={styles.profileImage}
            />

            {/* Two-column identity header */}
            <div className={styles.identityCols}>
              {/* LEFT */}
              <div className={styles.identityColLeft}>
                <h3 className={styles.employeeName}>{displayName}</h3>
                <p className={styles.position}>{ranked}</p>
                <p className={styles.phone}>
                  {formatPhoneNumber(phonePrimary)}
                </p>
                <p className={styles.project}>Site: {currentSite}</p>

                <div className={styles.quickChips}>
                  <span
                    className={`${styles.chip} ${
                      isActive ? styles.ok : styles.warn
                    }`}
                  >
                    {g("employeeStatus", "employee_status") || "Status —"}
                  </span>
                  <span className={styles.chip}>Tenure: {tenureLabel}</span>
                  <span className={styles.chip}>
                    Position:{" "}
                    {g("positionTitle", "position_title") ||
                      "—" ||
                      g("businessTitle", "business_title")}
                  </span>
                  {g("managerLevel", "manager_level") && (
                    <span className={styles.chip}>
                      Mgr Lvl: {g("managerLevel", "manager_level")}
                    </span>
                  )}
                </div>
              </div>

              {/* RIGHT: Key IDs + Pay */}
              <aside className={styles.identityColRight}>
                <div className={styles.idCard}>
                  <h4 className={styles.idCardTitle}>Key IDs</h4>
                  <dl className={styles.idList}>
                    <dt>CEC ID</dt>
                    <dd>{employeeCodeCI || "—"}</dd>

                    <dt>TIXID</dt>
                    <dd>{tixid || "—"}</dd>

                    <dt>Badge #</dt>
                    <dd>{g("badgeNum", "badge_num") || "—"}</dd>

                    <dt>Job #</dt>
                    <dd>{jobNumberResolved || "—"}</dd>

                    <dt>GWA Tag</dt>
                    <dd>{g("gwaTagNum", "gwa_tag_num") || "—"}</dd>

                    <dt>iPad</dt>
                    <dd>{g("ipad") || "—"}</dd>

                    <dt>Laptop</dt>
                    <dd>{g("laptop") || "—"}</dd>
                  </dl>

                  {/* Pay */}
                  <div className={styles.payBlock}>
                    <div className={styles.payHeader}>Pay</div>
                    {(() => {
                      const p = getPay(employee);
                      const amt = formatUSD(p.rate);
                      return amt ? (
                        <div className={styles.payRow}>
                          <div className={styles.payAmt}>{amt}</div>
                          <div className={styles.payMeta}>
                            <div className={styles.payType}>{p.type}</div>
                            {p.effective && (
                              <div className={styles.payEff}>
                                Eff. {formatDate(p.effective)}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className={styles.payEmpty}>—</div>
                      );
                    })()}
                  </div>
                </div>
              </aside>
            </div>
          </div>

          {/* Level tabs */}
          <div className={styles.levelButtons}>
            {[
              "Level1",
              "Level2",
              "Level3",
              "Notes",
              "Files",
              "Timecards",
              "History",
              "CorrectiveAction",
            ].map((lab) => (
              <button
                key={lab}
                onClick={() => toggleLevel(lab)}
                className={
                  selectedLevel === lab
                    ? styles.activeButton
                    : styles.levelButton
                }
              >
                {lab.replace(/([A-Z])/g, " $1").trim()}
              </button>
            ))}
          </div>

          {selectedLevel && (
            <div className={styles.levelInfo}>{renderLevelInfo()}</div>
          )}

          {/* Contact & Location */}
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Work Email:</span>{" "}
              {g("workEmail", "work_email") ? (
                <a href={`mailto:${g("workEmail", "work_email")}`}>
                  {g("workEmail", "work_email")}
                </a>
              ) : (
                "—"
              )}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Personal Email:</span>{" "}
              {g("personalEmail", "personal_email") ? (
                <a href={`mailto:${g("personalEmail", "personal_email")}`}>
                  {g("personalEmail", "personal_email")}
                </a>
              ) : (
                "—"
              )}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Address:</span>{" "}
              {g("primaryAddressLine1", "primary_address_line_1") ? (
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://maps.google.com/?q=${encodeURIComponent(
                    `${
                      g("primaryAddressLine1", "primary_address_line_1") || ""
                    }${
                      g("primaryAddressLine2", "primary_address_line_2")
                        ? ", " +
                          g("primaryAddressLine2", "primary_address_line_2")
                        : ""
                    }, ${
                      g(
                        "primaryCityMunicipality",
                        "primary_city_municipality"
                      ) || ""
                    }, ${
                      g("primaryStateProvince", "primary_state_province") || ""
                    } ${
                      g("primaryZipPostalCode", "primary_zip_postal_code") || ""
                    }`
                  )}`}
                >
                  {g("primaryAddressLine1", "primary_address_line_1") || ""}
                  {g("primaryAddressLine2", "primary_address_line_2")
                    ? ", " + g("primaryAddressLine2", "primary_address_line_2")
                    : ""}
                  {", "}
                  {g("primaryCityMunicipality", "primary_city_municipality") ||
                    ""}
                  {", "}
                  {g("primaryStateProvince", "primary_state_province") ||
                    ""}{" "}
                  {g("primaryZipPostalCode", "primary_zip_postal_code") || ""}
                </a>
              ) : (
                "—"
              )}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Time Zone:</span>{" "}
              {g(
                "timeZoneCode",
                "time_zone_code",
                "timeZoneDescription",
                "time_zone_description"
              ) || "—"}
            </div>
          </div>

          {/* Org & Role */}
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Business Title:</span>{" "}
              {g("businessTitle", "business_title") || "—"}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Position Title:</span>{" "}
              {g("positionTitle", "position_title") || "—"}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Position Type:</span>{" "}
              {g("positionType", "position_type") || "—"}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Department:</span> {deptLabel}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Sub-Department:</span>{" "}
              {g("subDepartmentDesc", "sub_department_desc") || "—"}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Supervisor (Primary):</span>{" "}
              {g("supervisorPrimary", "supervisor_primary") ? (
                <button
                  className={styles.linkBtn}
                  onClick={() =>
                    navigate(
                      `/search?name=${encodeURIComponent(
                        g("supervisorPrimary", "supervisor_primary")
                      )}`
                    )
                  }
                >
                  {g("supervisorPrimary", "supervisor_primary")}
                </button>
              ) : (
                "—"
              )}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Supervisor (Secondary):</span>{" "}
              {g("supervisorSecondary", "supervisor_secondary") || "—"}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Sponsor:</span>{" "}
              {g("sponsor") || "—"}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Backup Sponsor:</span>{" "}
              {g("backupSponsor", "backup_sponsor") || "—"}
            </div>
          </div>

          {/* Core dates */}
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Date of Hire:</span>{" "}
              {formatDate(
                g("hireDate", "hire_date", "startDate", "start_date")
              )}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Last Worked:</span>{" "}
              {formatDate(lastWorkedResolved)}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Transfer (Eff.):</span>{" "}
              {formatDate(transferEffResolved)}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Termination:</span>{" "}
              {formatDate(
                g(
                  "terminationDateCanonical",
                  "termination_date_canonical",
                  "terminationDate",
                  "termination_date"
                )
              )}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>End Date:</span>{" "}
              {formatDate(endDateResolved)}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Transfer To:</span>{" "}
              {g("transferTo", "transfer_to_location") || "—"}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Transfer to Date:</span>{" "}
              {formatDate(g("transferToDate", "transfer_to_date"))}
            </div>

            {/* License */}
            <div className={`${styles.infoItem} ${licClass}`}>
              <span className={styles.infoLabel}>License:</span>{" "}
              {g("licenseType", "license_type", "driver_license_type") ? (
                <>
                  {g("licenseType", "license_type", "driver_license_type") ||
                    ""}{" "}
                  (
                  {g(
                    "carLicenseNum",
                    "car_license_num",
                    "driver_license_number"
                  ) || "—"}
                  ){" • "}Expires{" "}
                  {formatDate(
                    g(
                      "licenseExpiration",
                      "license_expiration",
                      "driver_license_expiration"
                    )
                  )}
                  {licDays != null ? ` (${licDays}d)` : ""}
                </>
              ) : (
                "—"
              )}
            </div>
          </div>

          {/* TI / SM1 / Blue Dot */}
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>SM1 BD Trained:</span>{" "}
              {g("sm1BlueDotTrained", "sm_one_blue_dot_trained") || "—"}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>SM1 BD Date:</span>{" "}
              {formatDate(g("sm1BDDate", "sm_one_bd_date"))}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>CEC SM1 Onboarding:</span>{" "}
              {g("cecSm1Onboarding", "cec_sm_one_onboarding") || "—"}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Onboarding Date:</span>{" "}
              {formatDate(g("cecSm1ObDate", "cec_sm_one_ob_date"))}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Fab or EW:</span>{" "}
              {g("fabOrEnergizedWork", "fab_or_energized_work") || "—"}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Shirt Size:</span>{" "}
              {g("shirtSize", "shirtsize") || "—"}
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Language:</span>{" "}
              {g(
                "essLanguagePreference",
                "ess_language_preference",
                "languageSpoken",
                "language_spoken"
              ) || "—"}
            </div>
          </div>

          {/* Provenance */}
          <div className={styles.metaChips}>
            <span className={`${styles.chip} ${styles.metaChip}`}>
              Last updated:{" "}
              {g("updatedAt", "updated_at")
                ? new Date(g("updatedAt", "updated_at")).toLocaleString()
                : "—"}
            </span>
            <span className={`${styles.chip} ${styles.metaChip}`}>
              Source: {g("lastSource", "last_source") || "—"}
            </span>
            <span className={`${styles.chip} ${styles.metaChip}`}>
              Batch: {g("lastBatchId", "last_batch_id") || "—"}
            </span>
          </div>

          {/* Actions */}
          <div className={styles.actionButtons}>
            <button onClick={handleDelete} className={styles.deleteButton}>
              Delete this Employee
            </button>
            <button onClick={handleEdit} className={styles.editButton}>
              Edit this Employee
            </button>
            <button onClick={handleReturnHome} className={styles.returnButton}>
              Return Home
            </button>
          </div>
        </div>
      </main>
    </div>
  );

  /* ------------------------------ Level tabs content ------------------------------ */
  function renderLevelInfo() {
    if (!employee || !selectedLevel) return null;
    const x = (a, b) => getCI(employee, a, b);

    switch (selectedLevel) {
      case "Level1":
        return (
          <div>
            <p>
              <strong>SS: </strong>
              {formatDate(x("lvl1SS", "level_one_ss"))}
            </p>
            <p>
              <strong>Material Handling: </strong>
              {formatDate(
                x("lvl1MaterialHandling", "level_one_material_handling")
              )}
            </p>
            <p>
              <strong>Ladder Safety: </strong>
              {formatDate(x("lvl1LadderSafety", "level_one_ladder_safety"))}
            </p>
            <p>
              <strong>Fall Protection: </strong>
              {formatDate(x("lvl1FallProtection", "level_one_fall_protection"))}
            </p>
            <p>
              <strong>Spotter Training: </strong>
              {formatDate(
                x("lvl1SpotterTraining", "level_one_spotter_training")
              )}
            </p>
            <p>
              <strong>Electrical Safety Awareness: </strong>
              {formatDate(
                x(
                  "lvl1ElectricalSafetyAwareness",
                  "level_one_electrical_safety_awareness"
                )
              )}
            </p>
            <p>
              <strong>LOTO: </strong>
              {formatDate(x("lvl1Loto", "level_one_loto"))}
            </p>
            <p>
              <strong>Energized Steps: </strong>
              {formatDate(x("lvl1EnergizedSteps", "level_one_energized_steps"))}
            </p>
            <p>
              <strong>2-Man Verify: </strong>
              {formatDate(x("lvl12MenVerify", "level_one_two_men_verify"))}
            </p>
            <p>
              <strong>Jack Stands: </strong>
              {formatDate(x("lvl1JackStands", "level_one_jack_stands"))}
            </p>
            <p>
              <strong>Cable Tray Rollers: </strong>
              {formatDate(
                x("lvl1CableTrayRollers", "level_one_cable_tray_rollers")
              )}
            </p>
            <p>
              <strong>Cable Cutting: </strong>
              {formatDate(x("lvl1CableCutting", "level_one_cable_cutting"))}
            </p>
            <p>
              <strong>Cable Stripping: </strong>
              {formatDate(x("lvl1CableStripping", "level_one_cable_stripping"))}
            </p>
          </div>
        );
      case "Level2":
        return (
          <div>
            <p>
              <strong>Cable Pullies Install: </strong>
              {formatDate(
                x("lvl2CablePulliesInstall", "level_two_cable_pullies_install")
              )}
            </p>
            <p>
              <strong>Cable Sock Selection: </strong>
              {formatDate(
                x("lvl2CableSockSelection", "level_two_cable_sock_selection")
              )}
            </p>
            <p>
              <strong>Cable Connector Install: </strong>
              {formatDate(
                x(
                  "lvl2CableConnectorInstall",
                  "level_two_cable_connector_install"
                )
              )}
            </p>
            <p>
              <strong>Cable Labeling: </strong>
              {formatDate(x("lvl2CableLabeling", "level_two_cable_labeling"))}
            </p>
            <p>
              <strong>Cable Megging: </strong>
              {formatDate(x("lvl2Megging", "level_two_megging"))}
            </p>
            <p>
              <strong>Crimping Procedures: </strong>
              {formatDate(
                x("lvl2CrimpingProcedures", "level_two_crimping_procedures")
              )}
            </p>
            <p>
              <strong>Drilling Holes: </strong>
              {formatDate(x("lvl2DrillingHoles", "level_two_drilling_holes"))}
            </p>
          </div>
        );
      case "Level3":
        return (
          <div>
            <p>
              <strong>Tool Feeds: </strong>
              {formatDate(x("lvl3ToolFeeds", "level_three_tool_feeds"))}
            </p>
            <p>
              <strong>Commissioning: </strong>
              {formatDate(x("lvl3Commissioning", "level_three_commissioning"))}
            </p>
            <p>
              <strong>Torqueing: </strong>
              {formatDate(x("lvl3Torqueing", "level_three_torqueing"))}
            </p>
            <p>
              <strong>Torque Seal: </strong>
              {formatDate(x("lvl3TorqueSeal", "level_three_torque_seal"))}
            </p>
            <p>
              <strong>Breaker Manipulation: </strong>
              {formatDate(
                x("lvl3BreakerManipulation", "level_three_breaker_manipulation")
              )}
            </p>
            <p>
              <strong>Turn Off Procedure: </strong>
              {formatDate(
                x("lvl3TurnOffProcedure", "level_three_turn_off_procedure")
              )}
            </p>
            <p>
              <strong>Turn On Procedures: </strong>
              {formatDate(
                x("lvl3TurnOnProcedures", "level_three_turn_on_procedures")
              )}
            </p>
            <p>
              <strong>Energize Permit: </strong>
              {formatDate(
                x("lvl3EnergizePermit", "level_three_energize_permit")
              )}
            </p>
            <p>
              <strong>QEW: </strong>
              {formatDate(x("lvl3QEW", "level_three_qew"))}
            </p>
          </div>
        );
      case "Notes":
        return (
          <div>
            <p>
              <strong>Notes:</strong>{" "}
              {g("notes", "emp_notes") || "Not Available"}
            </p>
            <p>
              <strong>More Notes:</strong>{" "}
              {g("moreNotes", "emp_more_notes") || "Not Available"}
            </p>
            <p>
              <strong>Car License Number:</strong>{" "}
              {g("carLicenseNum", "car_license_num", "driver_license_number") ||
                "Not Available"}
            </p>
            <p>
              <strong>License Type:</strong>{" "}
              {g("licenseType", "license_type", "driver_license_type") ||
                "Not Available"}
            </p>
            <p>
              <strong>License Expiration:</strong>{" "}
              {formatDate(
                g(
                  "licenseExpiration",
                  "license_expiration",
                  "driver_license_expiration"
                )
              ) || "Not Available"}
            </p>
            <p>
              <strong>GWA Tag Number:</strong>{" "}
              {g("gwaTagNum", "gwa_tag_num") || "Not Available"}
            </p>
            <p>
              <strong>Code To Clean:</strong>{" "}
              {g("codeToClean", "code_to_clean") || "Not Available"}
            </p>
            <p>
              <strong>Tech Name:</strong>{" "}
              {g("techName", "tech_name") || "Not Available"}
            </p>
            <p>
              <strong>Tech ID Number:</strong>{" "}
              {g("techIdNum", "tech_id_num") || "Not Available"}
            </p>
            <p>
              <strong>Shirt Size:</strong>{" "}
              {g("shirtSize", "shirtsize") || "Not Available"}
            </p>
            <p>
              <strong>Language Spoken:</strong>{" "}
              {g(
                "essLanguagePreference",
                "ess_language_preference",
                "languageSpoken",
                "language_spoken"
              ) || "Not Available"}
            </p>
          </div>
        );
      case "Files":
        if (g("filesForEmployee", "files_for_employee")) {
          const blob = g("filesForEmployee", "files_for_employee");
          const fileDataUrl = `data:application/octet-stream;base64,${blob}`;
          return (
            <div>
              <p>
                <strong>File:</strong>
              </p>
              <a href={fileDataUrl} target="_blank" rel="noopener noreferrer">
                View / Download File
              </a>
            </div>
          );
        } else {
          return <p>No files available</p>;
        }
      case "Timecards":
        return renderTimecards();
      case "History":
        return (
          <>
            {renderTimelineVisual()}
            <div style={{ marginTop: 12 }}>{renderTimeline()}</div>
          </>
        );
      case "CorrectiveAction":
        return renderCorrectiveAction();
      default:
        return null;
    }
  }

  // --- timecards renderer (collapsible weeks; no merging at all)
  function renderTimecards() {
    const latest = tcLatest;

    // utils
    const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-US") : "—");
    const fmtDow = (d) =>
      d ? new Date(d).toLocaleDateString("en-US", { weekday: "short" }) : "";

    // Time formatter - use the Date object as-is (already parsed in normalizeSpan)
    const fmtTime = (d) => {
      if (!d) return "—";

      // If it's already a Date object, just format it
      const date = d instanceof Date ? d : new Date(d);

      if (isNaN(date.getTime())) return "—";

      // Format as 12-hour time with AM/PM
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    };

    const iso = (d) => (d ? d.toISOString().slice(0, 10) : "");

    // Monday start for a given date
    const getMonStart = (date) => {
      if (!date) return null;
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const day = d.getDay(); // 0..6 (Sun..Sat)
      const offset = (day + 6) % 7; // 0 for Mon, 6 for Sun
      d.setDate(d.getDate() - offset);
      return d;
    };

    const keyForWeek = (ws) => `wk_${iso(ws)}`;
    const isCollapsed = (ws) => collapsedWeeks[keyForWeek(ws)] === true;
    const toggleWeek = (ws) =>
      setCollapsedWeeks((prev) => ({
        ...prev,
        [keyForWeek(ws)]: !isCollapsed(ws),
      }));

    // tcSpans now contains one span per CSV/DB row.
    // Group by Monday...Sunday using the span.workDate (or start/end).
    const buckets = new Map(); // weekStartISO -> { weekStart, weekEnd, days: Map<YYYY-MM-DD, {date, items:[], total:number}> }

    for (const s of tcSpans) {
      const pivot = s.workDate
        ? new Date(s.workDate + "T12:00:00") // noon to avoid TZ edge cases
        : s.start || s.end;
      if (!pivot) continue;

      const weekStart = getMonStart(pivot);
      const weekStartIso = iso(weekStart);

      if (!buckets.has(weekStartIso)) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        buckets.set(weekStartIso, { weekStart, weekEnd, days: new Map() });
      }
      const wb = buckets.get(weekStartIso);

      const dayDate = s.workDate
        ? new Date(s.workDate + "T12:00:00")
        : new Date(s.start || s.end);
      const dayKey = iso(dayDate);

      if (!wb.days.has(dayKey))
        wb.days.set(dayKey, { date: dayDate, items: [], total: 0 });

      const day = wb.days.get(dayKey);
      day.items.push(s);
      day.total += Number(s.hours ?? 0);
    }

    // sort weeks/days/items
    const weeks = Array.from(buckets.values()).sort(
      (a, b) => b.weekStart - a.weekStart // newest week first
    );
    for (const w of weeks) {
      w.weekTotal = 0;
      w.days = Array.from(w.days.values()).sort((a, b) => a.date - b.date);
      for (const d of w.days) {
        d.items.sort((a, b) => {
          const as = a.start ? new Date(a.start).getTime() : 0;
          const bs = b.start ? new Date(b.start).getTime() : 0;
          return as - bs;
        });
        w.weekTotal += d.total;
      }
    }

    return (
      <>
        {/* Latest row */}
        <div className={styles.listTable} style={{ marginBottom: 12 }}>
          <div className={styles.listRow}>
            <div style={{ fontWeight: 600, minWidth: 140 }}>
              Latest timecard
            </div>
            <div>
              <span className={styles.infoLabel}>Last Worked:</span>{" "}
              {fmtDate(latest?.last)}
            </div>
            <div>
              <span className={styles.infoLabel}>Job #:</span>{" "}
              {latest?.jobCode || "—"}
            </div>
            <div>
              <span className={styles.infoLabel}>Project:</span>{" "}
              {latest?.jobDesc || "—"}
            </div>
            <div>
              <span className={styles.infoLabel}>Location:</span>{" "}
              {latest?.location || "—"}
            </div>
          </div>
        </div>

        {/* Weeks (collapsible) */}
        {weeks.length === 0 ? (
          <div className={styles.listTable}>
            <div className={styles.listRow}>
              <div className={styles.muted}>
                No timecard rows in last 90 days.
              </div>
            </div>
          </div>
        ) : (
          weeks.map((w) => {
            const collapsed = isCollapsed(w.weekStart);
            const weekLabel =
              `Week: ${fmtDow(w.weekStart)} ${fmtDate(w.weekStart)} – ` +
              `${fmtDow(w.weekEnd)} ${fmtDate(
                w.weekEnd
              )} • Total: ${w.weekTotal.toFixed(2)} h`;

            return (
              <section
                className={styles.weekSection}
                key={keyForWeek(w.weekStart)}
              >
                <div className={styles.weekHeader}>
                  <button
                    type="button"
                    className={styles.weekToggle}
                    onClick={() => toggleWeek(w.weekStart)}
                    aria-expanded={!collapsed}
                  >
                    <span
                      className={
                        collapsed
                          ? styles.chev
                          : `${styles.chev} ${styles.chevOpen}`
                      }
                      aria-hidden="true"
                    />
                    <span>{weekLabel}</span>
                  </button>
                </div>

                {!collapsed && (
                  <div className={styles.weekBody}>
                    <div className={styles.weekGrid}>
                      {w.days.length === 0 ? (
                        <div className={styles.dayCell}>—</div>
                      ) : (
                        w.days.map((d) => (
                          <div className={styles.dayCell} key={iso(d.date)}>
                            <div style={{ fontWeight: 600, marginBottom: 6 }}>
                              {fmtDow(d.date)} {fmtDate(d.date)} • Day total:{" "}
                              {d.total.toFixed(2)} h
                            </div>

                            {d.items.length === 0 ? (
                              <div className={styles.muted}>—</div>
                            ) : (
                              d.items.map((it, idx) => (
                                <div
                                  key={`${iso(d.date)}_${idx}`}
                                  style={{ marginBottom: 8 }}
                                >
                                  <div>
                                    {fmtTime(it.start)} — {fmtTime(it.end)}
                                  </div>
                                  <div>
                                    {it.jobCode || "—"}
                                    {it.jobDesc ? ` — ${it.jobDesc}` : ""}
                                  </div>
                                  <div className={styles.muted}>
                                    {it.activity || "—"}
                                  </div>
                                  <div style={{ fontWeight: 600 }}>
                                    {Number(it.hours ?? 0).toFixed(2)}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </section>
            );
          })
        )}
      </>
    );
  }

  function renderCorrectiveAction() {
    const filtered =
      actionCat == null
        ? actions
        : actions.filter(
            (a) => String(a.category || "").toUpperCase() === actionCat
          );

    return (
      <div className={styles.levelInfo}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {["All", "Attendance", "Performance", "Behavior"].map((lab) => (
            <button
              key={lab}
              className={
                actionCat === (lab === "All" ? null : lab.toUpperCase())
                  ? styles.activeButton
                  : styles.levelButton
              }
              onClick={() =>
                setActionCat(lab === "All" ? null : lab.toUpperCase())
              }
            >
              {lab}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p>No corrective actions recorded.</p>
        ) : (
          <div className={styles.listTable}>
            {filtered.map((a) => (
              <div key={a.id} className={styles.listRow}>
                <div>
                  <strong>{a.category}</strong> • {formatDate(a.actionDate)}
                </div>
                <div>{a.summary || "—"}</div>
                <div className={styles.muted}>
                  {a.severity || "—"} • {a.status || "—"} • Issued by{" "}
                  {a.issuedBy || "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
}

export default EmployeeDetails;
