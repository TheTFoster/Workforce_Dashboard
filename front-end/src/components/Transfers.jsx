// src/components/Transfers.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import styles from "../stylesheets/Transfers.module.css";
import { toast } from "react-toastify";
import { BsArrowLeftRight, BsArrowUp } from "react-icons/bs";
import { CgCloseR, CgAirplane } from "react-icons/cg";
import { FaPlus } from "react-icons/fa";
import newBtnStyles from "../stylesheets/NewBtn.module.css";
import { FaCarSide, FaHouseUser } from "react-icons/fa6";
import { FaHome } from "react-icons/fa";
import { HiArrowCircleDown } from "react-icons/hi";
import { GrUserNew } from "react-icons/gr";
import Footer from "./Footer";

const EMP_DETAILS_BATCH_URL = "/api/v1/employee/details-by-emp";
const COL_WIDTHS = [
  "90px", // EE Code
  "160px", // Name
  "120px", // Group
  "120px", // New Group
  "170px", // Classification
  "150px", // Current Jobsite
  "150px", // New Jobsite
  "130px", // Effective Date
  "140px", // Status
  "90px", // Eval
  "120px", // Rate
  "110px", // Per Diem
  "100px", // Travel Pref
  "190px", // Jobsites of Interest
  "150px", // Location
  "140px", // Phone
  "220px", // E-Mail
  "80px", // License 1
  "80px", // License 2
  "80px", // License 3
  "80px", // License 4
  "100px", // Badging
  "90px", // Level 1
  "100px", // Scissor Lift
  "110px", // OSHA 10
  "110px", // OSHA 30
  "170px", // New Hire Follow-Up
  "170px", // Corrective Action
  "200px", // Notes
  "180px", // Updates
  "160px", // Actions
];

/* Travel preference labels and helpers */
const TRAVEL_LABEL = {
  0: "—",
  1: "Willing to Travel",
  2: "Willing to Travel Within State",
  3: "Prefers to Stay Local",
};

function getTravelPref(e) {
  if (!e || typeof e !== "object") return 0;

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
    (typeof e?.prefersLocal === "boolean" && e.prefersLocal) ||
    (typeof e?.prefers_local === "boolean" && e.prefers_local) ||
    (typeof e?.localOnly === "boolean" && e.localOnly) ||
    (typeof raw === "string" &&
      /(local|stay\s*local|no\s*travel|local-only)/i.test(raw));

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
}

/* ---------------- helpers ---------------- */

function toDate(d) {
  if (!d) return null;
  // If it's an ISO date string (YYYY-MM-DD), parse as local midnight
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) {
    const [y, m, day] = d.trim().split("-").map(Number);
    return new Date(y, m - 1, day); // month is 0-indexed
  }
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

function formatDate(d) {
  const dt = toDate(d);
  if (!dt) return "";
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  const y = dt.getFullYear();
  return `${m}-${day}-${y}`;
}

// Format date for HTML5 date inputs (YYYY-MM-DD)
function formatDateForInput(d) {
  const dt = toDate(d);
  if (!dt) return "";
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  const y = dt.getFullYear();
  return `${y}-${m}-${day}`;
}

// Case/underscore-insensitive getter (aligns with EmployeeDetails style)
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

// Pay helper – mirror the EmployeeDetails-style pay resolution
const getPay = (obj) => {
  if (!obj) return { rate: null, type: null, effective: null };

  const rate =
    getCI(
      obj,
      "rate_hourly",
      "rateHourly",
      "rate1",
      "rate_1",
      "hourlyRate",
      "hourly_rate",
      "payRate",
      "pay_rate",
      "wage",
      "wage_hourly",
      "rate"
    ) ?? null;

  const typeRaw =
    getCI(
      obj,
      "rate_type",
      "payType",
      "pay_type",
      "payrollProfileDesc",
      "payroll_profile_desc",
      "payrollProfileCode",
      "payroll_profile_code"
    ) ?? null;
  let type = typeRaw != null ? String(typeRaw) : null;
  // Treat common placeholder values as missing so UI doesn't show '(unknown)'
  if (type) {
    const tnorm = type.trim().toLowerCase();
    if (/^(unknown|n\/?a|none|-|—)$/i.test(tnorm)) {
      type = null;
    }
  }

  const effective =
    getCI(
      obj,
      "payRateEffectiveDate",
      "pay_rate_effective_date",
      "rate_effective_date"
    ) ?? null;

  return { rate, type, effective };
};

function firstDefined(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && `${v}`.trim() !== "") return v;
  }
  return undefined;
}

function normKey(v) {
  if (!v) return "";
  return String(v).replace(/\s+/g, "").toUpperCase();
}

