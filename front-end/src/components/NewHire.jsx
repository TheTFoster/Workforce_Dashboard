// src/components/NewHire.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import styles from "../stylesheets/Transfers.module.css";
import { toast } from "react-toastify";
import { BsArrowLeftRight, BsArrowUp } from "react-icons/bs";
import { CgCloseR } from "react-icons/cg";

const EMP_DETAILS_BATCH_URL = "/api/v1/employee/details-by-emp";

function toDate(d) {
  if (!d) return null;
  // If it's an ISO date string (YYYY-MM-DD), parse as local midnight
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) {
    const [y, m, day] = d.trim().split('-').map(Number);
    return new Date(y, m - 1, day); // month is 0-indexed
  }
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

function formatDate(d) {
  const dt = toDate(d);
  if (!dt) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getCI(obj, ...candidates) {
  if (!obj || typeof obj !== "object") return null;
  const norm = (s) => String(s).replace(/[\s_\-]/g, "").toLowerCase();
  const index = Object.keys(obj).reduce((m, k) => {
    const nk = norm(k);
    if (!m[nk]) m[nk] = k;
    return m;
  }, {});
  for (const c of candidates) {
    const k = index[norm(c)];
    if (k != null) {
      const v = obj[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
  }
  return null;
}

const getPay = (obj) => {
  if (!obj) return { rate: null, type: null };
  const rate = getCI(obj, "rate_hourly", "rateHourly", "rate1", "hourlyRate", "payRate", "wage") ?? null;
  const typeRaw = getCI(obj, "rate_type", "payType", "pay_type") ?? null;
  let type = typeRaw != null ? String(typeRaw) : null;
  if (type && /^(unknown|n\/?a|none|-|—)$/i.test(type.trim().toLowerCase())) type = null;
  return { rate, type };
};

function normKey(v) {
  return v ? String(v).replace(/\s+/g, "").toUpperCase() : "";
}

function currency(v) {
  const n = Number(v);
  if (!isFinite(n)) return String(v ?? "");
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

export default function NewHires() {
  const navigate = useNavigate();
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [filters, setFilters] = useState({ search: "", status: "", jobTitle: "", supervisor: "", startDate: "", endDate: "" });
  const [sortConfig, setSortConfig] = useState({ key: "hire_date", direction: "desc" });
  const [editingRow, setEditingRow] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);
  const [empDetailsByCode, setEmpDetailsByCode] = useState({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const tableWrapRef = useRef(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDraft, setAddDraft] = useState({});
  const [savingAdd, setSavingAdd] = useState(false);
  const [addError, setAddError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      setLoading(true);
      setFetchError(null);
      try {
        console.log("[NewHire] Fetching transfers data...");
        
        // Fetch transfers data
        const transfersResp = await api.get("/api/v1/transfers");
        
        if (!mounted) return;
        
        console.log("[NewHire] Transfers response:", transfersResp.data);
        
        let transfers = Array.isArray(transfersResp.data) ? transfersResp.data : 
                       Array.isArray(transfersResp.data?.content) ? transfersResp.data.content :
                       Array.isArray(transfersResp.data?.data) ? transfersResp.data.data : [];
        
        console.log("[NewHire] Total transfers:", transfers.length);
        
        // Filter for transfers where from_jobsite (Current Jobsite) contains "new hire" (case insensitive)
        transfers = transfers.filter((transfer) => {
          const fromJobsite = transfer.from_jobsite || transfer.fromJobsite || transfer.from_jobsite_key || "";
          const matches = /new\s*hire/i.test(String(fromJobsite));
          if (matches) {
            console.log("[NewHire] Matched transfer:", transfer);
          }
          return matches;
        });

        console.log("[NewHire] Filtered new hires:", transfers.length);
        
        // Fetch employee details for all the employee codes from transfers
        const codes = Array.from(
          new Set(
            transfers
              .map((t) => normKey(t.emp_code || t.empCode || t.employee_code || ""))
              .filter(Boolean)
          )
        );
        
        console.log("[NewHire] Requesting employee details for codes:", codes);
        
        let detailsMap = {};
        if (codes.length > 0) {
          try {
            const detailsResp = await api.post(
              EMP_DETAILS_BATCH_URL,
              { empCodes: codes },
              { withCredentials: true, headers: { "Content-Type": "application/json" } }
            );
            
            const results = detailsResp.data?.results || detailsResp.data || {};
            console.log("[NewHire] Employee details response:", results);
            
            Object.entries(results).forEach(([rawCode, dto]) => {
              const code = normKey(rawCode);
              if (code) {
                detailsMap[code] = dto;
              }
            });
            
            setEmpDetailsByCode(detailsMap);
          } catch (err) {
            console.warn("[NewHire] Failed to fetch employee details:", err);
          }
        }

        // Map to consistent structure
        let rows = transfers.map((transfer) => {
          // Get employee details
          const empCode = normKey(transfer.emp_code || transfer.empCode || transfer.employee_code || "");
          const details = detailsMap[empCode];
          
          if (empCode && !details) {
            console.log("[NewHire] No details for code:", empCode);
          } else if (details) {
            console.log("[NewHire] Found details for code:", empCode, "Supervisor:", details.supervisor || details.supervisorPrimary || details.supervisor_primary);
          }
          
          // Name might be in emp_name as "Last, First" or "First Last" format
          const fullName = transfer.emp_name || transfer.employee_name || "";
          let firstName = transfer.first_name || transfer.firstName || "";
          let lastName = transfer.last_name || transfer.lastName || "";
          
          // If name fields are empty but we have emp_name, try to parse it
          if (!firstName && !lastName && fullName) {
            const nameParts = fullName.split(/[,\s]+/).filter(Boolean);
            if (nameParts.length >= 2) {
              // Check if it's "Last, First" format (has comma)
              if (fullName.includes(',')) {
                lastName = nameParts[0];
                firstName = nameParts.slice(1).join(' ');
              } else {
                // Assume "First Last" format
                firstName = nameParts[0];
                lastName = nameParts.slice(1).join(' ');
              }
            } else if (nameParts.length === 1) {
              lastName = nameParts[0];
            }
          }
          
          // Get supervisor from employee details
          const supervisor = details ? (
            getCI(details, 
              "supervisor", "supervisorPrimary", "supervisor_primary", "supervisor_1", "supervisor1",
              "supervisor_name", "supervisorName",
              "manager", "manager_name", "managerName"
            ) || ""
          ) : "";
          
          return {
            employee_id: transfer.emp_code || transfer.empCode || transfer.employee_code || transfer.employeeCode || "",
            first_name: firstName,
            last_name: lastName,
            job_title: transfer.classification || transfer.job_title || transfer.jobTitle || "",
            supervisor: supervisor,
            current_jobsite: transfer.to_jobsite || transfer.toJobsite || transfer.to_jobsite_key || transfer.project || "",
            status: transfer.transfer_status || transfer.status || "Active",
            hire_date: transfer.effective_date || transfer.effectiveDate || transfer.eff_key || "",
            transfer_id: transfer.transfer_id || transfer.transferId || transfer.id,
            _details: details,
            _transfer: transfer
          };
        });
        
        console.log("[NewHire] Mapped rows:", rows);
        setRawData(rows);
      } catch (err) {
        if (!mounted) return;
        console.error("[NewHire] Fetch error:", err);
        setFetchError(err.message || "Failed to fetch new hires");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Check both window scroll and table wrapper scroll
      const windowScrolled = window.scrollY > 700;
      const tableScrolled = tableWrapRef.current ? tableWrapRef.current.scrollTop > 700 : false;
      const shouldShow = windowScrolled || tableScrolled;
      
      if (shouldShow !== showScrollTop) {
        setShowScrollTop(shouldShow);
      }
    };

    // Listen to both window and table wrapper scroll
    window.addEventListener('scroll', handleScroll);
    const tableWrap = tableWrapRef.current;
    if (tableWrap) {
      tableWrap.addEventListener('scroll', handleScroll);
    }
    
    // Check initial state
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (tableWrap) {
        tableWrap.removeEventListener('scroll', handleScroll);
      }
    };
  }, [showScrollTop]);

  const scrollToTop = () => {
    // Scroll both the window and the table wrapper to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (tableWrapRef.current) {
      tableWrapRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const filteredData = useMemo(() => {
    let out = [...rawData];
    if (filters.search) {
      const lower = filters.search.toLowerCase();
      out = out.filter((row) => [row.first_name, row.last_name, row.employee_id, row.job_title, row.supervisor, row.current_jobsite].some(f => String(f || "").toLowerCase().includes(lower)));
    }
    if (filters.status) out = out.filter((r) => normKey(r.status || r.employeeStatus) === normKey(filters.status));
    if (filters.jobTitle) out = out.filter((r) => normKey(r.job_title).includes(normKey(filters.jobTitle)));
    if (filters.supervisor) out = out.filter((r) => normKey(r.supervisor).includes(normKey(filters.supervisor)));
    if (filters.startDate || filters.endDate) {
      const sd = toDate(filters.startDate);
      const ed = toDate(filters.endDate);
      out = out.filter((r) => {
        const hd = toDate(r.hire_date);
        return hd && (!sd || hd >= sd) && (!ed || hd <= ed);
      });
    }
    return out;
  }, [rawData, filters]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (sortConfig.key === "pay_rate") {
        const aPay = getPay(a._details)?.rate ?? 0;
        const bPay = getPay(b._details)?.rate ?? 0;
        return Number(aPay) - Number(bPay);
      }
      if (sortConfig.key.includes("date")) {
        const ad = toDate(aVal);
        const bd = toDate(bVal);
        if (!ad && !bd) return 0;
        // Always push blank dates to the end, regardless of sort direction
        if (!ad) return 1;
        if (!bd) return -1;
        const comparison = ad.getTime() - bd.getTime();
        return sortConfig.direction === "desc" ? -comparison : comparison;
      }
      aVal = String(aVal || "").toLowerCase();
      bVal = String(bVal || "").toLowerCase();
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortConfig.direction === "desc" ? -comparison : comparison;
    });
    return sorted;
  }, [filteredData, sortConfig]);

  const uniqueStatuses = useMemo(() => Array.from(new Set(rawData.map(r => r.status || r.employeeStatus).filter(Boolean))).sort(), [rawData]);
  const uniqueJobTitles = useMemo(() => Array.from(new Set(rawData.map(r => r.job_title).filter(Boolean))).sort(), [rawData]);
  const uniqueSupervisors = useMemo(() => Array.from(new Set(rawData.map(r => r.supervisor).filter(Boolean))).sort(), [rawData]);

  const handleSort = (key) => setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc" }));
  const handleFilterChange = (field, value) => setFilters((prev) => ({ ...prev, [field]: value }));
  const handleClearFilters = () => setFilters({ search: "", status: "", jobTitle: "", supervisor: "", startDate: "", endDate: "" });
  const handleRowClick = (row) => row.employee_id && navigate(`/employee-details/${row.employee_id}`);
  const handleEditClick = (e, row) => { e.stopPropagation(); setEditingRow(row); setEditDraft({ ...row }); setEditError(null); };
  const handleEditCancel = () => { setEditingRow(null); setEditDraft({}); setEditError(null); };
  const handleEditChange = (field, value) => setEditDraft((prev) => ({ ...prev, [field]: value }));

  const handleAddNewHire = () => {
    setAddDraft({
      employee_id: "",
      first_name: "",
      last_name: "",
      job_title: "",
      supervisor: "",
      current_jobsite: "",
      status: "Active",
      hire_date: "",
      rate_hourly: "",
      rate_type: "hourly"
    });
    setAddError(null);
    setShowAddModal(true);
  };

  const handleAddCancel = () => {
    setShowAddModal(false);
    setAddDraft({});
    setAddError(null);
  };

  const handleAddChange = (field, value) => {
    setAddDraft((prev) => ({ ...prev, [field]: value }));
  };

  async function handleAddSave() {
    if (!addDraft.employee_id || !addDraft.first_name || !addDraft.last_name) {
      setAddError("CEC ID, First Name, and Last Name are required");
      return;
    }
    
    if (!addDraft.current_jobsite) {
      setAddError("Jobsite Being Assigned To is required");
      return;
    }

    setSavingAdd(true);
    setAddError(null);
    try {
      // Create a new transfer record with from_jobsite = "new hire"
      const transferPayload = {
        empCode: addDraft.employee_id,
        empName: `${addDraft.last_name}, ${addDraft.first_name}`,
        classification: addDraft.job_title || null,
        fromJobsite: "new hire",
        toJobsite: addDraft.current_jobsite,
        effectiveDate: addDraft.hire_date || new Date().toISOString().split('T')[0],
        transferStatus: addDraft.status || "Active"
      };

      const response = await api.post("/api/v1/transfers", transferPayload);
      
      // Also save pay info to Employee record if provided
      if (addDraft.rate_hourly) {
        const employeePayload = {
          rate1: parseFloat(addDraft.rate_hourly),
          payType: addDraft.rate_type || "hourly"
        };
        try {
          await api.put(`/api/v1/employees/byCode/${addDraft.employee_id}`, employeePayload);
        } catch (err) {
          console.warn("Failed to save pay info to employee record:", err);
        }
      }
      
      // Add to the local state
      const newRow = {
        employee_id: addDraft.employee_id,
        first_name: addDraft.first_name,
        last_name: addDraft.last_name,
        job_title: addDraft.job_title,
        supervisor: addDraft.supervisor,
        current_jobsite: addDraft.current_jobsite,
        status: addDraft.status || "Active",
        hire_date: addDraft.hire_date,
        transfer_id: response.data?.transfer_id || response.data?.id,
        _details: {},
        _transfer: response.data
      };

      setRawData((prev) => [...prev, newRow]);
      toast.success("New hire added successfully");
      handleAddCancel();
    } catch (err) {
      console.error("Add new hire error:", err);
      setAddError(err.response?.data?.message || err.message || "Failed to add new hire");
    } finally {
      setSavingAdd(false);
    }
  }

  async function handleEditSave() {
    if (!editingRow?.transfer_id) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      // Map fields back to transfer API format
      const payload = {
        firstName: editDraft.first_name,
        lastName: editDraft.last_name,
        jobTitle: editDraft.job_title,
        supervisor: editDraft.supervisor,
        transferTo: editDraft.current_jobsite,
        status: editDraft.status,
        hireDate: editDraft.hire_date || null
      };
      
      await api.put(`/api/v1/transfers/${editingRow.transfer_id}`, payload);
      
      // Also save pay info to Employee record if provided
      if (editDraft.rate_hourly) {
        const employeePayload = {
          rate1: parseFloat(editDraft.rate_hourly),
          payType: editDraft.rate_type || "hourly"
        };
        try {
          await api.put(`/api/v1/employees/byCode/${editingRow.employee_id}`, employeePayload);
        } catch (err) {
          console.warn("Failed to save pay info to employee record:", err);
        }
      }
      setRawData((prev) => prev.map((r) => r.transfer_id === editingRow.transfer_id ? { ...r, ...editDraft } : r));
      toast.success("New hire record updated");
      handleEditCancel();
    } catch (err) {
      setEditError(err.response?.data?.message || "Failed to save");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleExportExcel() {
    try {
      const rows = sortedData.map((row) => {
        const pay = getPay(row._details);
        return {
          "Employee ID": row.employee_id || "",
          "First Name": row.first_name || "",
          "Last Name": row.last_name || "",
          "Job Title": row.job_title || "",
          Supervisor: row.supervisor || "",
          "Current Jobsite": row.current_jobsite || "",
          Status: row.status || "",
          "Hire Date": formatDate(row.hire_date),
          "Pay Rate": pay.rate || "",
          "Pay Type": pay.type || "",
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "NewHires");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      saveAs(new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `NewHires_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Excel exported");
    } catch (err) {
      toast.error("Export failed");
    }
  }

  if (loading) return <div className={styles.container}><div className={styles.loadingMessage}>Loading new hires...</div></div>;
  if (fetchError) return <div className={styles.container}><div className={styles.errorMessage}>Error: {fetchError}</div></div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}><BsArrowLeftRight className={styles.titleIcon} />New Hires</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className={styles.secondaryBtn} onClick={() => navigate("/home")}>← Home</button>
          <button className={styles.secondaryBtn} onClick={() => navigate("/transfers")}>Transfers</button>
          <button className={styles.secondaryBtn} onClick={() => navigate("/mandown")}>Mandown</button>
          <button className={styles.primaryBtn} onClick={handleAddNewHire}>+ Add New Hire</button>
          <button className={styles.exportBtn} onClick={handleExportExcel}>Export to Excel</button>
        </div>
      </header>
      <section className={styles.filters}>
        <input type="text" placeholder="Search..." className={styles.searchInput} value={filters.search} onChange={(e) => handleFilterChange("search", e.target.value)} />
        <select className={styles.filterSelect} value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)}><option value="">All Statuses</option>{uniqueStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select className={styles.filterSelect} value={filters.jobTitle} onChange={(e) => handleFilterChange("jobTitle", e.target.value)}><option value="">All Titles</option>{uniqueJobTitles.map((j) => <option key={j} value={j}>{j}</option>)}</select>
        <select className={styles.filterSelect} value={filters.supervisor} onChange={(e) => handleFilterChange("supervisor", e.target.value)}><option value="">All Supervisors</option>{uniqueSupervisors.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <div className={styles.dateRange}>
          <input type="date" className={styles.dateInput} value={filters.startDate} onChange={(e) => handleFilterChange("startDate", e.target.value)} />
          <span>to</span>
          <input type="date" className={styles.dateInput} value={filters.endDate} onChange={(e) => handleFilterChange("endDate", e.target.value)} />
        </div>
        <button className={styles.clearBtn} onClick={handleClearFilters}>Clear Filters</button>
        <button className={styles.clearBtn} onClick={() => setSortConfig({ key: "last_name", direction: "asc" })}>Clear Sort</button>
      </section>
      <div className={styles.summary}>Showing {sortedData.length} of {rawData.length} new hire(s)</div>
      <div className={styles.tableWrapper} ref={tableWrapRef}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => handleSort("employee_id")}>CEC ID {sortConfig.key === "employee_id" && (sortConfig.direction === "asc" ? "↑" : "↓")}</th>
              <th onClick={() => handleSort("first_name")}>First {sortConfig.key === "first_name" && (sortConfig.direction === "asc" ? "↑" : "↓")}</th>
              <th onClick={() => handleSort("last_name")}>Last {sortConfig.key === "last_name" && (sortConfig.direction === "asc" ? "↑" : "↓")}</th>
              <th onClick={() => handleSort("job_title")}>Title {sortConfig.key === "job_title" && (sortConfig.direction === "asc" ? "↑" : "↓")}</th>
              <th onClick={() => handleSort("supervisor")}>Supervisor {sortConfig.key === "supervisor" && (sortConfig.direction === "asc" ? "↑" : "↓")}</th>
              <th onClick={() => handleSort("current_jobsite")}>Jobsite {sortConfig.key === "current_jobsite" && (sortConfig.direction === "asc" ? "↑" : "↓")}</th>
              <th onClick={() => handleSort("status")}>Status {sortConfig.key === "status" && (sortConfig.direction === "asc" ? "↑" : "↓")}</th>
              <th onClick={() => handleSort("hire_date")}>Hire Date {sortConfig.key === "hire_date" && (sortConfig.direction === "asc" ? "↑" : "↓")}</th>
              <th onClick={() => handleSort("pay_rate")} className={styles.sortableHeader}>Pay {sortConfig.key === "pay_rate" && (sortConfig.direction === "asc" ? "↑" : "↓")}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => {
              const pay = getPay(row._details);
              const rowKey = row.transfer_id || row.employee_id || `${row.first_name}-${row.last_name}`;
              return (
                <tr key={rowKey} onClick={() => handleRowClick(row)} className={styles.clickableRow}>
                  <td>{row.employee_id}</td>
                  <td>{row.first_name}</td>
                  <td>{row.last_name}</td>
                  <td>{row.job_title}</td>
                  <td>{row.supervisor}</td>
                  <td>{row.current_jobsite}</td>
                  <td>{row.status}</td>
                  <td>{formatDate(row.hire_date)}</td>
                  <td>{pay.rate ? `${currency(pay.rate)}${pay.type ? ` (${pay.type})` : ""}` : ""}</td>
                  <td><button className={styles.editBtn} onClick={(e) => handleEditClick(e, row)}>Edit</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editingRow && (
        <div className={styles.modalOverlay} onClick={handleEditCancel}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <header className={styles.modalHeader}>
              <h2>Edit: {editingRow.first_name} {editingRow.last_name}</h2>
              <button className={styles.modalClose} onClick={handleEditCancel} disabled={savingEdit}><CgCloseR /></button>
            </header>
            <div className={styles.modalBody}>
              <div className={styles.modalField}><label>First Name</label><input type="text" value={editDraft.first_name || ""} onChange={(e) => handleEditChange("first_name", e.target.value)} /></div>
              <div className={styles.modalField}><label>Last Name</label><input type="text" value={editDraft.last_name || ""} onChange={(e) => handleEditChange("last_name", e.target.value)} /></div>
              <div className={styles.modalField}><label>Job Title</label><input type="text" value={editDraft.job_title || ""} onChange={(e) => handleEditChange("job_title", e.target.value)} /></div>
              <div className={styles.modalField}><label>Supervisor</label><input type="text" value={editDraft.supervisor || ""} onChange={(e) => handleEditChange("supervisor", e.target.value)} /></div>
              <div className={styles.modalField}><label>Jobsite</label><input type="text" value={editDraft.current_jobsite || ""} onChange={(e) => handleEditChange("current_jobsite", e.target.value)} /></div>
              <div className={styles.modalField}><label>Status</label><select value={editDraft.status || ""} onChange={(e) => handleEditChange("status", e.target.value)}><option value="">Select</option>{uniqueStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
              <div className={styles.modalField}><label>Hire Date</label><input type="date" value={editDraft.hire_date || ""} onChange={(e) => handleEditChange("hire_date", e.target.value)} /></div>
              <div className={styles.modalField}><label>Pay Rate (Hourly)</label><input type="number" step="0.01" value={editDraft.rate_hourly || ""} onChange={(e) => handleEditChange("rate_hourly", e.target.value)} placeholder="0.00" /></div>
              <div className={styles.modalField}><label>Pay Type</label><select value={editDraft.rate_type || ""} onChange={(e) => handleEditChange("rate_type", e.target.value)}><option value="">Select</option><option value="hourly">Hourly</option><option value="salary">Salary</option></select></div>
              {editError && <div className={styles.modalError}>{editError}</div>}
            </div>
            <footer className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={handleEditCancel} disabled={savingEdit}>Cancel</button>
              <button className={styles.primaryBtn} onClick={handleEditSave} disabled={savingEdit}>{savingEdit ? "Saving..." : "Save"}</button>
            </footer>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className={styles.modalOverlay} onClick={handleAddCancel}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <header className={styles.modalHeader}>
              <h2>Add New Hire</h2>
              <button className={styles.modalClose} onClick={handleAddCancel} disabled={savingAdd}><CgCloseR /></button>
            </header>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <label>CEC ID *</label>
                <input type="text" value={addDraft.employee_id || ""} onChange={(e) => handleAddChange("employee_id", e.target.value)} placeholder="Employee code" />
              </div>
              <div className={styles.modalField}>
                <label>First Name *</label>
                <input type="text" value={addDraft.first_name || ""} onChange={(e) => handleAddChange("first_name", e.target.value)} />
              </div>
              <div className={styles.modalField}>
                <label>Last Name *</label>
                <input type="text" value={addDraft.last_name || ""} onChange={(e) => handleAddChange("last_name", e.target.value)} />
              </div>
              <div className={styles.modalField}>
                <label>Job Title</label>
                <input type="text" value={addDraft.job_title || ""} onChange={(e) => handleAddChange("job_title", e.target.value)} />
              </div>
              <div className={styles.modalField}>
                <label>Supervisor</label>
                <input type="text" value={addDraft.supervisor || ""} onChange={(e) => handleAddChange("supervisor", e.target.value)} />
              </div>
              <div className={styles.modalField}>
                <label>Jobsite Being Assigned To</label>
                <input type="text" value={addDraft.current_jobsite || ""} onChange={(e) => handleAddChange("current_jobsite", e.target.value)} />
              </div>
              <div className={styles.modalField}>
                <label>Status</label>
                <select value={addDraft.status || "Active"} onChange={(e) => handleAddChange("status", e.target.value)}>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>
              <div className={styles.modalField}>
                <label>Hire Date</label>
                <input type="date" value={addDraft.hire_date || ""} onChange={(e) => handleAddChange("hire_date", e.target.value)} />
              </div>
              <div className={styles.modalField}>
                <label>Pay Rate (Hourly)</label>
                <input type="number" step="0.01" value={addDraft.rate_hourly || ""} onChange={(e) => handleAddChange("rate_hourly", e.target.value)} placeholder="0.00" />
              </div>
              <div className={styles.modalField}>
                <label>Pay Type</label>
                <select value={addDraft.rate_type || "hourly"} onChange={(e) => handleAddChange("rate_type", e.target.value)}>
                  <option value="hourly">Hourly</option>
                  <option value="salary">Salary</option>
                </select>
              </div>
              <div className={styles.modalField}>
                <label>Hire Date</label>
                <input type="date" value={addDraft.hire_date || ""} onChange={(e) => handleAddChange("hire_date", e.target.value)} />
              </div>
              {addError && <div className={styles.modalError}>{addError}</div>}
            </div>
            <footer className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={handleAddCancel} disabled={savingAdd}>Cancel</button>
              <button className={styles.primaryBtn} onClick={handleAddSave} disabled={savingAdd}>{savingAdd ? "Adding..." : "Add New Hire"}</button>
            </footer>
          </div>
        </div>
      )}

      <button
        type="button"
        className={`${styles.scrollToTop} ${showScrollTop ? styles.visible : ''}`}
        onClick={scrollToTop}
        title="Scroll to top"
        aria-label="Scroll to top"
      >
        <BsArrowUp />
      </button>
    </div>
  );
}