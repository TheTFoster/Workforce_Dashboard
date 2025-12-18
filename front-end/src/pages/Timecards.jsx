import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import api from "../api";
import styles from "../stylesheets/Timecards.module.css";

const defaultFilters = {
  employeeCode: "",
  employeeName: "",
  project: "",
  businessTitle: "",
  workGroup: "",
  startDate: "",
  endDate: "",
};

export default function Timecards() {
  const [filters, setFilters] = useState(defaultFilters);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [options, setOptions] = useState({ projects: [], titles: [], groups: [] });
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 100;
  const [detail, setDetail] = useState({ open: false, rows: [], loading: false, error: null, context: null });
  const [lastRun, setLastRun] = useState({ time: null, count: 0 });

  useEffect(() => {
    fetchTimecards({ reset: true, page: 0 });
    fetchOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleEnter = (e) => {
    if (e.key === "Enter") {
      fetchTimecards({ reset: true, page: 0 });
    }
  };

  const handleDateRange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const fetchTimecards = async ({ reset = false, page: pageOverride = page } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = { ...filters, page: pageOverride, size: pageSize };
      const { data } = await api.get("/api/v1/timecards/search", {
        params,
        withCredentials: true,
      });
      const rows = data || [];
      if (reset) {
        setResults(rows);
      } else {
        setResults((prev) => [...prev, ...rows]);
      }
      setPage(pageOverride);
      setHasMore(rows.length === pageSize);
      setLastRun({ time: new Date().toISOString(), count: reset ? rows.length : results.length + rows.length });
    } catch (err) {
      console.error("Error fetching timecards", err);
      setError("Unable to load timecards right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const { data } = await api.get("/api/v1/timecards/options", { withCredentials: true });
      setOptions({
        projects: data?.projects || [],
        titles: data?.businessTitles || [],
        groups: data?.workGroups || [],
      });
    } catch (err) {
      console.error("Error fetching dropdown options", err);
    }
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setPage(0);
    setHasMore(false);
    setResults([]);
  };

  const applyPreset = (preset) => {
    const today = dayjs();
    const getWeekRange = (offsetWeeks = 0) => {
      let monday = today.startOf("week").add(1, "day").add(offsetWeeks * 7, "day");
      // If start bumped into future, pull back a week (for Sundays)
      if (offsetWeeks === 0 && monday.isAfter(today)) {
        monday = monday.subtract(7, "day");
      }
      const sunday = monday.add(6, "day");
      return { start: monday, end: sunday };
    };

    if (preset === "thisWeek") {
      const { start, end } = getWeekRange(0);
      setFilters((prev) => ({
        ...prev,
        startDate: start.format("YYYY-MM-DD"),
        endDate: end.format("YYYY-MM-DD"),
      }));
    } else if (preset === "lastWeek") {
      const { start, end } = getWeekRange(-1);
      setFilters((prev) => ({
        ...prev,
        startDate: start.format("YYYY-MM-DD"),
        endDate: end.format("YYYY-MM-DD"),
      }));
    } else if (preset === "thisMonth") {
      const start = today.startOf("month");
      const end = today.endOf("month");
      setFilters((prev) => ({
        ...prev,
        startDate: start.format("YYYY-MM-DD"),
        endDate: end.format("YYYY-MM-DD"),
      }));
    }
  };

  const groupedByWeek = useMemo(() => {
    return [...results].sort((a, b) => {
      // Week ending desc
      const da = a.weekEnding || "";
      const db = b.weekEnding || "";
      if (da !== db) return db.localeCompare(da);
      // Last name asc (employeeName expected as "LAST, FIRST")
      const lastA = (a.employeeName || "").split(",")[0].trim().toLowerCase();
      const lastB = (b.employeeName || "").split(",")[0].trim().toLowerCase();
      if (lastA !== lastB) return lastA.localeCompare(lastB);
      // Employee code to keep same person together even across projects
      const codeA = (a.employeeCode || "").toLowerCase();
      const codeB = (b.employeeCode || "").toLowerCase();
      if (codeA !== codeB) return codeA.localeCompare(codeB);
      // Project to keep similar rows together
      const projA = (a.project || "").toLowerCase();
      const projB = (b.project || "").toLowerCase();
      if (projA !== projB) return projA.localeCompare(projB);
      return 0;
    });
  }, [results]);

  const openDetail = async (row) => {
    if (!row.employeeCode || !row.weekEnding) return;
    setDetail({ open: true, rows: [], loading: true, error: null, context: row });
    try {
      const { data } = await api.get("/api/v1/timecards/week-detail", {
        params: {
          eeCode: row.employeeCode,
          weekEnding: row.weekEnding,
          projectCode: row.projectCode || "",
        },
        withCredentials: true,
      });
      setDetail((d) => ({ ...d, rows: data || [], loading: false }));
    } catch (err) {
      console.error("Error fetching week detail", err);
      setDetail((d) => ({
        ...d,
        loading: false,
        error: "Unable to load entries for that week.",
      }));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Timecards</h1>
          <p className={styles.subtitle}>
            Lookup time records by employee, week/date range, project, or title.
          </p>
        </div>
        <div className={styles.actions}>
          <div className={styles.presets}>
            <button
              className={styles.chipButton}
              onClick={() => applyPreset("thisWeek")}
            >
              This Week
            </button>
            <button
              className={styles.chipButton}
              onClick={() => applyPreset("lastWeek")}
            >
              Last Week
            </button>
            <button
              className={styles.chipButton}
              onClick={() => applyPreset("thisMonth")}
            >
              This Month
            </button>
          </div>
          <button className={styles.secondaryButton} onClick={resetFilters}>
            Clear
          </button>
          <button className={styles.primaryButton} onClick={() => fetchTimecards({ reset: true, page: 0 })}>
            Search
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.field}>
          <label>CEC ID</label>
          <input
            name="employeeCode"
            value={filters.employeeCode}
            onChange={handleChange}
            onKeyDown={handleEnter}
            placeholder="Employee_code"
          />
        </div>
        <div className={styles.field}>
          <label>Employee Name</label>
          <input
            name="employeeName"
            value={filters.employeeName}
            onChange={handleChange}
            onKeyDown={handleEnter}
            placeholder="Name or partial"
          />
        </div>
        <div className={styles.field}>
          <label>Project</label>
          <input
            name="project"
            list="projectOptions"
            value={filters.project}
            onChange={handleChange}
            onKeyDown={handleEnter}
            placeholder="Job code / project"
          />
          <datalist id="projectOptions">
            {options.projects.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
        <div className={styles.field}>
          <label>Business Title</label>
          <input
            name="businessTitle"
            list="titleOptions"
            value={filters.businessTitle}
            onChange={handleChange}
            onKeyDown={handleEnter}
            placeholder="Title"
          />
          <datalist id="titleOptions">
            {options.titles.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div className={styles.field}>
          <label>Group</label>
          <input
            name="workGroup"
            list="groupOptions"
            value={filters.workGroup}
            onChange={handleChange}
            onKeyDown={handleEnter}
            placeholder="Group"
          />
          <datalist id="groupOptions">
            {options.groups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </div>
        <div className={styles.field}>
          <label>Start Date</label>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={(e) => handleDateRange("startDate", e.target.value)}
            onKeyDown={handleEnter}
          />
        </div>
        <div className={styles.field}>
          <label>End Date</label>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={(e) => handleDateRange("endDate", e.target.value)}
            onKeyDown={handleEnter}
          />
        </div>
      </div>

      {loading && <div className={styles.info}>Loading timecards...</div>}
      {error && <div className={styles.error}>{error}</div>}

      {!loading && !error && (
        <div className={styles.tableWrap}>
          <div className={styles.statusBar}>
            <span>
              Last run: {lastRun.time ? dayjs(lastRun.time).format("YYYY-MM-DD HH:mm:ss") : "—"}
            </span>
            <span>Rows loaded: {lastRun.count}</span>
            <button
              className={styles.primaryButton}
              onClick={() => fetchTimecards({ reset: true, page: 0 })}
            >
              {loading ? "Searching…" : "Execute Search"}
            </button>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Week Ending</th>
                <th>CEC ID</th>
                <th>Name</th>
                <th>Project</th>
                <th>Title</th>
                <th>Group</th>
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              {groupedByWeek.length === 0 && (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    No timecards found for the current filters.
                  </td>
                </tr>
              )}
              {groupedByWeek.map((row, idx) => (
                <tr key={idx} className={styles.clickable} onClick={() => openDetail(row)}>
                  <td>{row.weekEnding ? dayjs(row.weekEnding).format("YYYY-MM-DD") : "—"}</td>
                  <td>{row.employeeCode || "—"}</td>
                  <td>{row.employeeName || "—"}</td>
                  <td>{row.project || "—"}</td>
                  <td>{row.businessTitle || "—"}</td>
                  <td>{row.workGroup || "—"}</td>
                  <td>{row.hours != null ? row.hours.toFixed(2) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <div className={styles.loadMoreRow}>
              <button
                className={styles.primaryButton}
                onClick={() => fetchTimecards({ page: page + 1 })}
                disabled={loading}
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}

      {detail.open && (
        <div className={styles.modalBackdrop} onClick={() => setDetail({ open: false, rows: [], loading: false, error: null, context: null })}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalTitle}>
                  {detail.context?.employeeName || detail.context?.employeeCode}
                </div>
                <div className={styles.modalSub}>
                  Week ending {detail.context?.weekEnding} · Project {detail.context?.project || detail.context?.projectCode || "—"}
                </div>
              </div>
              <button
                className={styles.secondaryButton}
                onClick={() =>
                  setDetail({ open: false, rows: [], loading: false, error: null, context: null })
                }
              >
                Close
              </button>
            </div>
            {detail.loading && <div className={styles.info}>Loading entries…</div>}
            {detail.error && <div className={styles.error}>{detail.error}</div>}
            {!detail.loading && !detail.error && (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Project</th>
                      <th>Activity</th>
                      <th>In</th>
                      <th>Out</th>
                      <th>Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.rows.length === 0 && (
                      <tr>
                        <td colSpan={6} className={styles.empty}>
                          No entries for that week.
                        </td>
                      </tr>
                    )}
                    {detail.rows.map((r, i) => (
                      <tr key={i}>
                        <td>{r.workDate || "—"}</td>
                        <td>{r.projectDesc || r.projectCode || "—"}</td>
                        <td>{r.activity || "—"}</td>
                        <td>{r.inPunch || "—"}</td>
                        <td>{r.outPunch || "—"}</td>
                        <td>{r.hours != null ? Number(r.hours).toFixed(2) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
