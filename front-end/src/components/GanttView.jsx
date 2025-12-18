// src/pages/GanttView.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import api from "../api";
import Chart from "react-apexcharts";
import ApexCharts from "apexcharts";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { BsHouseDoor } from "react-icons/bs";
import styles from "../stylesheets/GanttView.module.css";
import { findOverlaps } from "../utils/findOverlaps";
import buildAssignmentsFromTimecards from "../utils/buildAssignmentsFromTimecards";
import Footer from "../components/Footer";
import LoadingScreen from "../components/LoadingScreen";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_BARS = 5000; // Reduced from 10k to 5k to prevent ApexCharts render freeze
const PAGE_SIZE = 10000;
const MAX_PAGES = 5; // Fetch up to 50k records (full November) while keeping render capped

const colorCache = new Map();
const hashColor = (name) => {
  const key = String(name || "unknown");
  if (colorCache.has(key)) return colorCache.get(key);
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  const color = `hsl(${Math.abs(h) % 360}deg 60% 52%)`;
  colorCache.set(key, color);
  return color;
};
const truncate = (s, n) =>
  !s ? "" : s.length > n ? `${s.slice(0, n - 1)}…` : s;
const clampInt = (n, min, max) =>
  Number.isNaN(n) ? min : Math.min(max, Math.max(min, n | 0));

const getEmpId = (e) =>
  e?.employeeid ?? e?.employeeId ?? e?.empId ?? e?.id ?? null;
const getEmpCode = (e) =>
  e?.employeeCode ??
  e?.employee_code ??
  e?.emp_code ??
  e?.ee_code ??
  e?.code ??
  null;
const getIsActive = (e) => {
  if (typeof e?.active === "boolean") return e.active;
  if (typeof e?.isActive === "boolean") return e.isActive;
  if (typeof e?.status === "string") {
    const s = e.status.toUpperCase();
    if (s.includes("ACTIVE")) return true;
    if (s.includes("INACTIVE") || s.includes("TERMINATED")) return false;
  }
  return undefined;
};

