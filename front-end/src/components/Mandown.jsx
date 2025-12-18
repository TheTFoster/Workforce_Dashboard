// src/components/Mandown.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import styles from "../stylesheets/Transfers.module.css";
import { toast } from "react-toastify";
import { BsArrowLeftRight, BsArrowUp } from "react-icons/bs";
import { CgCloseR } from "react-icons/cg";

function toDate(d) {
  if (!d) return null;
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

function firstDefined(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && `${v}`.trim() !== "") return v;
  }
  return undefined;
}

const getPay = (transferRow) => {
  if (!transferRow) return { rate: null, type: null };
  
  const t = transferRow;
  const emp = transferRow._field || {};
  const details = transferRow._details || {};
  
  // Try transfer fields first, then employee details, then field
  const rate =
    firstDefined(t, "rate_hourly", "rateHourly", "rate", "rate1") ??
    getCI(details, "rate_hourly", "rateHourly", "rate1", "hourlyRate", "payRate", "wage") ??
    getCI(emp, "rate_1") ??
    null;

  const typeRaw =
    firstDefined(t, "rate_type") ??
    getCI(details, "rate_type", "payType", "pay_type", "payrollProfileDesc", "payroll_profile_desc") ??
    getCI(emp, "pay_type", "payType", "payroll_profile_desc") ??
    null;
    
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

// Color contrast detection for readable text on colored backgrounds
function textColorForBg(bg) {
  if (!bg) return "#000";
  
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = bg;
    const computed = ctx.fillStyle;
    
    let r = 0, g = 0, b = 0;
    const hexMatch = computed.match(/^#([0-9a-f]{6})$/i);
    
    if (hexMatch) {
      r = parseInt(hexMatch[1].substr(0, 2), 16);
      g = parseInt(hexMatch[1].substr(2, 2), 16);
      b = parseInt(hexMatch[1].substr(4, 2), 16);
    } else {
      const rgbMatch = computed.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
      if (rgbMatch) {
        r = Number(rgbMatch[1]);
        g = Number(rgbMatch[2]);
        b = Number(rgbMatch[3]);
      } else {
        return "#000";
      }
    }
    
    // relative luminance per WCAG
    const srgbToLin = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const R = srgbToLin(r);
    const G = srgbToLin(g);
    const B = srgbToLin(b);
    const lum = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    
    // choose white or black text for best contrast
    const whiteLum = 1.0;
    const blackLum = 0.0;
    const contrastWhite = (Math.max(lum, whiteLum) + 0.05) / (Math.min(lum, whiteLum) + 0.05);
    const contrastBlack = (Math.max(lum, blackLum) + 0.05) / (Math.min(lum, blackLum) + 0.05);
    
    return contrastWhite >= contrastBlack ? "#fff" : "#000";
  } catch (e) {
    return "#000";
  }
}

export default function Mandown() {
  const navigate = useNavigate();
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Mandown Groups Management
  const [mandownGroups, setMandownGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupModalMode, setGroupModalMode] = useState("create");
  const [editingGroup, setEditingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#2563eb"); // Default blue
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningEmployeeId, setAssigningEmployeeId] = useState(null);
  const [draggedGroupId, setDraggedGroupId] = useState(null);
  const [showBatchAddModal, setShowBatchAddModal] = useState(false);
  const [batchAddGroupId, setBatchAddGroupId] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    jobTitle: "",
    supervisor: "",
    currentJobsite: "",
    startDate: "",
    endDate: "",
  });
  const [sortConfig, setSortConfig] = useState({ key: "last_name", direction: "asc" });
  const [editingRow, setEditingRow] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const tableWrapRef = useRef(null);

  // Load groups from localStorage
  useEffect(() => {
    async function loadGroups() {
      try {
        const response = await api.get("/api/v1/mandown-groups");
        const groups = response.data || [];
        setMandownGroups(groups);
      } catch (err) {
        console.warn("Failed to load mandown groups from server:", err);
        // Fallback to localStorage for migration
        try {
          const saved = localStorage.getItem("mandownGroups");
          if (saved) {
            const localGroups = JSON.parse(saved);
            setMandownGroups(localGroups);
            // Try to migrate to backend
            for (const group of localGroups) {
              try {
                await api.post("/api/v1/mandown-groups", {
                  name: group.name,
                  color: group.color,
                  employeeIds: group.employeeIds,
                  displayOrder: group.displayOrder
                });
              } catch (e) {
                console.warn("Failed to migrate group:", group.name, e);
              }
            }
            // Clear localStorage after migration
            localStorage.removeItem("mandownGroups");
          }
        } catch (err2) {
          console.warn("Failed to load from localStorage:", err2);
        }
      }
    }
    loadGroups();
  }, []);

  // Remove the localStorage save effect - now handled by API
  // useEffect(() => {
  //   try {
  //     localStorage.setItem("mandownGroups", JSON.stringify(mandownGroups));
  //   } catch (err) {
  //     console.warn("Failed to save mandown groups:", err);
  //   }
  // }, [mandownGroups]);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      setLoading(true);
      setFetchError(null);
      try {
        const resp = await api.get("/api/v1/transfers");
        if (!mounted) return;
        let rows = Array.isArray(resp.data) ? resp.data : [];

        // Filter out "new hire" entries - they haven't joined a crew yet
        rows = rows.filter((r) => {
          const fromJobsite = r.from_jobsite || r.fromJobsite || r.from_jobsite_key || "";
          const isNewHire = /new\s*hire/i.test(String(fromJobsite));
          return !isNewHire;
        });

        // Deduplicate by emp_code to get unique employees only
        const uniqueMap = new Map();
        rows.forEach((row) => {
          const empCode = row.emp_code || row.employee_code || row.employee_id || row.id;
          if (empCode && !uniqueMap.has(empCode)) {
            uniqueMap.set(empCode, row);
          }
        });
        rows = Array.from(uniqueMap.values());

        // Fetch employee details to get supervisor, pay, etc.
        // Extract and normalize employee codes
        const empCodes = Array.from(
          new Set(
            rows
              .map((r) => {
                const code = r.emp_code || r.employee_code || r.emp_code_norm_key;
                return code ? String(code).trim() : null;
              })
              .filter(Boolean) // Remove null/undefined/empty
              .filter(code => code.length > 0 && !/^(null|undefined)$/i.test(code)) // Extra validation
          )
        );
        
        console.log("[Mandown] Requesting details for codes:", empCodes.slice(0, 5), `(${empCodes.length} total)`);
        
        if (empCodes.length > 0) {
          try {
            const detailsResp = await api.post(
              "/api/v1/employee/details-by-emp",
              { empCodes: empCodes }, // API expects { empCodes: [...] } not just [...]
              { withCredentials: true, headers: { "Content-Type": "application/json" } }
            );
            
            // Support wrapper response shape { results: { ... }, unmatchedRequested: [...] }
            const results = detailsResp.data?.results || detailsResp.data || {};
            
            const detailsMap = new Map();
            if (typeof results === 'object' && !Array.isArray(results)) {
              // Results is a map of code -> EmployeeDTO
              Object.entries(results).forEach(([code, dto]) => {
                if (code && dto) {
                  detailsMap.set(String(code).trim(), dto);
                }
              });
            } else if (Array.isArray(results)) {
              // Fallback: array of DTOs
              results.forEach((d) => {
                const code = d.employee_code || d.employeeCode || d.emp_code || d.cecId;
                if (code) {
                  detailsMap.set(String(code).trim(), d);
                }
              });
            }
            
            // Merge employee details into transfer rows
            rows = rows.map((r) => {
              const empCode = r.emp_code || r.employee_code || r.emp_code_norm_key;
              const details = empCode ? detailsMap.get(String(empCode).trim()) || {} : {};
              return { ...r, _details: details };
            });
            console.log("[Mandown] Successfully fetched details for", detailsMap.size, "employees");
            
            // Debug: Check first employee's supervisor data
            if (rows.length > 0) {
              const sample = rows[0];
              console.log("[Mandown] Sample employee data:", {
                emp_code: sample.emp_code,
                supervisor_from_transfer: sample.supervisor,
                supervisor_from_details: sample._details?.supervisor,
                supervisorName_from_details: sample._details?.supervisorName,
                all_details_keys: Object.keys(sample._details || {})
              });
            }
          } catch (err) {
            console.warn("Failed to fetch employee details:", err);
            console.log("Sample codes that failed:", empCodes.slice(0, 10));
            // Continue without details - supervisor and pay will be missing but page will load
            rows = rows.map((r) => ({ ...r, _details: {} }));
          }
        }

        setRawData(rows);
      } catch (err) {
        if (!mounted) return;
        setFetchError(err.message || "Failed to fetch employees");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    return () => {
      mounted = false;
    };
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

  // Group management handlers
  const handleCreateGroup = () => {
    setGroupModalMode("create");
    setNewGroupName("");
    setNewGroupColor("#2563eb"); // Default blue
    setEditingGroup(null);
    setShowGroupModal(true);
  };

  const handleEditGroup = (group) => {
    setGroupModalMode("edit");
    setNewGroupName(group.name);
    setNewGroupColor(group.color || "#2563eb");
    setEditingGroup(group);
    setShowGroupModal(true);
  };

  const handleSaveGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    try {
      if (groupModalMode === "create") {
        const response = await api.post("/api/v1/mandown-groups", {
          name: newGroupName.trim(),
          color: newGroupColor,
          employeeIds: [],
        });
        setMandownGroups((prev) => [...prev, response.data]);
        toast.success(`Group "${newGroupName}" created`);
      } else if (groupModalMode === "edit" && editingGroup) {
        const response = await api.put(`/api/v1/mandown-groups/${editingGroup.id}`, {
          name: newGroupName.trim(),
          color: newGroupColor,
          employeeIds: editingGroup.employeeIds,
          displayOrder: editingGroup.displayOrder
        });
        setMandownGroups((prev) =>
          prev.map((g) => (g.id === editingGroup.id ? response.data : g))
        );
        toast.success(`Group "${newGroupName}" updated`);
      }
      setShowGroupModal(false);
    } catch (err) {
      console.error("Failed to save group:", err);
      toast.error("Failed to save group");
    }
  };

  const handleDeleteGroup = async (groupId) => {
    const group = mandownGroups.find((g) => g.id === groupId);
    if (!group) return;
    if (window.confirm(`Delete group "${group.name}"?`)) {
      try {
        await api.delete(`/api/v1/mandown-groups/${groupId}`);
        setMandownGroups((prev) => prev.filter((g) => g.id !== groupId));
        if (activeGroupId === groupId) {
          setActiveGroupId(null);
        }
        toast.success(`Group "${group.name}" deleted`);
      } catch (err) {
        console.error("Failed to delete group:", err);
        toast.error("Failed to delete group");
      }
    }
  };

  const handleAssignToGroup = (employeeId) => {
    setAssigningEmployeeId(employeeId);
    setShowAssignModal(true);
  };

  const handleConfirmAssign = async (groupId) => {
    if (!assigningEmployeeId || !groupId) return;
    try {
      const response = await api.post(`/api/v1/mandown-groups/${groupId}/employees`, {
        employeeIds: [assigningEmployeeId]
      });
      setMandownGroups((prev) =>
        prev.map((g) => (g.id === groupId ? response.data : g))
      );
      const group = mandownGroups.find((g) => g.id === groupId);
      toast.success(`Employee assigned to "${group?.name}"`);
      setShowAssignModal(false);
      setAssigningEmployeeId(null);
    } catch (err) {
      console.error("Failed to assign employee:", err);
      toast.error("Failed to assign employee");
    }
  };

  const handleRemoveFromGroup = async (employeeId, groupId) => {
    try {
      const response = await api.delete(`/api/v1/mandown-groups/${groupId}/employees/${employeeId}`);
      setMandownGroups((prev) =>
        prev.map((g) => (g.id === groupId ? response.data : g))
      );
      toast.success("Employee removed from group");
    } catch (err) {
      console.error("Failed to remove employee:", err);
      toast.error("Failed to remove employee");
    }
  };

  // Drag and drop handlers for reordering groups
  const handleDragStart = (e, groupId) => {
    setDraggedGroupId(groupId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, targetGroupId) => {
    e.preventDefault();
    if (!draggedGroupId || draggedGroupId === targetGroupId) {
      setDraggedGroupId(null);
      return;
    }

    const draggedIndex = mandownGroups.findIndex((g) => g.id === draggedGroupId);
    const targetIndex = mandownGroups.findIndex((g) => g.id === targetGroupId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedGroupId(null);
      return;
    }
    
    const newGroups = [...mandownGroups];
    const [removed] = newGroups.splice(draggedIndex, 1);
    newGroups.splice(targetIndex, 0, removed);
    
    // Update local state immediately for smooth UX
    setMandownGroups(newGroups);
    
    // Send reorder to backend
    try {
      const groupIds = newGroups.map(g => g.id);
      await api.post("/api/v1/mandown-groups/reorder", groupIds);
    } catch (err) {
      console.error("Failed to reorder groups:", err);
      toast.error("Failed to save group order");
    }
    
    setDraggedGroupId(null);
  };

  const handleDragEnd = () => {
    setDraggedGroupId(null);
  };

  // Batch add handlers
  const handleBatchAdd = (groupId) => {
    setBatchAddGroupId(groupId);
    setSelectedEmployees(new Set());
    setShowBatchAddModal(true);
  };

  const handleToggleEmployee = (employeeId) => {
    setSelectedEmployees((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedEmployees.size === sortedData.length) {
      setSelectedEmployees(new Set());
    } else {
      const allIds = sortedData.map((row) => row.transfer_id || row.id || row.emp_code || row.employee_id);
      setSelectedEmployees(new Set(allIds));
    }
  };

  const handleConfirmBatchAdd = async () => {
    if (!batchAddGroupId || selectedEmployees.size === 0) return;
    
    try {
      const response = await api.post(`/api/v1/mandown-groups/${batchAddGroupId}/employees`, {
        employeeIds: Array.from(selectedEmployees)
      });
      
      setMandownGroups((prev) =>
        prev.map((g) => (g.id === batchAddGroupId ? response.data : g))
      );

      const group = mandownGroups.find((g) => g.id === batchAddGroupId);
      toast.success(`Added ${selectedEmployees.size} employee(s) to "${group?.name}"`);
      setShowBatchAddModal(false);
      setSelectedEmployees(new Set());
      setBatchAddGroupId(null);
    } catch (err) {
      console.error("Failed to batch add employees:", err);
      toast.error("Failed to add employees");
    }
  };

  const filteredData = useMemo(() => {
    let out = [...rawData];
    if (activeGroupId) {
      const activeGroup = mandownGroups.find((g) => g.id === activeGroupId);
      if (activeGroup) {
        out = out.filter((row) => {
          const rowId = row.transfer_id || row.id || row.emp_code || row.employee_id;
          return activeGroup.employeeIds.includes(rowId);
        });
      }
    }
    if (filters.search) {
      const lower = filters.search.toLowerCase();
      out = out.filter((row) => {
        const supervisor = row._details?.supervisor || row._details?.supervisorPrimary || row.supervisor || "";
        const fields = [
          row.emp_name,
          row.first_name,
          row.last_name,
          row.emp_code,
          row.employee_id,
          row.classification,
          row.job_title,
          supervisor,
          row.from_jobsite,
          row.fromJobsite,
          row.project,
          row.current_jobsite,
        ];
        return fields.some((f) => String(f || "").toLowerCase().includes(lower));
      });
    }
    if (filters.status) out = out.filter((r) => {
      const empStatus = r._details?.employeeStatus || 
                       r._details?.employee_status || 
                       r._details?.status || 
                       r._field?.employeeStatus ||
                       r._field?.employee_status ||
                       r._field?.status || 
                       r.transfer_status || 
                       r.status;
      return normKey(empStatus) === normKey(filters.status);
    });
    if (filters.jobTitle) out = out.filter((r) => normKey(r.classification || r.job_title).includes(normKey(filters.jobTitle)));
    if (filters.supervisor) {
      out = out.filter((r) => {
        const supervisor = r._details?.supervisor || r._details?.supervisorPrimary || r.supervisor || "";
        return normKey(supervisor).includes(normKey(filters.supervisor));
      });
    }
    if (filters.currentJobsite)
      out = out.filter((r) => normKey(r.from_jobsite || r.fromJobsite || r.from_jobsite_key || r.project || r.current_jobsite).includes(normKey(filters.currentJobsite)));
    if (filters.startDate || filters.endDate) {
      const sd = toDate(filters.startDate);
      const ed = toDate(filters.endDate);
      out = out.filter((r) => {
        const hd = toDate(r.effective_date || r.hire_date);
        return hd && (!sd || hd >= sd) && (!ed || hd <= ed);
      });
    }
    return out;
  }, [rawData, filters, activeGroupId, mandownGroups]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      let aVal, bVal;
      
      // Special handling for supervisor field (derived from _details)
      if (sortConfig.key === "supervisor") {
        aVal = a._details?.supervisor || a._details?.supervisorPrimary || a.supervisor || "";
        bVal = b._details?.supervisor || b._details?.supervisorPrimary || b.supervisor || "";
      }
      // Special handling for group field (derived from _details)
      else if (sortConfig.key === "group") {
        aVal = a._details?.workGroup || a._details?.work_group || a.group || a.work_group || "";
        bVal = b._details?.workGroup || b._details?.work_group || b.group || b.work_group || "";
      }
      else {
        aVal = a[sortConfig.key];
        bVal = b[sortConfig.key];
      }
      
      if (sortConfig.key.includes("date")) {
        const ad = toDate(aVal);
        const bd = toDate(bVal);
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return ad - bd;
      }
      aVal = String(aVal || "").toLowerCase();
      bVal = String(bVal || "").toLowerCase();
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });
    if (sortConfig.direction === "desc") sorted.reverse();
    return sorted;
  }, [filteredData, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      status: "",
      jobTitle: "",
      supervisor: "",
      currentJobsite: "",
      startDate: "",
      endDate: "",
    });
  };

  const handleRowClick = (row) => {
    const empId = row.employee_id || row.emp_code;
    if (empId) {
      navigate(`/employee-details/${empId}`);
    }
  };

  const handleEditClick = (e, row) => {
    e.stopPropagation();
    setEditingRow(row);
    // Pre-populate status from employee details (employeeStatus or employee_status field)
    const empStatus = row._details?.employeeStatus || 
                     row._details?.employee_status || 
                     row._details?.status || 
                     row._field?.employeeStatus ||
                     row._field?.employee_status ||
                     row._field?.status || 
                     row.transfer_status || 
                     row.status || "";
    setEditDraft({ ...row, status: empStatus });
    setEditError(null);
  };

  const handleEditCancel = () => {
    setEditingRow(null);
    setEditDraft({});
    setEditError(null);
  };

  const handleEditChange = (field, value) => {
    setEditDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async () => {
    if (!editingRow) return;
    const id = editingRow.transfer_id || editingRow.id;
    if (!id) {
      setEditError("Missing transfer ID");
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      await api.put(`/api/v1/transfers/${id}`, editDraft);
      setRawData((prev) => prev.map((r) => (r.id === id || r.transfer_id === id ? { ...r, ...editDraft } : r)));
      toast.success("Updated successfully");
      handleEditCancel();
    } catch (err) {
      console.error("Save error:", err);
      setEditError(err.response?.data?.message || "Failed to save");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const rows = sortedData.map((row) => {
        const pay = getPay(row);
        const groupNames = mandownGroups
          .filter((g) => {
            const rowId = row.transfer_id || row.id || row.emp_code || row.employee_id;
            return g.employeeIds.includes(rowId);
          })
          .map((g) => g.name)
          .join(", ");
        return {
          "Employee ID": row.emp_code || row.employee_id || "",
          Name: row.emp_name || `${row.first_name || ""} ${row.last_name || ""}`.trim(),
          Classification: row.classification || row.job_title || "",
          Supervisor: row.supervisor || "",
          Project: row.from_jobsite || row.fromJobsite || row.from_jobsite_key || row.project || row.current_jobsite || "",
          "Mandown Groups": groupNames,
          Status: row._details?.employeeStatus || row._details?.employee_status || row._details?.status || row._field?.employeeStatus || row._field?.employee_status || row._field?.status || row.transfer_status || row.status || "",
          "Effective Date": formatDate(row.effective_date || row.hire_date),
          "Pay Rate": pay.rate || "",
          "Pay Type": pay.type || "",
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Mandown");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, `Mandown_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Excel file exported");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export Excel");
    }
  };

  const uniqueStatuses = useMemo(() => {
    const set = new Set();
    rawData.forEach((r) => {
      // Try to get status from employee details - check various field names
      const s = r._details?.employeeStatus || 
                r._details?.employee_status || 
                r._details?.status || 
                r._field?.employeeStatus ||
                r._field?.employee_status ||
                r._field?.status || 
                r.transfer_status || 
                r.status;
      if (s) set.add(s);
    });
    
    // Add default status options if no statuses found in data
    if (set.size === 0) {
      return ["Active", "Completed", "Pending", "On Leave", "Terminated", "Transferred", "In Progress"];
    }
    
    return Array.from(set).sort();
  }, [rawData]);

  const uniqueJobTitles = useMemo(() => {
    const set = new Set();
    rawData.forEach((r) => {
      const j = r.classification || r.job_title;
      if (j) set.add(j);
    });
    return Array.from(set).sort();
  }, [rawData]);

  const uniqueSupervisors = useMemo(() => {
    const set = new Set();
    rawData.forEach((r) => {
      const supervisor = r._details?.supervisor || r._details?.supervisorPrimary || r.supervisor;
      if (supervisor) set.add(supervisor);
    });
    return Array.from(set).sort();
  }, [rawData]);

  const uniqueJobsites = useMemo(() => {
    const set = new Set();
    rawData.forEach((r) => {
      const j = r.from_jobsite || r.fromJobsite || r.from_jobsite_key || r.project || r.current_jobsite;
      if (j) set.add(j);
    });
    return Array.from(set).sort();
  }, [rawData]);

  if (loading) return <div className={styles.container}><div className={styles.loadingMessage}>Loading mandown data...</div></div>;
  if (fetchError) return <div className={styles.container}><div className={styles.errorMessage}>Error: {fetchError}</div></div>;

  const activeGroup = mandownGroups.find((g) => g.id === activeGroupId);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <BsArrowLeftRight className={styles.titleIcon} />
          Mandown
        </h1>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => navigate("/home")}
          >
            ← Home
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => navigate("/transfers")}
          >
            Transfers
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => navigate("/new-hires")}
          >
            New Hires
          </button>
          <button 
            className={styles.exportBtn} 
            onClick={handleExportExcel}
            style={{ backgroundColor: "#217346", borderColor: "#1c5e39", color: "#fff" }}
          >
            Export to Excel
          </button>
        </div>
      </header>

      {/* Mandown Groups Section */}
      <section className={styles.groupsSection}>
        <div className={styles.groupsHeader}>
          <h2>Mandown Groups</h2>
          <button className={styles.primaryBtn} onClick={handleCreateGroup}>
            + Create Group
          </button>
        </div>
        <div className={styles.groupsList}>
          <button
            className={`${styles.groupChip} ${!activeGroupId ? styles.activeChip : ""}`}
            onClick={() => setActiveGroupId(null)}
          >
            All Employees ({rawData.length})
          </button>
          {mandownGroups.map((group) => (
            <div 
              key={group.id} 
              className={styles.groupChipContainer}
              draggable
              onDragStart={(e) => handleDragStart(e, group.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, group.id)}
              onDragEnd={handleDragEnd}
              style={{
                opacity: draggedGroupId === group.id ? 0.5 : 1,
                cursor: 'move',
                borderLeft: `4px solid ${group.color || '#2563eb'}`,
                background: activeGroupId === group.id ? group.color || '#2563eb' : 'rgba(15, 23, 42, 0.7)'
              }}
            >
              <button
                className={`${styles.groupChip} ${activeGroupId === group.id ? styles.activeChip : ""}`}
                onClick={() => setActiveGroupId(group.id)}
                style={{
                  backgroundColor: 'transparent',
                  color: activeGroupId === group.id ? textColorForBg(group.color || '#2563eb') : 'inherit'
                }}
              >
                {group.name} ({group.employeeIds.length})
              </button>
              <button 
                onClick={() => handleEditGroup(group)} 
                className={styles.groupEditBtn} 
                title="Edit group"
                style={{
                  color: activeGroupId === group.id ? textColorForBg(group.color || '#2563eb') : '#9ca3af'
                }}
              >
                ✎
              </button>
              <button 
                onClick={() => handleBatchAdd(group.id)} 
                className={styles.groupEditBtn} 
                title="Batch add employees"
                style={{
                  color: activeGroupId === group.id ? textColorForBg(group.color || '#2563eb') : '#9ca3af'
                }}
              >
                +
              </button>
              <button 
                onClick={() => handleDeleteGroup(group.id)} 
                className={styles.groupDeleteBtn} 
                title="Delete group"
                style={{
                  color: activeGroupId === group.id ? textColorForBg(group.color || '#2563eb') : '#9ca3af'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Filters */}
      <section className={styles.filters}>
        <input
          type="text"
          placeholder="Search..."
          className={styles.searchInput}
          value={filters.search}
          onChange={(e) => handleFilterChange("search", e.target.value)}
        />
        <select className={styles.filterSelect} value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)}>
          <option value="">All Statuses</option>
          {uniqueStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className={styles.filterSelect} value={filters.jobTitle} onChange={(e) => handleFilterChange("jobTitle", e.target.value)}>
          <option value="">All Titles</option>
          {uniqueJobTitles.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
        <select className={styles.filterSelect} value={filters.supervisor} onChange={(e) => handleFilterChange("supervisor", e.target.value)}>
          <option value="">All Supervisors</option>
          {uniqueSupervisors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className={styles.filterSelect} value={filters.currentJobsite} onChange={(e) => handleFilterChange("currentJobsite", e.target.value)}>
          <option value="">All Jobsites</option>
          {uniqueJobsites.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
        <div className={styles.dateRange}>
          <input type="date" className={styles.dateInput} value={filters.startDate} onChange={(e) => handleFilterChange("startDate", e.target.value)} />
          <span>to</span>
          <input type="date" className={styles.dateInput} value={filters.endDate} onChange={(e) => handleFilterChange("endDate", e.target.value)} />
        </div>
        <button className={styles.clearBtn} onClick={handleClearFilters}>
          Clear Filters
        </button>
      </section>

      {/* Summary */}
      <div className={styles.summary}>
        {activeGroup ? <>Showing {sortedData.length} employee(s) in "{activeGroup.name}"</> : <>Showing {sortedData.length} of {rawData.length} employee(s)</>}
      </div>

      {/* Table */}
      <div className={styles.tableWrapper} ref={tableWrapRef}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => handleSort("emp_code")}>EE Code {sortConfig.key === "emp_code" && (sortConfig.direction === "asc" ? "↑" : "↓")}</th>
              <th onClick={() => handleSort("emp_name")}>Name {sortConfig.key === "emp_name" && (sortConfig.direction === "asc" ? "↑" : "↓")}</th>
              <th onClick={() => handleSort("classification")}>Classification {sortConfig.key === "classification" && (sortConfig.direction === "asc" ? "↑" : "↓")}</th>
              <th onClick={() => handleSort("group")}>Group {sortConfig.key === "group" && (sortConfig.direction === "asc" ? "↑" : "↓")}</th>
              <th onClick={() => handleSort("supervisor")}>Supervisor {sortConfig.key === "supervisor" && (sortConfig.direction === "asc" ? "↑" : "↓")}</th>
              <th onClick={() => handleSort("project")}>Project {sortConfig.key === "project" && (sortConfig.direction === "asc" ? "↑" : "↓")}</th>
              <th>Mandown Groups</th>
              <th onClick={() => handleSort("transfer_status")}>Status {sortConfig.key === "transfer_status" && (sortConfig.direction === "asc" ? "↑" : "↓")}</th>
              <th>Pay Rate</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, idx) => {
              const pay = getPay(row);
              const rowId = row.transfer_id || row.id || row.emp_code || row.employee_id || `row-${idx}`;
              const empGroups = mandownGroups.filter((g) => g.employeeIds.includes(rowId));
              
              // Get supervisor from details or field
              const supervisor = row.supervisor || 
                                row._details?.supervisor || 
                                row._details?.supervisorName ||
                                row._field?.supervisor || "";
              
              // Get work group from details or transfer
              const workGroup = row._details?.workGroup || 
                               row._details?.work_group ||
                               row.group ||
                               row.work_group || "";
              
              // Get employee status from employee details first (employeeStatus or employee_status)
              const empStatus = row._details?.employeeStatus || 
                               row._details?.employee_status || 
                               row._details?.status || 
                               row._field?.employeeStatus ||
                               row._field?.employee_status ||
                               row._field?.status || 
                               row.transfer_status || 
                               row.status || "";
              
              return (
                <tr key={rowId} onClick={() => handleRowClick(row)} className={styles.clickableRow}>
                  <td>{row.emp_code || row.employee_id}</td>
                  <td>{row.emp_name || `${row.first_name || ""} ${row.last_name || ""}`.trim()}</td>
                  <td>{row.classification || row.job_title}</td>
                  <td>{workGroup}</td>
                  <td>{supervisor}</td>
                  <td>{row.from_jobsite || row.fromJobsite || row.from_jobsite_key || row.project || row.current_jobsite}</td>
                  <td>
                    <div className={styles.groupBadges}>
                      {empGroups.map((g) => (
                        <span key={g.id} className={styles.groupBadge}>
                          {g.name}
                          {activeGroupId === g.id && (
                            <button onClick={(e) => { e.stopPropagation(); handleRemoveFromGroup(rowId, g.id); }} className={styles.removeBadge}>×</button>
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{empStatus}</td>
                  <td>
                    {pay.rate ? (
                      <>
                        {currency(pay.rate)}
                        {pay.type && <div style={{ fontSize: "0.85em", color: "#9ca3af" }}>{pay.type}</div>}
                      </>
                    ) : (
                      <span style={{ color: "#6b7280" }}>—</span>
                    )}
                  </td>
                  <td>
                    <button className={styles.editBtn} onClick={(e) => handleEditClick(e, row)}>
                      Edit
                    </button>
                    {mandownGroups.length > 0 && (
                      <button className={styles.assignBtn} onClick={(e) => { e.stopPropagation(); handleAssignToGroup(rowId); }}>
                        Assign
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Group Create/Edit Modal */}
      {showGroupModal && (
        <div className={styles.modalOverlay} onClick={() => setShowGroupModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
            <header className={styles.modalHeader}>
              <h2>{groupModalMode === "create" ? "Create New Group" : "Edit Group"}</h2>
              <button className={styles.modalClose} onClick={() => setShowGroupModal(false)}>
                <CgCloseR />
              </button>
            </header>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <label>Group Name</label>
                <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Enter group name..." autoFocus />
              </div>
              <div className={styles.modalField}>
                <label>Group Color</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    value={newGroupColor} 
                    onChange={(e) => setNewGroupColor(e.target.value)}
                    style={{ 
                      width: '60px', 
                      height: '40px', 
                      border: '1px solid #1f2937', 
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  />
                  <div 
                    style={{ 
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: newGroupColor,
                      color: textColorForBg(newGroupColor),
                      textAlign: 'center',
                      fontWeight: '600'
                    }}
                  >
                    Preview: {newGroupName || 'Group Name'}
                  </div>
                </div>
              </div>
            </div>
            <footer className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setShowGroupModal(false)}>
                Cancel
              </button>
              <button className={styles.primaryBtn} onClick={handleSaveGroup}>
                {groupModalMode === "create" ? "Create" : "Save"}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Assign to Group Modal */}
      {showAssignModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAssignModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
            <header className={styles.modalHeader}>
              <h2>Assign to Mandown Group</h2>
              <button className={styles.modalClose} onClick={() => setShowAssignModal(false)}>
                <CgCloseR />
              </button>
            </header>
            <div className={styles.modalBody}>
              <div className={styles.groupSelectList}>
                {mandownGroups.map((group) => {
                  const isAssigned = group.employeeIds.includes(assigningEmployeeId);
                  return (
                    <button
                      key={group.id}
                      onClick={() => handleConfirmAssign(group.id)}
                      disabled={isAssigned}
                      className={`${styles.groupSelectItem} ${isAssigned ? styles.assigned : ""}`}
                    >
                      {group.name} ({group.employeeIds.length})
                      {isAssigned && <span className={styles.assignedLabel}>✓ Already assigned</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <footer className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setShowAssignModal(false)}>
                Cancel
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Batch Add to Group Modal */}
      {showBatchAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowBatchAddModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "900px", maxHeight: "90vh" }}>
            <header className={styles.modalHeader}>
              <h2>Batch Add to "{mandownGroups.find(g => g.id === batchAddGroupId)?.name}"</h2>
              <button className={styles.modalClose} onClick={() => setShowBatchAddModal(false)}>
                <CgCloseR />
              </button>
            </header>
            <div className={styles.modalBody} style={{ padding: '16px' }}>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#9ca3af', fontSize: '14px' }}>
                  Selected: {selectedEmployees.size} / {sortedData.length}
                </div>
                <button 
                  className={styles.secondaryBtn} 
                  onClick={handleSelectAll}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  {selectedEmployees.size === sortedData.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #1f2937', borderRadius: '6px' }}>
                <table className={styles.table} style={{ margin: 0 }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#0f172a', zIndex: 1 }}>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedEmployees.size === sortedData.length && sortedData.length > 0}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th>EE Code</th>
                      <th>Name</th>
                      <th>Classification</th>
                      <th>Project</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((row) => {
                      const rowId = row.transfer_id || row.id || row.emp_code || row.employee_id;
                      const isSelected = selectedEmployees.has(rowId);
                      const group = mandownGroups.find(g => g.id === batchAddGroupId);
                      const alreadyInGroup = group?.employeeIds.includes(rowId);
                      
                      return (
                        <tr 
                          key={rowId} 
                          onClick={() => !alreadyInGroup && handleToggleEmployee(rowId)}
                          style={{ 
                            cursor: alreadyInGroup ? 'not-allowed' : 'pointer',
                            opacity: alreadyInGroup ? 0.5 : 1,
                            background: isSelected ? 'rgba(37, 99, 235, 0.2)' : 'transparent'
                          }}
                        >
                          <td onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => handleToggleEmployee(rowId)}
                              disabled={alreadyInGroup}
                            />
                          </td>
                          <td>{row.emp_code || row.employee_id}</td>
                          <td>
                            {row.emp_name || `${row.first_name || ""} ${row.last_name || ""}`.trim()}
                            {alreadyInGroup && <span style={{ marginLeft: '8px', color: '#10b981', fontSize: '11px' }}>✓ In group</span>}
                          </td>
                          <td>{row.classification || row.job_title}</td>
                          <td>{row.from_jobsite || row.fromJobsite || row.from_jobsite_key || row.project || row.current_jobsite}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <footer className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setShowBatchAddModal(false)}>
                Cancel
              </button>
              <button 
                className={styles.primaryBtn} 
                onClick={handleConfirmBatchAdd}
                disabled={selectedEmployees.size === 0}
              >
                Add {selectedEmployees.size} Employee(s)
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editingRow && (
        <div className={styles.modalOverlay} onClick={handleEditCancel}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <header className={styles.modalHeader}>
              <h2>Edit: {editingRow.emp_name || `${editingRow.first_name || ""} ${editingRow.last_name || ""}`}</h2>
              <button className={styles.modalClose} onClick={handleEditCancel} disabled={savingEdit}>
                <CgCloseR />
              </button>
            </header>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <label>Name</label>
                <input type="text" value={editDraft.emp_name || ""} onChange={(e) => handleEditChange("emp_name", e.target.value)} />
              </div>
              <div className={styles.modalField}>
                <label>Classification</label>
                <input type="text" value={editDraft.classification || ""} onChange={(e) => handleEditChange("classification", e.target.value)} />
              </div>
              <div className={styles.modalField}>
                <label>Supervisor</label>
                <input type="text" value={editDraft.supervisor || ""} onChange={(e) => handleEditChange("supervisor", e.target.value)} />
              </div>
              <div className={styles.modalField}>
                <label>Project</label>
                <input type="text" value={editDraft.from_jobsite || editDraft.fromJobsite || editDraft.project || ""} onChange={(e) => handleEditChange("from_jobsite", e.target.value)} />
              </div>
              <div className={styles.modalField}>
                <label>Status</label>
                <select value={editDraft.status || ""} onChange={(e) => handleEditChange("status", e.target.value)}>
                  <option value="">Select</option>
                  {uniqueStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {editError && <div className={styles.modalError}>{editError}</div>}
            </div>
            <footer className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={handleEditCancel} disabled={savingEdit}>
                Cancel
              </button>
              <button className={styles.primaryBtn} onClick={handleEditSave} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save"}
              </button>
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
