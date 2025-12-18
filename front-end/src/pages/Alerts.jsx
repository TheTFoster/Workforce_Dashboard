import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listAlerts,
  ackAlert,
  resolveAlert,
  runNoHours,
  runMissedPunch,
} from "../api/alerts";
import styles from "../stylesheets/Alerts.module.css";

const TYPE_OPTIONS = [
  "MISSED_PUNCH",
  "NO_HOURS_THIS_WEEK",
  "NO_HOURS_LAST_WEEK",
];

export default function Alerts() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("open");
  const [types, setTypes] = useState([]);
  const [empCode, setEmpCode] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(200);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const data = await listAlerts({
        status,
        types,
        empCode: empCode.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
        limit,
      });
      setRows(data);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh(); /* auto-load once */
  }, []);

  async function onAck(id) {
    await ackAlert(id, "TJFoster");
    await refresh();
  }
  async function onResolve(id) {
    await resolveAlert(id);
    await refresh();
  }

  const openCount = useMemo(
    () => rows.filter((r) => (r.status || "").toLowerCase() === "open").length,
    [rows]
  );
  const resolvedCount = useMemo(
    () => rows.filter((r) => (r.status || "").toLowerCase() === "resolved").length,
    [rows]
  );

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>Alerts</p>
          <h1>Ops exceptions at a glance</h1>
          <p className={styles.lead}>
            Track missed punches and no-hours issues, then acknowledge or resolve them in one place.
          </p>
          <div className={styles.heroActions}>
            <button
              onClick={() => runNoHours("this-week").then(refresh)}
              title="No-hours for this week"
            >
              Run No-Hours (This Week)
            </button>
            <button
              onClick={() => runNoHours("last-week").then(refresh)}
              title="No-hours for last week"
            >
              Run No-Hours (Last Week)
            </button>
            <button
              onClick={() => runMissedPunch().then(refresh)}
              title="Prev business day"
            >
              Run Missed-Punch
            </button>
          </div>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.statCard}>
            <span>Open</span>
            <strong>{openCount}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Resolved</span>
            <strong>{resolvedCount}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Total in view</span>
            <strong>{rows.length}</strong>
          </div>
        </div>
      </section>

      <section className={styles.filtersCard}>
        <div className={styles.filters}>
          <label className={styles.field}>
            <span>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Any</option>
              <option value="open">Open</option>
              <option value="acked">Acked</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>Types</span>
            <select
              multiple
              value={types}
              onChange={(e) =>
                setTypes(Array.from(e.target.selectedOptions).map((o) => o.value))
              }
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Emp Code</span>
            <input
              value={empCode}
              onChange={(e) => setEmpCode(e.target.value)}
              placeholder="e.g. 5122"
            />
          </label>

          <label className={styles.field}>
            <span>From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Limit</span>
            <input
              type="number"
              min={1}
              max={2000}
              value={limit}
              onChange={(e) => setLimit(+e.target.value || 200)}
            />
          </label>

          <button className={styles.applyBtn} onClick={refresh} disabled={loading}>
            {loading ? "Loading..." : "Apply"}
          </button>
        </div>
      </section>

      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.tableCard}>
        <header className={styles.tableHead}>
          <div>
            <h2>Alerts</h2>
            <p>{rows.length ? `${rows.length} result${rows.length === 1 ? "" : "s"}` : "No alerts found"}</p>
          </div>
          <button className={styles.refreshBtn} onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </header>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Occurred</th>
                <th>Status</th>
                <th>Type</th>
                <th>Emp Code</th>
                <th>Severity</th>
                <th>Count</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className={styles.empty}>
                    No alerts
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const statusBadge = (r.status || "").toLowerCase();
                const sevBadge = (r.severity || "").toLowerCase();
                return (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.occurredOn}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[`status_${statusBadge}`]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <span className={styles.pill}>{r.type}</span>
                    </td>
                    <td>{r.empCode || "—"}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[`sev_${sevBadge}`]}`}>
                        {r.severity}
                      </span>
                    </td>
                    <td>{r.occurrenceCount}</td>
                    <td className={styles.rowActions}>
                      <button
                        onClick={() => nav(`/alerts/${r.id}`)}
                        title="View details"
                      >
                        View
                      </button>
                      {statusBadge === "open" && (
                        <button onClick={() => onAck(r.id)}>Ack</button>
                      )}
                      {statusBadge !== "resolved" && (
                        <button onClick={() => onResolve(r.id)}>Resolve</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