function formatPhone(raw) {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(
      7
    )}`;
  }
  return String(raw);
}

function telHref(raw) {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  return digits.length >= 10 ? `tel:${digits}` : "";
}

// Missing-contact helper: returns true if location, phone, or email is missing
function isMissingContact(row) {
  if (!row) return false;
  return !row.location || !row.phone || !row.email;
}

function currency(v, currencyCode = "USD") {
  const n = Number(v);
  if (!isFinite(n)) return String(v ?? "");
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function asNumeric(v) {
  if (v === null || v === undefined) return undefined;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

// Get CEC ID / EE code from any object (case/underscore-insensitive)
function getEmpCodeCI(obj) {
  if (!obj || typeof obj !== "object") return "";
  return (
    getCI(
      obj,
      // common DTO keys
      "cecId",
      "cec_id",
      "ee_code",
      "EECode",
      "emp_code",
      "empCode",
      "employee_code",
      "employeeCode",
      "employee_code_new",
      "employeeCodeNew",
      // *** add the normalized employee_code fields ***
      "employee_code_norm",
      "employeeCodeNorm",
      // normalized code stored on transfers
      "emp_code_norm_key",
      "empCodeNormKey"
    ) || ""
  );
}

// Normalized employee code helpers aligned with DB schema
function normEmpCodeFromField(emp) {
  if (!emp) return "";
  const raw =
    getCI(
      emp,
      "employee_code_norm", // DB column
      "employeeCodeNorm", // DTO camelCase
      "employee_code_new",
      "employeeCodeNew",
      "employee_code",
      "employeeCode"
    ) || "";
  return normKey(raw);
}

function normEmpCodeFromTransfer(t) {
  if (!t) return "";
  const raw =
    getCI(
      t,
      "emp_code_norm_key", // DB column
      "empCodeNormKey", // DTO camelCase
      "emp_code",
      "empCode"
    ) || "";
  return normKey(raw);
}

// Week helpers: compute Monday (start) and Sunday (end) ISO dates for a given date
function weekRangeFor(d) {
  const dt = d ? new Date(d) : new Date();
  // shift to Monday as start of week
  const day = dt.getDay(); // 0 (Sun) .. 6 (Sat)
  // compute offset to Monday (1)
  const diffToMonday = (day + 6) % 7; // 0->6 => Mon offset 0..6
  const monday = new Date(dt);
  monday.setDate(dt.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const toISODate = (x) => {
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return { start: toISODate(monday), end: toISODate(sunday) };
}

// Render details text with bold labels before semicolons for readability
/* --------------- component ---------------- */

export default function Transfers() {
  // State for delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, row: null });
  // State for currently editing row
  const [editingRow, setEditingRow] = useState(null);
  // Delete transfer handler (for archived entries)
  // Show modal for delete confirmation
  const handleDeleteTransfer = (row) => {
    setDeleteConfirm({ open: true, row });
  };

  // Actually perform the delete after confirmation
  const confirmDeleteTransfer = async () => {
    const row = deleteConfirm.row;
    if (!row) return;
    try {
      await api.delete(`/api/v1/transfers/${row.transferId}`);
      await fetchData();
      toast.success("Transfer deleted successfully");
      setDeleteConfirm({ open: false, row: null });
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete transfer: " + (err.response?.data || err.message));
      setDeleteConfirm({ open: false, row: null });
    }
  };

  // Cancel delete modal
  const cancelDeleteTransfer = () => {
    setDeleteConfirm({ open: false, row: null });
  };
  const navigate = useNavigate();

  const [transfers, setTransfers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [empDetailsByCode, setEmpDetailsByCode] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [filterGroup, setFilterGroup] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showMissingOnly, setShowMissingOnly] = useState(false); // filter for missing contact/location
  const [savingStatusId, setSavingStatusId] = useState(null);
  const [showNoDateEntries, setShowNoDateEntries] = useState(false); // Tab state: false = with dates, true = no dates
  const [showArchivedEntries, setShowArchivedEntries] = useState(false); // Tab state for archived entries
  const [viewMode, setViewMode] = useState("ALL_TRANSFERS"); // "ALL_TRANSFERS" or "TRANSFERS_BY_WEEK"
  const [missingInfoModalOpen, setMissingInfoModalOpen] = useState(false);

  // Column sorting state
  const [sortColumn, setSortColumn] = useState("effectiveDate"); // column name to sort by
  const [sortDirection, setSortDirection] = useState("desc"); // "asc" or "desc"

  // Notes search filter
  const [notesSearchText, setNotesSearchText] = useState("");

  // EE Code search filter
  const [eeCodeSearchText, setEeCodeSearchText] = useState("");

  // Scroll state for "scroll to top" button visibility
  const [showScrollTop, setShowScrollTop] = useState(false);
  const tableWrapRef = useRef(null);

  // Highlighting: map of rowId -> color (hex or CSS color name). Persisted in localStorage.
  const [highlights, setHighlights] = useState({});
  const [highlightEditor, setHighlightEditor] = useState({
    open: false,
    rowId: null,
    color: "#ffff00",
  });
  const textColorCacheRef = useRef(new Map());
  const [VirtualListComp, setVirtualListComp] = useState(null);

  // Archive confirmation modal state
  const [archiveConfirm, setArchiveConfirm] = useState({
    open: false,
    action: null,
    row: null,
  });

  // Employee autofill for edit modal
  const [autofillingEmp, setAutofillingEmp] = useState(false);

  // Week navigation state helpers
  useEffect(() => {
    // initialize to current week (Monday-Sunday) when component mounts or viewMode changes
    if (!startDate && !endDate && viewMode === "TRANSFERS_BY_WEEK") {
      const { start, end } = weekRangeFor(new Date());
      setStartDate(start);
      setEndDate(end);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const setWeekRange = (startIso, endIso) => {
    setStartDate(startIso);
    setEndDate(endIso);
  };

  // Helper to compute a stable row id for highlights
  const getRowId = (row) => {
    if (!row) return null;
    if (row.transferId) return String(row.transferId);
    return `${row.empCode || row.name || "row"}-${row.effectiveDate || ""}`;
  };

  // Persist highlights to localStorage
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Try server-side highlights first (shared/global)
        const res = await api.get("/api/v1/transfers/highlights");
        if (!alive) return;
        const data = Array.isArray(res.data) ? res.data : [];
        const map = {};
        data.forEach((h) => {
          if (h && h.transferId != null && h.color)
            map[String(h.transferId)] = h.color;
        });
        // Merge with any client-side persisted highlights (client overrides server if present)
        try {
          const raw = localStorage.getItem("transfers_highlights");
          if (raw) {
            const local = JSON.parse(raw || "{}") || {};
            Object.entries(local).forEach(([k, v]) => {
              if (v) map[k] = v;
            });
          }
        } catch (e) {
          // ignore local parse errors
        }
        setHighlights(map);
      } catch (e) {
        // fallback: load from localStorage only
        try {
          const raw = localStorage.getItem("transfers_highlights");
          if (raw) setHighlights(JSON.parse(raw));
        } catch (ex) {
          // ignore
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "transfers_highlights",
        JSON.stringify(highlights || {})
      );
    } catch (e) {
      // ignore
    }
  }, [highlights]);

  const applyHighlight = (rowId, color) => {
    // optimistic UI update
    setHighlights((prev) => {
      const next = { ...(prev || {}) };
      if (!color) delete next[rowId];
      else next[rowId] = color;
      return next;
    });
    setHighlightEditor({ open: false, rowId: null, color: "#ffff00" });

    // push to server (shared/global highlight). If it fails, we keep local change.
    (async () => {
      try {
        // attempt to parse numeric transfer id when possible
        const tid = isNaN(Number(rowId)) ? null : Number(rowId);
        if (tid == null) {
          // server highlights are keyed by transferId only; ignore non-transfer rows
          return;
        }
        if (!color) {
          await api.delete(
            `/api/v1/transfers/highlights/${encodeURIComponent(tid)}`
          );
        } else {
          await api.post(`/api/v1/transfers/highlights`, {
            transferId: tid,
            color,
          });
        }
      } catch (e) {
        console.warn("Failed to persist highlight to server", e);
      }
    })();
  };

  const clearHighlight = (rowId) => applyHighlight(rowId, null);

  const openHighlightFor = (row) => {
    const id = getRowId(row);
    const cur = (highlights && highlights[id]) || "#ffff00";
    setHighlightEditor({ open: true, rowId: id, color: cur });
  };

  // compute a readable text color (black/white) based on background with caching
  const textColorForBg = (bg) => {
    if (!bg) return undefined;
    const cache = textColorCacheRef.current;
    if (cache.has(bg)) return cache.get(bg);
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = bg;
      const computed = ctx.fillStyle; // normalized rgb/hex or rgb(...)

      let r = 0,
        g = 0,
        b = 0;
      const hexMatch = computed.match(/^#([0-9a-f]{6})$/i);
      if (hexMatch) {
        r = parseInt(hexMatch[1].substr(0, 2), 16);
        g = parseInt(hexMatch[1].substr(2, 2), 16);
        b = parseInt(hexMatch[1].substr(4, 2), 16);
      } else {
        const rgbMatch = computed.match(
          /^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
        );
        if (rgbMatch) {
          r = Number(rgbMatch[1]);
          g = Number(rgbMatch[2]);
          b = Number(rgbMatch[3]);
        } else {
          // unknown format: default to dark text
          cache.set(bg, "#000");
          return "#000";
        }
      }

      // relative luminance per WCAG
      const srgbToLin = (v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      const R = srgbToLin(r);
      const G = srgbToLin(g);
      const B = srgbToLin(b);
      const lum = 0.2126 * R + 0.7152 * G + 0.0722 * B;

      // choose white or black text for best contrast
      const whiteLum = 1.0;
      const blackLum = 0.0;
      const contrastWhite =
        (Math.max(lum, whiteLum) + 0.05) / (Math.min(lum, whiteLum) + 0.05);
      const contrastBlack =
        (Math.max(lum, blackLum) + 0.05) / (Math.min(lum, blackLum) + 0.05);

      const chosen = contrastWhite >= contrastBlack ? "#fff" : "#000";
      cache.set(bg, chosen);
      return chosen;
    } catch (e) {
      return "#000";
    }
  };

  const contrastRatio = (bg, fg) => {
    if (!bg || !fg) return null;
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = bg;
      const bgc = ctx.fillStyle;
      ctx.fillStyle = fg;
      const fgc = ctx.fillStyle;

      const toRgb = (val) => {
        const h = val.match(/^#([0-9a-f]{6})$/i);
        if (h)
          return [
            parseInt(h[1].substr(0, 2), 16),
            parseInt(h[1].substr(2, 2), 16),
            parseInt(h[1].substr(4, 2), 16),
          ];
        const m = val.match(
          /^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
        );
        if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
        return [0, 0, 0];
      };

      const [br, bgcG, bb] = toRgb(bgc);
      const [fr, fgG, fb] = toRgb(fgc);

      const sToLin = (v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      const L1 =
        0.2126 * sToLin(br) + 0.7152 * sToLin(bgcG) + 0.0722 * sToLin(bb);
      const L2 =
        0.2126 * sToLin(fr) + 0.7152 * sToLin(fgG) + 0.0722 * sToLin(fb);
      const high = Math.max(L1, L2);
      const low = Math.min(L1, L2);
      return (high + 0.05) / (low + 0.05);
    } catch (e) {
      return null;
    }
  };

  const shiftWeek = (days) => {
    // ensure we parse the ISO date as local midnight to avoid timezone quirks
    const base = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
    base.setDate(base.getDate() + days);
    const { start, end } = weekRangeFor(base);
    setWeekRange(start, end);
  };

  const prevWeek = () => shiftWeek(-7);
  const nextWeek = () => shiftWeek(7);
  const goToToday = () => {
    const { start, end } = weekRangeFor(new Date());
    setWeekRange(start, end);
  };

  // Try to dynamically import react-window for virtualization; fail gracefully.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mod = await import("react-window");
        if (alive && mod && mod.FixedSizeList)
          setVirtualListComp(() => mod.FixedSizeList);
      } catch (e) {
        // react-window not installed — virtualization disabled
        console.warn("react-window not available; virtualization disabled");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Track scroll position to show/hide scroll-to-top button
  useEffect(() => {
    const tableWrap = tableWrapRef.current;
    if (!tableWrap) return;

    const handleScroll = () => {
      // Show button after scrolling down about 15-20 rows (approximately 600-800px)
      setShowScrollTop(tableWrap.scrollTop > 700);
    };

    tableWrap.addEventListener("scroll", handleScroll);
    return () => tableWrap.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    if (tableWrapRef.current) {
      tableWrapRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Sorting control for Effective Date
  // In ALL_TRANSFERS mode, always sort descending (newest first). In TRANSFERS_BY_WEEK, user controls it.
  const [sortAsc, setSortAsc] = useState(false); // default: descending (newest first)
  const effectiveSortAsc = viewMode === "ALL_TRANSFERS" ? false : sortAsc;

  function formatWeekLabel(startIso, endIso) {
    if (!startIso || !endIso) return "";
    try {
      const s = new Date(`${startIso}T00:00:00`);
      const e = new Date(`${endIso}T00:00:00`);
      const opts = { month: "short", day: "numeric" };
      const sLabel = s.toLocaleDateString(undefined, opts);
      const eLabel = e.toLocaleDateString(undefined, opts);
      return `Showing week ${sLabel} — ${eLabel}`;
    } catch (e) {
      return `${startIso} — ${endIso}`;
    }
  }

  // Normalize free-form rate type to either 'hourly' or 'salary'.
  const normalizeRateKind = (rt) => {
    if (!rt) return null;
    const s = String(rt).trim().toLowerCase();
    if (/salary|annual|year|yr|annum/.test(s)) return "salary";
    if (/hour|hr|hourly/.test(s)) return "hourly";
    return null;
  };

  // modal edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [showReminderModal, setShowReminderModal] = useState(false);
  // Helper to check for unsaved changes
  const hasUnsavedEditChanges = () => {
    if (!editDraft || !editingRow) return false;
    for (const key in editDraft) {
      if (editDraft[key] !== editingRow[key]) return true;
    }
    return false;
  };

  const handleEditCancel = () => {
    if (hasUnsavedEditChanges() && !savingEdit) {
      setShowReminderModal(true);
      return;
    }
    setEditOpen(false);
    setEditDraft(null);
    setEditError("");
    setEditingRow(null);
  };

  const handleReminderConfirm = () => {
    setEditOpen(false);
    setEditDraft(null);
    setEditError("");
    setEditingRow(null);
    setShowReminderModal(false);
  };

  const handleReminderCancel = () => {
    setShowReminderModal(false);
  };

  // Fetch transfers and employees data - can be called from useEffect and after archive/restore
  const fetchData = async () => {
    try {
      console.log("fetchData: Starting data fetch...");
      setLoading(true);
      setErr("");

      const [activeTransfersRes, archivedTransfersRes, employeesRes] =
        await Promise.all([
          api.get("/api/v1/transfers"),
          api.get("/api/v1/transfers/archived"),
          api.get("/api/v1/employee/list"),
        ]);

      console.log(
        "fetchData: Active transfers count:",
        activeTransfersRes.data?.length || 0
      );
      console.log(
        "fetchData: Archived transfers count:",
        archivedTransfersRes.data?.length || 0
      );

      const activeTransfersData = Array.isArray(activeTransfersRes.data)
        ? activeTransfersRes.data
        : Array.isArray(activeTransfersRes.data?.content)
        ? activeTransfersRes.data.content
        : Array.isArray(activeTransfersRes.data?.data)
        ? activeTransfersRes.data.data
        : [];

      const archivedTransfersData = Array.isArray(archivedTransfersRes.data)
        ? archivedTransfersRes.data
        : Array.isArray(archivedTransfersRes.data?.content)
        ? archivedTransfersRes.data.content
        : Array.isArray(archivedTransfersRes.data?.data)
        ? archivedTransfersRes.data.data
        : [];

      // Combine active and archived transfers
      const transfersData = [...activeTransfersData, ...archivedTransfersData];

      console.log("fetchData: Combined transfers count:", transfersData.length);
      console.log("fetchData: Setting state with new data");

      const employeesRaw = employeesRes.data;
      const employeesData = Array.isArray(employeesRaw)
        ? employeesRaw
        : Array.isArray(employeesRaw?.content)
        ? employeesRaw.content
        : Array.isArray(employeesRaw?.data)
        ? employeesRaw.data
        : [];

      setTransfers(transfersData);
      setEmployees(employeesData);

      console.log("fetchData: State updated successfully");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const [activeTransfersRes, archivedTransfersRes, employeesRes] =
          await Promise.all([
            api.get("/api/v1/transfers"),
            api.get("/api/v1/transfers/archived"),
            api.get("/api/v1/employee/list"),
          ]);

        if (!alive) return;

        // Helpful while we’re debugging – you can remove later
        console.log("Active Transfers API payload:", activeTransfersRes.data);
        console.log(
          "Archived Transfers API payload:",
          archivedTransfersRes.data
        );
        console.log("Employees API payload:", employeesRes.data);

        const activeTransfersData = Array.isArray(activeTransfersRes.data)
          ? activeTransfersRes.data
          : Array.isArray(activeTransfersRes.data?.content)
          ? activeTransfersRes.data.content
          : Array.isArray(activeTransfersRes.data?.data)
          ? activeTransfersRes.data.data
          : [];

        const archivedTransfersData = Array.isArray(archivedTransfersRes.data)
          ? archivedTransfersRes.data
          : Array.isArray(archivedTransfersRes.data?.content)
          ? archivedTransfersRes.data.content
          : Array.isArray(archivedTransfersRes.data?.data)
          ? archivedTransfersRes.data.data
          : [];

        // Combine active and archived transfers
        const transfersData = [
          ...activeTransfersData,
          ...archivedTransfersData,
        ];

        const employeesRaw = employeesRes.data;
        const employeesData = Array.isArray(employeesRaw)
          ? employeesRaw
          : Array.isArray(employeesRaw?.content)
          ? employeesRaw.content
          : Array.isArray(employeesRaw?.data)
          ? employeesRaw.data
          : [];

        setTransfers(transfersData);
        setEmployees(employeesData);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  // Batch-hit EmployeeDTO by normalized employee codes so Transfers can prefer server-provided group / rate
  useEffect(() => {
    (async () => {
      try {
        const codes = Array.from(
          new Set([
            ...employees
              .map(
                (emp) => normEmpCodeFromField(emp) || normKey(getEmpCodeCI(emp))
              )
              .filter(Boolean),
            ...transfers
              .map(
                (t) => normEmpCodeFromTransfer(t) || normKey(getEmpCodeCI(t))
              )
              .filter(Boolean),
          ])
        );

        // debug: show which normalized codes we will request
        if (process.env.NODE_ENV !== "production") {
          console.log("[Transfers] requesting emp details for codes:", codes);
        }

        if (!codes.length) return;

        const { data } = await api.post(
          EMP_DETAILS_BATCH_URL,
          { empCodes: codes },
          {
            withCredentials: true,
            headers: { "Content-Type": "application/json" },
          }
        );

        // Support new wrapper response shape { results: { ... }, unmatchedRequested: [...] }
        // while remaining backwards-compatible with older endpoints that returned a raw map.
        const results = data && data.results ? data.results : data || {};
        const unmatched =
          data && Array.isArray(data.unmatchedRequested)
            ? data.unmatchedRequested
            : [];

        if (process.env.NODE_ENV !== "production") {
          console.log("[Transfers] emp details response (results):", results);
          if (unmatched && unmatched.length) {
            console.log(
              "[Transfers] emp details unmatchedRequested:",
              unmatched.slice(0, 20)
            );
          }
        }

        const map = {};
        Object.entries(results || {}).forEach(([rawCode, dto]) => {
          const code = normKey(rawCode);
          if (!code) return;
          map[code] = dto;
        });

        setEmpDetailsByCode(map);
      } catch (e) {
        // non-fatal — Transfers can still render without details
        console.warn("Failed to load employee details for transfers", e);
      }
    })();
  }, [employees, transfers]);

  // Build joined rows + filter options from transfers_v2 + field
  const { baseRows, uniqueGroups, uniqueProjects, transferById } =
    useMemo(() => {
      if (!transfers?.length) {
        return {
          baseRows: [],
          uniqueGroups: [],
          uniqueProjects: [],
          transferById: new Map(),
        };
      }

      const transferById = new Map();
      transfers.forEach((t) => {
        const id = firstDefined(t, "transfer_id", "id");
        if (id !== undefined && id !== null && !transferById.has(id)) {
          transferById.set(id, t);
        }
      });

      // ---- Map FIELD employees by *normalized* CEC ID ----
      const empByCode = new Map();
      employees.forEach((emp) => {
        // prefer employee_code_norm / employeeCodeNorm; fall back to raw code
        const key = normEmpCodeFromField(emp) || normKey(getEmpCodeCI(emp));
        if (key && !empByCode.has(key)) {
          empByCode.set(key, emp);
        }
      });

      const rows = transfers.map((t) => {
        // raw CEC ID / employee code from the transfer row
        const transferCode = getEmpCodeCI(t);

        // normalized key we use to match into FIELD
        const empKey = normEmpCodeFromTransfer(t) || normKey(transferCode);
        const emp = empByCode.get(empKey) || null;

        // IDs for Details page
        let empId =
          getCI(emp, "emp_id", "empId", "employeeid", "employeeId", "id") || "";
        const xid =
          firstDefined(t, "xid") ||
          getCI(emp, "xid", "tixid", "xid_norm", "person_xid_norm") ||
          "";

        // Name
        const transName = firstDefined(t, "emp_name", "employee_name");
        const empDisplay = firstDefined(emp, "display_name", "employeename");
        const empFirst = firstDefined(
          emp,
          "preferred_firstname",
          "legal_firstname"
        );
        const empLast = firstDefined(emp, "legal_lastname");
        const empFull =
          empFirst && empLast ? `${empFirst} ${empLast}` : empFirst || "";
        const name = transName || empDisplay || empFull || "";

        // Server-provided EmployeeDTO details (prefer these when available)
        const fieldKey =
          normEmpCodeFromField(emp) || normKey(getEmpCodeCI(emp));
        const detailsKey = empKey || fieldKey;

        // Try direct lookup by normalized key first
        let details =
          (detailsKey && empDetailsByCode && empDetailsByCode[detailsKey]) ||
          null;

        // Fallback: scan DTOs returned by the server and match against common identifiers
        if (!details && empDetailsByCode) {
          const targets = new Set(
            [
              empKey,
              fieldKey,
              normEmpCodeFromTransfer(t),
              normKey(transferCode),
              // also include the raw transfer empCode and field emp code variants
            ].filter(Boolean)
          );

          details =
            Object.values(empDetailsByCode).find((dto) => {
              // collect normalized candidate keys from the DTO
              const dtoKeys = [
                normKey(
                  String(
                    getCI(
                      dto,
                      "employeeCode",
                      "employee_code",
                      "emp_code",
                      "cecId"
                    ) || ""
                  )
                ),
                normKey(
                  String(
                    getCI(dto, "employeeCodeNew", "employee_code_new") || ""
                  )
                ),
                normKey(
                  String(getCI(dto, "xid", "tixid", "employeeXid") || "")
                ),
                normKey(String(getCI(dto, "badge_num", "badgeNum") || "")),
                normKey(String(getCI(dto, "employeeid", "emp_id", "id") || "")),
              ];

              return dtoKeys.some((k) => k && targets.has(k));
            }) || null;
        }

        // If we didn't find an empId from the FIELD `emp` object but the
        // server returned an EmployeeDTO in `details`, prefer its id so the
        // Details button can open the canonical page.
        if ((!empId || String(empId).trim() === "") && details) {
          empId = String(
            getCI(details, "employeeid", "emp_id", "id", "employeeId") || ""
          ).trim();
        }

        // Group: prefer server-provided EmployeeDTO, then FIELD, then transfer
        const group =
          (details && (details.workGroup || details.work_group)) ||
          getCI(
            emp,
            "work_group",
            "workGroup",
            "group",
            "Group",
            "department",
            "Department",
            "department_desc",
            "Department_Desc"
          ) ||
          getCI(
            t,
            "group",
            "Group",
            "work_group",
            "workGroup",
            "department",
            "Department"
          ) ||
          "";

        // Classification – what you’re already displaying
        const newGroupValue =
          firstDefined(t, "new_group", "newGroup") ||
          firstDefined(emp, "new_group", "newGroup") ||
          "";

        const jobsitesOfInterest =
          firstDefined(t, "jobsites_of_interest", "jobsitesOfInterest") || "";

        const classification =
          firstDefined(t, "classification") ??
          getCI(
            emp,
            "emp_rank",
            "empRank",
            "ranked",
            "Ranked",
            "business_title",
            "businessTitle",
            "position_title",
            "positionTitle",
            "position"
          ) ??
          "";

        // Jobsite info
        const fromJobsite =
          firstDefined(t, "from_jobsite", "from_jobsite_key") ||
          firstDefined(
            emp,
            "from_location",
            "work_location",
            "workLocation",
            "work_project",
            "workProject"
          );

        const toJobsite =
          firstDefined(t, "to_jobsite", "to_jobsite_key", "project") ||
          firstDefined(
            emp,
            "transfer_to_location",
            "work_project",
            "workProject"
          );

        // Dates
        const effectiveDate =
          firstDefined(t, "effective_date", "eff_key") ||
          firstDefined(emp, "transfer_to_date", "start_date");

        const transferStatus = firstDefined(t, "transfer_status");
        const term = firstDefined(t, "term");

        // Pay – prefer transfer.rate_hourly, then FIELD.rate_1
        const payFromTransfer = getPay(t);
        const payFromEmp = getPay(emp);
        const payFromDetails = getPay(details);

        // Rate precedence: transfer explicit -> transfer derived -> server details (rate1) -> field pay
        const rate =
          firstDefined(t, "rate_hourly", "rateHourly", "rate", "rate1") ??
          payFromTransfer.rate ??
          (payFromDetails && payFromDetails.rate) ??
          payFromEmp.rate ??
          firstDefined(emp, "rate_1");

        const rateType =
          firstDefined(t, "rate_type") ??
          payFromTransfer.type ??
          (payFromDetails && payFromDetails.type) ??
          payFromEmp.type ??
          firstDefined(emp, "pay_type", "payType", "payroll_profile_desc");

        const perDiem =
          firstDefined(t, "per_diem") ??
          getCI(
            emp,
            "travel_allowance",
            "travelAllowance",
            "per_diem",
            "perDiem"
          );

        // Contact & location (prefer transfer -> employee details DTO -> FIELD record)
        const phone =
          firstDefined(t, "contact_phone") ||
          getCI(
            details,
            "primary_phone",
            "primaryPhone",
            "work_phone",
            "workPhone",
            "mobile_phone",
            "mobilePhone",
            "phone",
            "phoneNumber"
          ) ||
          firstDefined(emp, "primary_phone", "work_phone");
        const email =
          firstDefined(t, "email") ||
          getCI(
            details,
            "work_email",
            "workEmail",
            "email",
            "personal_email",
            "personalEmail"
          ) ||
          firstDefined(emp, "work_email", "personal_email");

        const license1 =
          firstDefined(t, "license_1", "license1") ||
          firstDefined(emp, "license_1", "license1") ||
          "";
        const license2 =
          firstDefined(t, "license_2", "license2") ||
          firstDefined(emp, "license_2", "license2") ||
          "";
        const license3 =
          firstDefined(t, "license_3", "license3") ||
          firstDefined(emp, "license_3", "license3") ||
          "";
        const license4 =
          firstDefined(t, "license_4", "license4") ||
          firstDefined(emp, "license_4", "license4") ||
          "";

        const locationCity =
          firstDefined(t, "location_city") ||
          getCI(
            details,
            "work_location_city",
            "workLocationCity",
            "primary_city_municipality",
            "home_city",
            "city"
          ) ||
          firstDefined(
            emp,
            "primary_city_municipality",
            "work_location_city",
            "workLocationCity"
          );
        const locationState =
          firstDefined(t, "location_state") ||
          getCI(
            details,
            "work_location_state",
            "workLocationState",
            "primary_state_province",
            "home_state",
            "state"
          ) ||
          firstDefined(
            emp,
            "primary_state_province",
            "work_location_state",
            "workLocationState"
          );

        const locParts = [];
        if (locationCity) locParts.push(locationCity);
        if (
          locationState &&
          (!locationCity || !String(locationCity).includes(locationState))
        ) {
          locParts.push(locationState);
        }
        const location = locParts.join(", ");

        // Training / compliance / misc
        const badging =
          firstDefined(t, "badging") || firstDefined(emp, "badge_num");
        const badgeNum = firstDefined(emp, "badge_num");

        const lvl1Status = firstDefined(t, "level1_status");
        const scissorLift = firstDefined(t, "scissor_lift_status");
        const evaluationScore = firstDefined(t, "evaluation_score");

        const notes = firstDefined(t, "notes");
        const travelNotes = firstDefined(
          t,
          "travel_notes",
          "travelNotes",
          "travel_note"
        );
        const correctiveAction = firstDefined(t, "corrective_action");
        const updates = firstDefined(t, "updates");
        const newHireFollowUp = firstDefined(t, "new_hire_follow_up");

        const doh =
          firstDefined(t, "doh") ||
          firstDefined(emp, "hire_date", "rehire_date");
        const lastPayChange = firstDefined(t, "last_pay_change");
        const osha10Date = firstDefined(t, "osha_10_date", "osha10_date");
        const osha30Date = firstDefined(t, "osha_30_date", "osha30_date");

        const sheetDate = firstDefined(t, "sheet_date");
        const createdAt = firstDefined(t, "created_at");
        const updatedAt = firstDefined(t, "updated_at");
        const sourceFile = firstDefined(t, "source_file");

        const language =
          firstDefined(t, "language") ||
          firstDefined(emp, "language_spoken", "ess_language_preference");

        // Travel preference
        const travelPref = getTravelPref(details || emp || t);

        // Fold long-form stuff into one details block
        return {
          transferId: firstDefined(t, "transfer_id", "id"),
          empCode: transferCode || "",
          empId: empId || "",
          xid: xid || "",
          name: name || "",
          group: group || "",
          newGroup: newGroupValue || "",
          jobsitesOfInterest: jobsitesOfInterest || "",
          classification: classification || "",
          fromJobsite: fromJobsite || "",
          toJobsite: toJobsite || "",
          effectiveDate: effectiveDate || "",
          transferStatus: transferStatus || "",
          term: term || "",
          rate: rate ?? "",
          rateType: rateType || "",
          perDiem: perDiem ?? "",
          phone: phone || "",
          email: email || "",
          license1,
          license2,
          license3,
          license4,
          locationCity: locationCity || "",
          locationState: locationState || "",
          location: location || "",
          badging: badging || "",
          badgeNum: badgeNum || "",
          lvl1Status: lvl1Status || "",
          scissorLift: scissorLift || "",
          evaluationScore: evaluationScore ?? "",
          notes: notes || "",
          travelNotes: travelNotes || "",
          correctiveAction: correctiveAction || "",
          updates: updates || "",
          newHireFollowUp: newHireFollowUp || "",
          doh: doh || "",
          lastPayChange: lastPayChange || "",
          osha10Date: osha10Date || "",
          osha30Date: osha30Date || "",
          sheetDate: sheetDate || "",
          createdAt: createdAt || "",
          updatedAt: updatedAt || "",
          sourceFile: sourceFile || "",
          language: language || "",
          travelPref: travelPref || 0,
          isArchived: t.is_archived || false,
        };
      });

      // debug: which transfers couldn't be matched to FIELD by CEC ID?
      if (process.env.NODE_ENV !== "production") {
        const unmatched = rows.filter((r) => r.empCode && !r.empId && !r.xid);
        if (unmatched.length) {
          console.log(
            "[Transfers] rows with no FIELD match by CEC ID:",
            unmatched.map((u) => u.empCode)
          );
        }
      }

      const groupSet = new Set(
        rows.map((r) => r.group).filter((g) => g && `${g}`.trim() !== "")
      );
      const projectSet = new Set(
        rows
          .map((r) => r.toJobsite || r.fromJobsite)
          .filter((p) => p && `${p}`.trim() !== "")
      );

      return {
        baseRows: rows,
        uniqueGroups: Array.from(groupSet).sort((a, b) =>
          String(a).localeCompare(String(b))
        ),
        uniqueProjects: Array.from(projectSet).sort((a, b) =>
          String(a).localeCompare(String(b))
        ),
        transferById,
      };
    }, [transfers, employees, empDetailsByCode]);

  // Track which rows are missing contact/location data so we can surface a quick audit
  const missingContactRows = useMemo(() => {
    return baseRows
      .map((r) => ({
        empCode: r.empCode || "",
        name: r.name || "",
        row: r,
        missing: [
          !r.location && "location",
          !r.phone && "phone",
          !r.email && "email",
        ].filter(Boolean),
      }))
      .filter((entry) => entry.missing.length);
  }, [baseRows]);

  useEffect(() => {
    if (!missingContactRows.length) return;
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "[Transfers] Missing contact/location info:",
        missingContactRows.slice(0, 20)
      );
    }
  }, [missingContactRows]);

  const rows = useMemo(() => {
    const s =
      viewMode === "TRANSFERS_BY_WEEK" && startDate ? toDate(startDate) : null;
    const e =
      viewMode === "TRANSFERS_BY_WEEK" && endDate ? toDate(endDate) : null;

    // debug: which transfers didn't find a FIELD match by CEC ID
    if (process.env.NODE_ENV !== "production") {
      const unmatched = baseRows.filter((r) => r.empCode && !r.empId && !r.xid);
      if (unmatched.length) {
        console.log(
          "[Transfers] rows with no FIELD match by CEC ID:",
          unmatched.map((u) => u.empCode)
        );
      }
    }

    return baseRows
      .filter((r) => !filterGroup || r.group === filterGroup)
      .filter(
        (r) =>
          !filterProject ||
          r.toJobsite === filterProject ||
          r.fromJobsite === filterProject
      )
      .filter((r) => (showMissingOnly ? isMissingContact(r) : true))
      .filter((r) => {
        // EE Code search filter
        if (!eeCodeSearchText.trim()) return true;
        const code = String(r.empCode || "").toLowerCase();
        const needle = eeCodeSearchText.trim().toLowerCase();
        return code.includes(needle);
      })
      .filter((r) => {
        // Notes search filter
        if (notesSearchText.trim()) {
          const notes = String(r.notes || "").toLowerCase();
          if (!notes.includes(notesSearchText.toLowerCase())) {
            return false;
          }
        }
        return true;
      })
      .filter((r) => {
        // Archived entries filtering
        if (showArchivedEntries) {
          return r.isArchived;
        } else {
          // Don't show archived entries in active tabs
          if (r.isArchived) return false;
        }

        const hasEffectiveDate =
          !!r.effectiveDate && String(r.effectiveDate).trim() !== "";

        // Tab filtering: show entries based on whether they have an effective date
        if (showNoDateEntries) {
          // Show only entries WITHOUT effective date
          return !hasEffectiveDate;
        } else {
          // Show only entries WITH effective date
          if (!hasEffectiveDate) return false;

          // Apply date range filter only for entries with effective dates (and only in TRANSFERS_BY_WEEK mode)
          if (viewMode === "TRANSFERS_BY_WEEK") {
            if (!s && !e) return true;
            const pivot =
              toDate(r.effectiveDate) ||
              toDate(r.sheetDate) ||
              toDate(r.createdAt);
            if (!pivot) return false;

            // Dates are already parsed as local midnight, so direct comparison works
            if (s && pivot < s) return false;
            if (e && pivot > e) return false;
          }
          return true;
        }
      })
      .sort((a, b) => {
        // Determine sort values based on sortColumn
        let aVal, bVal;

        switch (sortColumn) {
          case "empCode":
            aVal = String(a.empCode || "").toLowerCase();
            bVal = String(b.empCode || "").toLowerCase();
            break;
          case "name":
            aVal = String(a.name || "").toLowerCase();
            bVal = String(b.name || "").toLowerCase();
            break;
          case "group":
            aVal = String(a.group || "").toLowerCase();
            bVal = String(b.group || "").toLowerCase();
            break;
          case "classification":
            aVal = String(a.classification || "").toLowerCase();
            bVal = String(b.classification || "").toLowerCase();
            break;
          case "fromJobsite":
            aVal = String(a.fromJobsite || "").toLowerCase();
            bVal = String(b.fromJobsite || "").toLowerCase();
            break;
          case "toJobsite":
            aVal = String(a.toJobsite || "").toLowerCase();
            bVal = String(b.toJobsite || "").toLowerCase();
            break;
          case "effectiveDate":
            aVal =
              toDate(a.effectiveDate) ||
              toDate(a.sheetDate) ||
              toDate(a.createdAt) ||
              new Date(0);
            bVal =
              toDate(b.effectiveDate) ||
              toDate(b.sheetDate) ||
              toDate(b.createdAt) ||
              new Date(0);
            break;
          case "transferStatus":
            aVal = String(a.transferStatus || "").toLowerCase();
            bVal = String(b.transferStatus || "").toLowerCase();
            break;
          case "evaluationScore":
            aVal = Number(a.evaluationScore) || 0;
            bVal = Number(b.evaluationScore) || 0;
            break;
          case "rateHourly":
            aVal = Number(a.rate) || 0;
            bVal = Number(b.rate) || 0;
            break;
          case "perDiem":
            aVal = Number(a.perDiem) || 0;
            bVal = Number(b.perDiem) || 0;
            break;
          default:
            aVal = String(a.effectiveDate || "");
            bVal = String(b.effectiveDate || "");
        }

        // Compare values
        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [
    baseRows,
    filterGroup,
    filterProject,
    startDate,
    endDate,
    showMissingOnly,
    showNoDateEntries,
    showArchivedEntries,
    viewMode,
    sortColumn,
    sortDirection,
    notesSearchText,
    eeCodeSearchText,
  ]); // Count entries with and without effective dates for tab badges
  const { withDateCount, noDateCount, archivedCount } = useMemo(() => {
    const filtered = baseRows
      .filter((r) => !filterGroup || r.group === filterGroup)
      .filter(
        (r) =>
          !filterProject ||
          r.toJobsite === filterProject ||
          r.fromJobsite === filterProject
      )
      .filter((r) => {
        if (!eeCodeSearchText.trim()) return true;
        const code = String(r.empCode || "").toLowerCase();
        const needle = eeCodeSearchText.trim().toLowerCase();
        return code.includes(needle);
      });

    const withDate = filtered.filter(
      (r) =>
        !r.isArchived &&
        !!r.effectiveDate &&
        String(r.effectiveDate).trim() !== ""
    );
    const noDate = filtered.filter(
      (r) =>
        !r.isArchived &&
        (!r.effectiveDate || String(r.effectiveDate).trim() === "")
    );
    const archived = filtered.filter((r) => r.isArchived);

    return {
      withDateCount: withDate.length,
      noDateCount: noDate.length,
      archivedCount: archived.length,
    };
  }, [baseRows, filterGroup, filterProject, eeCodeSearchText]);

  const handleArchiveTransfer = async (row) => {
    setArchiveConfirm({ open: true, action: "archive", row });
  };

  const confirmArchiveTransfer = async (row) => {
    try {
      console.log("Archiving transfer:", row.transferId, row);

      // Update the transfer with archived flag - send minimal payload
      const response = await api.put(`/api/v1/transfers/${row.transferId}`, {
        is_archived: true,
      });

      console.log("Archive response:", response);

      // Refetch all data to get updated lists
      await fetchData();

      toast.success("Transfer archived successfully");
      setArchiveConfirm({ open: false, action: null, row: null });
    } catch (err) {
      console.error("Archive error:", err);
      console.error("Error response:", err.response);
      toast.error(
        "Failed to archive transfer: " + (err.response?.data || err.message)
      );
    }
  };

  const handleRestoreTransfer = async (row) => {
    setArchiveConfirm({ open: true, action: "restore", row });
  };

  const confirmRestoreTransfer = async (row) => {
    try {
      console.log("Restoring transfer:", row.transferId, row);

      // Update the transfer with archived flag removed - send minimal payload
      const response = await api.put(`/api/v1/transfers/${row.transferId}`, {
        is_archived: false,
      });

      console.log("Restore response:", response);

      // Refetch all data to get updated lists
      await fetchData();

      toast.success("Transfer restored successfully");
      setArchiveConfirm({ open: false, action: null, row: null });
    } catch (err) {
      console.error("Restore error:", err);
      console.error("Error response:", err.response);
      toast.error(
        "Failed to restore transfer: " + (err.response?.data || err.message)
      );
    }
  };

  const handleStatusChange = async (row, nextStatus) => {
    if (!row.transferId) return;

    const id = row.transferId;
    const prevStatus = row.transferStatus;

    // Normalize payload: allow null/blank to indicate "clear status".
    // Use `null` for empty selection so backend can detect and clear the stored value.
    const payloadStatus = nextStatus == null ? null : String(nextStatus).trim();

    setSavingStatusId(id);

    // optimistic update - set both snake_case and camelCase fields so UI uses correct value
    setTransfers((prev) =>
      prev.map((t) =>
        t.transfer_id === id || t.transferId === id
          ? {
              ...t,
              transfer_status: payloadStatus,
              transferStatus: payloadStatus,
            }
          : t
      )
    );

    try {
      await api.patch(`/api/v1/transfers/${encodeURIComponent(id)}/status`, {
        // ensure we never send JSON null for status; backend expects string (possibly empty)
        status: payloadStatus,
      });
    } catch (e) {
      // log extra details to help debugging 400s
      console.error("Update transfer status error:", e);
      if (e?.response) {
        console.warn(
          "Status update response:",
          e.response.status,
          e.response.data
        );
      }
      // revert on failure
      setTransfers((prev) =>
        prev.map((t) =>
          t.transfer_id === id || t.transferId === id
            ? { ...t, transfer_status: prevStatus, transferStatus: prevStatus }
            : t
        )
      );
    } finally {
      setSavingStatusId(null);
    }
  };

  const exportToExcel = () => {
    if (!rows.length) return;

    const data = rows.map((r) => {
      const rateNum = asNumeric(r.rate);
      const perDiemNum = asNumeric(r.perDiem);
      const evalVal = (() => {
        const n = Number(r.evaluationScore);
        return Number.isFinite(n) ? n : r.evaluationScore || "";
      })();

      const yesNoDate = (d) => (d ? `Yes — ${formatDate(d)}` : "No");

      return {
        "Transfer ID": r.transferId || "",
        "Employee Code": r.empCode || "",
        XID: r.xid || "",
        "Employee ID (Field)": r.empId || "",
        Name: r.name || "",
        Group: r.group || "",
        "New Group": r.newGroup || "",
        "Jobsites of Interest": r.jobsitesOfInterest || "",
        Classification: r.classification || "",
        "Current Jobsite": r.fromJobsite || "",
        "New Jobsite": r.toJobsite || "",
        "Effective Date": formatDate(r.effectiveDate),
        "Transfer Status": r.transferStatus || "",
        Term: r.term || "",
        "Hourly Rate": rateNum ?? r.rate ?? "",
        "Rate Type": r.rateType || "",
        "Per Diem": perDiemNum ?? r.perDiem ?? "",
        Badging: r.badging || "",
        "Badge #": r.badgeNum || "",
        "Evaluation Score": evalVal,
        Notes: r.notes || "",
        "Corrective Action": r.correctiveAction || "",
        Updates: r.updates || "",
        "New Hire Follow Up": r.newHireFollowUp || "",
        "Level 1 Status": r.lvl1Status || "",
        "Scissor Lift Status": r.scissorLift || "",
        Language: r.language || "",
        "Phone #": r.phone || "",
        "E-Mail": r.email || "",
        "License 1": r.license1 || "",
        "License 2": r.license2 || "",
        "License 3": r.license3 || "",
        "License 4": r.license4 || "",
        "Location City": r.locationCity || "",
        "Location State": r.locationState || "",
        DOH: formatDate(r.doh),
        "Last Pay Change": formatDate(r.lastPayChange),
        "OSHA 10": yesNoDate(r.osha10Date),
        "OSHA 30": yesNoDate(r.osha30Date),
        "Sheet Date": formatDate(r.sheetDate),
        "Source File": r.sourceFile || "",
        "Created At": r.createdAt ? new Date(r.createdAt).toISOString() : "",
        "Updated At": r.updatedAt ? new Date(r.updatedAt).toISOString() : "",
      };
    });

    const header = [
      "Transfer ID",
      "Employee Code",
      "XID",
      "Employee ID (Field)",
      "Name",
      "Group",
      "New Group",
      "Jobsites of Interest",
      "Classification",
      "Current Jobsite",
      "New Jobsite",
      "Effective Date",
      "Transfer Status",
      "Term",
      "Hourly Rate",
      "Rate Type",
      "Per Diem",
      "Badging",
      "Badge #",
      "Evaluation Score",
      "Notes",
      "Corrective Action",
      "Updates",
      "New Hire Follow Up",
      "Level 1 Status",
      "Scissor Lift Status",
      "Language",
      "Phone #",
      "E-Mail",
      "License 1",
      "License 2",
      "License 3",
      "License 4",
      "Location City",
      "Location State",
      "DOH",
      "Last Pay Change",
      "OSHA 10",
      "OSHA 30",
      "Sheet Date",
      "Source File",
      "Created At",
      "Updated At",
    ];

    const ws = XLSX.utils.json_to_sheet(data, { header });
    const range = XLSX.utils.decode_range(ws["!ref"]);

    ws["!autofilter"] = { ref: XLSX.utils.encode_range(range) };

    const MAX_WCH = 120;
    const cols = header.map((h) => ({
      wch: Math.min(MAX_WCH, Math.max(10, String(h).length + 2)),
    }));

    for (let R = 1; R <= range.e.r; ++R) {
      for (let C = 0; C <= range.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (!cell || cell.v == null) continue;
        const raw = typeof cell.v === "string" ? cell.v : String(cell.v);
        const longest = raw
          .split(/\r?\n/)
          .reduce((m, s) => Math.max(m, s.length), 0);
        cols[C].wch = Math.min(MAX_WCH, Math.max(cols[C].wch, longest + 2));
      }
    }
    ws["!cols"] = cols;

    const rateColIdx = header.indexOf("Hourly Rate");
    const perDiemColIdx = header.indexOf("Per Diem");
    const numericCols = [rateColIdx, perDiemColIdx].filter((idx) => idx >= 0);

    numericCols.forEach((colIdx) => {
      for (let R = 1; R <= range.e.r; ++R) {
        const addr = XLSX.utils.encode_cell({ r: R, c: colIdx });
        const cell = ws[addr];
        if (cell && typeof cell.v === "number") {
          cell.z = "$#,##0.00";
        }
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transfers");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "Transfers.xlsx");
  };

  const goDetails = (row) => {
    try {
      // try to locate the full employee object from FIELD employees
      const idKey = String(row.empId ?? "").trim();
      let empObj = null;

      if (idKey) {
        empObj = employees.find((e) => {
          const candidate = String(
            e.employeeid ?? e.emp_id ?? e.empId ?? e.id ?? ""
          ).trim();
          return candidate && candidate === idKey;
        });
      }

      // fallback: try match by XID
      if (!empObj && row.xid) {
        const xidKey = String(row.xid).trim();
        empObj = employees.find((e) => {
          const cand = String(
            getCI(e, "xid", "tixid", "employeeXid", "employee_xid") || ""
          ).trim();
          return cand && cand === xidKey;
        });
      }

      // fallback: try match by normalized emp code
      if (!empObj && row.empCode) {
        const target = normKey(row.empCode);
        empObj = employees.find((e) => {
          const k = normEmpCodeFromField(e) || normKey(getEmpCodeCI(e));
          return k && k === target;
        });
      }

      if (empObj && (empObj.employeeid ?? getCI(empObj, "emp_id", "id"))) {
        const empId = empObj.employeeid ?? empObj.emp_id ?? empObj.id;
        navigate(`/employee-details/${encodeURIComponent(empId)}`, {
          state: { employee: empObj },
        });
        return;
      }

      // last-resort: if we only have an empId value (from transfer row), navigate using it
      if (row.empId) {
        navigate(`/employee-details/${encodeURIComponent(row.empId)}`);
        return;
      }

      // if we only have an XID (no numeric employeeid), show info and don't navigate
      if (row.xid) {
        toast.info("No employeeid on this row — can’t open details.");
        return;
      }
    } catch (e) {
      console.warn("goDetails navigation error", e);
    }
  };

  /* ---------- modal edit helpers ---------- */

  const openEditModal = (row) => {
    if (!row) return;
    const id = row.transferId;
    const base = (id != null ? transferById.get(id) : null) || {};
    const b = base || {};

    const pickInputDate = (obj, rowValue, ...keys) => {
      const raw = firstDefined(obj, ...keys);
      if (raw !== undefined && raw !== null && `${raw}`.trim() !== "") {
        const f = formatDateForInput(raw);
        return f || "";
      }
      if (
        rowValue !== undefined &&
        rowValue !== null &&
        `${rowValue}`.trim() !== ""
      ) {
        const f = formatDateForInput(rowValue);
        return f || "";
      }
      return "";
    };

    const draft = {
      transfer_id: firstDefined(b, "transfer_id", "id") || row.transferId || "",
      emp_code:
        firstDefined(
          b,
          "emp_code",
          "employee_code",
          "empCode",
          "employeeCode"
        ) ||
        row.empCode ||
        "",
      xid: firstDefined(b, "xid") || row.xid || "",
      emp_name: firstDefined(b, "emp_name") || row.name || "",
      classification:
        firstDefined(b, "classification") || row.classification || "",
      work_group: firstDefined(b, "work_group", "workGroup") || row.group || "",
      new_group: firstDefined(b, "new_group") || row.newGroup || "",
      from_jobsite:
        firstDefined(b, "from_jobsite", "from_jobsite_key") ||
        row.fromJobsite ||
        "",
      to_jobsite:
        firstDefined(b, "to_jobsite", "to_jobsite_key", "project") ||
        row.toJobsite ||
        "",
      effective_date: pickInputDate(
        b,
        row.effectiveDate,
        "effective_date",
        "eff_key"
      ),
      transfer_status:
        firstDefined(b, "transfer_status") || row.transferStatus || "",
      term: firstDefined(b, "term") || row.term || "",
      rate_hourly:
        firstDefined(b, "rate_hourly") ??
        (row.rate !== undefined && row.rate !== null ? row.rate : ""),
      per_diem:
        firstDefined(b, "per_diem") ??
        (row.perDiem !== undefined && row.perDiem !== null ? row.perDiem : ""),
      evaluation_score:
        firstDefined(b, "evaluation_score") ??
        (row.evaluationScore !== undefined && row.evaluationScore !== null
          ? row.evaluationScore
          : ""),
      badging: firstDefined(b, "badging") || row.badging || "",
      level1_status:
        firstDefined(b, "level1_status", "lvl1_status") || row.lvl1Status || "",
      scissor_lift_status:
        firstDefined(b, "scissor_lift_status") || row.scissorLift || "",
      jobsites_of_interest:
        firstDefined(b, "jobsites_of_interest") || row.jobsitesOfInterest || "",
      contact_phone: firstDefined(b, "contact_phone") || row.phone || "",
      email: firstDefined(b, "email") || row.email || "",
      location_city: firstDefined(b, "location_city") || row.locationCity || "",
      location_state:
        firstDefined(b, "location_state") || row.locationState || "",
      notes: firstDefined(b, "notes") || row.notes || "",
      corrective_action:
        firstDefined(b, "corrective_action") || row.correctiveAction || "",
      updates: firstDefined(b, "updates") || row.updates || "",
      new_hire_follow_up:
        firstDefined(b, "new_hire_follow_up") || row.newHireFollowUp || "",
      license_1:
        firstDefined(b, "license_1", "license1") || row.license1 || "",
      license_2:
        firstDefined(b, "license_2", "license2") || row.license2 || "",
      license_3:
        firstDefined(b, "license_3", "license3") || row.license3 || "",
      license_4:
        firstDefined(b, "license_4", "license4") || row.license4 || "",
      hire_date: pickInputDate(b, row.hireDate, "hire_date"),
      last_pay_change: pickInputDate(b, row.lastPayChange, "last_pay_change"),
      osha_10_date: pickInputDate(
        b,
        row.osha10Date,
        "osha_10_date",
        "osha10_date"
      ),
      osha_30_date: pickInputDate(
        b,
        row.osha30Date,
        "osha_30_date",
        "osha30_date"
      ),
      sheet_date: pickInputDate(b, row.sheetDate, "sheet_date"),
      source_file: firstDefined(b, "source_file") || row.sourceFile || "",
      language: firstDefined(b, "language") || row.language || "",
      travel_preference:
        firstDefined(
          b,
          "travel_preference",
          "travel_pref",
          "travelPref",
          "travelPreference"
        ) ??
        (row.travelPref !== undefined && row.travelPref !== null
          ? row.travelPref
          : null),
      travel_notes:
        firstDefined(b, "travel_notes", "travelNotes", "travel_note") ||
        row.travelNotes ||
        "",
    };

    setEditError("");
    setEditDraft(draft);
    setEditingRow(draft);
    setEditOpen(true);
  };

  const handleEditChange = (field, value) => {
    // Format phone number as user types
    if (field === "contact_phone") {
      setEditDraft((prev) =>
        prev ? { ...prev, [field]: formatPhone(value) } : prev
      );
    } else {
      setEditDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    }
  };

  // Autofill employee data in edit modal
  const handleAutofillEmployee = async () => {
    if (!editDraft || !editDraft.emp_code) {
      setEditError("Please enter an Employee Code first.");
      return;
    }

    setAutofillingEmp(true);
    setEditError("");

    try {
      const empCode = editDraft.emp_code.trim();
      console.log("=== Autofilling employee data for:", empCode);
      console.log("Total employees in list:", employees.length);

      // Try to fetch current jobsite from timecards
      let currentJobsiteFromTimecard = "";
      try {
        const response = await api.get(`/api/v1/timecards/latest`, {
          params: { eeCode: empCode },
        });
        if (response.data && typeof response.data === "object") {
          currentJobsiteFromTimecard =
            firstDefined(
              response.data,
              "jobDesc",
              "job_desc",
              "jobCode",
              "job_code",
              "jobsite",
              "project"
            ) || "";
          console.log(
            "Current jobsite from timecard:",
            currentJobsiteFromTimecard
          );
        }
      } catch (e) {
        console.warn("Could not fetch timecard for current jobsite:", e);
        console.warn("Error details:", e.response?.data);
      }
      console.log(
        "Final currentJobsiteFromTimecard:",
        currentJobsiteFromTimecard
      );

      // Try to fetch employee details directly from the details endpoint as a fallback
      let emp = null;
      const targetKey = normKey(empCode);

      // First try to find in the loaded employees list
      emp = employees.find((e) => {
        const code =
          firstDefined(
            e,
            "employee_code",
            "employeeCode",
            "emp_code",
            "empCode",
            "employee_code_new",
            "employeeCodeNew",
            "cecId",
            "cec_id"
          ) ??
          firstDefined(
            e,
            "employee_code_norm",
            "employeeCodeNorm",
            "employee_code_new_norm",
            "employeeCodeNewNorm"
          );
        const key = normKey(code);
        return key === targetKey;
      });

      // If not found in the list, try fetching directly from the details endpoint
      if (!emp) {
        console.log("Employee not found in list, trying details endpoint...");
        try {
          // The endpoint expects an array of employee codes in the request body
          const { data } = await api.post(EMP_DETAILS_BATCH_URL, {
            empCodes: [empCode],
          });
          console.log("Details endpoint response:", data);

          // The endpoint returns { results: { empCode: dto, ... }, unmatchedRequested: [...] }
          if (data && data.results) {
            const results = data.results;
            // Find the matching employee in the results
            emp = Object.values(results).find((dto) => {
              if (!dto) return false;
              const dtoCode = firstDefined(
                dto,
                "employeeCode",
                "employee_code",
                "emp_code",
                "cecId",
                "cec_id"
              );
              return normKey(dtoCode) === targetKey;
            });

            if (emp) {
              console.log("Found employee from details endpoint:", emp);
            }
          }
        } catch (detailsErr) {
          console.error("Failed to fetch from details endpoint:", detailsErr);
          console.error("Error details:", detailsErr.response?.data);
        }
      }

      if (!emp) {
        setEditError(`No employee found for code: ${empCode}`);
        return;
      }

      console.log("Found employee:", emp);

      // Build employee name
      const displayName =
        firstDefined(
          emp,
          "displayName",
          "display_name",
          "employeename",
          "employeeName"
        ) ||
        (() => {
          const first = firstDefined(
            emp,
            "preferredFirstname",
            "preferred_firstname",
            "legalFirstname",
            "legal_firstname",
            "firstName",
            "firstname"
          );
          const last = firstDefined(
            emp,
            "legalLastname",
            "legal_lastname",
            "lastName",
            "lastname"
          );
          return first && last ? `${first} ${last}` : first || last || "";
        })();

      // Get all the fields
      const xid =
        firstDefined(
          emp,
          "xid",
          "tixid",
          "xid_norm",
          "tixid_norm",
          "person_xid_norm"
        ) || "";
      const classification =
        firstDefined(
          emp,
          "classification",
          "positionTitle",
          "position_title",
          "emp_rank",
          "empRank",
          "position",
          "businessTitle",
          "business_title"
        ) || "";
      const workGroup =
        firstDefined(
          emp,
          "workGroup",
          "work_group",
          "group",
          "businessUnit",
          "business_unit"
        ) || "";
      const fromJobsite =
        currentJobsiteFromTimecard ||
        firstDefined(
          emp,
          "currentJobsite",
          "work_project",
          "workProject",
          "work_location",
          "workLocation"
        ) ||
        "";
      const locationCity =
        firstDefined(
          emp,
          "workLocationCity",
          "work_location_city",
          "primaryCityMunicipality",
          "primary_city_municipality",
          "city"
        ) || "";
      const locationState =
        firstDefined(
          emp,
          "workLocationState",
          "work_location_state",
          "primaryStateProvince",
          "primary_state_province",
          "state"
        ) || "";
      const email =
        firstDefined(
          emp,
          "workEmail",
          "work_email",
          "personalEmail",
          "personal_email",
          "email",
          "emailAddress"
        ) || "";
      const phone =
        firstDefined(
          emp,
          "primaryPhone",
          "primary_phone",
          "workPhone",
          "work_phone",
          "phone",
          "phoneNumber"
        ) || "";
      const badging =
        firstDefined(emp, "badgeNum", "badge_num", "badging") || "";
      const language =
        firstDefined(
          emp,
          "essLanguagePreference",
          "ess_language_preference",
          "languageSpoken",
          "language_spoken",
          "language"
        ) || "";
      const hireDate =
        firstDefined(
          emp,
          "hireDate",
          "hire_date",
          "originalHireDate",
          "original_hire_date",
          "rehireDate",
          "rehire_date"
        ) || "";
      const lastPayChange =
        firstDefined(emp, "lastPayChange", "last_pay_change") || "";
      const hourlyRateRaw = firstDefined(
        emp,
        "rateHourly",
        "hourlyRate",
        "rate1",
        "rate_1",
        "payRate",
        "rate"
      );
      const perDiemRaw = firstDefined(
        emp,
        "perDiem",
        "travelAllowance",
        "travel_allowance"
      );

      let lvl1Status = firstDefined(emp, "level1Status") || "";
      if (!lvl1Status) {
        const lvlFlag = firstDefined(emp, "lvl1_completed", "training_highest");
        if (lvlFlag) lvl1Status = "Completed";
      }

      console.log("Extracted data:", {
        displayName,
        xid,
        classification,
        workGroup,
        fromJobsite,
        locationCity,
        locationState,
        email,
        phone,
        badging,
        language,
        hireDate,
        lastPayChange,
        hourlyRateRaw,
        perDiemRaw,
        lvl1Status,
      });

      // Helper to check if field is empty
      const isEmpty = (val) => !val || String(val).trim() === "";

      // Update the draft with autofilled values (only if fields are empty)
      setEditDraft((prev) => {
        const updated = { ...prev };

        if (isEmpty(prev.emp_name)) updated.emp_name = displayName;
        if (isEmpty(prev.xid)) updated.xid = xid;
        if (isEmpty(prev.classification))
          updated.classification = classification;
        if (isEmpty(prev.work_group)) updated.work_group = workGroup;
        if (isEmpty(prev.from_jobsite)) updated.from_jobsite = fromJobsite;
        if (isEmpty(prev.location_city)) updated.location_city = locationCity;
        if (isEmpty(prev.location_state))
          updated.location_state = locationState;
        if (isEmpty(prev.email)) updated.email = email;
        if (isEmpty(prev.contact_phone))
          updated.contact_phone = formatPhone(phone);
        if (isEmpty(prev.badging)) updated.badging = badging;
        if (isEmpty(prev.language)) updated.language = language;
        if (isEmpty(prev.hire_date)) updated.hire_date = hireDate;
        if (isEmpty(prev.last_pay_change))
          updated.last_pay_change = lastPayChange;
        if (isEmpty(prev.rate_hourly) && hourlyRateRaw != null)
          updated.rate_hourly = String(hourlyRateRaw);
        if (isEmpty(prev.per_diem) && perDiemRaw != null)
          updated.per_diem = String(perDiemRaw);
        if (isEmpty(prev.level1_status)) updated.level1_status = lvl1Status;

        console.log("Updated draft:", updated);
        return updated;
      });

      console.log("Autofill complete");
    } catch (e) {
      console.error("Autofill error:", e);
      setEditError(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to autofill employee data."
      );
    } finally {
      setAutofillingEmp(false);
    }
  };

  // ...existing code...

  const handleEditSave = async () => {
    if (!editDraft) return;
    const id = editDraft.transfer_id ?? editDraft.id ?? editDraft.transferId;

    if (!id) {
      setEditError("Missing transfer ID; cannot save.");
      return;
    }

    setSavingEdit(true);
    setEditError("");

    try {
      // Map work_group to group for backend
      const payload = { ...editDraft };
      // Normalize travel notes field name
      if (payload.travel_notes === undefined && payload.travelNotes !== undefined) {
        payload.travel_notes = payload.travelNotes;
      }
      if (payload.travel_notes === undefined && payload.travel_note !== undefined) {
        payload.travel_notes = payload.travel_note;
      }
      // Keep all common casings for backend compatibility
      if (payload.travel_notes !== undefined) {
        const tn = payload.travel_notes;
        payload.travel_note = tn === "" ? null : tn;
        payload.travelNotes = tn === "" ? null : tn;
        // prefer null over empty string so backend updates properly
        payload.travel_notes = tn === "" ? null : tn;
      }

      if (payload.work_group !== undefined) {
        payload.group = payload.work_group;
        delete payload.work_group;
      }

      // Convert travel_preference to integer if it's a non-empty string, otherwise null
      if (
        payload.travel_preference !== undefined &&
        payload.travel_preference !== null &&
        payload.travel_preference !== ""
      ) {
        payload.travel_preference = parseInt(payload.travel_preference, 10);
      } else {
        // Convert empty string or undefined to null for clearing
        payload.travel_preference = null;
      }

      console.log("[Transfers] PUT payload:", payload);
      console.log("[Transfers] Payload keys:", Object.keys(payload));
      console.log(
        "[Transfers] travel_preference value:",
        payload.travel_preference,
        "type:",
        typeof payload.travel_preference
      );

      // Filter out undefined/null fields that shouldn't be sent
      const cleanPayload = {};
      Object.keys(payload).forEach((key) => {
        if (payload[key] !== undefined) {
          cleanPayload[key] = payload[key];
        }
      });

      console.log("[Transfers] Clean payload:", cleanPayload);

      const res = await api.put(
        `/api/v1/transfers/${encodeURIComponent(id)}`,
        cleanPayload
      );
      // Prefer the payload values (so fields the API doesn't echo back, like travel_notes,
      // stay in local state), but still merge any authoritative values returned by the API.
      const updated =
        res?.data && typeof res.data === "object"
          ? { ...payload, ...res.data }
          : payload;

      setTransfers((prev) =>
        prev.map((t) => {
          const tid = firstDefined(t, "transfer_id", "id");
          return tid === id ? { ...t, ...updated } : t;
        })
      );

      setEditOpen(false);
      setEditDraft(null);
    } catch (e) {
      console.error("Update transfer error:", e);
      const errorMsg =
        e?.response?.data?.message ||
        e?.response?.data ||
        e?.message ||
        "Failed to update transfer.";
      console.error("Error details:", errorMsg);
      setEditError(errorMsg);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            flex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <h1 className={styles.title} style={{ margin: 0 }}>
              <span className={styles.titleIcon} aria-hidden="true">
                <BsArrowLeftRight />
              </span>
              Transfers
            </h1>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: "bold",
                color: "#facc15",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              {formatWeekLabel(startDate, endDate) || "All Transfers"}
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => navigate("/new-hires")}
          >
            <GrUserNew />New Hires
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => navigate("/mandown")}
          >
            <HiArrowCircleDown />Mandown
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => navigate("/home")}
          >
            <FaHome />Home
          </button>
        </div>
      </header>

      {(loading || err) && (
        <div className={styles.status}>
          {loading ? "Loading transfers..." : `Error: ${err}`}
        </div>
      )}

      <section className={styles.filters}>
        <div
          className={styles.filterRow}
          style={{ alignItems: "flex-end", gap: "12px" }}
        >
          {/* Left: Group and New Jobsite dropdowns */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <div className={styles.filterItem}>
              <label>Group</label>
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
              >
                <option value="">All</option>
                {uniqueGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterItem}>
              <label>New Jobsite</label>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
              >
                <option value="">All</option>
                {uniqueProjects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Center: View Mode Buttons (centered under the header label) */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
            }}
          >
            <button
              type="button"
              className={`${styles.secondaryBtn} ${
                viewMode === "ALL_TRANSFERS" ? styles.activeTab : ""
              }`}
              onClick={() => {
                setViewMode("ALL_TRANSFERS");
                setStartDate("");
                setEndDate("");
              }}
              style={{
                minWidth: "120px",
                height: "36px",
                backgroundColor:
                  viewMode === "ALL_TRANSFERS" ? "#facc15" : undefined,
                color: viewMode === "ALL_TRANSFERS" ? "#1f2937" : undefined,
                fontWeight: viewMode === "ALL_TRANSFERS" ? "bold" : "normal",
                padding: "0 8px",
              }}
              title="View all transfers sorted by newest first"
            >
              ALL TRANSFERS
            </button>
            <button
              type="button"
              className={`${styles.secondaryBtn} ${
                viewMode === "TRANSFERS_BY_WEEK" ? styles.activeTab : ""
              }`}
              onClick={() => setViewMode("TRANSFERS_BY_WEEK")}
              style={{
                minWidth: "150px",
                height: "36px",
                backgroundColor:
                  viewMode === "TRANSFERS_BY_WEEK" ? "#facc15" : undefined,
                color: viewMode === "TRANSFERS_BY_WEEK" ? "#1f2937" : undefined,
                fontWeight:
                  viewMode === "TRANSFERS_BY_WEEK" ? "bold" : "normal",
                padding: "0 8px",
              }}
              title="View transfers grouped by week"
            >
              TRANSFERS BY WEEK
            </button>
          </div>

          {/* Right: Week Navigation Controls - Only visible in TRANSFERS_BY_WEEK mode */}
          {viewMode === "TRANSFERS_BY_WEEK" && (
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "flex-end",
                marginLeft: "auto",
              }}
            >
              <div className={styles.filterItem} style={{ marginBottom: 0 }}>
                <label>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className={styles.filterItem} style={{ marginBottom: 0 }}>
                <label>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={prevWeek}
                title="Previous week"
                style={{ minWidth: "70px", height: "36px" }}
              >
                ← Prev
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={goToToday}
                title="Go to current week"
                style={{ minWidth: "70px", height: "36px" }}
              >
                Today
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={nextWeek}
                title="Next week"
                style={{ minWidth: "70px", height: "36px" }}
              >
                Next →
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setSortAsc((s) => !s)}
                title="Toggle effective date sort"
                aria-pressed={sortAsc}
                style={{ minWidth: "70px", height: "36px" }}
              >
                {sortAsc ? "↑ Asc" : "↓ Desc"}
              </button>
            </div>
          )}
        </div>
      </section>

      {missingContactRows.length > 0 && (
        <div
          style={{
            margin: "8px 0 16px",
            padding: "8px 12px",
            background: "#111827",
            border: "1px solid #374151",
            borderRadius: "8px",
            color: "#e5e7eb",
            fontSize: "0.95rem",
            lineHeight: 1.5,
          }}
          role="status"
        >
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <strong style={{ color: "#facc15" }}>
              {missingContactRows.length} row
              {missingContactRows.length === 1 ? "" : "s"} missing contact info
            </strong>
            <button
              type="button"
              className={styles.secondaryBtn}
              style={{ padding: "4px 8px", fontSize: "0.9rem" }}
              onClick={() => setShowMissingOnly((v) => !v)}
            >
              {showMissingOnly ? "Show All" : "Filter to Missing"}
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              style={{ padding: "4px 8px", fontSize: "0.9rem" }}
              onClick={() => setMissingInfoModalOpen(true)}
            >
              View List
            </button>
          </div>
          <div style={{ marginTop: 4 }}>
            {missingContactRows
              .slice(0, 3)
              .map((r) => `${r.empCode || "Unknown"}: ${r.missing.join(", ")}`)
              .join(" | ")}
            {missingContactRows.length > 3 ? " ..." : ""}
          </div>
        </div>
      )}

      {/* Missing-contact modal */}
      {missingInfoModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 720 }}>
            <header className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Missing Contact/Location ({missingContactRows.length})
              </h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setMissingInfoModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </header>
            <div className={styles.modalBody}>
              <div style={{ maxHeight: "420px", overflowY: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.95rem",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>EE Code</th>
                      <th style={{ textAlign: "left" }}>Name</th>
                      <th style={{ textAlign: "left" }}>Missing</th>
                      <th style={{ textAlign: "left" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missingContactRows.map((entry) => (
                      <tr
                        key={
                          entry.empCode ||
                          entry.name ||
                          (entry.row && entry.row.transferId) ||
                          (entry.row && entry.row.empId) ||
                          String(Math.random())
                        }
                      >
                        <td>{entry.empCode || "-"}</td>
                        <td>{entry.name || "-"}</td>
                        <td>{entry.missing.join(", ")}</td>
                        <td style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            className={styles.linkBtn}
                            onClick={() => goDetails(entry.row)}
                            disabled={!entry.row}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className={styles.linkBtn}
                            onClick={() => {
                              setMissingInfoModalOpen(false);
                              openEditModal(entry.row);
                            }}
                            disabled={!entry.row}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Highlight modal (replaces inline picker) */}
      {highlightEditor.open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 420 }}>
            <header className={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: "1rem", color: "#facc15" }}>
                Highlight Row
              </h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() =>
                  setHighlightEditor({
                    open: false,
                    rowId: null,
                    color: "#ffff00",
                  })
                }
              >
                ×
              </button>
            </header>
            <div className={styles.modalBody}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <input
                  type="color"
                  value={highlightEditor.color}
                  onChange={(e) =>
                    setHighlightEditor((s) => ({ ...s, color: e.target.value }))
                  }
                  aria-label="Pick highlight color"
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontSize: 13, color: "#e5e7eb", marginBottom: 6 }}
                  >
                    Preview
                  </div>
                  <div
                    style={{
                      padding: 8,
                      borderRadius: 6,
                      border: "1px solid rgba(31,41,55,0.9)",
                      background: highlightEditor.color,
                      color: textColorForBg(highlightEditor.color),
                    }}
                  >
                    <strong style={{ fontSize: 14 }}>Row preview text</strong>
                    <div style={{ fontSize: 12 }}>{`Contrast: ${
                      Math.round(
                        (contrastRatio(
                          highlightEditor.color,
                          textColorForBg(highlightEditor.color)
                        ) || 0) * 10
                      ) / 10
                    }`}</div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>
                  Selected row id:{" "}
                  <code style={{ color: "#e5e7eb" }}>
                    {highlightEditor.rowId}
                  </code>
                </div>
              </div>
            </div>
            <footer className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => {
                  clearHighlight(highlightEditor.rowId);
                }}
              >
                Clear
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() =>
                  setHighlightEditor({
                    open: false,
                    rowId: null,
                    color: "#ffff00",
                  })
                }
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() =>
                  applyHighlight(highlightEditor.rowId, highlightEditor.color)
                }
              >
                Apply
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Tab navigation for filtering by effective date */}
      <div
        className={styles.tabNav}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            className={`${styles.tab} ${
              !showNoDateEntries && !showArchivedEntries ? styles.activeTab : ""
            }`}
            onClick={() => {
              setShowNoDateEntries(false);
              setShowArchivedEntries(false);
            }}
          >
            With Effective Date
            <span className={styles.tabBadge}>{withDateCount}</span>
          </button>
          <button
            type="button"
            className={`${styles.tab} ${
              showNoDateEntries && !showArchivedEntries ? styles.activeTab : ""
            }`}
            onClick={() => {
              setShowNoDateEntries(true);
              setShowArchivedEntries(false);
            }}
          >
            No Effective Date
            <span className={styles.tabBadge}>{noDateCount}</span>
          </button>
          <button
            type="button"
            className={`${styles.tab} ${
              showArchivedEntries ? styles.activeTab : ""
            }`}
            onClick={() => {
              setShowArchivedEntries(true);
              setShowNoDateEntries(false);
            }}
          >
            Archived Entries
            <span className={styles.tabBadge}>{archivedCount}</span>
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => {
              setSortColumn("effectiveDate");
              setSortDirection("desc");
            }}
            title="Reset sorting to default (Effective Date, descending)"
            style={{ minWidth: "100px", height: "32px", fontSize: "12px" }}
          >
            Clear Sorting
          </button>
          <input
            type="text"
            placeholder="Filter by EE Code..."
            value={eeCodeSearchText}
            onChange={(e) => setEeCodeSearchText(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #4b5563",
              borderRadius: "4px",
              backgroundColor: "#1f2937",
              color: "#e5e7eb",
              minWidth: "150px",
              fontSize: "14px",
            }}
            title="Type to filter by EE Code"
          />
        </div>

        {/* Notes Search, New Transfer, and Export on the right */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            className={newBtnStyles.newBtn}
            onClick={() => navigate("/transfers/new")}
            style={{
              order: 0,
              minWidth: "160px",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <FaPlus style={{ marginRight: "0.5em" }} />
            New Transfer
          </button>
          <input
            type="text"
            placeholder="Search notes..."
            value={notesSearchText}
            onChange={(e) => setNotesSearchText(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #4b5563",
              borderRadius: "4px",
              backgroundColor: "#1f2937",
              color: "#e5e7eb",
              minWidth: "180px",
              fontSize: "14px",
            }}
            title="Type to dynamically filter transfers by notes content"
          />
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setNotesSearchText("")}
            title="Clear notes search"
            style={{ minWidth: "70px", height: "36px" }}
          >
            Clear
          </button>
          <button
            type="button"
            className={`${styles.primaryBtn} ${styles.excelBtn || ""}`}
            onClick={exportToExcel}
            disabled={rows.length === 0}
            title={rows.length === 0 ? "No rows to export" : "Export to Excel"}
            style={{
              backgroundColor: "#217346",
              borderColor: "#1c5e39",
              color: "#fff",
            }}
          >
            Export
          </button>
        </div>
      </div>

      <section className={styles.tableWrap} ref={tableWrapRef}>
          <table className={styles.table}>
            <colgroup>
              {COL_WIDTHS.map((w, idx) => (
                <col key={idx} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
            <tr>
              <th
                style={{ width: 120, cursor: "pointer" }}
                onClick={() => {
                  if (sortColumn === "empCode") {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortColumn("empCode");
                    setSortDirection("asc");
                  }
                }}
              >
                EE Code{" "}
                {sortColumn === "empCode" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => {
                  if (sortColumn === "name") {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortColumn("name");
                    setSortDirection("asc");
                  }
                }}
              >
                Name{" "}
                {sortColumn === "name" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => {
                  if (sortColumn === "group") {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortColumn("group");
                    setSortDirection("asc");
                  }
                }}
              >
                Group{" "}
                {sortColumn === "group" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th>New Group</th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => {
                  if (sortColumn === "classification") {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortColumn("classification");
                    setSortDirection("asc");
                  }
                }}
              >
                Classification{" "}
                {sortColumn === "classification" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => {
                  if (sortColumn === "fromJobsite") {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortColumn("fromJobsite");
                    setSortDirection("asc");
                  }
                }}
              >
                Current Jobsite{" "}
                {sortColumn === "fromJobsite" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => {
                  if (sortColumn === "toJobsite") {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortColumn("toJobsite");
                    setSortDirection("asc");
                  }
                }}
              >
                New Jobsite{" "}
                {sortColumn === "toJobsite" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                style={{ width: 130, cursor: "pointer", whiteSpace: "nowrap" }}
                onClick={() => {
                  if (sortColumn === "effectiveDate") {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortColumn("effectiveDate");
                    setSortDirection("desc");
                  }
                }}
              >
                Effective Date{" "}
                {sortColumn === "effectiveDate" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => {
                  if (sortColumn === "transferStatus") {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortColumn("transferStatus");
                    setSortDirection("asc");
                  }
                }}
              >
                Status{" "}
                {sortColumn === "transferStatus" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => {
                  if (sortColumn === "evaluationScore") {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortColumn("evaluationScore");
                    setSortDirection("desc");
                  }
                }}
              >
                Eval{" "}
                {sortColumn === "evaluationScore" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => {
                  if (sortColumn === "rateHourly") {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortColumn("rateHourly");
                    setSortDirection("desc");
                  }
                }}
              >
                Rate{" "}
                {sortColumn === "rateHourly" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => {
                  if (sortColumn === "perDiem") {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortColumn("perDiem");
                    setSortDirection("desc");
                  }
                }}
              >
                Per Diem{" "}
                {sortColumn === "perDiem" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th>Travel Pref</th>
              <th style={{ minWidth: 180 }}>Jobsites of Interest</th>
              <th>Location</th>
              <th>Phone #</th>
              <th>E-Mail</th>
              <th>License 1</th>
              <th>License 2</th>
              <th>License 3</th>
              <th>License 4</th>
              <th>Badging</th>
              <th>Level 1</th>
              <th>Scissor Lift</th>
              <th>OSHA 10</th>
              <th>OSHA 30</th>
              <th>New Hire Follow-Up</th>
              <th>Corrective Action</th>
              <th>Notes</th>
              <th>Updates</th>
              <th style={{ width: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={31} className={styles.empty}>
                  {loading
                    ? "Loading..."
                    : err
                    ? "Could not load transfers."
                    : "No transfers found with the current filters."}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const key = `${r.transferId || r.empCode || r.name || "row"}-${
                  r.effectiveDate || ""
                }`;
                const canGo =
                  !!r.empId ||
                  !!r.xid ||
                  (!!r.empCode && String(r.empCode).trim() !== "");
                const rowId = getRowId(r);
                const manualColor = (highlights && highlights[rowId]) || null;
                const statusRaw = (r.transferStatus || "")
                  .toString()
                  .toLowerCase();
                let statusColor = null;
                // stronger, more distinct status colors for better readability
                if (statusRaw === "confirmed" || statusRaw === "completed") {
                  statusColor = "#228B22"; // forest green
                } else if (statusRaw === "needs assignment") {
                  statusColor = "#facc15"; // CEC yellow (distinct)
                } else if (statusRaw === "cancelled") {
                  statusColor = "#dc2626"; // red for cancelled
                }
                const bg = manualColor || statusColor || null;
                const textClr = bg ? textColorForBg(bg) : undefined;
                // normalizeRateKind is defined once outside render for performance

                const rateKindRaw = normalizeRateKind(r.rateType);
                const rateKindLabel =
                  rateKindRaw === "salary"
                    ? "Salary"
                    : rateKindRaw === "hourly" || !rateKindRaw
                    ? "Hourly"
                    : rateKindRaw;
                const hasRate =
                  r.rate !== null &&
                  r.rate !== undefined &&
                  String(r.rate).trim() !== "";
                const rateLabel = hasRate
                  ? `${currency(r.rate)}/${rateKindLabel}`
                  : "-";
                const hasPerDiem =
                  r.perDiem !== null &&
                  r.perDiem !== undefined &&
                  String(r.perDiem).trim() !== "";
                const perDiemLabel = hasPerDiem
                  ? `${currency(r.perDiem)}/day`
                  : "-";
                const travelTitle = r.travelPref
                  ? r.travelNotes
                    ? `${TRAVEL_LABEL[r.travelPref] || "Travel Pref"} — ${
                        r.travelNotes
                      }`
                    : TRAVEL_LABEL[r.travelPref]
                  : r.travelNotes || undefined;

                const trStyle =
                  bg && textClr
                    ? { ["--highlight-bg"]: bg, ["--highlight-text"]: textClr }
                    : undefined;

                return (
                  <tr
                    key={key}
                    className={bg ? styles.highlightedRow : undefined}
                    style={trStyle}
                  >
                    <td>{r.empCode || "-"}</td>
                    <td>{r.name || "-"}</td>
                    <td>
                      {r.group || <span className={styles.muted}>—</span>}
                    </td>
                    <td>
                      {r.newGroup ? (
                        r.newGroup
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td>
                      {r.classification || (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td>{r.fromJobsite || "-"}</td>
                    <td>{r.toJobsite || "-"}</td>
                    <td
                      style={{
                        cursor: r.effectiveDate ? "pointer" : "default",
                        color: r.effectiveDate ? "#facc15" : "inherit",
                        textDecoration: r.effectiveDate ? "underline" : "none",
                      }}
                      onClick={() => {
                        if (r.effectiveDate) {
                          const { start, end } = weekRangeFor(
                            toDate(r.effectiveDate)
                          );
                          setViewMode("TRANSFERS_BY_WEEK");
                          setStartDate(start);
                          setEndDate(end);
                          // Scroll to top of page
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }}
                    >
                      {formatDate(r.effectiveDate) || "-"}
                    </td>
                    <td>
                      {r.transferId ? (
                        <select
                          value={r.transferStatus || ""}
                          onChange={(e) =>
                            handleStatusChange(r, e.target.value)
                          }
                          disabled={savingStatusId === r.transferId}
                        >
                          <option value="">—</option>
                          <option value="needs assignment">
                            Needs Assignment
                          </option>
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      ) : (
                        r.transferStatus || "-"
                      )}
                    </td>
                    <td>
                      {r.evaluationScore !== "" &&
                      r.evaluationScore !== null &&
                      r.evaluationScore !== undefined
                        ? r.evaluationScore
                        : "-"}
                    </td>
                    <td>{rateLabel}</td>
                    <td>{perDiemLabel}</td>
                    <td>
                      {r.travelPref === 1 && (
                        <span
                          title={travelTitle}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <CgAirplane
                            size={24}
                            focusable="false"
                            aria-label={travelTitle || TRAVEL_LABEL[1]}
                          />
                        </span>
                      )}
                      {r.travelPref === 2 && (
                        <span
                          title={travelTitle}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <FaCarSide
                            size={18}
                            focusable="false"
                            aria-label={travelTitle || TRAVEL_LABEL[2]}
                          />
                        </span>
                      )}
                      {r.travelPref === 3 && (
                        <span
                          title={travelTitle}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <FaHouseUser
                            size={18}
                            focusable="false"
                            aria-label={travelTitle || TRAVEL_LABEL[3]}
                          />
                        </span>
                      )}
                      {r.travelPref === 0 && (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td>
                      {r.jobsitesOfInterest ? (
                        <div style={{ whiteSpace: "pre-line" }}>
                          {r.jobsitesOfInterest}
                        </div>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td>{r.location || "-"}</td>
                    <td>
                      {r.phone
                        ? (() => {
                            const href = telHref(r.phone);
                            const label = formatPhone(r.phone);
                            return href ? (
                              <a className={styles.linkBtn} href={href}>
                                {label}
                              </a>
                            ) : (
                              label
                            );
                          })()
                        : "-"}
                    </td>
                    <td>
                      {r.email ? (
                        <a
                          className={styles.linkBtn}
                          href={`mailto:${r.email}`}
                        >
                          {r.email}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{r.license1 || "-"}</td>
                    <td>{r.license2 || "-"}</td>
                    <td>{r.license3 || "-"}</td>
                    <td>{r.license4 || "-"}</td>
                    <td>{r.badging || "-"}</td>
                    <td>{r.lvl1Status || "-"}</td>
                    <td>{r.scissorLift || "-"}</td>
                    <td>{formatDate(r.osha10Date) || "-"}</td>
                    <td>{formatDate(r.osha30Date) || "-"}</td>
                    <td>
                      {r.newHireFollowUp ? (
                        <div style={{ whiteSpace: "pre-line" }}>
                          {r.newHireFollowUp}
                        </div>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td>
                      {r.correctiveAction ? (
                        <div style={{ whiteSpace: "pre-line" }}>
                          {r.correctiveAction}
                        </div>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td>
                      {r.notes ? (
                        <div style={{ whiteSpace: "pre-line" }}>{r.notes}</div>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td>
                      {r.updates ? (
                        <div style={{ whiteSpace: "pre-line" }}>{r.updates}</div>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td className={styles.actionsCell}>
                      <div className={styles.actionsInner}>
                        <button
                          type="button"
                          className={styles.linkBtn}
                          onClick={() => openEditModal(r)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.linkBtn}
                          onClick={() => openHighlightFor(r)}
                          title="Highlight this row"
                        >
                          Highlight
                        </button>
                        <button
                          type="button"
                          className={styles.linkBtn}
                          onClick={() => goDetails(r)}
                          disabled={!canGo}
                          title={
                            r.empId
                              ? "View employee details"
                              : r.xid
                              ? "View employee details (by XID)"
                              : r.empCode && String(r.empCode).trim() !== ""
                              ? "View employee details"
                              : "Missing employee link"
                          }
                        >
                          Details
                        </button>
                        {!showArchivedEntries ? (
                          <button
                            type="button"
                            className={styles.linkBtn}
                            onClick={() => handleArchiveTransfer(r)}
                            title="Archive this transfer entry"
                            style={{ color: "#ef4444" }}
                          >
                            Archive
                          </button>
                        ) : (
                          <div className={styles.archiveActions}>
                            <button
                              type="button"
                              className={styles.linkBtn}
                              onClick={() => handleRestoreTransfer(r)}
                              title="Restore this transfer entry"
                              style={{ color: "#10b981" }}
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              className={styles.linkBtn}
                              onClick={() => handleDeleteTransfer(r)}
                              title="Delete this transfer entry permanently"
                              style={{ color: "#ef4444" }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      {/* highlight editor is shown as a modal (see below) */}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {editOpen && editDraft && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <header className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                Edit Transfer - {editDraft.emp_code || editDraft.empCode || ""}
              </h2>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={handleEditCancel}
                disabled={savingEdit}
              >
                <CgCloseR />
              </button>
            </header>

            <div className={styles.modalBody}>
              <div className={styles.modalGrid}>
                <div className={styles.modalCol}>
                  <div className={styles.modalField}>
                    <label>Employee Name</label>
                    <input
                      type="text"
                      value={editDraft.emp_name || ""}
                      onChange={(e) =>
                        handleEditChange("emp_name", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>Classification</label>
                    <input
                      type="text"
                      value={editDraft.classification || ""}
                      onChange={(e) =>
                        handleEditChange("classification", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>Work Group</label>
                    <input
                      type="text"
                      value={editDraft.work_group || ""}
                      onChange={(e) =>
                        handleEditChange("work_group", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>New Group</label>
                    <input
                      type="text"
                      value={editDraft.new_group || ""}
                      onChange={(e) =>
                        handleEditChange("new_group", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>Current Jobsite</label>
                    <input
                      type="text"
                      value={editDraft.from_jobsite || ""}
                      onChange={(e) =>
                        handleEditChange("from_jobsite", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>New Jobsite</label>
                    <input
                      type="text"
                      value={editDraft.to_jobsite || ""}
                      onChange={(e) =>
                        handleEditChange("to_jobsite", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>Jobsites of Interest</label>
                    <textarea
                      value={editDraft.jobsites_of_interest || ""}
                      onChange={(e) =>
                        handleEditChange("jobsites_of_interest", e.target.value)
                      }
                      rows={2}
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>Effective Date</label>
                    <input
                      type="date"
                      value={editDraft.effective_date || ""}
                      onChange={(e) =>
                        handleEditChange("effective_date", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>Status</label>
                    <select
                      value={editDraft.transfer_status || ""}
                      onChange={(e) =>
                        handleEditChange("transfer_status", e.target.value)
                      }
                    >
                      <option value="">—</option>
                      <option value="needs assignment">Needs Assignment</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className={styles.modalField}>
                    <label>Term</label>
                    <input
                      type="text"
                      value={editDraft.term || ""}
                      onChange={(e) => handleEditChange("term", e.target.value)}
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>Hourly Rate</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editDraft.rate_hourly ?? ""}
                      onChange={(e) =>
                        handleEditChange("rate_hourly", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>Per Diem</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editDraft.per_diem ?? ""}
                      onChange={(e) =>
                        handleEditChange("per_diem", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>Evaluation Score</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editDraft.evaluation_score ?? ""}
                      onChange={(e) =>
                        handleEditChange("evaluation_score", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>Language</label>
                    <input
                      type="text"
                      value={editDraft.language || ""}
                      onChange={(e) =>
                        handleEditChange("language", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>Travel Preference</label>
                    <select
                      value={
                        editDraft.travel_preference != null
                          ? String(editDraft.travel_preference)
                          : ""
                      }
                      onChange={(e) =>
                        handleEditChange("travel_preference", e.target.value)
                      }
                    >
                      <option value="">Not Specified</option>
                      <option value="1">Willing to Travel</option>
                      <option value="2">Willing to Travel Within State</option>
                      <option value="3">Prefers to Stay Local</option>
                    </select>
                  </div>
                  <div className={styles.modalField}>
                    <label>Travel Notes</label>
                    <textarea
                      value={editDraft.travel_notes || ""}
                      onChange={(e) =>
                        handleEditChange("travel_notes", e.target.value)
                      }
                      placeholder="Add travel-related notes (will be appended with timestamp to employee record)"
                      style={{
                        minHeight: "80px",
                        fontFamily: "monospace",
                        fontSize: "12px",
                      }}
                    />
                  </div>
                </div>

                <div className={styles.modalCol}>
                  <div className={styles.modalField}>
                    <label>Employee Code</label>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="text"
                        value={editDraft.emp_code || ""}
                        onChange={(e) =>
                          handleEditChange("emp_code", e.target.value)
                        }
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={handleAutofillEmployee}
                        disabled={autofillingEmp || !editDraft.emp_code}
                        className={styles.secondaryBtn}
                        style={{
                          padding: "8px 12px",
                          fontSize: "13px",
                          whiteSpace: "nowrap",
                          minWidth: "auto",
                        }}
                        title="Autofill employee data from employee code"
                      >
                        {autofillingEmp ? "Loading..." : "Autofill"}
                      </button>
                    </div>
                  </div>
                  <div className={styles.modalField}>
                    <label>Badging</label>
                    <input
                      type="text"
                      value={editDraft.badging || ""}
                      onChange={(e) =>
                        handleEditChange("badging", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>Level 1 Status</label>
                    <input
                      type="text"
                      value={editDraft.level1_status || ""}
                      onChange={(e) =>
                        handleEditChange("level1_status", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>Scissor Lift Status</label>
                    <input
                      type="text"
                      value={editDraft.scissor_lift_status || ""}
                      onChange={(e) =>
                        handleEditChange("scissor_lift_status", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>Phone</label>
                    <input
                      type="text"
                      value={editDraft.contact_phone || ""}
                      onChange={(e) =>
                        handleEditChange("contact_phone", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>Email</label>
                    <input
                      type="email"
                      value={editDraft.email || ""}
                      onChange={(e) =>
                        handleEditChange("email", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>License 1</label>
                    <input
                      type="text"
                      value={editDraft.license_1 || ""}
                      onChange={(e) =>
                        handleEditChange("license_1", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>License 2</label>
                    <input
                      type="text"
                      value={editDraft.license_2 || ""}
                      onChange={(e) =>
                        handleEditChange("license_2", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>License 3</label>
                    <input
                      type="text"
                      value={editDraft.license_3 || ""}
                      onChange={(e) =>
                        handleEditChange("license_3", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>License 4</label>
                    <input
                      type="text"
                      value={editDraft.license_4 || ""}
                      onChange={(e) =>
                        handleEditChange("license_4", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>Location City</label>
                    <input
                      type="text"
                      value={editDraft.location_city || ""}
                      onChange={(e) =>
                        handleEditChange("location_city", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>Location State</label>
                    <input
                      type="text"
                      value={editDraft.location_state || ""}
                      onChange={(e) =>
                        handleEditChange("location_state", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>Hire Date</label>
                    <input
                      type="date"
                      value={editDraft.hire_date || ""}
                      onChange={(e) =>
                        handleEditChange("hire_date", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>Last Pay Change</label>
                    <input
                      type="date"
                      value={editDraft.last_pay_change || ""}
                      onChange={(e) =>
                        handleEditChange("last_pay_change", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>OSHA 10</label>
                    <input
                      type="date"
                      value={editDraft.osha_10_date || ""}
                      onChange={(e) =>
                        handleEditChange("osha_10_date", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>OSHA 30</label>
                    <input
                      type="date"
                      value={editDraft.osha_30_date || ""}
                      onChange={(e) =>
                        handleEditChange("osha_30_date", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className={styles.modalField}>
                <label>XID</label>
                <input
                  type="text"
                  value={editDraft.xid || ""}
                  onChange={(e) => handleEditChange("xid", e.target.value)}
                />
              </div>
              <div className={styles.modalField}>
                <label>Notes</label>
                <textarea
                  rows={3}
                  value={editDraft.notes || ""}
                  onChange={(e) => handleEditChange("notes", e.target.value)}
                />
              </div>
              <div className={styles.modalField}>
                <label>Corrective Action</label>
                <textarea
                  rows={2}
                  value={editDraft.corrective_action || ""}
                  onChange={(e) =>
                    handleEditChange("corrective_action", e.target.value)
                  }
                />
              </div>
              <div className={styles.modalField}>
                <label>Updates</label>
                <textarea
                  rows={2}
                  value={editDraft.updates || ""}
                  onChange={(e) => handleEditChange("updates", e.target.value)}
                />
              </div>
              <div className={styles.modalField}>
                <label>New Hire Follow-Up</label>
                <textarea
                  rows={2}
                  value={editDraft.new_hire_follow_up || ""}
                  onChange={(e) =>
                    handleEditChange("new_hire_follow_up", e.target.value)
                  }
                />
              </div>

              {editError && (
                <div className={styles.modalError}>{editError}</div>
              )}
            </div>

            <footer className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleEditCancel}
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleEditSave}
                disabled={savingEdit}
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Reminder Modal for unsaved changes */}
      {showReminderModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <header className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Unsaved Changes</h2>
            </header>
            <div className={styles.modalBody}>
              <p>You have unsaved changes. Are you sure you want to discard them?</p>
            </div>
            <footer className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleReminderCancel}
              >
                Return to Editing
              </button>
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={handleReminderConfirm}
              >
                Discard Changes
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {archiveConfirm.open && archiveConfirm.row && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 500 }}>
            <header className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {archiveConfirm.action === "archive"
                  ? "Archive Transfer"
                  : "Restore Transfer"}
              </h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() =>
                  setArchiveConfirm({ open: false, action: null, row: null })
                }
              >
                ×
              </button>
            </header>
            <div className={styles.modalBody}>
              <p
                style={{
                  color: "#d1d5db",
                  marginBottom: "16px",
                  lineHeight: "1.6",
                }}
              >
                {archiveConfirm.action === "archive"
                  ? `Archive transfer for ${
                      archiveConfirm.row.name || archiveConfirm.row.empCode
                    }? This can be restored later.`
                  : `Restore transfer for ${
                      archiveConfirm.row.name || archiveConfirm.row.empCode
                    }?`}
              </p>
            </div>
            <footer className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() =>
                  setArchiveConfirm({ open: false, action: null, row: null })
                }
              >
                Cancel
              </button>
              <button
                type="button"
                className={
                  archiveConfirm.action === "archive"
                    ? styles.deleteBtn
                    : styles.successBtn
                }
                onClick={() => {
                  if (archiveConfirm.action === "archive") {
                    confirmArchiveTransfer(archiveConfirm.row);
                  } else {
                    confirmRestoreTransfer(archiveConfirm.row);
                  }
                }}
              >
                {archiveConfirm.action === "archive" ? "Archive" : "Restore"}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm.open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <header className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Confirm Delete</h2>
            </header>
            <div className={styles.modalBody}>
              <p>
                Are you sure you want to permanently delete this transfer? This cannot be
                undone.
              </p>
            </div>
            <footer className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={cancelDeleteTransfer}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={confirmDeleteTransfer}
              >
                Delete
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Scroll to top button */}
      <button
        type="button"
        className={`${styles.scrollToTop} ${
          showScrollTop ? styles.visible : ""
        }`}
        onClick={scrollToTop}
        title="Scroll to top"
        aria-label="Scroll to top"
      >
        <BsArrowUp />
      </button>
    </div>
  );
}
