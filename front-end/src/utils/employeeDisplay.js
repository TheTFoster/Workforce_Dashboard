// src/utils/employeeDisplay.js
import React from "react";
import { CgAirplane } from "react-icons/cg";
import { FaCarSide } from "react-icons/fa";

// ---------- date helpers ----------
export function parseServerDate(v) {
  if (!v) return null;
  const s = String(v).trim().replace(/Z$/, ""); // allow fake UTC
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

export function formatAbsolute(dt) {
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

export function formatRelative(dt) {
  if (!dt) return "";
  const ms = Date.now() - dt.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function ymd(d) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (!dt || isNaN(dt)) return "";
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ---------- name + CEC helpers ----------
export const getCecId = (e) =>
  e?.employeeCode || e?.empCode || e?.emp_code || e?.cec_id || "";

function nameHasCode(str, code) {
  if (!str || !code) return false;
  const norm = (s) => s.toString().toLowerCase().replace(/\s+/g, "");
  return norm(str).includes(norm(code));
}

function titleCaseName(str) {
  if (!str) return "";
  return str
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function resolveName(e) {
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
  ];
  return reads.find((x) => x && String(x).trim()) || "";
}

export function getDisplayNameLF(e) {
  const fn = String(
    e?.firstName || e?.firstname || e?.first_name || e?.first || ""
  ).trim();
  const ln = String(
    e?.lastName || e?.lastname || e?.last_name || e?.last || ""
  ).trim();

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
  const code = getCecId(e);
  if (!code) return pretty || "";
  if (!pretty) return `— ${code}`;
  return nameHasCode(pretty, code) ? pretty : `${pretty} — ${code}`;
}

// ---------- phone formatting (copied from your pages) ----------
export const formatPhone = (raw) => {
  const value = (raw || "").toString().trim();
  if (!value) {
    return { text: "No Number Entered.", href: null };
  }

  const parts = value.split(/[;,]+/);
  const pretty = [];
  const hrefs = [];

  for (const part of parts) {
    const extMatch = part.match(/\b(?:ext|x)\s*(\d{1,6})\s*$/i);
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
      `tel:+1${area ? area + pre + line : pre + line}` +
      (ext ? `,${ext}` : "");
    pretty.push(ext ? `${text} x${ext}` : text);
    hrefs.push(href);
  }

  return {
    text: pretty.join(" • "),
    href: hrefs.find(Boolean) || null,
  };
};

// ---------- travel helpers ----------
export const TRAVEL_LABEL = {
  0: "No preference recorded",
  1: "Air travel",
  2: "Drives company / personal vehicle",
};

export function getTravelPref(e) {
  const v =
    e?.travelPref ??
    e?.travel_pref ??
    e?.travel_preference ??
    e?.travelPreference ??
    e?.travel;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function getTravelNotes(e) {
  return (
    e?.travelNotes ??
    e?.travel_notes ??
    e?.travel_note ??
    e?.travelcomments ??
    ""
  );
}

export function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5 3h11l4 4v14H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2v14h14V9h-4a2 2 0 0 1-2-2V3H5zm7 8H8v-2h4v2zm4 4H8v-2h8v2z"
      />
    </svg>
  );
}

// ---------- assignment overlay helpers ----------
export function getAssignFor(e, assignMap) {
  if (!assignMap) return null;
  const code = getCecId(e);
  if (!code) return null;
  return assignMap.get(code) || null;
}

export function composeScope(assign, e) {
  const workGroup = assign?.workGroup || e?.workGroup || "";
  const project =
    assign?.jobNumber || assign?.project || e?.project || e?.jobNumber || "";
  if (workGroup && project) return `${workGroup} - ${project}`;
  return workGroup || project || "Group / Project not available";
}
