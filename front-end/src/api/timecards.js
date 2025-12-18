// src/api/timecards.js
import api from "../api";

const getXsrf = () =>
  document.cookie.split("; ").find(c => c.startsWith("XSRF-TOKEN="))?.split("=")[1];

const withXsrf = (extraHeaders = {}) => ({
  withCredentials: true,
  headers: {
    ...(getXsrf() ? { "X-XSRF-TOKEN": decodeURIComponent(getXsrf()) } : {}),
    ...extraHeaders,
  },
});

// Upload; if your backend still uses /import, this falls back automatically.
export async function uploadPaycom(file) {
  const fd = new FormData();
  fd.append("file", file);

  try {
    // Let Axios set the multipart boundary. Do NOT set Content-Type yourself.
    const { data } = await api.post("/api/v1/timecards/upload", fd, withXsrf());
    return data;
  } catch (e) {
    if (e?.response?.status === 404) {
      const { data } = await api.post("/api/v1/timecards/import", fd, withXsrf());
      return data;
    }
    throw e;
  }
}

export async function normalizePaycom() {
  const { data } = await api.post("/api/v1/timecards/normalize", {}, withXsrf());
  return data;
}

export async function recomputeAlerts(
  scopes = ["MISSED_PUNCH_LAST_BUSINESS_DAY", "NO_HOURS_THIS_WEEK_CT"]
) {
  const { data } = await api.post("/api/v1/alerts/refresh", { scopes }, withXsrf());
  return data;
}

export async function rebuildPredictions(windowDays = 28) {
  const { data } = await api.post(
    "/api/v1/timecards/predict/rebuild",
    null,
    { ...withXsrf(), params: { windowDays } }
  );
  return data;
}


export async function latestByEmp(ee, limit = 50) {
  const { data } = await api.get("/api/v1/timecards/latest-by-emp", {
    params: { ee, limit },   // name the param exactly as your controller expects
  });
  return data;
}