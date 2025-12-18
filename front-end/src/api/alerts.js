// front-end/src/api/alerts.js
import api from "../api";

// XSRF helpers (mirror approach used elsewhere)
const getXsrfToken = () =>
  document.cookie
    .split("; ")
    .find((c) => c.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];

async function ensureXsrf() {
  if (getXsrfToken()) return;
  try {
    await api.get("/csrf-token", { withCredentials: true });
  } catch (_) {
    // ignore; best effort
  }
}

/** List alerts with filters */
export async function listAlerts({
  status,           // "open" | "acked" | "resolved"
  types,            // array of strings
  employeeId,
  empCode,
  from,             // YYYY-MM-DD
  to,               // YYYY-MM-DD
  limit = 200,
} = {}) {
  const params = {};
  if (status) params.status = status;
  if (types?.length) params.types = types;              // axios will serialize arrays
  // Normalize param names so either backend style works (prefer camelCase to match backend)
  if (employeeId != null) {
    params.employeeId = employeeId;
    params.employee_id = employeeId; // fallback for older APIs
  }
  if (empCode) {
    params.empCode = empCode;
    params.emp_code = empCode; // fallback for older APIs
  }
  if (from) params.from = from;
  if (to) params.to = to;
  params.limit = Math.max(1, Math.min(+limit || 200, 2000));

  const res = await api.get("/api/v1/alerts", { params, withCredentials: true });
  return res.data;
}

/** Fetch one alert by id */
export async function getAlert(id) {
  const { data } = await api.get(`/api/v1/alerts/${id}`, { withCredentials: true });
  return data;
}

/** Acknowledge */
export async function ackAlert(id, by = "system") {
  await ensureXsrf();
  const token = getXsrfToken();
  const headers = token ? { "X-XSRF-TOKEN": decodeURIComponent(token) } : {};
  const { data } = await api.post(
    `/api/v1/alerts/${id}/ack`,
    null,
    { params: { by }, withCredentials: true, headers }
  );
  return data;
}

/** Resolve */
export async function resolveAlert(id) {
  await ensureXsrf();
  const token = getXsrfToken();
  const headers = token ? { "X-XSRF-TOKEN": decodeURIComponent(token) } : {};
  const { data } = await api.post(
    `/api/v1/alerts/${id}/resolve`,
    null,
    { withCredentials: true, headers }
  );
  return data;
}

/** Batch runners (optional) */
export async function runNoHours(scope = "this-week") {
  const { data } = await api.post(`/api/v1/alerts/run/no-hours`, null, { params: { scope }, withCredentials: true });
  return data;
}
export async function runMissedPunch(workDay /* YYYY-MM-DD */) {
  const { data } = await api.post(`/api/v1/alerts/run/missed-punch`, null, { params: { workDay }, withCredentials: true });
  return data;
}

/** Orphan punches (missing in/out) */
export async function listOrphanPunches({ empCode, from, to, limit = 200 } = {}) {
  const params = {};
  if (empCode) params.empCode = empCode;
  if (from) params.from = from;
  if (to) params.to = to;
  params.limit = Math.max(1, Math.min(+limit || 200, 2000));
  const { data } = await api.get("/api/v1/alerts/orphan-punches", { params, withCredentials: true });
  return data;
}

export async function deleteOrphanPunch(id, resolveAlertId) {
  await ensureXsrf();
  const token = getXsrfToken();
  const headers = token ? { "X-XSRF-TOKEN": decodeURIComponent(token) } : {};
  const params = resolveAlertId ? { resolveAlertId } : undefined;
  const { data } = await api.delete(`/api/v1/alerts/orphan-punches/${id}`, { params, withCredentials: true, headers });
  return data;
}

/* ------------------ Convenience + compatibility exports ------------------ */

/** What your context expects for the list of open alerts */
export async function fetchOpenAlerts(opts = {}) {
  return listAlerts({ status: "open", ...opts });
}

/** What your context expects for the open count */
export async function fetchOpenCount() {
  // 1) Preferred: dedicated count endpoint
  try {
    const r = await api.get("/api/v1/alerts/count", { params: { status: "open" }, withCredentials: true });
    if (typeof r.data?.count === "number") return r.data.count;
  } catch (_) {}

  // 2) Try meta header from list endpoint
  try {
    const r = await api.get("/api/v1/alerts", { params: { status: "open", limit: 1 }, withCredentials: true });
    const hdr = r.headers?.["x-total-count"] ?? r.headers?.["x-total"];
    if (hdr != null && !Number.isNaN(Number(hdr))) return Number(hdr);

    // 3) Common shapes: { total } or array
    if (typeof r.data?.total === "number") return r.data.total;
    if (Array.isArray(r.data)) return r.data.length;
  } catch (_) {}

  return 0;
}

export default {
  listAlerts,
  getAlert,
  ackAlert,
  resolveAlert,
  listOrphanPunches,
  deleteOrphanPunch,
  runNoHours,
  runMissedPunch,
  fetchOpenAlerts,
  fetchOpenCount,
};
