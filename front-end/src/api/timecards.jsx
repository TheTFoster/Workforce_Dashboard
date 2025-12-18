import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import styles from "../stylesheets/GanttView.module.css"; // reuse existing styles
import {
  uploadPaycom,
  normalizePaycom,
  recomputeAlerts,
  rebuildPredictions,
} from "../api/timecards";

export default function TimecardsImport() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [result, setResult] = useState(null);
  const [normalizeOut, setNormalizeOut] = useState(null);
  const [alertsOut, setAlertsOut] = useState(null);
  const [rebuildOut, setRebuildOut] = useState(null);

  const [alsoNormalize, setAlsoNormalize] = useState(true);
  const [alsoRecompute, setAlsoRecompute] = useState(true);

  const navigate = useNavigate();

  // Mint CSRF cookie once so Axios auto-sends X-XSRF-TOKEN
  useEffect(() => {
    api.get("/csrf-token").catch(() => {});
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setNormalizeOut(null);
    setAlertsOut(null);
    setRebuildOut(null);

    if (!file) {
      setError("Choose a CSV (or XLSX) first.");
      return;
    }

    setBusy(true);
    try {
      const up = await uploadPaycom(file);
      setResult(up);

      if (alsoNormalize) {
        const norm = await normalizePaycom();
        setNormalizeOut(norm);
      }
      if (alsoRecompute) {
        const alerts = await recomputeAlerts();
        setAlertsOut(alerts);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRebuildPreds = async () => {
    setBusy(true);
    setError(null);
    setRebuildOut(null);
    try {
      const r = await rebuildPredictions(28);
      setRebuildOut(r);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Rebuild failed");
    } finally {
      setBusy(false);
    }
  };

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
            onSubmit={handleUpload}
            className={styles.filtersPanel}
            style={{ padding: 16 }}
          >
            <label className={styles.controlLabel}>Paycom Time Report</label>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={busy}
            />

            <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
              <label style={{ fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={alsoNormalize}
                  onChange={(e) => setAlsoNormalize(e.target.checked)}
                  disabled={busy}
                />{" "}
                Normalize zero-dates/NULLs after upload
              </label>
              <label style={{ fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={alsoRecompute}
                  onChange={(e) => setAlsoRecompute(e.target.checked)}
                  disabled={busy}
                />{" "}
                Recompute alerts (Missed Punch + No-Hours Week)
              </label>
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                className={styles.toolbarBtn}
                type="submit"
                disabled={busy || !file}
              >
                {busy ? "Working…" : "Upload"}
              </button>

              {result && (
                <button
                  type="button"
                  className={styles.toolbarBtn}
                  style={{ marginLeft: 8 }}
                  onClick={handleRebuildPreds}
                  disabled={busy}
                >
                  Rebuild Predictions
                </button>
              )}

              <button
                type="button"
                className={styles.toolbarBtn}
                style={{ marginLeft: 8 }}
                onClick={() => navigate("/gantt")}
              >
                Open Gantt
              </button>
            </div>

            {error && (
              <p className={styles.noData} style={{ color: "#ff8b8b" }}>
                {error}
              </p>
            )}

            {result && (
              <div className={styles.metaBox} style={{ marginTop: 16 }}>
                {"batchId" in result && (
                  <div>
                    <strong>Batch ID:</strong> {result.batchId}
                  </div>
                )}
                <div>
                  <strong>Rows ingested:</strong>{" "}
                  {result.rowsIngested ?? result.inserted ?? 0}
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

            {normalizeOut && (
              <div className={styles.metaBox} style={{ marginTop: 16 }}>
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

            {alertsOut && (
              <div className={styles.metaBox} style={{ marginTop: 16 }}>
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

            {rebuildOut && (
              <div className={styles.metaBox} style={{ marginTop: 16 }}>
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
