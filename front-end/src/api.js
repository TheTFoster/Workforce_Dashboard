// src/api.js
import axios from "axios";

export const BASENAME =
  typeof __APP_BASENAME__ !== "undefined" ? __APP_BASENAME__ : "";

const isDev = !!import.meta.env?.DEV;
const envBase = (import.meta.env?.VITE_API_BASE || "").trim();

const apiBase =
  envBase ||
  // default: same-origin so Vite dev/preview proxies can forward to the backend
  `${window.location.origin}`;

// Track a single in-flight CSRF bootstrap to avoid request stampedes
let csrfReady = null;

function readCookie(name) {
  try {
    const rows = document.cookie ? document.cookie.split(";") : [];
    for (const row of rows) {
      const [k, v] = row.split("=").map((s) => s.trim());
      if (k === name) return decodeURIComponent(v || "");
    }
  } catch {
    // ignore
  }
  return null;
}

function attachCsrfHeader(config, rawToken) {
  const t = rawToken || readCookie("XSRF-TOKEN");
  if (!t) return config;
  config.headers = {
    ...(config.headers || {}),
    "X-XSRF-TOKEN": t, // CookieCsrfTokenRepository default
    "X-CSRF-TOKEN": t, // HttpSessionCsrfTokenRepository default
    "XSRF-TOKEN": t, // some proxies/older code paths
  };
  return config;
}

const api = axios.create({
  baseURL: apiBase,
  withCredentials: true,
  withXSRFToken: true, // axios >=1.6 tries to add XSRF header
  timeout: 120000,
  headers: { Accept: "application/json" },
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

api.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();
  const isFormData =
    typeof FormData !== "undefined" && config.data instanceof FormData;

  if (isFormData && config.headers && config.headers["Content-Type"]) {
    delete config.headers["Content-Type"];
  }
  if (
    method !== "get" &&
    !isFormData &&
    !config.headers?.["Content-Type"] &&
    config.data !== undefined
  ) {
    config.headers = { ...(config.headers || {}), "Content-Type": "application/json" };
  }

  // Read XSRF cookie and reflect it into ALL likely header names
  // Ensure CSRF token is loaded for mutating calls; initCsrf() sets the cookie.
  const needsCsrf = method !== "get" && method !== "head";
  const token = readCookie("XSRF-TOKEN");

  if (needsCsrf && !token) {
    // Kick off CSRF bootstrap if missing; best-effort to avoid 403
    csrfReady = csrfReady || initCsrf().catch(() => {});
    return Promise.resolve(csrfReady)
      .then(() => {
        return attachCsrfHeader(config);
      })
      .catch(() => {
        return config;
      });
  }

  attachCsrfHeader(config, token);

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const reqUrl = (err?.config?.url || "").toString();

    const onLogin =
      window.location.pathname === `${BASENAME}/login` ||
      window.location.pathname === "/login";

    const isLoginCall = reqUrl.includes("/api/v1/auth/login");
    const isPublicProbe =
      reqUrl.includes("/csrf-token") || reqUrl.includes("/api/ping");

    if (status === 401 && !onLogin && !isLoginCall && !isPublicProbe) {
      const here = window.location.pathname + window.location.search;
      sessionStorage.setItem("postLoginRedirect", here);
      const target = `${BASENAME}/login?reason=expired`;
      if (here !== target) window.location.replace(target);
    }
    return Promise.reject(err);
  }
);

// Call once on boot; also gives you the token to set as a default header.
export async function initCsrf() {
  const res = await api.get("/csrf-token", { withCredentials: true, params: { t: Date.now() } });
  const token = res?.data?.token;
  if (token) {
    api.defaults.headers.common["X-XSRF-TOKEN"] = token;
  }
}

export default api;
