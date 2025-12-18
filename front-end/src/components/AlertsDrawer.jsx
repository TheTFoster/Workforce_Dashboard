import React, { useEffect, useMemo, useState } from "react";
import { useAlerts } from "../context/AlertsContext";
import styles from "../stylesheets/AlertsDrawer.module.css";

/**
 * Expected alert shape (backend can return more; these are used):
 * {
 *   id: string|number,
 *   empCode: string|null,
 *   empId: string|number|null,
 *   empName: string|null,
 *   type: "PAYCOM_ORPHAN_PUNCH" | "SYSTEM" | string,
 *   severity: "low" | "medium" | "high" | "warn" | string,
 *   message: string,
 *   createdAt: "YYYY-MM-DDTHH:mm:ss" | epoch,
 *   acked: boolean,
 *   resolved: boolean
 * }
 */

const SEV_TAG = {
  low: "low",
  warn: "warn",
  medium: "medium",
  high: "high",
};

function rowKey(a) {
  return `${a.id}`;
}

export default function AlertsDrawer({ open, onClose }) {
  const {
    list,
    listLoading,
    listError,
    refreshList,
    ackOne,
    resolveOne,
    ackBulk,
    resolveBulk,
    filters,
    setFilters,
    safeStr,
  } = useAlerts();

  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    refreshList(); // initial load when opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (id) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );

  const allIds = useMemo(() => list.map((a) => a.id), [list]);
  const allChecked = selected.length > 0 && selected.length === allIds.length;

  const visible = useMemo(() => list, [list]);

  return (
    <>
      {open && <div className={styles.overlay} onClick={() => onClose?.()} />}

      <aside
        className={`${styles.drawer} ${open ? styles.open : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Alerts"
      >
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>Alerts</h3>
          <div className={styles.headerBtns}>
            <button
              type="button"
              className={styles.smallBtn}
              onClick={() => refreshList()}
              disabled={listLoading}
              title="Refresh"
            >
              Refresh
            </button>
            <button
              type="button"
              className={styles.smallBtn}
              onClick={() => onClose?.()}
              title="Close"
            >
              Close
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <select
            value={filters.by}
            onChange={(e) => setFilters((f) => ({ ...f, by: e.target.value }))}
            className={styles.input}
            title="Filter field"
          >
            <option value="empCode">Emp Code</option>
            <option value="name">Name</option>
            <option value="id">Emp ID</option>
            <option value="any">Any</option>
          </select>
          <input
            className={styles.input}
            type="text"
            placeholder="Search…"
            value={filters.q || ""}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          />
          <input
            className={styles.input}
            type="date"
            value={filters.from || ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, from: e.target.value }))
            }
            title="From"
          />
          <input
            className={styles.input}
            type="date"
            value={filters.to || ""}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            title="To"
          />
          <button
            type="button"
            className={styles.applyBtn}
            onClick={() => refreshList()}
            disabled={listLoading}
          >
            Apply
          </button>
        </div>

        {/* Error / empty */}
        {listError && <div className={styles.err}>{listError}</div>}
        {!listLoading && visible.length === 0 && (
          <div className={styles.empty}>No alerts.</div>
        )}

        {/* List */}
        <div className={styles.list} role="list">
          {visible.map((a) => {
            const tag =
              SEV_TAG[a.severity?.toLowerCase?.()] ??
              (a.severity ? a.severity.toLowerCase() : "low");
            const sub =
              [safeStr(a.empCode), safeStr(a.empName)]
                .filter(Boolean)
                .join(" — ") || "—";

            return (
              <div
                key={rowKey(a)}
                className={`${styles.row} ${
                  a.resolved ? styles.rowResolved : ""
                }`}
                role="listitem"
              >
                <label className={styles.chkWrap}>
                  <input
                    type="checkbox"
                    checked={selected.includes(a.id)}
                    onChange={() => toggle(a.id)}
                  />
                </label>

                <div className={styles.rowMain} onClick={() => toggle(a.id)}>
                  <div className={styles.rowHead}>
                    <div className={styles.type}>
                      {a.type || "ALERT"}
                      <span className={`${styles.sev} ${styles[`sev_${tag}`]}`}>
                        {a.severity || "low"}
                      </span>
                    </div>
                    <div className={styles.time}>
                      {a.createdAt ? String(a.createdAt) : "—"}
                    </div>
                  </div>
                  <div className={styles.sub}>{sub}</div>
                  {a.message && <div className={styles.msg}>{a.message}</div>}
                </div>

                <div className={styles.rowBtns}>
                  {!a.acked && (
                    <button
                      type="button"
                      className={styles.rowBtn}
                      onClick={() => ackOne(a.id)}
                      title="Acknowledge"
                    >
                      Ack
                    </button>
                  )}
                  {!a.resolved && (
                    <button
                      type="button"
                      className={styles.rowBtn}
                      onClick={() => resolveOne(a.id)}
                      title="Resolve"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer bulk actions */}
        <div className={styles.footer}>
          <label className={styles.selectAll}>
            <input
              type="checkbox"
              checked={allChecked}
              onChange={(e) => setSelected(e.target.checked ? allIds : [])}
            />
            <span>Select all</span>
          </label>

          <div className={styles.bulkBtns}>
            <button
              type="button"
              className={styles.bulkBtn}
              disabled={selected.length === 0}
              onClick={() => ackBulk(selected)}
            >
              Ack Selected
            </button>
            <button
              type="button"
              className={styles.bulkBtn}
              disabled={selected.length === 0}
              onClick={() => resolveBulk(selected)}
            >
              Resolve Selected
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