const LegendModal = React.memo(function LegendModal({ items, onClose }) {
  const [VirtualList, setVirtualList] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mod = await import("react-window");
        const Comp =
          mod.FixedSizeList ||
          (mod && mod.default && mod.default.FixedSizeList) ||
          mod.default ||
          null;
        if (alive && Comp) setVirtualList(() => Comp);
      } catch (err) {
        console.warn(
          "react-window not available for LegendModal; falling back.",
          err
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const needle = q.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(needle));
  }, [items, q]);
  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>Legend (Employees)</div>
          <button className={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>
        <input
          className={styles.searchInput}
          placeholder="Search employee…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className={styles.legendCount}>
          Showing {filtered.length} of {items.length}
        </div>
        <div className={styles.virtualWrap}>
          {VirtualList ? (
            <VirtualList
              height={420}
              width={"100%"}
              itemSize={32}
              itemCount={filtered.length}
            >
              {({ index, style }) => {
                const item = filtered[index];
                return (
                  <div style={style} className={styles.legendRow}>
                    <span
                      className={styles.swatch}
                      style={{ background: item.color }}
                    />
                    <span className={styles.legendText}>{item.name}</span>
                  </div>
                );
              }}
            </VirtualList>
          ) : (
            <div>
              {filtered.map((item, index) => (
                <div key={item?.name ?? index} className={styles.legendRow}>
                  <span
                    className={styles.swatch}
                    style={{ background: item.color }}
                  />
                  <span className={styles.legendText}>{item.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default function GanttView() {
  const navigate = useNavigate();
  const navigateToEmployee = useCallback(
    (empId) => {
      if (empId) navigate(`/employee-details/${empId}`);
    },
    [navigate]
  );

  const [employees, setEmployees] = useState([]);
  const [timecards, setTimecards] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartReady, setChartReady] = useState(false); // Defer chart render to prevent freeze

  const [predictions, setPredictions] = useState({});
  const [usePredicted, setUsePredicted] = useState(false); // disabled for Gantt
  const [minPredConfidence, setMinPredConfidence] = useState(70);
  const [showUpcomingTransfers, setShowUpcomingTransfers] = useState(false); // disabled for Gantt
  const [transferLookAhead, setTransferLookAhead] = useState(90); // days

  const [dateRangeStart, setDateRangeStart] = useState(() => {
    // Default to November 2025 start
    return "2025-11-01";
  });
  const [dateRangeEnd, setDateRangeEnd] = useState(() => {
    // Default to November 2025 end
    return "2025-11-30";
  });
  // Helper: set the date range to a specific calendar month
  const setMonthRange = useCallback((year, monthIndex /* 0-11 */) => {
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    setDateRangeStart(start.toISOString().slice(0, 10));
    setDateRangeEnd(end.toISOString().slice(0, 10));
  }, []);
  const [loadingProgress, setLoadingProgress] = useState({
    current: 0,
    total: 0,
    status: "",
  });
  const abortRef = useRef(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  useEffect(() => {
    // Lock background scroll while legend is open
    if (legendOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [legendOpen]);

  const [autoGroup, setAutoGroup] = useState(true);
  const [groupMode, setGroupMode] = useState("project");
  const [selectedProjects, setSelectedProjects] = useState([]);

  const [showLabels, setShowLabels] = useState(false);
  const [minLabelDays, setMinLabelDays] = useState(90);
  const [minLabelDaysInput, setMinLabelDaysInput] = useState(String(90));
  const MIN_DAYS_MIN = 1,
    MIN_DAYS_MAX = 365;
  useEffect(() => setMinLabelDaysInput(String(minLabelDays)), [minLabelDays]);
  const onMinDaysSlider = (e) =>
    setMinLabelDays(
      clampInt(parseInt(e.target.value, 10), MIN_DAYS_MIN, MIN_DAYS_MAX)
    );
  const onMinDaysInputChange = (e) => setMinLabelDaysInput(e.target.value);
  const commitMinDaysInput = () => {
    const parsed = clampInt(
      parseInt(minLabelDaysInput, 10),
      MIN_DAYS_MIN,
      MIN_DAYS_MAX
    );
    setMinLabelDays(parsed);
    setMinLabelDaysInput(String(parsed));
  };

  const [employeeQuery, setEmployeeQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceTimerRef = useRef(null);
  const [sortBy, setSortBy] = useState("alpha");
  const [projectSort, setProjectSort] = useState("alpha"); 
  const [rowDensity, setRowDensity] = useState(22);
  const [pageSize, setPageSize] = useState(60);
  const [pageIndex, setPageIndex] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);

  const bannerStyle = {
    background: "#2b1618",
    color: "#ffd6d9",
    border: "1px solid #6b1f25",
    padding: "10px 12px",
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 14,
  };

  const coerceArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    for (const k of [
      "data",
      "items",
      "rows",
      "results",
      "content",
      "employees",
      "list",
      "values",
      "spans",
    ])
      if (Array.isArray(payload[k])) return payload[k];
    if (Array.isArray(payload?.page?.content)) return payload.page.content;
    for (const k of Object.keys(payload)) {
      const v = payload[k];
      if (Array.isArray(v) && (!v.length || typeof v[0] === "object")) return v;
    }
    return [];
  };

  useEffect(() => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let isMounted = true;

    const fetchPagedTimecards = async (startDate, endDate) => {
      const allTimecards = [];
      let page = 0;
      let hasMore = true;

      setLoadingProgress({
        current: 0,
        total: 0,
        status: "Fetching timecards...",
      });

      while (hasMore && page < MAX_PAGES && isMounted) {
        try {
          const params = {
            startDate,
            endDate,
            page,
            size: PAGE_SIZE,
          };
          console.log(`[Gantt] Fetching page ${page} with params:`, params);

          const r = await api.get("/api/v1/timecards/range/paged", {
            params,
            signal: ctrl.signal,
          });
          console.log(`[Gantt] Page ${page} response received`);

          const data = r?.data;
          const content = coerceArray(data?.content || data);
          console.log(`[Gantt] Page ${page} returned ${content.length} records`);

          if (content.length > 0) {
            allTimecards.push(...content);

            const totalElements = data?.totalElements || allTimecards.length;
            const totalPages = data?.totalPages || 1;

            setLoadingProgress({
              current: allTimecards.length,
              total: Math.min(totalElements, MAX_PAGES * PAGE_SIZE),
              status: `Loaded ${allTimecards.length.toLocaleString()} of ${Math.min(
                totalElements,
                MAX_PAGES * PAGE_SIZE
              ).toLocaleString()} timecards (page ${page + 1}/${Math.min(
                totalPages,
                MAX_PAGES
              )})`,
            });
            // Progressive rendering: update timecards as pages arrive
            if (isMounted) {
              setTimecards(allTimecards.slice());
            }
          }

          hasMore = data?.hasNext === true && content.length === PAGE_SIZE;
          page++;

          // Yield to UI every 2 pages
          if (page % 2 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        } catch (e) {
          if (e.name !== "AbortError") {
            console.error(`Error fetching page ${page}:`, e);
          }
          hasMore = false;
        }
      }

      return allTimecards;
    };

    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        setLoadingProgress({
          current: 0,
          total: 0,
          status: "Starting data load...",
        });
        console.log("[Gantt] Starting data load for range:", dateRangeStart, "to", dateRangeEnd);

        // Fetch employees
        setLoadingProgress({
          current: 0,
          total: 0,
          status: "Loading employees...",
        });
        console.log("[Gantt] Fetching employees...");
        const empResp = await api.get("/api/v1/employee/list", {
          params: { activeOnly: true, size: 100000 },
          signal: ctrl.signal,
        });
        const empData = coerceArray(empResp?.data);
        console.log("[Gantt] Loaded", empData.length, "employees");

        if (isMounted) {
          setEmployees(empData);
          setLoadingProgress({
            current: 0,
            total: 0,
            status: `Loaded ${empData.length} employees`,
          });
        }

        // Transfers suppressed for Gantt view; handled on a dedicated page
        setTransfers([]);

        // Fetch timecards with pagination (progressive sets inside fetch)
        console.log("[Gantt] Starting paged timecard fetch...");
        const tcData = await fetchPagedTimecards(dateRangeStart, dateRangeEnd);
        console.log("[Gantt] Finished fetching", tcData.length, "timecards");

        if (isMounted) {
          setLoadingProgress({
            current: tcData.length,
            total: tcData.length,
            status: `Processing ${tcData.length.toLocaleString()} timecards...`,
          });

          // Small delay to show final count
          await new Promise((resolve) => setTimeout(resolve, 300));
          console.log("[Gantt] Setting loading=false");
          setLoading(false);
        }
      } catch (e) {
        if (e.name === "AbortError" || e?.name === "CanceledError") return;
        console.error("Data load error:", e);
        if (isMounted) {
          setLoadError(
            `Failed to load data: ${
              e.response?.data?.message || e.message || "Unknown error"
            }. Try refreshing or narrowing your date range.`
          );
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      ctrl.abort();
    };
  }, [dateRangeStart, dateRangeEnd, transferLookAhead]);

  // Legacy months-based timecards loader removed; paginated loader above is authoritative.

  // Predictions (lazy: only if enabled, dataset reasonable, and data loaded)
  useEffect(() => {
    // Don't fetch predictions until main data is loaded
    if (loading || !employees.length || !timecards.length) {
      return;
    }

    if (!usePredicted) {
      setPredictions({});
      return;
    }

    // Skip if dataset is too large
    if (timecards.length > 7000) {
      console.info("[Gantt] Skipping predictions due to large dataset");
      setPredictions({});
      return;
    }

    // Debounce predictions fetch to avoid multiple rapid calls
    const timer = setTimeout(() => {
      (async () => {
        try {
          const codes = Array.from(
            new Set(employees.map(getEmpCode).filter(Boolean))
          );
          if (!codes.length) {
            setPredictions({});
            return;
          }
          console.info(
            `[Gantt] Fetching predictions for ${codes.length} employees...`
          );
          const r = await api.post("/api/v1/timecards/predict/batch", {
            empCodes: codes,
          });
          setPredictions(r?.data?.predictions || {});
          console.info(`[Gantt] Predictions loaded`);
        } catch (e) {
          console.warn("Predictions fetch failed.", e);
          setPredictions({});
        }
      })();
    }, 500); // Wait 500ms after data loads before fetching predictions

    return () => clearTimeout(timer);
  }, [employees, usePredicted, timecards, loading]);

  // Debounce employee query
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(employeeQuery);
    }, 300);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [employeeQuery]);

  // Index employees by CEC ID
  const empIndexByCode = useMemo(() => {
    const m = new Map();
    for (const e of employees) {
      const code = getEmpCode(e);
      if (code) m.set(code, e);
    }
    return m;
  }, [employees]);

  // Build assignments (skip if no data) - use chunked processing to prevent UI blocking
  // Only build when loading completes to avoid repeated expensive builds during progressive updates
  const assignmentsRaw = useMemo(() => {
    if (loading || !timecards.length || !empIndexByCode.size) {
      return [];
    }

    // For smaller datasets, process normally
    if (timecards.length < 10000) {
      const start = performance.now();
      const result = buildAssignmentsFromTimecards(timecards, empIndexByCode);
      const elapsed = performance.now() - start;
      if (elapsed > 100) {
        console.info(
          `[Gantt] buildAssignments took ${elapsed.toFixed(0)}ms for ${
            timecards.length
          } timecards`
        );
      }
      return result;
    }

    // For large datasets, process in chunks to avoid blocking
    console.info(
      `[Gantt] Processing ${timecards.length} timecards in chunks...`
    );
    const CHUNK_SIZE = 5000;
    const chunks = [];
    for (let i = 0; i < timecards.length; i += CHUNK_SIZE) {
      chunks.push(timecards.slice(i, i + CHUNK_SIZE));
    }

    const start = performance.now();
    const allResults = [];
    for (const chunk of chunks) {
      const chunkResult = buildAssignmentsFromTimecards(chunk, empIndexByCode);
      allResults.push(...chunkResult);
    }
    const elapsed = performance.now() - start;
    console.info(
      `[Gantt] Chunked buildAssignments took ${elapsed.toFixed(0)}ms for ${
        timecards.length
      } timecards`
    );
    console.info(`[Gantt] Built ${allResults.length} assignment spans from timecards`);

    return allResults;
  }, [timecards, empIndexByCode, loading]);

  // Predictions disabled: always empty
  const transferPredictions = useMemo(() => new Map(), []);

  // Pass-through assignments without predictions
  const assignments = useMemo(() => {
    return (assignmentsRaw || []).map((a) => ({
      ...a,
      projectRaw: a.project || "Unknown",
      project: a.project || "Unknown",
      __predicted: null,
    }));
  }, [assignmentsRaw]);

  // Precompute render-friendly fields once so filters and series building stay cheap
  const preparedAssignments = useMemo(() => {
    if (!assignments.length) return [];
    return assignments
      .map((a) => {
        const employeeName = a.employee || "Unknown";
        const projectName = a.project || "Unknown";
        const startMs =
          a.start instanceof Date && !isNaN(a.start)
            ? a.start.getTime()
            : NaN;
        let endMs =
          a.end instanceof Date && !isNaN(a.end) ? a.end.getTime() : NaN;
        if (!Number.isFinite(endMs) || endMs <= startMs) {
          endMs = Number.isFinite(startMs) ? startMs + MS_PER_DAY : endMs;
        }
        const durationDays =
          Number.isFinite(startMs) && Number.isFinite(endMs)
            ? Math.max(1, Math.round((endMs - startMs) / MS_PER_DAY))
            : null;

        return {
          ...a,
          employeeName,
          projectName,
          startMs,
          endMs,
          durationDays,
          barColor: a.__isTransferSpan ? "#ffa726" : hashColor(employeeName),
        };
      })
      .filter(Boolean);
  }, [assignments]);

  const allProjects = useMemo(() => {
    if (!preparedAssignments.length) return [];
    return Array.from(
      new Set(preparedAssignments.map((a) => a.projectName))
    ).sort((a, b) => a.localeCompare(b));
  }, [preparedAssignments]);

  const allEmployees = useMemo(() => {
    if (!preparedAssignments.length) return [];
    return Array.from(
      new Set(preparedAssignments.map((a) => a.employeeName))
    ).sort((a, b) => a.localeCompare(b));
  }, [preparedAssignments]);

  const filteredByProject = useMemo(() => {
    if (!selectedProjects?.length) return preparedAssignments;
    const chosen = new Set(selectedProjects);
    return preparedAssignments.filter((a) => chosen.has(a.projectName));
  }, [preparedAssignments, selectedProjects]);

  const effectiveGroup = useMemo(
    () =>
      autoGroup
        ? selectedProjects.length === 1
          ? "employee"
          : "project"
        : groupMode,
    [autoGroup, groupMode, selectedProjects.length]
  );

  // Employee view: derive rows + sort/paginate
  const employeeRowsAll = useMemo(() => {
    if (effectiveGroup !== "employee") return [];
    const map = new Map();
    for (const a of filteredByProject) {
      const name = a.employeeName;
      const s = Number.isFinite(a.startMs) ? a.startMs : Number.POSITIVE_INFINITY;
      const agg = map.get(name) || { name, earliest: s };
      agg.earliest = Math.min(agg.earliest, s);
      map.set(name, agg);
    }
    let arr = Array.from(map.values());
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      arr = arr.filter((x) => x.name.toLowerCase().includes(q));
    }
    if (sortBy === "alpha") arr.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "startAsc") arr.sort((a, b) => a.earliest - b.earliest);
    else if (sortBy === "startDesc")
      arr.sort((a, b) => b.earliest - a.earliest);
    return arr.map((x) => x.name);
  }, [filteredByProject, effectiveGroup, debouncedQuery, sortBy]);

  // Project view: derive rows + sort
  const projectRowsAll = useMemo(() => {
    if (effectiveGroup !== "project") return [];
    const map = new Map();
    for (const a of filteredByProject) {
      const name = a.projectName;
      const s = Number.isFinite(a.startMs) ? a.startMs : Number.POSITIVE_INFINITY;
      const agg = map.get(name) || { name, earliest: s };
      agg.earliest = Math.min(agg.earliest, s);
      map.set(name, agg);
    }
    let arr = Array.from(map.values());
    if (projectSort === "alpha")
      arr.sort((a, b) => a.name.localeCompare(b.name));
    else if (projectSort === "startAsc")
      arr.sort((a, b) => a.earliest - b.earliest);
    else if (projectSort === "startDesc")
      arr.sort((a, b) => b.earliest - a.earliest);
    return arr.map((x) => x.name);
  }, [filteredByProject, effectiveGroup, projectSort]);

  const pageCount = useMemo(() => {
    if (effectiveGroup === "employee") {
      return Math.max(1, Math.ceil(employeeRowsAll.length / pageSize));
    }
    if (effectiveGroup === "project") {
      return Math.max(1, Math.ceil(projectRowsAll.length / pageSize));
    }
    return 1;
  }, [effectiveGroup, employeeRowsAll.length, projectRowsAll.length, pageSize]);
  useEffect(() => {
    if (pageIndex > pageCount - 1) setPageIndex(pageCount - 1);
  }, [pageCount, pageIndex]);
  useEffect(() => {
    setPageIndex(0);
  }, [effectiveGroup]);
  const visibleEmployees = useMemo(() => {
    if (effectiveGroup !== "employee") return [];
    const start = pageIndex * pageSize;
    return employeeRowsAll.slice(start, start + pageSize);
  }, [employeeRowsAll, effectiveGroup, pageIndex, pageSize]);
  const visibleProjects = useMemo(() => {
    if (effectiveGroup !== "project") return [];
    const start = pageIndex * pageSize;
    return projectRowsAll.slice(start, start + pageSize);
  }, [projectRowsAll, effectiveGroup, pageIndex, pageSize]);

  const filtered = useMemo(() => {
    if (effectiveGroup === "employee") {
      const allow = new Set(visibleEmployees);
      return filteredByProject.filter((a) => allow.has(a.employeeName));
    }
    if (effectiveGroup === "project") {
      const allow = new Set(visibleProjects);
      return filteredByProject.filter((a) => allow.has(a.projectName));
    }
    return filteredByProject;
  }, [filteredByProject, visibleEmployees, visibleProjects, effectiveGroup]);

  // Cap bars rendered
  // Add upcoming transfer spans as predicted future assignments
  // Upcoming transfer spans disabled; use filtered as-is
  const filteredWithTransfers = useMemo(() => filtered, [filtered]);

  const filteredCapped = useMemo(() => {
    const total = filteredWithTransfers?.length || 0;
    console.info(`[Gantt] Total assignments before cap: ${total} (MAX_BARS=${MAX_BARS})`);
    if (total <= MAX_BARS) return filteredWithTransfers;
    
    const capped = [...filteredWithTransfers]
      .sort(
        (a, b) =>
          (Number.isFinite(b.endMs) ? b.endMs : 0) -
          (Number.isFinite(a.endMs) ? a.endMs : 0)
      )
      .slice(0, MAX_BARS);
    console.warn(`[Gantt] Capped ${total} assignments down to ${MAX_BARS} for chart rendering`);
    return capped;
  }, [filteredWithTransfers]);
  const capped = filtered.length > MAX_BARS;

  const chartRange = useMemo(() => {
    // Base on the selected date range, add small padding to prevent edge clipping
    const startMs = new Date(dateRangeStart).getTime();
    const endMs = new Date(dateRangeEnd).getTime();
    const baseMin = Number.isFinite(startMs) ? startMs : Date.now() - 180 * MS_PER_DAY;
    const baseMax = Number.isFinite(endMs) ? endMs : Date.now() + 90 * MS_PER_DAY;
    const outerPad = 3 * MS_PER_DAY; // small padding on both ends

    if (filteredCapped.length === 0) {
      return { min: baseMin - outerPad, max: baseMax + outerPad };
    }

    // For single project, zoom to data bounds with stronger padding
    if (selectedProjects.length === 1) {
      let min = Infinity,
        max = -Infinity;
      for (const a of filteredCapped) {
        const s = Number.isFinite(a.startMs) ? a.startMs : NaN;
        const e = Number.isFinite(a.endMs) ? a.endMs : NaN;
        if (!isNaN(s)) min = Math.min(min, s);
        if (!isNaN(e)) max = Math.max(max, e);
      }
      if (!isFinite(min) || !isFinite(max)) {
        return { min: baseMin - outerPad, max: baseMax + outerPad };
      }
      const innerPad = 14 * MS_PER_DAY; // 2 weeks padding for single project
      return { min: min - innerPad, max: max + innerPad };
    }

    // Multi-project: use date range with small padding
    return { min: baseMin - outerPad, max: baseMax + outerPad };
  }, [filteredCapped, selectedProjects.length, dateRangeStart, dateRangeEnd]);

  const overlaps = useMemo(() => {
    // Only calculate overlaps if we have a reasonable amount of data
    if (filteredCapped.length === 0 || filteredCapped.length > 1000) return [];
    return findOverlaps(filteredCapped);
  }, [filteredCapped]);

  const series = useMemo(() => {
    console.info(`[Gantt] Building chart series from ${filteredCapped.length} assignments`);
    const seriesStart = performance.now();
    const data = filteredCapped
      .filter((a) => Number.isFinite(a.startMs) && Number.isFinite(a.endMs))
      .map((a) => {
        const sMs = a.startMs;
        const eMs = a.endMs > sMs ? a.endMs : sMs + MS_PER_DAY; // guarantee > start

        const row =
          effectiveGroup === "project" ? a.projectName : a.employeeName;
        const other =
          effectiveGroup === "project" ? a.employeeName : a.projectName;

        return {
          x: row,
          y: [sMs, eMs],
          employee: a.employeeName,
          empId: a.employeeId,
          project: a.projectName,
          projectRaw: a.projectRaw || a.projectName,
          labelOther: other,
          durationDays:
            a.durationDays ?? Math.max(1, Math.round((eMs - sMs) / MS_PER_DAY)),
          fillColor: a.barColor, // Orange for transfer spans precomputed for transfers
          predicted: a.__predicted,
          isTransferSpan: !!a.__isTransferSpan,
        };
      });
    const seriesElapsed = performance.now() - seriesStart;
    console.info(`[Gantt] Chart series built with ${data.length} bars in ${seriesElapsed.toFixed(0)}ms`);
    console.info(`[Gantt] Passing series to Chart component...`);
    return [{ name: "Assignments", data }];
  }, [filteredCapped, effectiveGroup]);

  const yLabelFontSize = useMemo(
    () => `${Math.max(9, Math.min(12, Math.round(rowDensity / 2)))}px`,
    [rowDensity]
  );

  const CHART_ID = "gantt-main";

  // Track when chart finishes rendering
  useEffect(() => {
    if (!loading && series.length > 0 && series[0]?.data?.length > 0) {
      console.info(`[Gantt] Chart component mounted with ${series[0].data.length} bars`);
      // Defer chart render slightly to prevent UI freeze
      if (!chartReady) {
        console.info(`[Gantt] Deferring chart render by 100ms to prevent freeze...`);
        const timer = setTimeout(() => {
          setChartReady(true);
          console.info(`[Gantt] Chart ready, rendering now...`);
        }, 100);
        return () => clearTimeout(timer);
      } else {
        // Chart already rendered, log completion
        const timer = setTimeout(() => {
          console.info(`[Gantt] Chart rendering completed`);
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, series, chartReady]);

  // For project grouping, restrict categories to those present in the (capped) data, ordered by projectRowsAll.
  const projectCategories = useMemo(() => {
    if (effectiveGroup !== "project") return undefined;
    const present = new Set(filteredCapped.map((a) => a.projectName));
    return visibleProjects.filter((name) => present.has(name));
  }, [effectiveGroup, filteredCapped, visibleProjects]);

  const options = useMemo(
    () => ({
      chart: {
        id: CHART_ID,
        type: "rangeBar",
        foreColor: "#cfe1ff",
        background: "#0f1526",
        toolbar: { show: true },
        selection: { enabled: false },
        events: {
          dataPointSelection: (evt, _ctx, detail) => {
            const d =
              detail?.w?.config?.series?.[detail.seriesIndex]?.data?.[
                detail.dataPointIndex
              ];
            if (!d?.empId) return;
            try {
              evt?.preventDefault?.();
              evt?.stopPropagation?.();
            } catch {}
            requestAnimationFrame(() =>
              setTimeout(() => navigateToEmployee(d.empId), 60)
            );
          },
        },
      },
      theme: { mode: "dark" },
      plotOptions: {
        bar: { horizontal: true, rangeBarGroupRows: true, barHeight: "65%" },
      },
      xaxis: {
        type: "datetime",
        labels: { datetimeUTC: false, style: { colors: "#cfe1ff" } },
        ...(chartRange ? { min: chartRange.min, max: chartRange.max } : {}),
      },
      yaxis: {
        categories:
          effectiveGroup === "project" ? projectCategories : undefined,
        labels: {
          maxWidth: 300,
          style: { colors: "#cfe1ff", fontSize: yLabelFontSize },
        },
      },
      dataLabels: {
        enabled: showLabels,
        formatter: (_val, opts) => {
          const d =
            opts.w.config.series[opts.seriesIndex].data[opts.dataPointIndex];
          if (!showLabels) return "";
          if (!d || !d.durationDays || d.durationDays < minLabelDays) return "";
          return truncate(d.labelOther || "", 22);
        },
        style: { fontSize: "11px", fontWeight: 700, colors: ["#e9eef7"] },
        offsetX: 0,
        dropShadow: { enabled: true, top: 0, left: 0, blur: 3, opacity: 0.85 },
      },
      tooltip: {
        followCursor: true,
        custom: ({ seriesIndex, dataPointIndex, w }) => {
          const d = w.config.series[seriesIndex].data[dataPointIndex];
          if (!d) return "";
          const s = format(new Date(d.y[0]), "yyyy-MM-dd");
          const e = format(new Date(d.y[1]), "yyyy-MM-dd");
          const predLine = ""; // predictions disabled
          const rawNote =
            d.predicted && d.project !== d.projectRaw
              ? `
          <div style="margin-top:4px;color:#9fb3d9;font-size:12px;">Original project: ${d.projectRaw}</div>`
              : "";
          return `
          <div style="background:#101524;color:#eaf1ff;border:1px solid #3a4970;border-radius:10px;
                      box-shadow:0 8px 28px rgba(0,0,0,.35);padding:10px 12px;line-height:1.45;font-size:13px;max-width:420px;">
            <div style="font-weight:800;margin-bottom:6px;font-size:14px;">${
              d.employee || "Unknown"
            }</div>
            <div style="margin-bottom:4px;">
              <span style="color:#9fb3d9;font-weight:700;">Project:</span> ${
                d.project || "Unknown"
              }
              ${
                d.predicted
                  ? '<span style="background:#163a2b;border:1px solid #2b6d52;border-radius:6px;padding:2px 6px;margin-left:6px;font-size:11px;">predicted</span>'
                  : ""
              }
            </div>
            <div><span style="color:#9fb3d9;font-weight:700;">Dates:</span> ${s} → ${e}
              &nbsp; <span style="opacity:.85">(${
                d.durationDays
              } days)</span></div>
            ${predLine}${rawNote}
            <div style="margin-top:6px;color:#9fb3d9;font-size:12px;">Click the bar for details</div>
          </div>`;
        },
      },
      colors: ["#5ea1ff"],
      fill: { type: "solid" },
      grid: { borderColor: "#1f2942" },
      legend: { show: false },
    }),
    [
      CHART_ID,
      chartRange,
      effectiveGroup,
      navigateToEmployee,
      projectCategories,
      showLabels,
      minLabelDays,
      yLabelFontSize,
    ]
  );

  const visibleRowCount =
    effectiveGroup === "employee"
      ? new Set(filteredCapped.map((a) => a.employeeName)).size
      : new Set(filteredCapped.map((a) => a.projectName)).size;

  const dynamicHeight = useMemo(() => {
    const minH = 420,
      maxH = 3000,
      pad = 120;
    const calc = Math.round(visibleRowCount * rowDensity + pad);
    return Math.max(minH, Math.min(maxH, calc));
  }, [visibleRowCount, rowDensity]);

  const singleProject =
    selectedProjects.length === 1 ? selectedProjects[0] : null;
  const totalRowCount =
    effectiveGroup === "employee"
      ? new Set(filteredByProject.map((a) => a.employeeName)).size
      : new Set(filteredByProject.map((a) => a.projectName)).size;
  const showingRowCount =
    effectiveGroup === "employee"
      ? visibleRowCount
      : effectiveGroup === "project"
      ? new Set(visibleProjects).size
      : totalRowCount;

  const exportPNG = useCallback(async (mode) => {
    const isWhite = mode === "white";
    const to = isWhite
      ? {
          chart: { background: "#fff", foreColor: "#000" },
          xaxis: { labels: { style: { colors: "#000" } } },
          yaxis: { labels: { style: { colors: "#000" } } },
          dataLabels: { style: { colors: ["#000"] } },
        }
      : {
          chart: { background: "#0f1526", foreColor: "#cfe1ff" },
          xaxis: { labels: { style: { colors: "#cfe1ff" } } },
          yaxis: { labels: { style: { colors: "#cfe1ff" } } },
          dataLabels: { style: { colors: ["#e9eef7"] } },
        };
    await ApexCharts.exec(CHART_ID, "updateOptions", to, false, true);
    const { imgURI } = await ApexCharts.exec(CHART_ID, "dataURI");
    await ApexCharts.exec(
      CHART_ID,
      "updateOptions",
      {
        chart: { background: "#0f1526", foreColor: "#cfe1ff" },
        xaxis: { labels: { style: { colors: "#cfe1ff" } } },
        yaxis: { labels: { style: { colors: "#cfe1ff" } } },
        dataLabels: { style: { colors: ["#e9eef7"] } },
      },
      false,
      true
    );
    const a = document.createElement("a");
    a.href = imgURI;
    a.download = `Gantt_${mode}_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setExportOpen(false);
  }, []);

  const exportAssignmentsCSV = useCallback(() => {
    // Export pre-cap data: use assignmentsRaw
    const rows = (assignmentsRaw || []).map((a) => {
      const s = a.start instanceof Date ? a.start.toISOString() : "";
      const e = a.end instanceof Date ? a.end.toISOString() : "";
      const dur = a.start instanceof Date && a.end instanceof Date
        ? Math.max(1, Math.round((a.end.getTime() - a.start.getTime()) / MS_PER_DAY))
        : "";
      return [
        a.employee || "",
        a.employeeId ?? "",
        a.project || "",
        a.projectRaw || a.project || "",
        s,
        e,
        dur,
      ];
    });
    const header = [
      "employee",
      "employeeId",
      "project",
      "projectRaw",
      "startISO",
      "endISO",
      "durationDays",
    ];
    const toCSV = (vals) => vals.map((v) => {
      const s = String(v ?? "");
      // Escape quotes and wrap if needed
      const needsWrap = s.includes(",") || s.includes("\n") || s.includes('"');
      const esc = s.replace(/"/g, '""');
      return needsWrap ? '"' + esc + '"' : esc;
    }).join(",");
    const lines = [toCSV(header), ...rows.map(toCSV)].join("\n");
    const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Gantt_Assignments_${dateRangeStart}_to_${dateRangeEnd}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setExportOpen(false);
  }, [assignmentsRaw, dateRangeStart, dateRangeEnd]);

  const rightBlockContent = useMemo(() => {
    if (effectiveGroup === "employee") {
      return (
        <React.Fragment>
          <input
            className={styles.searchInput}
            placeholder="Search employee…"
            value={employeeQuery}
            onChange={(e) => {
              setEmployeeQuery(e.target.value);
              setPageIndex(0);
            }}
          />
          <div className={styles.controlRow}>
            <label className={styles.controlLabelSm}>Sort by</label>
            <select
              className={styles.select}
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPageIndex(0);
              }}
            >
              <option value="alpha">Alphabetical</option>
              <option value="startAsc">Earliest start (asc)</option>
              <option value="startDesc">Earliest start (desc)</option>
            </select>
          </div>
          <div className={styles.sliderRow}>
            <label className={styles.controlLabelSm}>
              Row density:{" "}
              <span className={styles.sliderValue}>{rowDensity}px/row</span>
            </label>
            <input
              className={styles.slider}
              type="range"
              min={16}
              max={36}
              step={1}
              value={rowDensity}
              onChange={(e) => setRowDensity(parseInt(e.target.value, 10))}
            />
          </div>
          <div className={styles.sliderRow}>
            <label className={styles.controlLabelSm}>
              Page size:{" "}
              <span className={styles.sliderValue}>{pageSize}</span>
            </label>
            <input
              className={styles.slider}
              type="range"
              min={20}
              max={200}
              step={10}
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPageIndex(0);
              }}
            />
          </div>
          <div className={styles.pagerRow}>
            <button
              className={styles.pagerBtn}
              disabled={pageIndex <= 0}
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            >
              ← Prev
            </button>
            <div className={styles.pagerInfo}>
              Page <strong>{pageIndex + 1}</strong> of <strong>{pageCount}</strong>
            </div>
            <button
              className={styles.pagerBtn}
              disabled={pageIndex >= pageCount - 1}
              onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next →
            </button>
          </div>
        </React.Fragment>
      );
    }
    return (
      <React.Fragment>
        <div className={styles.controlRow}>
          <label className={styles.controlLabelSm}>Sort rows (jobs)</label>
          <select
            className={styles.select}
            value={projectSort}
            onChange={(e) => {
              setProjectSort(e.target.value);
              setPageIndex(0);
            }}
          >
            <option value="alpha">Project A - Z</option>
            <option value="startAsc">Earliest start (asc)</option>
            <option value="startDesc">Earliest start (desc)</option>
          </select>
        </div>
        <div className={styles.sliderRow}>
          <label className={styles.controlLabelSm}>
            Row density:{" "}
            <span className={styles.sliderValue}>{rowDensity}px/row</span>
          </label>
          <input
            className={styles.slider}
            type="range"
            min={16}
            max={36}
            step={1}
            value={rowDensity}
            onChange={(e) => setRowDensity(parseInt(e.target.value, 10))}
          />
        </div>
        <div className={styles.sliderRow}>
          <label className={styles.controlLabelSm}>
            Page size:{" "}
            <span className={styles.sliderValue}>{pageSize}</span>
          </label>
          <input
            className={styles.slider}
            type="range"
            min={20}
            max={200}
            step={10}
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value, 10));
              setPageIndex(0);
            }}
          />
        </div>
        <div className={styles.pagerRow}>
          <button
            className={styles.pagerBtn}
            disabled={pageIndex <= 0}
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
          >
             Prev
          </button>
          <div className={styles.pagerInfo}>
            Page <strong>{pageIndex + 1}</strong> of <strong>{pageCount}</strong>
          </div>
          <button
            className={styles.pagerBtn}
            disabled={pageIndex >= pageCount - 1}
            onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next 
          </button>
        </div>
        <p className={styles.muted}>
          Legend moved to a modal. Use the "Legend" button.
        </p>
      </React.Fragment>
    );
  }, [effectiveGroup, employeeQuery, sortBy, rowDensity, pageSize, pageIndex, pageCount, projectSort]);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        {loadError && (
          <div role="alert" style={bannerStyle}>
            {loadError}
          </div>
        )}
        {loading && (
          <div
            style={{
              ...bannerStyle,
              background: "#1a2942",
              color: "#7dd3fc",
              border: "1px solid #3b82f6",
            }}
          >
            <div style={{ marginBottom: "8px" }}>
              <strong>{loadingProgress.status}</strong>
            </div>
            {loadingProgress.total > 0 && (
              <div
                style={{
                  background: "#0f1729",
                  borderRadius: "4px",
                  height: "8px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: "linear-gradient(90deg, #3b82f6, #06b6d4)",
                    height: "100%",
                    width: `${
                      (loadingProgress.current / loadingProgress.total) * 100
                    }%`,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            )}
            <div style={{ marginTop: "10px" }}>
              <button
                className={styles.smallBtn}
                onClick={() => {
                  try {
                    abortRef.current?.abort();
                  } catch {}
                  setLoading(false);
                  setLoadingProgress((p) => ({ ...p, status: "Loading stopped. Showing partial results." }));
                }}
              >
                Stop Loading • Show Partial Results
              </button>
            </div>
          </div>
        )}
        <div className={styles.headerTop}>
          <h1 className={styles.title}>
            Project Timeline (Gantt)
            {singleProject && (
              <span className={styles.pill}>Project: {singleProject}</span>
            )}
            <span className={styles.pillSecondary}>
              Grouping:{" "}
              {effectiveGroup === "project" ? "Projects" : "Employees"}
            </span>
            <span className={styles.pillSecondary}>
              Showing {showingRowCount} of {totalRowCount}{" "}
              {effectiveGroup === "project" ? "rows" : "employees"}
            </span>
            {capped && (
              <span className={styles.pillWarn}>
                Capped to {MAX_BARS.toLocaleString()} spans — refine filters to
                see more
              </span>
            )}
          </h1>
          <div className={styles.toolbar}>
            <button
              className={`${styles.toolbarBtn} ${styles.homeBtn}`}
              onClick={() => navigate("/home")}
              title="Go to Home"
            >
              <BsHouseDoor className={styles.homeIcon} /> Home
            </button>
            <div className={styles.exportWrap}>
              <button
                className={styles.toolbarBtn}
                onClick={() => setExportOpen((o) => !o)}
              >
                Export
              </button>
              {exportOpen && (
                <div
                  className={styles.exportMenu}
                  onMouseLeave={() => setExportOpen(false)}
                >
                  <button onClick={() => exportPNG("dark")}>
                    PNG – match dark UI
                  </button>
                  <button onClick={() => exportPNG("white")}>
                    PNG – white background & black text
                  </button>
                  <button onClick={exportAssignmentsCSV}>
                    CSV – full assignments (pre-cap)
                  </button>
                </div>
              )}
            </div>
            <button
              className={styles.toolbarBtn}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              {filtersOpen ? "Hide Filters" : "Show Filters"}
            </button>
            <button
              className={styles.toolbarBtn}
              onClick={() => setLegendOpen(true)}
              disabled={series[0].data.length === 0}
              title={
                series[0].data.length === 0 ? "Nothing to show" : "Open Legend"
              }
            >
              Legend
            </button>
          </div>
        </div>

        {filtersOpen && (
          <div className={styles.filtersPanel}>
            <div className={styles.controlsGrid}>
              <div className={styles.controlBlock}>
                <label className={styles.controlLabel}>Date Range</label>
                <div
                  className={styles.controlRow}
                  style={{ gap: "8px", marginBottom: "12px" }}
                >
                  <div style={{ flex: 1 }}>
                    <label className={styles.controlLabelSm}>Start Date</label>
                    <input
                      type="date"
                      className={styles.dateInput}
                      value={dateRangeStart}
                      onChange={(e) => setDateRangeStart(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px",
                        borderRadius: "4px",
                        background: "#1a2942",
                        border: "1px solid #3a4970",
                        color: "#eaf1ff",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className={styles.controlLabelSm}>End Date</label>
                    <input
                      type="date"
                      className={styles.dateInput}
                      value={dateRangeEnd}
                      onChange={(e) => setDateRangeEnd(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px",
                        borderRadius: "4px",
                        background: "#1a2942",
                        border: "1px solid #3a4970",
                        color: "#eaf1ff",
                      }}
                    />
                  </div>
                </div>
                <div className={styles.controlRow} style={{ gap: "8px", marginBottom: "12px" }}>
                  <button className={styles.smallBtn} onClick={() => {
                    const now = new Date();
                    setMonthRange(now.getFullYear(), now.getMonth() - 1);
                  }}>Prev Month</button>
                  <button className={styles.smallBtn} onClick={() => {
                    const now = new Date();
                    setMonthRange(now.getFullYear(), now.getMonth());
                  }}>This Month</button>
                  <button className={styles.smallBtn} onClick={() => {
                    const now = new Date();
                    setMonthRange(now.getFullYear(), now.getMonth() + 1);
                  }}>Next Month</button>
                  <button className={styles.smallBtn} onClick={() => setMonthRange(2025, 10)} title="Set range to November 2025">November 2025</button>
                </div>
                {/* Info (sort rows) remains in the right column */}
                <div
                  style={{
                    fontSize: "12px",
                    color: "#9fb3d9",
                    marginBottom: "16px",
                  }}
                >
                  Narrow the date range to load faster. Currently:{" "}
                  {timecards.length.toLocaleString()} timecards loaded.
                  {timecards.length >= MAX_PAGES * PAGE_SIZE && (
                    <span
                      style={{
                        color: "#fbbf24",
                        display: "block",
                        marginTop: "4px",
                      }}
                    >
                      ⚠ Hit {MAX_PAGES * PAGE_SIZE} record limit. Narrow date
                      range for complete data.
                    </span>
                  )}
                </div>

                {effectiveGroup !== "employee" && (
                  <div className={styles.controlBlock} style={{ marginTop: 8 }}>
                    <label className={styles.controlLabel}>Info</label>
                    {rightBlockContent}
                  </div>
                )}
              </div>

              <div
                className={`${styles.controlBlock} ${styles.controlBlockTall}`}
              >
                <label className={styles.controlLabel}>Projects</label>
                <select
                  className={`${styles.multi} ${styles.multiTall}`}
                  multiple
                  size={Math.min(18, Math.max(10, allProjects.length))}
                  value={selectedProjects}
                  onChange={(e) =>
                    setSelectedProjects(
                      Array.from(e.target.selectedOptions).map((o) => o.value)
                    )
                  }
                >
                  {allProjects.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <div
                  className={`${styles.controlRow} ${styles.controlRowStickBottom}`}
                >
                  <button
                    className={styles.smallBtn}
                    onClick={() => setSelectedProjects([])}
                  >
                    Clear
                  </button>
                  <button
                    className={styles.smallBtn}
                    onClick={() => setSelectedProjects(allProjects)}
                  >
                    Select All
                  </button>
                </div>
              </div>
              <div className={styles.controlBlock}>
                <label className={styles.controlLabel}>Grouping</label>
                <div className={styles.checkboxRow}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={autoGroup}
                      onChange={(e) => setAutoGroup(e.target.checked)}
                    />
                    Auto group (Employees when a single project is selected)
                  </label>
                </div>
                <div className={styles.segment} aria-disabled={autoGroup}>
                  <button
                    className={`${styles.segmentBtn} ${
                      !autoGroup && groupMode === "project"
                        ? styles.segmentActive
                        : ""
                    }`}
                    onClick={() => !autoGroup && setGroupMode("project")}
                    disabled={autoGroup}
                  >
                    Project
                  </button>
                  <button
                    className={`${styles.segmentBtn} ${
                      !autoGroup && groupMode === "employee"
                        ? styles.segmentActive
                        : ""
                    }`}
                    onClick={() => !autoGroup && setGroupMode("employee")}
                    disabled={autoGroup}
                  >
                    Employee
                  </button>
                </div>
                <div className={styles.checkboxRow}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={showLabels}
                      onChange={(e) => setShowLabels(e.target.checked)}
                    />
                    Show labels on bars
                  </label>
                </div>
                <div className={styles.sliderRow}>
                  <label className={styles.controlLabelSm}>
                    Min days to show a label:{" "}
                    <span className={styles.sliderValue}>{minLabelDays}</span>
                  </label>
                  <div className={styles.sliderPack}>
                    <input
                      className={styles.slider}
                      type="range"
                      min={MIN_DAYS_MIN}
                      max={MIN_DAYS_MAX}
                      step={1}
                      value={minLabelDays}
                      onChange={onMinDaysSlider}
                      disabled={!showLabels}
                    />
                    <input
                      className={styles.numberInput}
                      type="number"
                      min={MIN_DAYS_MIN}
                      max={MIN_DAYS_MAX}
                      step={1}
                      value={minLabelDaysInput}
                      onChange={onMinDaysInputChange}
                      onBlur={commitMinDaysInput}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      disabled={!showLabels}
                      aria-label="Min days numeric input"
                    />
                  </div>
                </div>
              </div>
              {effectiveGroup === "employee" && (
                <div className={styles.controlBlock}>
                  <label className={styles.controlLabel}>Employees (visible rows)</label>
                  {rightBlockContent}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingScreen />
      ) : (
        <>
          <div className={styles.layout}>
            <div className={styles.chartCol}>
              {series[0].data.length === 0 ? (
                <p className={styles.noData}>
                  No timeline data yet. Import timecards or add transfer
                  history.
                </p>
              ) : !chartReady ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#7dd3fc" }}>
                  <div style={{ marginBottom: "12px", fontSize: "16px" }}>Preparing chart...</div>
                  <div style={{ fontSize: "14px", opacity: 0.7 }}>
                    {series[0]?.data?.length || 0} assignments ready to display
                  </div>
                </div>
              ) : (
                <div className={styles.chartScroll}>
                  <Chart
                    options={options}
                    series={series}
                    type="rangeBar"
                    height={dynamicHeight}
                  />
                </div>
              )}
            </div>

            <div className={styles.sidebar}>
              <h2 className={styles.sidebarTitle}>Overlaps</h2>
              {overlaps.length === 0 ? (
                <p className={styles.ok}>No overlaps detected.</p>
              ) : (
                <React.Fragment>
                  <ul className={styles.overlapList}>
                    {overlaps.map((o, idx) => (
                      <li key={idx} className={styles.overlapItem}>
                        <div className={styles.emp}>{o.employee}</div>
                        <div className={styles.pair}>
                          <span className={styles.projectA}>{o.a.project}</span>
                          <span className={styles.dates}>
                            {format(o.a.start, "yyyy-MM-dd")} {"\u2192"}{" "}
                            {format(o.a.end, "yyyy-MM-dd")}
                          </span>
                        </div>
                        <div className={styles.pair}>
                          <span className={styles.projectB}>{o.b.project}</span>
                          <span className={styles.dates}>
                            {format(o.b.start, "yyyy-MM-dd")} {"\u2192"}{" "}
                            {format(o.b.end, "yyyy-MM-dd")}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </React.Fragment>
              )}
              <div className={styles.metaBox}>
                <div>
                  <strong>Total assignments shown:</strong>{" "}
                  {filteredCapped.length}
                  {capped ? ` (capped at ${MAX_BARS.toLocaleString()})` : ""}
                </div>
                <div>
                  <strong>Employees:</strong> {allEmployees.length}
                </div>
                <div>
                  <strong>Projects:</strong> {allProjects.length}
                </div>
              </div>
            </div>
          </div>

          {legendOpen && (
            <LegendModal
              items={Array.from(
                new Set(filteredCapped.map((a) => a.employeeName))
              )
                .sort((a, b) => a.localeCompare(b))
                .map((n) => ({ name: n, color: hashColor(n) }))}
              onClose={() => setLegendOpen(false)}
            />
          )}
        </>
      )}

      <Footer rightSlot={<span>Gantt View</span>} />
    </div>
  );
}
