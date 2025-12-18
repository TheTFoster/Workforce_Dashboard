// front-end/src/components/KPIDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import Footer from "./Footer";
import styles from "../stylesheets/KPIDashboard.module.css";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  FaUsers,
  FaProjectDiagram,
  FaExchangeAlt,
  FaClock,
  FaBell,
} from "react-icons/fa";
import { MdDashboard } from "react-icons/md";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
];

const statusColor = (name, index) => {
  if (name && name.toLowerCase().includes("term")) return "#e74c3c"; // red for terminated
  return COLORS[index % COLORS.length];
};

export default function KPIDashboard() {
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectSort, setProjectSort] = useState({
    key: "activeCount",
    dir: "desc",
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchKPIData();
  }, []);

  const fetchKPIData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/api/v1/kpis/dashboard", {
        withCredentials: true,
      });
      setKpiData(response.data);
    } catch (err) {
      console.error("Error fetching KPI data:", err);
      setError("Failed to load KPI data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const employeeMetrics = kpiData?.employeeMetrics || {
    statusBreakdown: {},
    totalEmployees: 0,
    activeEmployees: 0,
    activeLeasedLabor: 0,
    activeDirectHire: 0,
    inactiveEmployees: 0,
    onLeaveEmployees: 0,
    newHiresThisMonth: 0,
    newHiresThisYear: 0,
    leasedLaborCount: 0,
    directHireCount: 0,
  };

  const projectDistribution = kpiData?.projectDistribution || [];
  const projectHoursTotal =
    kpiData?.projectHoursTotal ??
    projectDistribution.reduce(
      (sum, project) => sum + (project.totalHours || 0),
      0
    );
  const projectHoursStartDate = kpiData?.projectHoursStartDate;
  const projectHoursEndDate = kpiData?.projectHoursEndDate;
  const transferAnalytics = kpiData?.transferAnalytics || {
    totalTransfers: 0,
    transfersThisMonth: 0,
    transfersThisYear: 0,
    pendingTransfers: 0,
    recentTransfers: [],
  };
  const timecardInsights = kpiData?.timecardInsights || {
    totalTimecardEntries: 0,
    entriesThisMonth: 0,
    entriesThisWeek: 0,
    averageHoursPerWeek: 0,
    uniqueEmployeesWithTimecards: 0,
  };
  const alertSummary = kpiData?.alertSummary || {
    totalAlerts: 0,
    openAlerts: 0,
    resolvedAlerts: 0,
  };
  const trendData = kpiData?.trendData || {
    hiringTrend: [],
    terminationTrend: [],
    transferTrend: [],
  };

  // Prepare chart data

  // Custom tooltip for trend charts
  const tooltipContainerStyle = {
    background: "#222",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: 8,
    padding: "12px 18px",
    fontSize: 16,
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    minWidth: 150,
  };

  const tooltipLabelStyle = { fontWeight: 600, marginBottom: 6 };

  const tooltipRowStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return null;
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    return parsed.toLocaleDateString();
  };

  const formatHours = (value) =>
    Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

  const projectHoursRangeText = useMemo(() => {
    const start = formatDateLabel(projectHoursStartDate);
    const end = formatDateLabel(projectHoursEndDate);

    if (start && end) return `${start} to ${end}`;
    if (start || end) return start || end;
    return null;
  }, [projectHoursStartDate, projectHoursEndDate]);

  const TrendTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={tooltipContainerStyle}>
          <div style={tooltipLabelStyle}>{label}</div>
          {payload.map((item) => {
            const color = item.stroke || item.color || "#00C49F";
            return (
              <div
                key={item.dataKey}
                style={{ ...tooltipRowStyle, justifyContent: "space-between" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      background: color,
                      borderRadius: 2,
                    }}
                  />
                  <span style={{ color, fontWeight: 600 }}>
                    {item.name || item.dataKey}:
                  </span>
                </div>
                <span>{Number(item.value || 0).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const ProjectTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const scopedPayload = payload[0]?.payload || {};
      const totalHours = scopedPayload.totalHours;
      const displayLabel = scopedPayload.fullProjectName || label;
      return (
        <div style={tooltipContainerStyle}>
          <div style={tooltipLabelStyle}>{displayLabel}</div>
          {totalHours !== undefined && (
            <div
              style={{ ...tooltipRowStyle, justifyContent: "space-between" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    background: "#1890ff",
                    borderRadius: 2,
                  }}
                />
                <span style={{ color: "#1890ff", fontWeight: 600 }}>
                  Total Hours:
                </span>
              </div>
              <span>{formatHours(totalHours)}</span>
            </div>
          )}
          {payload.map((item) => {
            const color = item.fill || item.color || "#00C49F";
            return (
              <div
                key={item.dataKey}
                style={{ ...tooltipRowStyle, justifyContent: "space-between" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      background: color,
                      borderRadius: 2,
                    }}
                  />
                  <span style={{ color, fontWeight: 600 }}>{item.name}:</span>
                </div>
                <span>{Number(item.value || 0).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };
  const statusPieData = Object.entries(
    employeeMetrics.statusBreakdown || {}
  ).map(([name, value]) => ({
    name,
    value,
  }));

  // Custom label renderer for pie chart to avoid overlapping
  const renderCustomLabel = (entry) => {
    return `${entry.name}: ${(entry.percent * 100).toFixed(0)}%`;
  };

  const projectBarData = (projectDistribution || [])
    .slice() // copy to avoid mutating props
    .sort((a, b) => b.activeCount - a.activeCount)
    .slice(0, 10)
    .map((p) => {
      const name = p.projectName || "Unassigned";
      return {
        project: name.length > 15 ? name.substring(0, 15) + "..." : name,
        fullProjectName: name,
        Active: p.activeCount,
        Inactive: p.inactiveCount,
        totalHours: p.totalHours || 0,
      };
    });

  const sortedProjects = useMemo(() => {
    if (!projectDistribution) return [];
    const dir = projectSort.dir === "asc" ? 1 : -1;
    return [...projectDistribution].sort((a, b) => {
      const key = projectSort.key;
      const aVal = a?.[key] ?? 0;
      const bVal = b?.[key] ?? 0;
      if (typeof aVal === "string") {
        return aVal.localeCompare(String(bVal)) * dir;
      }
      return (Number(aVal) - Number(bVal)) * dir;
    });
  }, [projectDistribution, projectSort]);

  const toggleSort = (key) => {
    setProjectSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "desc" };
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <p>{error}</p>
          <button onClick={fetchKPIData} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!kpiData) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>
          <MdDashboard /> KPI Dashboard
        </h1>
        <button onClick={fetchKPIData} className={styles.refreshButton}>
          Refresh
        </button>
      </div>

      {/* Employee Metrics */}
      <section className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <h2>
            <FaUsers className={styles.sectionIcon} /> Employee Metrics
          </h2>
          <button className={styles.sectionButton} onClick={() => navigate("/")}>
            Employees
          </button>
        </div>
        <div className={styles.cardGrid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Total Active (CEC + LL)</div>
            <div className={styles.cardValue} style={{ color: "#00C49F" }}>
              {employeeMetrics.activeEmployees.toLocaleString()}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Active Direct Hire</div>
            <div className={styles.cardValue} style={{ color: "#00C49F" }}>
              {employeeMetrics.activeDirectHire.toLocaleString()}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Active Leased Labor</div>
            <div className={styles.cardValue} style={{ color: "#00C49F" }}>
              {employeeMetrics.activeLeasedLabor.toLocaleString()}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Inactive</div>
            <div className={styles.cardValue} style={{ color: "#FF8042" }}>
              {employeeMetrics.inactiveEmployees.toLocaleString()}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>On Leave</div>
            <div className={styles.cardValue} style={{ color: "#FFBB28" }}>
              {employeeMetrics.onLeaveEmployees.toLocaleString()}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>New Hires (This Month)</div>
            <div className={styles.cardValue}>
              {employeeMetrics.newHiresThisMonth.toLocaleString()}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>New Hires (This Year)</div>
            <div className={styles.cardValue}>
              {employeeMetrics.newHiresThisYear.toLocaleString()}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Total Employees (CEC + LL)</div>
            <div className={styles.cardValue}>
              {employeeMetrics.totalEmployees.toLocaleString()}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Leased Labor</div>
            <div className={styles.cardValue}>
              {employeeMetrics.leasedLaborCount.toLocaleString()}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Direct Hire</div>
            <div className={styles.cardValue}>
              {employeeMetrics.directHireCount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Status Breakdown Pie Chart */}
        {statusPieData.length > 0 && (
          <div className={styles.chartContainer}>
            <h3>Employee Status Distribution</h3>
            <ResponsiveContainer width="100%" height={450}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={statusColor(entry.name, index)}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry) =>
                    `${value} (${entry.payload.value.toLocaleString()})`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Project Distribution */}
      <section className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <h2>
            <FaProjectDiagram className={styles.sectionIcon} /> Project
            Distribution
          </h2>
          <button
            className={styles.sectionButton}
            onClick={() => navigate("/reports")}
          >
            Projects
          </button>
        </div>
        <p style={{ color: "#f6c200", marginBottom: "1rem", fontWeight: 800 }}>
          Showing top 10 projects by entries. Hours reflect timecard data
          {projectHoursRangeText ? ` from ${projectHoursRangeText}` : ""}.
          Total hours across all projects:{" "}
          <strong>{formatHours(projectHoursTotal)}</strong>.
        </p>
        {projectBarData.length > 0 && (
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={projectBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="project"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip content={<ProjectTooltip />} />
                <Legend />
                <Bar dataKey="Active" fill="#00C49F" />
                <Bar dataKey="Inactive" fill="#FF8042" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {sortedProjects.length > 0 && (
          <div className={styles.tableContainer}>
            <h3>All Projects ({sortedProjects.length} total)</h3>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th onClick={() => toggleSort("projectName")}>
                      Project Name
                    </th>
                    <th onClick={() => toggleSort("activeCount")}>
                      Active Entries
                    </th>
                    <th onClick={() => toggleSort("inactiveCount")}>
                      Inactive Entries
                    </th>
                    <th onClick={() => toggleSort("employeeCount")}>
                      Total Entries
                    </th>
                    <th onClick={() => toggleSort("totalHours")}>
                      Total Hours
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProjects.map((project, idx) => (
                    <tr key={idx}>
                      <td>{project.projectName}</td>
                      <td>{project.activeCount.toLocaleString()}</td>
                      <td>{project.inactiveCount.toLocaleString()}</td>
                    <td>
                      <strong>
                        {project.employeeCount.toLocaleString()}
                      </strong>
                    </td>
                    <td>{formatHours(project.totalHours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        )}
      </section>

      {/* Transfer Analytics */}
      <section className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <h2>
            <FaExchangeAlt className={styles.sectionIcon} /> Transfer Analytics
          </h2>
          <button
            className={styles.sectionButton}
            onClick={() => navigate("/transfers")}
          >
            Transfers
          </button>
        </div>
        <div className={styles.cardGrid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Total Transfers</div>
            <div className={styles.cardValue}>
              {transferAnalytics.totalTransfers.toLocaleString()}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>This Month</div>
            <div className={styles.cardValue}>
              {transferAnalytics.transfersThisMonth.toLocaleString()}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>This Year</div>
            <div className={styles.cardValue}>
              {transferAnalytics.transfersThisYear.toLocaleString()}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Pending</div>
            <div className={styles.cardValue} style={{ color: "#FFBB28" }}>
              {transferAnalytics.pendingTransfers.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Recent Transfers Table */}
        {transferAnalytics.recentTransfers &&
          transferAnalytics.recentTransfers.length > 0 && (
            <div className={styles.tableContainer}>
              <h3>Recent Transfers</h3>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>From Project</th>
                    <th>To Project</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transferAnalytics.recentTransfers
                    .slice(0, 10)
                    .map((transfer, idx) => (
                      <tr key={idx}>
                        <td>
                          {transfer.employeeName ||
                            `ID: ${transfer.employeeId}`}
                        </td>
                        <td>{transfer.fromProject || "N/A"}</td>
                        <td>{transfer.toProject || "N/A"}</td>
                        <td>
                          {transfer.transferDate
                            ? new Date(
                                transfer.transferDate
                              ).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td>
                          <span
                            className={`${styles.badge} ${
                              styles[transfer.status?.toLowerCase()]
                            }`}
                          >
                            {transfer.status || "Unknown"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
      </section>

      {/* Timecard Insights */}
      <section className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <h2>
            <FaClock className={styles.sectionIcon} /> Timecard Insights
          </h2>
          <button
            className={styles.sectionButton}
            onClick={() => navigate("/timecards")}
          >
            Timecards
          </button>
        </div>
        <div className={styles.cardGrid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Total Entries</div>
            <div className={styles.cardValue}>
              {timecardInsights.totalTimecardEntries.toLocaleString()}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Entries This Month</div>
            <div className={styles.cardValue}>
              {timecardInsights.entriesThisMonth.toLocaleString()}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Entries This Week</div>
            <div className={styles.cardValue}>
              {timecardInsights.entriesThisWeek.toLocaleString()}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Avg Hours Last 30 days</div>
            <div className={styles.cardValue}>
              {timecardInsights.averageHoursPerWeek
                ? timecardInsights.averageHoursPerWeek.toFixed(1)
                : "0.0"}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Employees Tracked</div>
            <div className={styles.cardValue}>
              {timecardInsights.uniqueEmployeesWithTimecards.toLocaleString()}
            </div>
          </div>
        </div>
      </section>

      {/* Alert Summary */}
      <section className={styles.section}>
        <h2>
          <FaBell className={styles.sectionIcon} /> Alert Summary
        </h2>
        <div className={styles.cardGrid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Total Alerts</div>
            <div className={styles.cardValue}>
              {alertSummary.totalAlerts.toLocaleString()}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Open Alerts</div>
            <div className={styles.cardValue} style={{ color: "#0088FE" }}>
              {alertSummary.openAlerts.toLocaleString()}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Critical</div>
            <div className={styles.cardValue} style={{ color: "#FF0000" }}>
              {alertSummary.criticalAlerts.toLocaleString()}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Warnings</div>
            <div className={styles.cardValue} style={{ color: "#FFBB28" }}>
              {alertSummary.warningAlerts.toLocaleString()}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Resolved Today</div>
            <div className={styles.cardValue}>
              {alertSummary.resolvedToday.toLocaleString()}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Resolved This Week</div>
            <div className={styles.cardValue}>
              {alertSummary.resolvedThisWeek.toLocaleString()}
            </div>
          </div>
        </div>
      </section>

      {/* Trends */}
      <section className={styles.section}>
        <h2>Trends (Last 6 Months)</h2>

        {trendData.hiringTrend && trendData.hiringTrend.length > 0 && (
          <div className={styles.chartContainer}>
            <h3 style={{ color: "#00C49F" }}>Hiring Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData.hiringTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<TrendTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="professionalCount"
                  stroke="#0088FE"
                  strokeWidth={2}
                  name="Professional"
                />
                <Line
                  type="monotone"
                  dataKey="fieldCount"
                  stroke="#00C49F"
                  strokeWidth={2}
                  name="Field"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {trendData.terminationTrend &&
          trendData.terminationTrend.length > 0 && (
            <div className={styles.chartContainer}>
                <h3 style={{ color: "#e74c3c" }}>Termination Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData.terminationTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip content={<TrendTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="professionalCount"
                    stroke="#0088FE"
                    strokeWidth={2}
                    name="Professional"
                  />
                  <Line
                    type="monotone"
                    dataKey="fieldCount"
                    stroke="#00C49F"
                    strokeWidth={2}
                    name="Field"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

        {trendData.transferTrend && trendData.transferTrend.length > 0 && (
          <div className={styles.chartContainer}>
            <h3 style={{ color: "#FFBB28" }}>Transfer Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData.transferTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<TrendTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="professionalCount"
                  stroke="#0088FE"
                  strokeWidth={2}
                  name="Professional"
                />
                <Line
                  type="monotone"
                  dataKey="fieldCount"
                  stroke="#00C49F"
                  strokeWidth={2}
                  name="Field"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}
