import React, { useEffect, useMemo, useState } from "react";
import { listOrphanPunches, deleteOrphanPunch } from "../api/alerts";
import styles from "../stylesheets/OrphanPunches.module.css";

export default function OrphanPunches() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [empCode, setEmpCode] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(200);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const data = await listOrphanPunches({
        empCode: empCode.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
        limit,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Load failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onDelete(id) {
    if (!window.confirm("Delete this orphan punch from the database?")) return;
    try {
      await deleteOrphanPunch(id);
      setRows((cur) => cur.filter((r) => r.id !== id));
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Delete failed");
    }
  }

  const orphanCount = useMemo(() => rows.length, [rows]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Data hygiene</p>
          <h1>Orphan Punches</h1>
          <p className={styles.lead}>
            Missing IN/OUT punches from Paycom. Review and delete dud rows before they trigger more alerts.
          </p>
        </div>
        <div className={styles.statCard}>
          <span>In view</span>
          <strong>{orphanCount}</strong>
        </div>
      </header>

      <section className={styles.filtersCard}>
        <div className={styles.filters}>
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
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
        <div className={styles.tableHead}>
          <div>
            <h2>Orphan punches</h2>
            <p>{rows.length ? `${rows.length} row${rows.length === 1 ? "" : "s"}` : "No rows"}</p>
          </div>
          <button className={styles.refreshBtn} onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Emp Code</th>
                <th>Name</th>
                <th>Work Date</th>
                <th>In Punch</th>
                <th>Out Punch</th>
                <th>Allocation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className={styles.empty}>No orphan punches.</td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.empCode || "—"}</td>
                  <td>{[r.firstName, r.lastName].filter(Boolean).join(" ") || "—"}</td>
                  <td>{r.workDate || "—"}</td>
                  <td>{r.inPunch || "—"}</td>
                  <td>{r.outPunch || "—"}</td>
                  <td>{r.allocationCode || "—"}</td>
                  <td className={styles.rowActions}>
                    <button onClick={() => onDelete(r.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
