import React, { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api";
import styles from "../stylesheets/ChangePassword.module.css";
import homeIcon from "../assets/home.svg"; // optional; remove if you don’t have it

export default function ChangePassword() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState({ cur: false, nw: false, cf: false });

  const [msg, setMsg] = useState(null); // { t: "e" | "s", x: string }
  const [busy, setBusy] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // If the server returns a short-lived pw-change token, store it in sessionStorage
  // (server should return it on login when mustChangePassword=true). We also
  // accept the token via query param for flexibility in some flows.
  const qs = new URLSearchParams(location.search);
  const tokenFromQuery = qs.get("pwChangeToken") || qs.get("pw_token");
  const storedToken = sessionStorage.getItem("pwChangeToken");
  const pwChangeToken = tokenFromQuery || storedToken;
  const isForced = qs.get("force") === "1" || !!pwChangeToken;

  const strength = useMemo(() => {
    const pw = newPassword || "";
    let score = 0;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const labels = ["Very weak", "Weak", "Okay", "Good", "Strong"];
    const colors = ["#e06666", "#f39c12", "#f1c40f", "#7bd389", "#36c16b"];
    return {
      score,
      width: `${(score / 4) * 100}%`,
      label: labels[score],
      color: colors[score],
    };
  }, [newPassword]);

  const mismatch = confirm.length > 0 && confirm !== newPassword;

  async function submit(e) {
    e.preventDefault();
    setMsg(null);

    if (newPassword !== confirm) {
      setMsg({ t: "e", x: "New password and confirmation do not match." });
      return;
    }
    if (newPassword.length < 12) {
      setMsg({ t: "e", x: "Use at least 12 characters." });
      return;
    }

    try {
      setBusy(true);

      // ✅ Correct Axios usage: ONE URL + JSON body (+ headers if needed)
      // If your api client already has baseURL=http://localhost:8086, keep the relative path below.
      // Attach the pw-change token header if present. Use a dedicated header so
      // it can't be accidentally used as a full-access auth token.
      const headers = { "Content-Type": "application/json" };
      if (pwChangeToken) headers["X-PW-CHANGE-TOKEN"] = pwChangeToken;

      await api.post(
        "/api/v1/auth/change-password-token",
        { currentPassword, newPassword },
        { headers }
      );

      setMsg({ t: "s", x: "Password changed. Please sign in again." });
      setCurrent("");
      setNew("");
      setConfirm("");
      setTimeout(() => window.location.assign("/login"), 900);
    } catch (err) {
      const status = err?.response?.status;

      if (status === 401) {
        setMsg({
          t: "e",
          x: "Not authenticated. Your session likely expired. Please sign in again.",
        });
        setTimeout(() => navigate("/login?reason=expired"), 900);
        return;
      }
      if (status === 403) {
        setMsg({
          t: "e",
          x: "You’re signed in but not allowed to change this password.",
        });
        return;
      }

      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Change failed. Please try again.";

      setMsg({ t: "e", x: serverMsg });
    } finally {
      setBusy(false);
    }
  }

  function goHome() {
    navigate("/home");
  }

  function cancel() {
    if (isForced) {
      // If forced, prevent canceling back into the app; instead sign out.
      // Clear the pwChangeToken just in case then redirect to login.
      sessionStorage.removeItem("pwChangeToken");
      navigate("/login");
      return;
    }
    if (window.history.length > 1) navigate(-1);
    else navigate("/home");
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Header with Home + Cancel */}
        <div className={styles.headerRow}>
          <button
            type="button"
            className={styles.homeBtn}
            onClick={goHome}
            aria-label="Go to Home"
            title="Home"
          >
            {homeIcon ? (
              <img src={homeIcon} alt="" className={styles.homeIcon} />
            ) : (
              "🏠"
            )}
            <span className={styles.homeText}>Home</span>
          </button>

          <h1 className={styles.title}>Change Password</h1>

          {!isForced ? (
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={cancel}
              aria-label="Cancel and go back"
              title="Cancel"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              className={styles.cancelBtn}
              disabled
              title="You must change your password before continuing"
            >
              Cancel
            </button>
          )}
        </div>

        <p className={styles.subtitle}>
          Choose a strong password. You’ll be asked to sign in again after
          changing it.
        </p>

        <form className={styles.form} onSubmit={submit}>
          {/* Current password */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cur">
              Current password
            </label>
            <div className={styles.inputRow}>
              <input
                id="cur"
                className={styles.input}
                type={show.cur ? "text" : "password"}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrent(e.target.value)}
                required
              />
              <button
                type="button"
                className={styles.eye}
                onClick={() => setShow((s) => ({ ...s, cur: !s.cur }))}
                aria-label={
                  show.cur ? "Hide current password" : "Show current password"
                }
              >
                {show.cur ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="new">
              New password
            </label>
            <div className={styles.inputRow}>
              <input
                id="new"
                className={styles.input}
                type={show.nw ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNew(e.target.value)}
                required
              />
              <button
                type="button"
                className={styles.eye}
                onClick={() => setShow((s) => ({ ...s, nw: !s.nw }))}
                aria-label={show.nw ? "Hide new password" : "Show new password"}
              >
                {show.nw ? "Hide" : "Show"}
              </button>
            </div>

            <div className={styles.meterWrap} aria-hidden="true">
              <div
                className={styles.meterBar}
                style={{ width: strength.width, background: strength.color }}
              />
            </div>
            <div className={styles.meterLabel}>Strength: {strength.label}</div>

            <ul className={styles.hints}>
              <li className={newPassword.length >= 12 ? styles.ok : undefined}>
                At least 12 characters
              </li>
              <li
                className={
                  /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)
                    ? styles.ok
                    : undefined
                }
              >
                Upper &amp; lower case letters
              </li>
              <li className={/\d/.test(newPassword) ? styles.ok : undefined}>
                A number
              </li>
              <li
                className={
                  /[^A-Za-z0-9]/.test(newPassword) ? styles.ok : undefined
                }
              >
                A symbol
              </li>
            </ul>
          </div>

          {/* Confirm */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="conf">
              Confirm new password
            </label>
            <div className={styles.inputRow}>
              <input
                id="conf"
                className={`${styles.input} ${
                  mismatch ? styles.inputError : ""
                }`}
                type={show.cf ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              <button
                type="button"
                className={styles.eye}
                onClick={() => setShow((s) => ({ ...s, cf: !s.cf }))}
                aria-label={show.cf ? "Hide confirmation" : "Show confirmation"}
              >
                {show.cf ? "Hide" : "Show"}
              </button>
            </div>
            {mismatch ? (
              <div className={styles.errorText}>Passwords do not match.</div>
            ) : null}
          </div>

          <div className={styles.actionsRow}>
            <button
              type="submit"
              className={styles.submit}
              disabled={busy || mismatch}
            >
              {busy ? "Saving…" : "Change password"}
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={cancel}
              disabled={busy}
            >
              Cancel
            </button>
          </div>

          <div className={styles.msg}>
            {msg && msg.t === "e" ? (
              <div className={styles.alertError}>{msg.x}</div>
            ) : null}
            {msg && msg.t === "s" ? (
              <div className={styles.alertSuccess}>{msg.x}</div>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
