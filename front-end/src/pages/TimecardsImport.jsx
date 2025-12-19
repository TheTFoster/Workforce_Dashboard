import React, { useState, useEffect } from "react";
import api, { initCsrf } from "../api";
import styles from "../stylesheets/TimecardsImport.module.css";
import { useNavigate } from "react-router-dom";

// read CSRF cookie Spring sets
const getXsrfToken = () =>
  document.cookie
    .split("; ")
    .find((c) => c.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];

const csrfHeaders = (token) =>
  token
    ? {
        "X-XSRF-TOKEN": token,
        "X-CSRF-TOKEN": token,
        "XSRF-TOKEN": token,
      }
    : {};

// Best-effort CSRF bootstrap to avoid Spring's 403 CsrfException
async function ensureCsrfToken(force = false) {
  let tok = getXsrfToken();
  if (tok && !force) return decodeURIComponent(tok);
  try {
    // Hit the CSRF endpoint directly; Spring returns the token in the body and cookie
    const res = await api.get("/csrf-token", {
      withCredentials: true,
      params: { t: Date.now() },
    });
    tok = res?.data?.token || getXsrfToken();
  } catch {
    tok = null;
  }
  return tok ? decodeURIComponent(tok) : null;
}

// Wrap POSTs so we retry once with a fresh CSRF token if the first shot is rejected
async function postWithCsrf(url, data, config = {}) {
  const attempt = async () => {
    const tok = await ensureCsrfToken(true);
    // If we somehow still don't have a token, fail fast with a clearer error
    if (!tok) {
      throw new Error("CSRF token missing; refresh login and retry.");
    }
    return api.post(url, data, {
      ...config,
      headers: {
        ...(config.headers || {}),
        ...csrfHeaders(tok),
      },
    });
  };

  try {
    return await attempt();
  } catch (err) {
    if (err?.response?.status === 403) {
      // Log details to help diagnose (visible in console)
      console.warn("[import] 403 on", url, {
        cookie: document.cookie,
        xsrf: getXsrfToken(),
        resp: err?.response?.data,
      });
      return attempt();
    }
    throw err;
  }
}

