import React, { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import api, { initCsrf } from "../api";
import styles from "../stylesheets/Login.module.css";

// ✅ force URL strings for images (no “invalid src” warning)
import cecLogoUrl from "../assets/CEC.jpg?url";
import dbIconUrl from "../assets/database.svg?url";

// Dev has no basename; prod serves under /cec-employee-database
const BASENAME =
  typeof __APP_BASENAME__ !== "undefined"
    ? __APP_BASENAME__
    : import.meta.env.DEV
    ? ""
    : "/cec-employee-database";

// Normalize any saved redirect into an in-app path (no basename duplication)
export function normalizeRedirect(raw) {
  if (!raw) return "/home";
  try {
    // if someone stored a full URL, pull out just the pathname+search
    const u = new URL(raw, window.location.origin);
    raw = u.pathname + (u.search || "");
  } catch {
    // not a URL; leave as-is
  }
  // strip prod basename if present
  if (BASENAME && raw.startsWith(BASENAME)) {
    raw = raw.slice(BASENAME.length) || "/home";
  }
  // ensure it starts with "/"
  if (!raw.startsWith("/")) raw = "/" + raw;
  // never allow redirect back to login
  if (raw.startsWith("/login")) return "/home";
  return raw || "/home";
}

export default function Login() {
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // reason=expired shows a banner if we were bounced by the 401 interceptor
  const params = new URLSearchParams(location.search);
  const reason = params.get("reason");

  // Prime CSRF cookie. Your CsrfCookieFilter writes it on any request.
  useEffect(() => {
    api.get("/csrf-token").catch(() => {});
  }, []);

  // If we were bounced for expiry, clear stale frontend flag
  useEffect(() => {
    if (reason === "expired") {
      localStorage.removeItem("auth");
    }
  }, [reason]);

  // If the user is already authed and hits /login, send them where they meant to go
  useEffect(() => {
    if (localStorage.getItem("auth")) {
      const saved = sessionStorage.getItem("postLoginRedirect");
      sessionStorage.removeItem("postLoginRedirect");
      navigate(normalizeRedirect(saved), { replace: true });
    }
  }, [navigate]);

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

  async function login(e) {
    e.preventDefault();
    setMsg(null);

    const code = (employeeCode || "").trim();
    if (!code || !password) {
      setMsg("Enter your CEC ID and password.");
      return;
    }

    try {
      setBusy(true);

      // Ensure CSRF cookie/header is present before login attempt
      try {
        await initCsrf();
      } catch (_e) {
        // ignore; backend may still accept if CSRF is disabled for login
      }

      // Manual fallback: inject the XSRF header from the cookie (proxy-friendly)
      let csrf = readCookie("XSRF-TOKEN");
      if (!csrf) {
        try {
          const res = await api.get("/csrf-token", {
            withCredentials: true,
            params: { t: Date.now() },
          });
          if (res?.data?.token) {
            csrf = res.data.token;
          }
        } catch {
          // ignore
        }
      }

      // Debug: surface CSRF state when failing to help diagnose 403s
      if (!csrf) {
        console.debug("CSRF debug: no XSRF-TOKEN cookie found before login", {
          cookies: document.cookie,
        });
      } else {
        console.debug("CSRF debug: using XSRF-TOKEN", csrf);
      }

      // Cookie-based session: backend should Set-Cookie on success
      const res = await api.post(
        "/api/v1/auth/login",
        { employeeCode: code, password },
        csrf
          ? {
              withCredentials: true,
              headers: {
                "X-XSRF-TOKEN": csrf,
                "X-CSRF-TOKEN": csrf,
                "XSRF-TOKEN": csrf,
              },
            }
          : { withCredentials: true }
      );

      const data = res?.data ?? {};
      const ok =
        data.success === true ||
        /success/i.test(String(data.message || "")) ||
        !!data.user ||
        res.status === 200;

      if (!ok) {
        localStorage.removeItem("auth");
        setMsg(data.message || "Incorrect CEC ID or password.");
        return;
      }

      // Frontend guard flag (server still enforces auth)
      localStorage.setItem("auth", "1");

      // New session after login often invalidates the pre-login CSRF token.
      // Refresh it immediately so the next POST (e.g., timecards import) won't 403.
      try {
        await initCsrf();
      } catch {
        // non-fatal; backend will still demand a token on the next call
      }

      // If server requires a password change, route to the change page first
      if (data.mustChangePassword === true) {
        // If server returned a pwChangeToken, persist it briefly for the change flow
        if (data.pwChangeToken) {
          sessionStorage.setItem("pwChangeToken", data.pwChangeToken);
        }
        // optional: pass a query param to force the change UI
        navigate("/change-password?force=1", { replace: true });
        return;
      }

      const saved = sessionStorage.getItem("postLoginRedirect");
      sessionStorage.removeItem("postLoginRedirect");
      navigate(normalizeRedirect(saved), { replace: true });
    } catch (err) {
      localStorage.removeItem("auth");
      const status = err?.response?.status;

      if (status === 401) {
        setMsg("Invalid credentials.");
      } else if (status === 403) {
        setMsg("You’re signed in but not allowed to access this application.");
      } else if (status === 404) {
        const base = api?.defaults?.baseURL || "";
        setMsg(
          `Login endpoint not found (404). Check your API base URL and path. ` +
            `Tried POST ${base}/api/v1/auth/login`
        );
      } else {
        setMsg(
          err?.response?.data?.message ||
            err?.message ||
            "Login failed. Please try again."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon} style={{ marginBottom: 8 }}>
          <img src={cecLogoUrl} alt="CEC" style={{ width: 140 }} />
        </div>

        <div className={styles.icon} style={{ gap: 8, marginBottom: 12 }}>
          <img src={dbIconUrl} alt="DB" style={{ width: 30 }} />
          <h2 className={styles.title}>Employee Database</h2>
        </div>

        {reason === "expired" && (
          <div className={`${styles.banner} ${styles.warn}`} role="alert">
            Session expired. Please sign in again.
          </div>
        )}

        {msg && (
          <div className={`${styles.banner} ${styles.error}`} role="alert">
            {msg}
          </div>
        )}

        <form onSubmit={login}>
          <div className={styles["form-group"]}>
            <label className={styles.label} htmlFor="cec">
              Username (CEC ID)
            </label>
            <input
              id="cec"
              type="text"
              className={styles.input}
              placeholder="Enter CEC ID"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              autoComplete="username"
              disabled={busy}
              required
            />
          </div>

          <div className={styles["form-group"]}>
            <label className={styles.label} htmlFor="pw">
              Password
            </label>

            <div className={styles.inputRow}>
              <input
                id="pw"
                type={showPw ? "text" : "password"}
                className={styles.input}
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={busy}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className={styles.toggle}
                aria-label={showPw ? "Hide password" : "Show password"}
                aria-pressed={showPw}
                disabled={busy}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={busy}
            aria-busy={busy ? "true" : "false"}
          >
            {busy ? "Signing in…" : "Login"}
          </button>

          <div style={{ marginTop: 10, textAlign: "center" }}>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
        </form>

        <div className={styles.footer}>
          <Link to="/privacy">Privacy Policy</Link> |{" "}
          <Link to="/terms">Terms of Use</Link>
        </div>
      </div>
    </div>
  );
}
