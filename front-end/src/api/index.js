import axios from "axios";

export const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:8086";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 20000,
});

// Simple, regex-free cookie reader
function readCookie(name) {
  try {
    const rows = document.cookie ? document.cookie.split("; ") : [];
    for (const row of rows) {
      if (row.startsWith(name + "=")) {
        return decodeURIComponent(row.slice(name.length + 1));
      }
    }
  } catch {}
  return null;
}

// Attach XSRF header for non-GETs
api.interceptors.request.use((cfg) => {
  const method = (cfg.method || "get").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    const token = readCookie("XSRF-TOKEN");
    if (token) {
      cfg.headers = cfg.headers || {};
      cfg.headers["X-XSRF-TOKEN"] = token;
    }
  }
  return cfg;
});

// Call once on startup to mint the XSRF cookie
export async function initCsrf() {
  try {
    await api.get("/csrf-token", { params: { t: Date.now() } });
  } catch {
    // backend down or CORS issue; app can still boot
  }
}

export default api;