export default function TimecardsImport({ onExport, onOpenBatch }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // optional extras
  const [normalizeOut, setNormalizeOut] = useState(null);
  const [alertsOut, setAlertsOut] = useState(null);
  const [alsoNormalize, setAlsoNormalize] = useState(true);
  const [alsoRecompute, setAlsoRecompute] = useState(true);
  const [replaceAll, setReplaceAll] = useState(false);
  const [rebuildOut, setRebuildOut] = useState(null);

  // Progress tracking
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  const navigate = useNavigate();

  async function uploadPaycom(fileObj) {
    const fd = new FormData();
    fd.append("file", fileObj);

    if (replaceAll) {
      setProgressMessage("Clearing existing data...");
    } else {
      setProgressMessage("Uploading file...");
    }
    setUploadProgress(0);
    const res = await postWithCsrf("/api/v1/timecards/import", fd, {
      params: { replaceAll: replaceAll },
      withCredentials: true,
      timeout: 600000,
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setUploadProgress(percentCompleted);
        if (percentCompleted === 100) {
          setProgressMessage("Processing file on server...");
        }
      },
    });

    setProgressMessage("Import complete!");
    setUploadProgress(100);

    return res.data; // { batchId, total, inserted, duplicates, errors }
  }

  async function normalizePaycom() {
    const res = await postWithCsrf(
      "/api/v1/timecards/normalize",
      {},
      { withCredentials: true }
    );
    return res.data; // { normalized:true, zeroDatesFixed:n }
  }

  async function recomputeAlerts() {
    const res = await postWithCsrf(
      "/api/v1/alerts/refresh",
      { scopes: ["MISSED_PUNCH_LAST_BUSINESS_DAY", "NO_HOURS_THIS_WEEK_CT"] },
      { withCredentials: true }
    );
    return res.data; // { missedPunchCreated:n, noHoursCreated:n }
  }

  async function onUpload(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setNormalizeOut(null);
    setAlertsOut(null);
    setRebuildOut(null);
    setUploadProgress(0);
    setProgressMessage("");

    if (!file) {
      setError("Choose a CSV or XLSX file to import.");
      return;
    }

    setBusy(true);
    try {
      // 1) upload
      setProgressMessage("Starting upload...");
      const up = await uploadPaycom(file);
      setResult(up);

      // 2) optionally normalize bogus dates/nulls
      if (alsoNormalize) {
        setProgressMessage("Normalizing data...");
        setUploadProgress(0);
        try {
          const norm = await normalizePaycom();
          setNormalizeOut(norm);
        } catch (normErr) {
          console.warn("Normalize failed (non-critical):", normErr);
          // Continue anyway - normalize is optional
        }
      }

      // 3) optionally recompute alert detections
      if (alsoRecompute) {
        setProgressMessage("Recomputing alerts...");
        setUploadProgress(0);
        try {
          const alerts = await recomputeAlerts();
          setAlertsOut(alerts);
        } catch (alertErr) {
          console.warn("Alert recompute failed (non-critical):", alertErr);
          // Continue anyway - alerts are optional
        }
      }

      setProgressMessage("All done!");
      setUploadProgress(100);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || err.message || "Upload failed");
      setProgressMessage("");
      setUploadProgress(0);
    } finally {
      setBusy(false);
      // Clear progress after a short delay
      setTimeout(() => {
        setProgressMessage("");
        setUploadProgress(0);
      }, 2000);
    }
  }

  // keep your existing predictions rebuild (if still used by Gantt)
  async function onRebuild() {
    setBusy(true);
    setError(null);
    setRebuildOut(null);
    try {
      const resp = await postWithCsrf(
        "/api/v1/timecards/predict/rebuild",
        null,
        {
          params: { windowDays: 28 },
          withCredentials: true,
        }
      );
      setRebuildOut(resp.data);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || err.message || "Rebuild failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>Timecards Import</h1>
          <div className={styles.toolbar}>
            <button
              className={`${styles.toolbarBtn} ${styles.homeBtn}`}
              onClick={() => navigate("/home")}
            >
              Home
            </button>
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.chartCol}>
          <form
            onSubmit={onUpload}
            className={styles.filtersPanel}
            style={{ padding: 16 }}
          >
            <label className={styles.controlLabel}>
              Paycom Time Report (CSV or XLSX)
            </label>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={busy}
              className={styles.fileInput}
            />

            <div className={styles.checkboxes}>
              <label>
                <input
                  type="checkbox"
                  checked={replaceAll}
                  onChange={(e) => setReplaceAll(e.target.checked)}
                  disabled={busy}
                />{" "}
                <strong style={{ color: "#cc0000" }}>
                  Replace all existing timecard data
                </strong>{" "}
                (clears table first)
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={alsoNormalize}
                  onChange={(e) => setAlsoNormalize(e.target.checked)}
                  disabled={busy}
                />{" "}
                Normalize zero-dates/NULLs after upload
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={alsoRecompute}
                  onChange={(e) => setAlsoRecompute(e.target.checked)}
                  disabled={busy}
                />{" "}
                Recompute alerts (Missed Punch + No-Hours Week)
              </label>
            </div>

            <div className={styles.buttonRow}>
              <button
                className={styles.toolbarBtn}
                type="submit"
                disabled={busy || !file}
              >
                {busy ? "Working…" : "Upload"}
              </button>

              {/* keep your Gantt prediction rebuild */}
              {result && (
                <button
                  type="button"
                  className={styles.toolbarBtn}
                  onClick={onRebuild}
                  disabled={busy}
                >
                  Rebuild Predictions
                </button>
              )}

              <button
                type="button"
                className={styles.toolbarBtn}
                onClick={() => navigate("/gantt")}
              >
                Open Gantt
              </button>
            </div>

            {error && <p className={styles.noData}>{error}</p>}

            {/* Progress indicator */}
            {busy && (
              <div className={styles.progressCard}>
                <div className={styles.progressTitle}>
                  <div className={styles.spinner} />
                  <span>{progressMessage || "Processing..."}</span>
                </div>
                {uploadProgress > 0 && (
                  <>
                    <div className={styles.progressTrack}>
                      <div
                        className={styles.progressBar}
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className={styles.progressPct}>{uploadProgress}%</div>
                  </>
                )}
              </div>
            )}

            {/* Upload summary */}
            {result && (
              <div className={styles.metaBox}>
                {"batchId" in result && (
                  <div>
                    <strong>Batch ID:</strong> {result.batchId}
                  </div>
                )}
                <div>
                  <strong>Total rows:</strong> {result.total ?? 0}
                </div>
                <div>
                  <strong>Rows inserted:</strong> {result.inserted ?? 0}
                </div>
                {"duplicates" in result && (
                  <div>
                    <strong>Duplicates:</strong> {result.duplicates}
                  </div>
                )}
                {"errors" in result && (
                  <div>
                    <strong>Errors:</strong> {result.errors}
                  </div>
                )}
                {Array.isArray(result.warnings) &&
                  result.warnings.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <strong>Warnings</strong>
                      <ul>
                        {result.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}

            {/* Normalize summary */}
            {normalizeOut && (
              <div className={styles.metaBox}>
                <div>
                  <strong>Normalized:</strong>{" "}
                  {String(normalizeOut.normalized ?? true)}
                </div>
                <div>
                  <strong>Zero-dates fixed:</strong>{" "}
                  {normalizeOut.zeroDatesFixed ?? 0}
                </div>
              </div>
            )}

            {/* Alerts recompute summary */}
            {alertsOut && (
              <div className={styles.metaBox}>
                <div>
                  <strong>Missed Punch created:</strong>{" "}
                  {alertsOut.missedPunchCreated ?? 0}
                </div>
                <div>
                  <strong>No-Hours Week created:</strong>{" "}
                  {alertsOut.noHoursCreated ?? 0}
                </div>
              </div>
            )}

            {/* Gantt prediction rebuild summary (existing) */}
            {rebuildOut && (
              <div className={styles.metaBox}>
                <div>
                  <strong>Predictions updated:</strong> {rebuildOut.updated}
                </div>
                <div>
                  <strong>Window (days):</strong> {rebuildOut.windowDays}
                </div>
              </div>
            )}

            <p className={styles.muted} style={{ marginTop: 8 }}>
              After import, normalization, and alerts recompute, go to{" "}
              <strong>Home</strong> to see the new alerts, or open{" "}
              <strong>Gantt</strong> to view timecard-based predictions.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
