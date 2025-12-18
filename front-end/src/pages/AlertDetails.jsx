import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAlert, ackAlert, resolveAlert } from "../api/alerts";
import styles from "../stylesheets/AlertDetails.module.css";

export default function AlertDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const [row, setRow] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [linkParams, setLinkParams] = useState(null);

  async function load() {
    setError("");
    try {
      const data = await getAlert(id);
      setRow(data);
    } catch (e) {
      setError(
        e?.response?.status === 404
          ? "Alert not found"
          : e.message || "Load failed"
      );
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    const stored = localStorage.getItem(`alert-note-${id}`);
    if (stored !== null) setNote(stored);
  }, [id]);

  useEffect(() => {
    localStorage.setItem(`alert-note-${id}`, note || "");
  }, [id, note]);

  const details = (() => {
    try {
      return row?.detailsJson ? JSON.parse(row.detailsJson) : null;
    } catch {
      return null;
    }
  })();

  const summary = (() => {
    const msg =
      row?.message ||
      row?.subject ||
      (details && (details.message || details.subject));
    const fallback = row?.type ? `Alert: ${row.type}` : "Alert";
    return msg || fallback;
  })();

  const source =
    details?.source_id ||
    details?.source ||
    row?.eventType ||
    row?.dedupeKey ||
    "Not provided";

  const hint = details?.hint || details?.note || "";
  const isOrphan = (row?.type || "").toUpperCase().includes("ORPHAN");

  useEffect(() => {
    if (!details && !row) return;
    const params = new URLSearchParams();
    const code =
      details?.emp_code ||
      details?.empCode ||
      row?.empCode ||
      row?.employeeId;
    if (code) params.set("empCode", code);
    const wd = details?.work_date || details?.workDate;
    if (wd) {
      params.set("from", wd);
      params.set("to", wd);
    }
    const s = params.toString();
    setLinkParams(s || null);
  }, [details, row]);

  async function onAck() {
    await ackAlert(id, "TJFoster");
    await load();
  }
  async function onResolve() {
    await resolveAlert(id);
    await load();
  }

  return (
    <div className={styles.wrap}>
      <button className={styles.back} onClick={() => nav(-1)}>
        ← Back
      </button>
      <h1>Alert #{id}</h1>

      {error && <div className={styles.error}>{error}</div>}
      {!error && !row && <div>Loading…</div>}

      {row && (
        <div className={styles.card}>
          <div className={styles.row}>
            <label>Status</label>
            <span className={`${styles.badge} ${styles[`status_${(row.status || "").toLowerCase()}`]}`}>
              {row.status}
            </span>
          </div>
          <div className={styles.row}>
            <label>Type</label>
            <span className={styles.badge}>{row.type}</span>
          </div>
          <div className={styles.row}>
            <label>Severity</label>
            <span className={`${styles.badge} ${styles[`sev_${(row.severity || "").toLowerCase()}`]}`}>
              {row.severity}
            </span>
          </div>
          <div className={styles.row}>
            <label>Occurred</label>
            <span>{row.occurredOn || "—"}</span>
          </div>
          <div className={styles.row}>
            <label>Emp Code</label>
            <span>{row.empCode || "—"}</span>
          </div>
          <div className={styles.row}>
            <label>Occurrences</label>
            <span>{row.occurrenceCount}</span>
          </div>
          <div className={styles.row}>
            <label>Subject</label>
            <span>{summary}</span>
          </div>
          <div className={styles.row}>
            <label>Source</label>
            <span className={styles.mono}>{source}</span>
          </div>
          {hint && (
            <div className={styles.row}>
              <label>Hint</label>
              <span>{hint}</span>
            </div>
          )}
          <div className={styles.row}>
            <label>Dedupe Key</label>
            <span className={styles.mono}>{row.dedupeKey}</span>
          </div>

          <div className={styles.details}>
            <div className={styles.detailsHeader}>Details JSON</div>
            <pre className={styles.pre}>
              {details && Object.keys(details).length
                ? JSON.stringify(details, null, 2)
                : "No details provided."}
            </pre>
          </div>

          <div className={styles.actions}>
            {isOrphan && (
              <button
                type="button"
                onClick={() =>
                  nav(linkParams ? `/orphan-punches?${linkParams}` : "/orphan-punches")
                }
              >
                View Orphan Punches
              </button>
            )}
            {row.status === "open" && <button onClick={onAck}>Ack</button>}
            {row.status !== "resolved" && (
              <button onClick={onResolve}>Resolve</button>
            )}
            <textarea
              className={styles.notes}
              placeholder="Notes (local only, saved in your browser)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
