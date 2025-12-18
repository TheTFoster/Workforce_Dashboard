// src/components/EmployeeForm.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import styles from "../stylesheets/AddEmployee.module.css";
import api from "../api";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import HomeIcon from "../assets/home.svg?react";
import dbIcon from "../assets/database.svg";

function EmployeeForm({ mode = "create" }) {
  const isEdit = mode === "edit";
  const { id } = useParams(); // /employee/:id/edit
  const location = useLocation();
  const navigate = useNavigate();

  // ---- NEW: ref for opening file dialog from dropzone ----
  const fileInputRef = useRef(null);

  // Prefer navigation state for instant render; fall back to fetch by :id when editing
  const [prefilledEmployee, setPrefilledEmployee] = useState(
    location.state?.employee || null
  );

  useEffect(() => {
    if (isEdit && !prefilledEmployee?.employeeid) {
      (async () => {
        try {
          const { data } = await api.get(`/api/v1/employee/id/${id}`);
          setPrefilledEmployee(data || {});
        } catch (e) {
          console.error("Failed to load employee for edit:", e);
          toast.error("Failed to load employee for edit.");
        }
      })();
    }
  }, [isEdit, id, prefilledEmployee?.employeeid]);

  const formatDate = (date) =>
    date ? new Date(date).toISOString().split("T")[0] : "";

  const formatPhoneNumber = (phone) => {
    if (!phone) return "";
    // Remove all non-digits
    const digits = (phone || "").replace(/\D/g, "");
    // If already 10 digits, format as (XXX) XXX-XXXX
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    // Return as-is if not 10 digits (might be incomplete or invalid)
    return phone;
  };

  const buildState = (src = {}) => ({
    // core identity
    employeeid: src.employeeid || src.emp_id || "",
    firstName: src.firstName || src.first_name || src.legal_firstname || src.preferred_firstname || "",
    lastName: src.lastName || src.last_name || src.legal_lastname || "",
    preferredFirstName: src.preferredFirstName || src.preferred_firstname || "",
    nickname: src.nickname || "",
    employeename: src.employeename || src.employee_name || src.display_name || "",
    employeeCode: src.employeeCode || src.employee_code || src.emp_code || src.cec_id || "",
    xid: src.xid || src.tixid || "",
    badgeNum: src.badgeNum || src.badge_num || "",
    phoneNumber: formatPhoneNumber(src.phoneNumber || src.phone_number || src.primary_phone || src.work_phone || ""),
    workEmail: src.workEmail || src.work_email || "",
    personalEmail: src.personalEmail || src.personal_email || src.email || "",
    
    // dates
    startDate: src.startDate || src.start_date || src.hire_date || src.hireDate || "",
    endDate: src.endDate || src.end_date || "",
    hireDate: src.hireDate || src.hire_date || "",
    rehireDate: src.rehireDate || src.rehire_date || "",
    mostRecentHireDate: src.mostRecentHireDate || src.most_recent_hire_date || "",
    lastPayChange: src.lastPayChange || src.last_pay_change || "",
    lastPositionChangeDate: src.lastPositionChangeDate || src.last_position_change_date || "",
    birthDate: src.birthDate || src.birth_date || "",
    terminationDate: src.terminationDate || src.termination_date || "",
    terminationDate1: src.terminationDate1 || src.termination_date_1 || "",
    terminationDate2: src.terminationDate2 || src.termination_date_2 || "",
    leaveStart: src.leaveStart || src.leave_start || "",
    leaveEnd: src.leaveEnd || src.leave_end || "",
    lastWorkedDate: src.lastWorkedDate || src.last_worked_date || "",
    transferDate: src.transferDate || src.transfer_date || "",
    transferToDate: src.transferToDate || src.transfer_to_date || "",
    previousTerminationDate: src.previousTerminationDate || src.previous_termination_date || "",
    
    // location
    workLocation: src.workLocation || src.work_location || "",
    workLocationAddress: src.workLocationAddress || src.work_location_address || "",
    workLocationCity: src.workLocationCity || src.work_location_city || "",
    workLocationState: src.workLocationState || src.work_location_state || "",
    workLocationZip: src.workLocationZip || src.work_location_zip || "",
    workLocationCountry: src.workLocationCountry || src.work_location_country || "",
    primaryAddressLine1: src.primaryAddressLine1 || src.primary_address_line1 || "",
    primaryAddressLine2: src.primaryAddressLine2 || src.primary_address_line2 || "",

    // vendor/leased labor
    leasedLabor: src.leasedLabor || src.leased_labor || false,
    vendorName: src.vendorName || src.vendor_name || "",
    vendorAddressLine1: src.vendorAddressLine1 || src.vendor_address_line1 || "",
    vendorAddressLine2: src.vendorAddressLine2 || src.vendor_address_line2 || "",

    // employment & org
    supervisor: src.supervisor || src.supervisor_id || src.supervisor_name || "",
    supervisorPrimary: src.supervisorPrimary || src.supervisor_primary || src.supervisor_primary_id || "",
    supervisorSecondary: src.supervisorSecondary || src.supervisor_secondary || src.supervisor_secondary_id || "",
    workGroup: src.workGroup || src.work_group || src.workgroup || "",
    ranked: src.ranked || src.rank_id || src.rank || "",
    project: src.project || src.project_id || src.project_code || "",
    jobNumber: src.jobNumber || src.job_number || src.job_num || "",
    sponsor: src.sponsor || src.sponsor_id || src.sponsor_name || "",
    backupSponsor: src.backupSponsor || src.backup_sponsor || src.backup_sponsor_id || "",
    employeeStatus: src.employeeStatus || src.employee_status || src.status || "",
    businessTitle: src.businessTitle || src.business_title || "",
    positionTitle: src.positionTitle || src.position_title || "",
    positionType: src.positionType || src.position_type || "",
    timeInPosition: src.timeInPosition || src.time_in_position || "",
    managerLevel: src.managerLevel || src.manager_level || src.manager_tier || "",
    departmentDesc: src.departmentDesc || src.department_desc || src.department || "",
    subDepartmentDesc: src.subDepartmentDesc || src.sub_department_desc || src.sub_department || "",
    jobDesc: src.jobDesc || src.job_desc || src.job_description || "",
    
    // pay
    annualSalary: src.annualSalary || src.annual_salary || src.salary || "",
    payType: src.payType || src.pay_type || "",
    rate1: src.rate1 || src.rate_1 || src.hourly_rate || src.pay_rate || "",
    incentive: src.incentive || src.incentive_amount || "",
    
    // travel
    travelPref: src.travelPref || src.travel_pref || 0,
    travelNotes: src.travelNotes || "",
    travelers: src.travelers || "",
    travelAllowance: src.travelAllowance || "",
    
    // equipment
    ipad: src.ipad || "",
    laptop: src.laptop || "",
    
    // safety/compliance
    osha10: src.osha10 || "",
    osha30: src.osha30 || "",
    evaluationScore: src.evaluationScore || "",
    
    // time zone
    timeZoneCode: src.timeZoneCode || "",
    timeZoneDescription: src.timeZoneDescription || "",
    
    // language
    essLanguagePreference: src.essLanguagePreference || "",
    
    // contractor
    independentContractor: src.independentContractor || false,
    
    // license
    carLicenseNum: src.carLicenseNum || "",
    licenseType: src.licenseType || "",
    licenseExpiration: src.licenseExpiration || "",
    
    // transfer
    from: src.from || "",
    transferTo: src.transferTo || "",
    transfers: src.transfers || "",

    // JSON histories
    workHistoryEntries: (() => {
      try {
        return src.workHistory ? JSON.parse(src.workHistory) : [];
      } catch {
        return [];
      }
    })(),
    transferHistoryEntries: (() => {
      try {
        return src.transferHistory ? JSON.parse(src.transferHistory) : [];
      } catch {
        return [];
      }
    })(),

    // misc + training
    employeeVerify: src.employeeVerify || "",
    sm1BDDate: src.sm1BDDate || "",
    sm1BlueDotTrained: src.sm1BlueDotTrained || "",
    cecSm1ObDate: src.cecSm1ObDate || "",
    cecSm1Onboarding: src.cecSm1Onboarding || "",
    //Level 1 trainings
    level1: src.level1 || 0,
    lvl1SS: src.lvl1SS || "",
    lvl1MaterialHandling: src.lvl1MaterialHandling || "",
    lvl1LadderSafety: src.lvl1LadderSafety || "",
    lvl1FallProtection: src.lvl1FallProtection || "",
    lvl1SpotterTraining: src.lvl1SpotterTraining || "",
    lvl1ElectricalSafetyAwareness: src.lvl1ElectricalSafetyAwareness || "",
    lvl1Loto: src.lvl1Loto || "",
    lvl1EnergizedSteps: src.lvl1EnergizedSteps || "",
    lvl12MenVerify: src.lvl12MenVerify || "",
    lvl1JackStands: src.lvl1JackStands || "",
    lvl1CableTrayRollers: src.lvl1CableTrayRollers || "",
    lvl1CableCutting: src.lvl1CableCutting || "",
    lvl1CableStripping: src.lvl1CableStripping || "",
    //Level 2 Trainings
    level2: src.level2 || 0,
    lvl2CablePulliesInstall: src.lvl2CablePulliesInstall || "",
    lvl2CableSockSelection: src.lvl2CableSockSelection || "",
    lvl2CableConnectorInstall: src.lvl2CableConnectorInstall || "",
    lvl2CableLabeling: src.lvl2CableLabeling || "",
    lvl2Megging: src.lvl2Megging || "",
    lvl2CrimpingProcedures: src.lvl2CrimpingProcedures || "",
    lvl2DrillingHoles: src.lvl2DrillingHoles || "",
    //Level 3 Trainings
    level3: src.level3 || 0,
    lvl3ToolFeeds: src.lvl3ToolFeeds || "",
    lvl3Commissioning: src.lvl3Commissioning || "",
    lvl3Torqueing: src.lvl3Torqueing || "",
    lvl3TorqueSeal: src.lvl3TorqueSeal || "",
    lvl3BreakerManipulation: src.lvl3BreakerManipulation || "",
    lvl3TurnOffProcedure: src.lvl3TurnOffProcedure || "",
    lvl3TurnOnProcedures: src.lvl3TurnOnProcedures || "",
    lvl3EnergizePermit: src.lvl3EnergizePermit || "",
    lvl3QEW: src.lvl3QEW || "",
    //Color Trainings
    blackEnergizedWork: src.blackEnergizedWork || "",
    greenTurnOnOff: src.greenTurnOnOff || "",
    redTroubleshoot: src.redTroubleshoot || "",
    aquaCablePulling: src.aquaCablePulling || "",
    blueTerminations: src.blueTerminations || "",
    goldManagement: src.goldManagement || "",
    fabOrEnergizedWork: src.fabOrEnergizedWork || "",
    threeTwoOne: src.threeTwoOne || "",
    // notes/files/tech
    notes: src.notes || "",
    moreNotes: src.moreNotes || "",
    gwaTagNum: src.gwaTagNum || "",
    codeToClean: src.codeToClean || "",
    filesForEmployee: [],
    techName: src.techName || "",
    techIdNum: src.techIdNum || "",
    shirtSize: src.shirtSize || "",
    languageSpoken: src.languageSpoken || "",
    trainingLevelOne: src.trainingLevelOne || "",
    trainingLevelTwo: src.trainingLevelTwo || "",
    trainingLevelThree: src.trainingLevelThree || "",
    onboardingStatus: src.onboardingStatus || "",
  });

  const [employeeData, setEmployeeData] = useState(
    buildState(prefilledEmployee || {})
  );
  useEffect(() => {
    setEmployeeData(buildState(prefilledEmployee || {}));
  }, [prefilledEmployee]);

  // --- File management state ---
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Fetch existing files when editing
  useEffect(() => {
    if (isEdit && employeeData.employeeid) {
      setIsLoadingFiles(true);
      api.get(`/api/v1/employee/${employeeData.employeeid}/files`)
        .then(({ data }) => setUploadedFiles(data || []))
        .catch((e) => console.error("Failed to load files:", e))
        .finally(() => setIsLoadingFiles(false));
    }
  }, [isEdit, employeeData.employeeid]);

  // --- Transfer sync state ---
  const [transferRecords, setTransferRecords] = useState([]);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(false);

  // Fetch existing transfers from transfers_v2 table when editing
  useEffect(() => {
    if (isEdit && employeeData.employeeCode) {
      setIsLoadingTransfers(true);
      api.get(`/api/v1/transfers/by-emp-code/${employeeData.employeeCode}`)
        .then(({ data }) => {
          setTransferRecords(data || []);
          // Sync to employee's transferHistoryEntries
          if (data && data.length > 0) {
            const mapped = data.map(t => ({
              from: t.fromJobsite || t.from_jobsite || "",
              to: t.toJobsite || t.to_jobsite || "",
              date: t.effectiveDate || t.effective_date || "",
              notes: t.notes || "",
              transferId: t.transferId || t.transfer_id, // Keep reference to DB record
            }));
            setEmployeeData(prev => ({
              ...prev,
              transferHistoryEntries: mapped
            }));
          }
        })
        .catch((e) => console.error("Failed to load transfers:", e))
        .finally(() => setIsLoadingTransfers(false));
    }
  }, [isEdit, employeeData.employeeCode]);

  // --- Draft persistence (sessionStorage) keyed by mode/id ---
  const draftKey = useMemo(
    () => `employee-form:${isEdit ? "edit" : "create"}:${id || "new"}`,
    [isEdit, id]
  );

  // Hydrate from saved draft (merge so prefill stays, draft overrides what you've typed)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        // Ensure phone number is formatted properly
        if (draft.phoneNumber) {
          draft.phoneNumber = formatPhoneNumber(draft.phoneNumber);
        }
        setEmployeeData((prev) => ({ ...prev, ...draft }));
      }
    } catch {}
  }, [draftKey]);

  // Save draft on every change
  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(employeeData));
    } catch {}
  }, [draftKey, employeeData]);

  // dynamic dropdowns
  const [uniqueSupervisors, setUniqueSupervisors] = useState([]);
  const [uniqueGroups, setUniqueGroups] = useState([]);
  const [uniqueRanks, setUniqueRanks] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueJobNumbers, setUniqueJobNumbers] = useState([]);
  const [nextAvailableId, setNextAvailableId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: employees } = await api.get("/api/v1/employee/list");
        // Handle different response formats: array, nested array, or object with array
        let list = Array.isArray(employees)
          ? employees
          : Array.isArray(employees?.content)
          ? employees.content
          : Array.isArray(employees?.data)
          ? employees.data
          : [];
        setUniqueSupervisors(
          [...new Set(list.map((e) => e.supervisor).filter(Boolean))].sort()
        );
        setUniqueGroups(
          [...new Set(list.map((e) => e.workGroup).filter(Boolean))].sort()
        );
        setUniqueRanks(
          [...new Set(list.map((e) => e.ranked).filter(Boolean))].sort()
        );
        setUniqueProjects(
          [...new Set(list.map((e) => e.project).filter(Boolean))].sort()
        );
        setUniqueJobNumbers(
          [...new Set(list.map((e) => e.jobNumber).filter(Boolean))].sort()
        );
      } catch (e) {
        console.error("Failed to fetch lookup sets:", e);
      }

      try {
        if (isEdit) {
          setNextAvailableId(employeeData.employeeid || id);
        } else {
          const { data } = await api.get(
            "/api/v1/employee/employees/latest-id"
          );
          setNextAvailableId((data?.latestEmployeeId ?? 0) + 1);
        }
      } catch (e) {
        console.error("Failed to compute next ID:", e);
        setNextAvailableId("N/A");
      }
    })();
  }, [isEdit, id, employeeData.employeeid]);

  // toggles for custom inputs
  const [showCustomSupervisorInput, setShowCustomSupervisorInput] =
    useState(false);
  const [showCustomGroupInput, setShowCustomGroupInput] = useState(false);
  const [showCustomRankInput, setShowCustomRankInput] = useState(false);
  const [showCustomProjectInput, setShowCustomProjectInput] = useState(false);
  const [showCustomJobNumberInput, setShowCustomJobNumberInput] =
    useState(false);

  // section handling
  const [viewSection, setViewSection] = useState("Employee Info");
  const sectionOrder = useMemo(
    () => [
      "Employee Info",
      "Employment & Organization",
      "Dates",
      "Location & Address",
      "Pay & Benefits",
      "Vendor & Equipment",
      "Levels & Training",
      "Work & Transfer History",
      "Notes",
    ],
    []
  );

  // ---- NEW: progress math for sticky status bar ----
  const currentIndex = useMemo(
    () => Math.max(0, sectionOrder.indexOf(viewSection)),
    [viewSection, sectionOrder]
  );
  const progressPercent = useMemo(
    () => Math.round(((currentIndex + 1) / sectionOrder.length) * 100),
    [currentIndex, sectionOrder.length]
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEmployeeData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneNumberChange = (e) => {
    let input = e.target.value.replace(/\D/g, "");
    if (input.length > 3 && input.length <= 6)
      input = `(${input.slice(0, 3)}) ${input.slice(3)}`;
    else if (input.length > 6)
      input = `(${input.slice(0, 3)}) ${input.slice(3, 6)}-${input.slice(
        6,
        10
      )}`;
    if (input.length > 14) input = input.slice(0, 14);
    setEmployeeData((prev) => ({ ...prev, phoneNumber: input }));
  };

  const validateForm = () => {
    const required = [
      "firstName",
      "lastName",
      "employeeCode",
      "startDate",
      "workGroup",
      "ranked",
      "project",
      "jobNumber",
    ];
    const invalid = required.filter(
      (k) => !String(employeeData[k] || "").trim()
    );
    if (invalid.length) {
      toast.error(`Missing: ${invalid.join(", ")}`);
      return false;
    }
    return true;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- File upload helpers ----
  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    setEmployeeData((prev) => ({
      ...prev,
      filesForEmployee: [...(prev.filesForEmployee || []), ...incoming],
    }));
  };
  const handleFileChange = (e) => {
    addFiles(e.target.files);
    // allow selecting same file again
    e.target.value = "";
  };

  const handleFileUpload = async (file) => {
    if (!employeeData.employeeid) {
      toast.error("Please save the employee first before uploading files");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post(
        `/api/v1/employee/${employeeData.employeeid}/files`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      toast.success(`File "${file.name}" uploaded successfully`);
      // Refresh file list
      const { data: files } = await api.get(
        `/api/v1/employee/${employeeData.employeeid}/files`
      );
      setUploadedFiles(files || []);
      // Remove from pending list
      setEmployeeData((prev) => ({
        ...prev,
        filesForEmployee: (prev.filesForEmployee || []).filter((f) => f !== file),
      }));
    } catch (err) {
      toast.error(`Failed to upload "${file.name}": ${err.message}`);
    }
  };

  const handleFileDelete = async (fileId, fileName) => {
    if (!employeeData.employeeid) return;

    if (!window.confirm(`Delete "${fileName}"?`)) return;

    try {
      await api.delete(`/api/v1/employee/${employeeData.employeeid}/files/${fileId}`);
      toast.success(`File "${fileName}" deleted`);
      setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      toast.error(`Failed to delete "${fileName}": ${err.message}`);
    }
  };

  const handleFileDownload = async (fileId, fileName) => {
    if (!employeeData.employeeid) return;

    try {
      const response = await api.get(
        `/api/v1/employee/${employeeData.employeeid}/files/${fileId}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(`Failed to download "${fileName}": ${err.message}`);
    }
  };

  // --- Transfer sync functions ---
  const syncTransferToTable = async (transfer, index) => {
    if (!employeeData.employeeCode) {
      toast.error("Employee code required to sync transfers");
      return;
    }

    try {
      const payload = {
        empCode: employeeData.employeeCode,
        empName: `${employeeData.firstName || ""} ${employeeData.lastName || ""}`.trim(),
        fromJobsite: transfer.from || "",
        toJobsite: transfer.to || "",
        effectiveDate: transfer.date || null,
        notes: transfer.notes || "",
      };

      if (transfer.transferId) {
        // Update existing transfer
        await api.put(`/api/v1/transfers/${transfer.transferId}`, payload);
        toast.success("Transfer updated in transfers table");
      } else {
        // Create new transfer
        const { data } = await api.post("/api/v1/transfers", payload);
        // Update local state with new ID
        setEmployeeData(prev => {
          const arr = [...prev.transferHistoryEntries];
          arr[index] = { ...arr[index], transferId: data.transferId || data.transfer_id };
          return { ...prev, transferHistoryEntries: arr };
        });
        toast.success("Transfer added to transfers table");
      }
    } catch (err) {
      toast.error(`Failed to sync transfer: ${err.message}`);
    }
  };

  const deleteTransferFromTable = async (transferId) => {
    if (!transferId) return;

    try {
      await api.delete(`/api/v1/transfers/${transferId}`);
      toast.success("Transfer deleted from transfers table");
    } catch (err) {
      console.error("Failed to delete transfer:", err);
    }
  };

  // ---- NEW: DnD helpers for reordering history entries ----
  const dragRef = useRef({ list: null, from: -1 });
  const onDragStart = (list, from) => (e) => {
    dragRef.current = { list, from };
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (list, to) => (e) => {
    e.preventDefault();
    const { list: l, from } = dragRef.current;
    if (l !== list || from === to || from < 0) return;
    if (list === "work") {
      const arr = [...(employeeData.workHistoryEntries || [])];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      setEmployeeData((p) => ({ ...p, workHistoryEntries: arr }));
    } else if (list === "transfer") {
      const arr = [...(employeeData.transferHistoryEntries || [])];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      setEmployeeData((p) => ({ ...p, transferHistoryEntries: arr }));
    }
    dragRef.current = { list: null, from: -1 };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (viewSection !== "Notes") {
      setViewSection("Notes");
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.info("Finish the last section to submit.");
      return;
    }

    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...employeeData,
        employeeid: isEdit ? employeeData.employeeid || id : undefined,
        employeename:
          `${employeeData.firstName} ${employeeData.lastName}`.trim(),

        // normalized dates
        startDate: formatDate(employeeData.startDate),
        endDate: formatDate(employeeData.endDate),
        hireDate: formatDate(employeeData.hireDate),
        rehireDate: formatDate(employeeData.rehireDate),
        mostRecentHireDate: formatDate(employeeData.mostRecentHireDate),
        lastPayChange: formatDate(employeeData.lastPayChange),
        lastPositionChangeDate: formatDate(employeeData.lastPositionChangeDate),
        birthDate: formatDate(employeeData.birthDate),
        terminationDate: formatDate(employeeData.terminationDate),
        terminationDate1: formatDate(employeeData.terminationDate1),
        terminationDate2: formatDate(employeeData.terminationDate2),
        leaveStart: formatDate(employeeData.leaveStart),
        leaveEnd: formatDate(employeeData.leaveEnd),
        lastWorkedDate: formatDate(employeeData.lastWorkedDate),
        transferDate: formatDate(employeeData.transferDate),
        transferToDate: formatDate(employeeData.transferToDate),
        previousTerminationDate: formatDate(employeeData.previousTerminationDate),
        osha10: formatDate(employeeData.osha10),
        osha30: formatDate(employeeData.osha30),
        licenseExpiration: formatDate(employeeData.licenseExpiration),
        sm1BDDate: formatDate(employeeData.sm1BDDate),
        cecSm1ObDate: formatDate(employeeData.cecSm1ObDate),
        lvl1SS: formatDate(employeeData.lvl1SS),
        lvl1MaterialHandling: formatDate(employeeData.lvl1MaterialHandling),
        lvl1LadderSafety: formatDate(employeeData.lvl1LadderSafety),
        lvl1FallProtection: formatDate(employeeData.lvl1FallProtection),
        lvl1SpotterTraining: formatDate(employeeData.lvl1SpotterTraining),
        lvl1ElectricalSafetyAwareness: formatDate(
          employeeData.lvl1ElectricalSafetyAwareness
        ),
        lvl1Loto: formatDate(employeeData.lvl1Loto),
        lvl1EnergizedSteps: formatDate(employeeData.lvl1EnergizedSteps),
        lvl12MenVerify: formatDate(employeeData.lvl12MenVerify),
        lvl1JackStands: formatDate(employeeData.lvl1JackStands),
        lvl1CableTrayRollers: formatDate(employeeData.lvl1CableTrayRollers),
        lvl1CableCutting: formatDate(employeeData.lvl1CableCutting),
        lvl1CableStripping: formatDate(employeeData.lvl1CableStripping),
        lvl2CablePulliesInstall: formatDate(
          employeeData.lvl2CablePulliesInstall
        ),
        lvl2CableSockSelection: formatDate(employeeData.lvl2CableSockSelection),
        lvl2CableConnectorInstall: formatDate(
          employeeData.lvl2CableConnectorInstall
        ),
        lvl2CableLabeling: formatDate(employeeData.lvl2CableLabeling),
        lvl2Megging: formatDate(employeeData.lvl2Megging),
        lvl2CrimpingProcedures: formatDate(employeeData.lvl2CrimpingProcedures),
        lvl2DrillingHoles: formatDate(employeeData.lvl2DrillingHoles),
        lvl3ToolFeeds: formatDate(employeeData.lvl3ToolFeeds),
        lvl3Commissioning: formatDate(employeeData.lvl3Commissioning),
        lvl3Torqueing: formatDate(employeeData.lvl3Torqueing),
        lvl3TorqueSeal: formatDate(employeeData.lvl3TorqueSeal),
        lvl3BreakerManipulation: formatDate(
          employeeData.lvl3BreakerManipulation
        ),
        lvl3TurnOffProcedure: formatDate(employeeData.lvl3TurnOffProcedure),
        lvl3TurnOnProcedures: formatDate(employeeData.lvl3TurnOnProcedures),
        lvl3EnergizePermit: formatDate(employeeData.lvl3EnergizePermit),
        lvl3QEW: formatDate(employeeData.lvl3QEW),

        // histories -> JSON strings
        workHistory: JSON.stringify(employeeData.workHistoryEntries || []),
        transferHistory: JSON.stringify(
          employeeData.transferHistoryEntries || []
        ),
      };

      const formData = new FormData();
      for (const key in payload) {
        if (key !== "filesForEmployee") {
          formData.append(key, payload[key] ?? "");
        }
      }
      if (employeeData.filesForEmployee?.length) {
        for (const file of employeeData.filesForEmployee) {
          formData.append("filesForEmployee", file, file.name);
        }
      }

      const url = isEdit
        ? `/api/v1/employee/id/${employeeData.employeeid || id}`
        : "/api/v1/employee/save";
      const method = isEdit ? "put" : "post";

      // 🔑 Always refresh CSRF and send header (prevents 403)
      let token;
      try {
        const { data } = await api.get("/csrf-token");
        token = data?.token;
      } catch {}

      const response = await api({
        method,
        url,
        data: formData,
        withCredentials: true,
        headers: token ? { "X-XSRF-TOKEN": token } : undefined,
      });

      if (response.data?.status === "error") {
        toast.error(response.data.message || "Server reported an error.");
        return;
      }

      toast.success(
        isEdit
          ? "Employee updated successfully!"
          : "Employee added successfully!"
      );
      try {
        sessionStorage.removeItem(draftKey);
      } catch {}
      navigate("/home");
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Failed to save employee. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearForm = () => setEmployeeData(buildState({}));
  const handleNextSection = () => {
    const i = sectionOrder.indexOf(viewSection);
    if (i < sectionOrder.length - 1) setViewSection(sectionOrder[i + 1]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handlePreviousSection = () => {
    const i = sectionOrder.indexOf(viewSection);
    if (i > 0) setViewSection(sectionOrder[i - 1]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // UI
  return (
    <div className={styles.container}>
      <ToastContainer position="top-right" autoClose={3000} />

      {/* --- Sticky progress/status bar (replaces old text progress) --- */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <img src={dbIcon} alt="DB Icon" style={{ width: 30 }} />
        </div>

        <div className={styles.headerCenter}>
          <div className={styles.headerTitleRow}>
            <span className={styles.headerTitle}>
              {isEdit ? "Edit Employee" : "Add Employee"}
            </span>
            <span className={styles.headerMeta}>
              Section {currentIndex + 1} of {sectionOrder.length} ·{" "}
              {progressPercent}% — <strong>{viewSection}</strong>
            </span>
            {nextAvailableId && (
              <span className={styles.headerId}>
                {isEdit ? "Employee ID" : "Next ID"}: {nextAvailableId}
              </span>
            )}
          </div>

          <div
            className={styles.headerTrack}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            aria-label="Completion percentage"
          >
            <div
              className={styles.headerFill}
              style={{ width: `${progressPercent}%` }}
            />
            <div className={styles.headerTicks}>
              {[20, 40, 60, 80, 100].map((p) => (
                <div
                  key={p}
                  className={styles.headerTick}
                  style={{ left: `${p}%` }}
                >
                  <span className={styles.headerTickLabel}>{p}%</span>
                  <span className={styles.headerTickLine} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.headerRight}>
          <button
            onClick={() => navigate("/home")}
            className={styles.homeButton}
            title="Home"
          >
            <HomeIcon className={styles.homeIcon} />
          </button>
          <button
            type="button"
            onClick={handleClearForm}
            className={styles.clearButton}
            title="Clear form"
          >
            Clear
          </button>
        </div>
      </header>

      <main className={styles.mainContent}>
        {/* Section tabs */}
        <div className={styles.radioContainer}>
          {sectionOrder.map((section) => (
            <label key={section}>
              <input
                type="radio"
                checked={viewSection === section}
                onChange={() => setViewSection(section)}
              />
              <span>{section}</span>
            </label>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            if (viewSection !== "Notes") e.preventDefault();
            else handleSubmit(e);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && viewSection !== "Notes")
              e.preventDefault();
          }}
          className={styles.form}
        >
          {viewSection === "Employee Info" && (
            <section className={styles.section}>
              <h2>Employee Information</h2>

              <div className={styles.fieldGroup}>
                <label>First Name</label>
                <input type="text" name="firstName" value={employeeData.firstName} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Last Name</label>
                <input type="text" name="lastName" value={employeeData.lastName} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Preferred First Name</label>
                <input type="text" name="preferredFirstName" value={employeeData.preferredFirstName} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Nickname</label>
                <input type="text" name="nickname" value={employeeData.nickname} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>CEC ID</label>
                <input type="text" name="employeeCode" value={employeeData.employeeCode} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>XID</label>
                <input type="text" name="xid" value={employeeData.xid} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Badge Number</label>
                <input type="text" name="badgeNum" value={employeeData.badgeNum} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Phone Number</label>
                <input type="text" name="phoneNumber" value={employeeData.phoneNumber} onChange={handlePhoneNumberChange} maxLength={14} placeholder="(XXX) XXX-XXXX" />
              </div>
              <div className={styles.fieldGroup}>
                <label>Work Email</label>
                <input type="email" name="workEmail" value={employeeData.workEmail} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Personal Email</label>
                <input type="email" name="personalEmail" value={employeeData.personalEmail} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Language Preference</label>
                <input type="text" name="essLanguagePreference" value={employeeData.essLanguagePreference} onChange={handleInputChange} />
              </div>
            </section>
          )}

          {viewSection === "Employment & Organization" && (
            <section className={styles.section}>
              <h2>Employment & Organization</h2>

              <div className={styles.fieldGroup}>
                <label>Employee Status</label>
                <input type="text" name="employeeStatus" value={employeeData.employeeStatus} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Independent Contractor</label>
                <select name="independentContractor" value={employeeData.independentContractor} onChange={handleInputChange}>
                  <option value={false}>No</option>
                  <option value={true}>Yes</option>
                </select>
              </div>

              <h3>Supervisors & Sponsors</h3>
              <div className={styles.fieldGroup}>
                <label>Supervisor</label>
                <select
                  name="supervisor"
                  value={employeeData.supervisor === "custom" ? "" : employeeData.supervisor}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "custom") {
                      setEmployeeData((p) => ({ ...p, supervisor: "" }));
                      setShowCustomSupervisorInput(true);
                    } else {
                      setEmployeeData((p) => ({ ...p, supervisor: value }));
                      setShowCustomSupervisorInput(false);
                    }
                  }}
                >
                  <option value="">Select Supervisor</option>
                  {uniqueSupervisors.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="custom">Add New Supervisor</option>
                </select>
                {showCustomSupervisorInput && (
                  <input type="text" placeholder="Enter new supervisor" value={employeeData.supervisor}
                    onChange={(e) => setEmployeeData((p) => ({ ...p, supervisor: e.target.value }))}
                    className={styles.customInput}
                  />
                )}
              </div>
              <div className={styles.fieldGroup}>
                <label>Supervisor Primary</label>
                <input type="text" name="supervisorPrimary" value={employeeData.supervisorPrimary} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Supervisor Secondary</label>
                <input type="text" name="supervisorSecondary" value={employeeData.supervisorSecondary} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Sponsor</label>
                <input type="text" name="sponsor" value={employeeData.sponsor} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Backup Sponsor</label>
                <input type="text" name="backupSponsor" value={employeeData.backupSponsor} onChange={handleInputChange} />
              </div>

              <h3>Group & Project</h3>
              <div className={styles.fieldGroup}>
                <label>Group</label>
                <select
                  name="workGroup"
                  value={employeeData.workGroup === "custom" ? "" : employeeData.workGroup}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "custom") {
                      setEmployeeData((p) => ({ ...p, workGroup: "" }));
                      setShowCustomGroupInput(true);
                    } else {
                      setEmployeeData((p) => ({ ...p, workGroup: value }));
                      setShowCustomGroupInput(false);
                    }
                  }}
                >
                  <option value="">Select Group</option>
                  {uniqueGroups.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                  <option value="custom">Add New Group</option>
                </select>
                {showCustomGroupInput && (
                  <input type="text" placeholder="Enter new group" value={employeeData.workGroup}
                    onChange={(e) => setEmployeeData((p) => ({ ...p, workGroup: e.target.value }))}
                    className={styles.customInput}
                  />
                )}
              </div>
              <div className={styles.fieldGroup}>
                <label>Ranked</label>
                <select
                  name="ranked"
                  value={employeeData.ranked === "custom" ? "" : employeeData.ranked}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "custom") {
                      setEmployeeData((p) => ({ ...p, ranked: "" }));
                      setShowCustomRankInput(true);
                    } else {
                      setEmployeeData((p) => ({ ...p, ranked: value }));
                      setShowCustomRankInput(false);
                    }
                  }}
                >
                  <option value="">Select Rank</option>
                  {uniqueRanks.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value="custom">Add New Rank</option>
                </select>
                {showCustomRankInput && (
                  <input type="text" placeholder="Enter new rank" value={employeeData.ranked}
                    onChange={(e) => setEmployeeData((p) => ({ ...p, ranked: e.target.value }))}
                    className={styles.customInput}
                  />
                )}
              </div>
              <div className={styles.fieldGroup}>
                <label>Project Name</label>
                <select
                  name="project"
                  value={employeeData.project === "custom" ? "" : employeeData.project}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "custom") {
                      setEmployeeData((p) => ({ ...p, project: "" }));
                      setShowCustomProjectInput(true);
                    } else {
                      setEmployeeData((p) => ({ ...p, project: value }));
                      setShowCustomProjectInput(false);
                    }
                  }}
                >
                  <option value="">Select Project</option>
                  {uniqueProjects.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  <option value="custom">Add New Project</option>
                </select>
                {showCustomProjectInput && (
                  <input type="text" placeholder="Enter new project" value={employeeData.project}
                    onChange={(e) => setEmployeeData((p) => ({ ...p, project: e.target.value }))}
                    className={styles.customInput}
                  />
                )}
              </div>
              <div className={styles.fieldGroup}>
                <label>Job #</label>
                <select
                  name="jobNumber"
                  value={employeeData.jobNumber === "custom" ? "" : employeeData.jobNumber}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "custom") {
                      setEmployeeData((p) => ({ ...p, jobNumber: "" }));
                      setShowCustomJobNumberInput(true);
                    } else {
                      setEmployeeData((p) => ({ ...p, jobNumber: value }));
                      setShowCustomJobNumberInput(false);
                    }
                  }}
                >
                  <option value="">Select Job #</option>
                  {uniqueJobNumbers.map((jn) => (
                    <option key={jn} value={jn}>{jn}</option>
                  ))}
                  <option value="custom">Add New Job #</option>
                </select>
                {showCustomJobNumberInput && (
                  <input type="text" placeholder="Enter new job number" value={employeeData.jobNumber}
                    onChange={(e) => setEmployeeData((p) => ({ ...p, jobNumber: e.target.value }))}
                    className={styles.customInput}
                  />
                )}
              </div>

              <h3>Titles & Department</h3>
              <div className={styles.fieldGroup}>
                <label>Business Title</label>
                <input type="text" name="businessTitle" value={employeeData.businessTitle} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Position Title</label>
                <input type="text" name="positionTitle" value={employeeData.positionTitle} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Position Type</label>
                <input type="text" name="positionType" value={employeeData.positionType} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Time In Position</label>
                <input type="text" name="timeInPosition" value={employeeData.timeInPosition} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Manager Level</label>
                <input type="text" name="managerLevel" value={employeeData.managerLevel} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Department Description</label>
                <input type="text" name="departmentDesc" value={employeeData.departmentDesc} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Sub-Department Description</label>
                <input type="text" name="subDepartmentDesc" value={employeeData.subDepartmentDesc} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Job Description</label>
                <input type="text" name="jobDesc" value={employeeData.jobDesc} onChange={handleInputChange} />
              </div>

              <h3>Time Zone</h3>
              <div className={styles.fieldGroup}>
                <label>Time Zone Code</label>
                <input type="text" name="timeZoneCode" value={employeeData.timeZoneCode} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Time Zone Description</label>
                <input type="text" name="timeZoneDescription" value={employeeData.timeZoneDescription} onChange={handleInputChange} />
              </div>

              <h3>SM1 & Verification</h3>
              <div className={styles.fieldGroup}>
                <label>Employee Verify</label>
                <select name="employeeVerify" value={employeeData.employeeVerify} onChange={handleInputChange}>
                  <option value="">Select</option>
                  <option value="Y">Y</option>
                  <option value="N">N</option>
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label>SM1 BD Date</label>
                <input type="date" name="sm1BDDate" value={employeeData.sm1BDDate} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>SM1 Blue Dot Trained</label>
                <select name="sm1BlueDotTrained" value={employeeData.sm1BlueDotTrained} onChange={handleInputChange}>
                  <option value="">Select</option>
                  <option value="Y">Y</option>
                  <option value="N">N</option>
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label>CEC SM1 OB Date</label>
                <input type="date" name="cecSm1ObDate" value={employeeData.cecSm1ObDate} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>CEC SM1 Onboarding</label>
                <select name="cecSm1Onboarding" value={employeeData.cecSm1Onboarding} onChange={handleInputChange}>
                  <option value="">Select</option>
                  <option value="Y">Y</option>
                  <option value="N">N</option>
                </select>
              </div>
            </section>
          )}

          {viewSection === "Dates" && (
            <section className={styles.section}>
              <h2>Dates</h2>

              <div className={styles.fieldGroup}>
                <label>Start Date</label>
                <input type="date" name="startDate" value={employeeData.startDate} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>End Date</label>
                <input type="date" name="endDate" value={employeeData.endDate} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Hire Date</label>
                <input type="date" name="hireDate" value={employeeData.hireDate} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Most Recent Hire Date</label>
                <input type="date" name="mostRecentHireDate" value={employeeData.mostRecentHireDate} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Rehire Date</label>
                <input type="date" name="rehireDate" value={employeeData.rehireDate} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Birth Date</label>
                <input type="date" name="birthDate" value={employeeData.birthDate} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Last Pay Change</label>
                <input type="date" name="lastPayChange" value={employeeData.lastPayChange} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Last Position Change Date</label>
                <input type="date" name="lastPositionChangeDate" value={employeeData.lastPositionChangeDate} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Transfer Date</label>
                <input type="date" name="transferDate" value={employeeData.transferDate} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Transfer To Date</label>
                <input type="date" name="transferToDate" value={employeeData.transferToDate} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Termination Date</label>
                <input type="date" name="terminationDate" value={employeeData.terminationDate} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Termination Date 1</label>
                <input type="date" name="terminationDate1" value={employeeData.terminationDate1} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Termination Date 2</label>
                <input type="date" name="terminationDate2" value={employeeData.terminationDate2} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Previous Termination Date</label>
                <input type="date" name="previousTerminationDate" value={employeeData.previousTerminationDate} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Last Worked Date</label>
                <input type="date" name="lastWorkedDate" value={employeeData.lastWorkedDate} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Leave Start</label>
                <input type="date" name="leaveStart" value={employeeData.leaveStart} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Leave End</label>
                <input type="date" name="leaveEnd" value={employeeData.leaveEnd} onChange={handleInputChange} />
              </div>
            </section>
          )}

          {viewSection === "Location & Address" && (
            <section className={styles.section}>
              <h2>Location & Address</h2>

              <h3>Work Location</h3>
              <div className={styles.fieldGroup}>
                <label>Work Location</label>
                <input type="text" name="workLocation" value={employeeData.workLocation} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Work Location Address</label>
                <input type="text" name="workLocationAddress" value={employeeData.workLocationAddress} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Work Location City</label>
                <input type="text" name="workLocationCity" value={employeeData.workLocationCity} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Work Location State</label>
                <input type="text" name="workLocationState" value={employeeData.workLocationState} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Work Location Zip</label>
                <input type="text" name="workLocationZip" value={employeeData.workLocationZip} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Work Location Country</label>
                <input type="text" name="workLocationCountry" value={employeeData.workLocationCountry} onChange={handleInputChange} />
              </div>

              <h3>Primary Address</h3>
              <div className={styles.fieldGroup}>
                <label>Primary Address Line 1</label>
                <input type="text" name="primaryAddressLine1" value={employeeData.primaryAddressLine1} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Primary Address Line 2</label>
                <input type="text" name="primaryAddressLine2" value={employeeData.primaryAddressLine2} onChange={handleInputChange} />
              </div>
            </section>
          )}

          {viewSection === "Pay & Benefits" && (
            <section className={styles.section}>
              <h2>Pay & Benefits</h2>

              <div className={styles.fieldGroup}>
                <label>Pay Type</label>
                <input type="text" name="payType" value={employeeData.payType} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Annual Salary</label>
                <input type="number" step="0.01" name="annualSalary" value={employeeData.annualSalary} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Rate 1 (Hourly)</label>
                <input type="number" step="0.01" name="rate1" value={employeeData.rate1} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Incentive</label>
                <input type="text" name="incentive" value={employeeData.incentive} onChange={handleInputChange} />
              </div>

              <h3>Travel</h3>
              <div className={styles.fieldGroup}>
                <label>Travel Preference</label>
                <select name="travelPref" value={employeeData.travelPref} onChange={handleInputChange}>
                  <option value="0">No preference recorded</option>
                  <option value="1">Willing to Travel</option>
                  <option value="2">Willing to Travel Within State</option>
                  <option value="3">Prefers to Stay Local</option>
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label>Travel Notes</label>
                <textarea name="travelNotes" value={employeeData.travelNotes} onChange={handleInputChange} className={styles.largeTextBox}></textarea>
              </div>
              <div className={styles.fieldGroup}>
                <label>Travel Allowance</label>
                <input type="number" step="0.01" name="travelAllowance" value={employeeData.travelAllowance} onChange={handleInputChange} />
              </div>

              <h3>Safety & Compliance</h3>
              <div className={styles.fieldGroup}>
                <label>OSHA 10 Date</label>
                <input type="date" name="osha10" value={employeeData.osha10} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>OSHA 30 Date</label>
                <input type="date" name="osha30" value={employeeData.osha30} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Evaluation Score</label>
                <input type="number" step="0.01" name="evaluationScore" value={employeeData.evaluationScore} onChange={handleInputChange} />
              </div>

              <h3>Driver License</h3>
              <div className={styles.fieldGroup}>
                <label>License Number</label>
                <input type="text" name="carLicenseNum" value={employeeData.carLicenseNum} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>License Type</label>
                <input type="text" name="licenseType" value={employeeData.licenseType} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>License Expiration</label>
                <input type="date" name="licenseExpiration" value={employeeData.licenseExpiration} onChange={handleInputChange} />
              </div>
            </section>
          )}

          {viewSection === "Vendor & Equipment" && (
            <section className={styles.section}>
              <h2>Vendor & Equipment</h2>

              <h3>Leased Labor / Vendor</h3>
              <div className={styles.fieldGroup}>
                <label>Leased Labor</label>
                <select name="leasedLabor" value={employeeData.leasedLabor} onChange={handleInputChange}>
                  <option value={false}>No</option>
                  <option value={true}>Yes</option>
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label>Vendor Name</label>
                <input type="text" name="vendorName" value={employeeData.vendorName} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Vendor Address Line 1</label>
                <input type="text" name="vendorAddressLine1" value={employeeData.vendorAddressLine1} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Vendor Address Line 2</label>
                <input type="text" name="vendorAddressLine2" value={employeeData.vendorAddressLine2} onChange={handleInputChange} />
              </div>

              <h3>Equipment</h3>
              <div className={styles.fieldGroup}>
                <label>iPad</label>
                <input type="text" name="ipad" value={employeeData.ipad} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Laptop</label>
                <input type="text" name="laptop" value={employeeData.laptop} onChange={handleInputChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label>GWA Tag Number</label>
                <input type="text" name="gwaTagNum" value={employeeData.gwaTagNum} onChange={handleInputChange} />
              </div>
            </section>
          )}

          {viewSection === "Levels & Training" && (
            <section className={styles.section}>
              <h2>Levels & Training Dates</h2>

              <div className={styles.fieldGroup}>
                <label>
                  <input
                    type="checkbox"
                    name="level1"
                    checked={!!employeeData.level1}
                    onChange={(e) =>
                      setEmployeeData((p) => ({
                        ...p,
                        level1: e.target.checked ? 1 : 0,
                      }))
                    }
                  />
                  Level 1
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="level2"
                    checked={!!employeeData.level2}
                    onChange={(e) =>
                      setEmployeeData((p) => ({
                        ...p,
                        level2: e.target.checked ? 1 : 0,
                      }))
                    }
                  />
                  Level 2
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="level3"
                    checked={!!employeeData.level3}
                    onChange={(e) =>
                      setEmployeeData((p) => ({
                        ...p,
                        level3: e.target.checked ? 1 : 0,
                      }))
                    }
                  />
                  Level 3
                </label>
              </div>

              <div className={styles.fieldGroup}>
                <label>Level (1, 2, 3)</label>
                <select
                  name="threeTwoOne"
                  value={employeeData.threeTwoOne}
                  onChange={handleInputChange}
                  className={styles.dropdown}
                >
                  <option value="">Select Level</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>

              <h3>Level 1 Dates</h3>
              <div className={styles.dateFields}>
                {[
                  { label: "SS", name: "lvl1SS" },
                  { label: "Material Handling", name: "lvl1MaterialHandling" },
                  { label: "Ladder Safety", name: "lvl1LadderSafety" },
                  { label: "Fall Protection", name: "lvl1FallProtection" },
                  { label: "Spotter Training", name: "lvl1SpotterTraining" },
                  {
                    label: "Electrical Safety Awareness",
                    name: "lvl1ElectricalSafetyAwareness",
                  },
                  { label: "LOTO", name: "lvl1Loto" },
                  { label: "Energized Steps", name: "lvl1EnergizedSteps" },
                  { label: "2-Man Verify", name: "lvl12MenVerify" },
                  { label: "Jack Stands", name: "lvl1JackStands" },
                  { label: "Cable Tray Rollers", name: "lvl1CableTrayRollers" },
                  { label: "Cable Cutting", name: "lvl1CableCutting" },
                  { label: "Cable Stripping", name: "lvl1CableStripping" },
                ].map(({ label, name }) => (
                  <div className={styles.fieldGroup} key={name}>
                    <label>{label}</label>
                    <input
                      type="date"
                      name={name}
                      value={employeeData[name]}
                      onChange={handleInputChange}
                    />
                  </div>
                ))}
              </div>

              <h3>Level 2 Dates</h3>
              <div className={styles.dateFields}>
                {[
                  {
                    label: "Cable Pullies Install",
                    name: "lvl2CablePulliesInstall",
                  },
                  {
                    label: "Cable Sock Selection",
                    name: "lvl2CableSockSelection",
                  },
                  {
                    label: "Cable Connector Install",
                    name: "lvl2CableConnectorInstall",
                  },
                  { label: "Cable Labeling", name: "lvl2CableLabeling" },
                  { label: "Cable Megging", name: "lvl2Megging" },
                  {
                    label: "Crimping Procedures",
                    name: "lvl2CrimpingProcedures",
                  },
                  { label: "Drilling Holes", name: "lvl2DrillingHoles" },
                ].map(({ label, name }) => (
                  <div className={styles.fieldGroup} key={name}>
                    <label>{label}</label>
                    <input
                      type="date"
                      name={name}
                      value={employeeData[name]}
                      onChange={handleInputChange}
                    />
                  </div>
                ))}
              </div>

              <h3>Level 3 Dates</h3>
              <div className={styles.dateFields}>
                {[
                  { label: "Tool Feeds", name: "lvl3ToolFeeds" },
                  { label: "Commissioning", name: "lvl3Commissioning" },
                  { label: "Torqueing", name: "lvl3Torqueing" },
                  { label: "Torque Seal", name: "lvl3TorqueSeal" },
                  {
                    label: "Breaker Manipulation",
                    name: "lvl3BreakerManipulation",
                  },
                  { label: "Turn Off Procedure", name: "lvl3TurnOffProcedure" },
                  { label: "Turn On Procedures", name: "lvl3TurnOnProcedures" },
                  { label: "Energize Permit", name: "lvl3EnergizePermit" },
                  { label: "QEW", name: "lvl3QEW" },
                ].map(({ label, name }) => (
                  <div className={styles.fieldGroup} key={name}>
                    <label>{label}</label>
                    <input
                      type="date"
                      name={name}
                      value={employeeData[name]}
                      onChange={handleInputChange}
                    />
                  </div>
                ))}
              </div>

              <h3>Miscellaneous</h3>
              <div className={styles.dateFields}>
                {[
                  { label: "Black Energized Work", name: "blackEnergizedWork" },
                  { label: "Green Turn On/Off", name: "greenTurnOnOff" },
                  { label: "Red Troubleshoot", name: "redTroubleshoot" },
                  { label: "Aqua Cable Pulling", name: "aquaCablePulling" },
                  { label: "Blue Terminations", name: "blueTerminations" },
                  { label: "Gold Management", name: "goldManagement" },
                  {
                    label: "Fab or Energized Work",
                    name: "fabOrEnergizedWork",
                  },
                ].map(({ label, name }) => (
                  <div className={styles.fieldGroup} key={name}>
                    <label>{label}</label>
                    <input
                      type="text"
                      name={name}
                      value={employeeData[name]}
                      onChange={handleInputChange}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {viewSection === "Work & Transfer History" && (
            <section className={styles.section}>
              <h2>Work & Transfer History</h2>

              <h3>Work History</h3>
              {(employeeData.workHistoryEntries || []).map((item, idx) => (
                <div
                  key={`wh-${idx}`}
                  className={styles.fieldGroup}
                  draggable
                  onDragStart={onDragStart("work", idx)}
                  onDragOver={onDragOver}
                  onDrop={onDrop("work", idx)}
                >
                  <label>Project / Assignment</label>
                  <input
                    type="text"
                    value={item.project || ""}
                    onChange={(e) => {
                      const arr = [...employeeData.workHistoryEntries];
                      arr[idx] = { ...arr[idx], project: e.target.value };
                      setEmployeeData({
                        ...employeeData,
                        workHistoryEntries: arr,
                      });
                    }}
                  />
                  <label>Role</label>
                  <input
                    type="text"
                    value={item.role || ""}
                    onChange={(e) => {
                      const arr = [...employeeData.workHistoryEntries];
                      arr[idx] = { ...arr[idx], role: e.target.value };
                      setEmployeeData({
                        ...employeeData,
                        workHistoryEntries: arr,
                      });
                    }}
                  />
                  <label>Location</label>
                  <input
                    type="text"
                    value={item.location || ""}
                    onChange={(e) => {
                      const arr = [...employeeData.workHistoryEntries];
                      arr[idx] = { ...arr[idx], location: e.target.value };
                      setEmployeeData({
                        ...employeeData,
                        workHistoryEntries: arr,
                      });
                    }}
                  />
                  <label>Start</label>
                  <input
                    type="date"
                    value={item.startDate || ""}
                    onChange={(e) => {
                      const arr = [...employeeData.workHistoryEntries];
                      arr[idx] = { ...arr[idx], startDate: e.target.value };
                      setEmployeeData({
                        ...employeeData,
                        workHistoryEntries: arr,
                      });
                    }}
                  />
                  <label>End</label>
                  <input
                    type="date"
                    value={item.endDate || ""}
                    onChange={(e) => {
                      const arr = [...employeeData.workHistoryEntries];
                      arr[idx] = { ...arr[idx], endDate: e.target.value };
                      setEmployeeData({
                        ...employeeData,
                        workHistoryEntries: arr,
                      });
                    }}
                  />
                  <label>Notes</label>
                  <input
                    type="text"
                    value={item.notes || ""}
                    onChange={(e) => {
                      const arr = [...employeeData.workHistoryEntries];
                      arr[idx] = { ...arr[idx], notes: e.target.value };
                      setEmployeeData({
                        ...employeeData,
                        workHistoryEntries: arr,
                      });
                    }}
                  />
                  <button
                    type="button"
                    className={styles.clearButton}
                    onClick={() => {
                      const arr = [...employeeData.workHistoryEntries];
                      arr.splice(idx, 1);
                      setEmployeeData({
                        ...employeeData,
                        workHistoryEntries: arr,
                      });
                    }}
                  >
                    Remove Work Entry
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={styles.nextButton}
                onClick={() =>
                  setEmployeeData({
                    ...employeeData,
                    workHistoryEntries: [
                      ...(employeeData.workHistoryEntries || []),
                      {
                        project: "",
                        role: "",
                        location: "",
                        startDate: "",
                        endDate: "",
                        notes: "",
                      },
                    ],
                  })
                }
              >
                + Add Work Entry
              </button>

              <hr />

              <h3>Transfer History</h3>
              {isLoadingTransfers && <p>Loading transfers...</p>}
              <p style={{ color: "#999", fontSize: "0.9rem", marginBottom: "10px" }}>
                Transfers are synced with the transfers_v2 table for timeline display.
              </p>
              {(employeeData.transferHistoryEntries || []).map((item, idx) => (
                <div
                  key={`th-${idx}`}
                  className={styles.fieldGroup}
                  draggable
                  onDragStart={onDragStart("transfer", idx)}
                  onDragOver={onDragOver}
                  onDrop={onDrop("transfer", idx)}
                  style={{
                    border: item.transferId ? "1px solid #5cb85c" : "1px solid #f0ad4e",
                    padding: "10px",
                    borderRadius: "4px",
                    marginBottom: "10px",
                    position: "relative"
                  }}
                >
                  {item.transferId && (
                    <div style={{ position: "absolute", top: "5px", right: "5px", fontSize: "0.8rem", color: "#5cb85c" }}>
                      ✓ Synced (ID: {item.transferId})
                    </div>
                  )}
                  {!item.transferId && (
                    <div style={{ position: "absolute", top: "5px", right: "5px", fontSize: "0.8rem", color: "#f0ad4e" }}>
                      ⚠ Not synced
                    </div>
                  )}
                  <label>From</label>
                  <input
                    type="text"
                    value={item.from || ""}
                    onChange={(e) => {
                      const arr = [...employeeData.transferHistoryEntries];
                      arr[idx] = { ...arr[idx], from: e.target.value };
                      setEmployeeData({
                        ...employeeData,
                        transferHistoryEntries: arr,
                      });
                    }}
                  />
                  <label>To</label>
                  <input
                    type="text"
                    value={item.to || ""}
                    onChange={(e) => {
                      const arr = [...employeeData.transferHistoryEntries];
                      arr[idx] = { ...arr[idx], to: e.target.value };
                      setEmployeeData({
                        ...employeeData,
                        transferHistoryEntries: arr,
                      });
                    }}
                  />
                  <label>Date</label>
                  <input
                    type="date"
                    value={item.date || ""}
                    onChange={(e) => {
                      const arr = [...employeeData.transferHistoryEntries];
                      arr[idx] = { ...arr[idx], date: e.target.value };
                      setEmployeeData({
                        ...employeeData,
                        transferHistoryEntries: arr,
                      });
                    }}
                  />
                  <label>Notes</label>
                  <input
                    type="text"
                    value={item.notes || ""}
                    onChange={(e) => {
                      const arr = [...employeeData.transferHistoryEntries];
                      arr[idx] = { ...arr[idx], notes: e.target.value };
                      setEmployeeData({
                        ...employeeData,
                        transferHistoryEntries: arr,
                      });
                    }}
                  />
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    {isEdit && (
                      <button
                        type="button"
                        onClick={() => syncTransferToTable(item, idx)}
                        style={{ background: "#5cb85c", flex: 1 }}
                      >
                        {item.transferId ? "Update in Transfers Table" : "Add to Transfers Table"}
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.clearButton}
                      onClick={async () => {
                        if (item.transferId) {
                          await deleteTransferFromTable(item.transferId);
                        }
                        const arr = [...employeeData.transferHistoryEntries];
                        arr.splice(idx, 1);
                        setEmployeeData({
                          ...employeeData,
                          transferHistoryEntries: arr,
                        });
                      }}
                      style={{ flex: 1 }}
                    >
                      Remove Transfer Entry
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className={styles.nextButton}
                onClick={() =>
                  setEmployeeData({
                    ...employeeData,
                    transferHistoryEntries: [
                      ...(employeeData.transferHistoryEntries || []),
                      { from: "", to: "", date: "", notes: "" },
                    ],
                  })
                }
              >
                + Add Transfer Entry
              </button>
            </section>
          )}

          {viewSection === "Notes" && (
            <section className={styles.section}>
              <h2>Notes, Etc.</h2>

              <div className={styles.fieldGroup}>
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={employeeData.notes}
                  onChange={handleInputChange}
                  className={styles.largeTextBox}
                ></textarea>
              </div>
              <div className={styles.fieldGroup}>
                <label>More Notes</label>
                <textarea
                  name="moreNotes"
                  value={employeeData.moreNotes}
                  onChange={handleInputChange}
                  className={styles.largeTextBox}
                ></textarea>
              </div>

              {/* legacy single-value transfer fields (kept for compatibility) */}
              <div className={styles.fieldGroup}>
                <label>From</label>
                <input
                  type="text"
                  name="from"
                  value={employeeData.from}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Transfers</label>
                <input
                  type="text"
                  name="transfers"
                  value={employeeData.transfers}
                  onChange={handleInputChange}
                />
              </div>

              {/* license + misc */}
              <div className={styles.fieldGroup}>
                <label>Car License Number</label>
                <input
                  type="text"
                  name="carLicenseNum"
                  value={employeeData.carLicenseNum}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>License Type</label>
                <input
                  type="text"
                  name="licenseType"
                  value={employeeData.licenseType}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>License Expiration</label>
                <input
                  type="date"
                  name="licenseExpiration"
                  value={employeeData.licenseExpiration}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>GWA Tag Number</label>
                <input
                  type="text"
                  name="gwaTagNum"
                  value={employeeData.gwaTagNum}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Code To Clean</label>
                <input
                  type="text"
                  name="codeToClean"
                  value={employeeData.codeToClean}
                  onChange={handleInputChange}
                />
              </div>

              {/* files */}
              <h3>Employee Files</h3>
              
              {isEdit && (
                <>
                  <div className={styles.fieldGroup}>
                    <label>Uploaded Files</label>
                    {isLoadingFiles && <p>Loading files...</p>}
                    {!isLoadingFiles && uploadedFiles.length === 0 && (
                      <p style={{ color: "#888" }}>No files uploaded yet</p>
                    )}
                    {!isLoadingFiles && uploadedFiles.length > 0 && (
                      <ul className={styles.fileList}>
                        {uploadedFiles.map((file) => (
                          <li key={file.id} className={styles.fileItem}>
                            <span>
                              {file.fileName} ({Math.round(file.size / 1024)} KB)
                              <br />
                              <small style={{ color: "#999" }}>
                                {new Date(file.createdAt).toLocaleString()}
                              </small>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleFileDownload(file.id, file.fileName)}
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFileDelete(file.id, file.fileName)}
                              style={{ background: "#d9534f" }}
                            >
                              Delete
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}

              <div className={styles.fieldGroup}>
                <label>Upload New Files</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  name="filesForEmployee"
                  onChange={handleFileChange}
                  accept="application/pdf,image/png,image/jpeg,image/jpg,.doc,.docx,.xls,.xlsx"
                  multiple
                />
              </div>

              {/* Drag & drop zone now opens file dialog on click */}
              <div
                className={styles.dropZone}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  addFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  fileInputRef.current?.click()
                }
              >
                Drag files here or click to select
              </div>

              {(employeeData.filesForEmployee || []).length > 0 && (
                <>
                  <p style={{ marginTop: "10px", fontWeight: "600" }}>
                    Pending Uploads ({employeeData.filesForEmployee.length})
                  </p>
                  <ul className={styles.fileList}>
                    {employeeData.filesForEmployee.map((f, i) => (
                      <li key={i} className={styles.fileItem}>
                        <span>
                          {f.name} ({Math.round(f.size / 1024)} KB)
                        </span>
                        {isEdit && (
                          <button
                            type="button"
                            onClick={() => handleFileUpload(f)}
                            style={{ background: "#5cb85c" }}
                          >
                            Upload Now
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const url = URL.createObjectURL(f);
                            window.open(url, "_blank", "noopener,noreferrer");
                            setTimeout(() => URL.revokeObjectURL(url), 60_000);
                          }}
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...employeeData.filesForEmployee];
                            next.splice(i, 1);
                            setEmployeeData((prev) => ({
                              ...prev,
                              filesForEmployee: next,
                            }));
                          }}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  {!isEdit && (
                    <p style={{ color: "#f0b400", marginTop: "10px" }}>
                      Note: Save employee first, then you can upload files
                    </p>
                  )}
                </>
              )}

              {/* tech */}
              <div className={styles.fieldGroup}>
                <label>Tech Name</label>
                <input
                  type="text"
                  name="techName"
                  value={employeeData.techName}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Tech ID Number</label>
                <input
                  type="text"
                  name="techIdNum"
                  value={employeeData.techIdNum}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Shirt Size</label>
                <input
                  type="text"
                  name="shirtSize"
                  value={employeeData.shirtSize}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Language Spoken</label>
                <input
                  type="text"
                  name="languageSpoken"
                  value={employeeData.languageSpoken}
                  onChange={handleInputChange}
                />
              </div>

              {/* Additional fields */}
              <div className={styles.fieldGroup}>
                <label>Training Level One</label>
                <input
                  type="text"
                  name="trainingLevelOne"
                  value={employeeData.trainingLevelOne}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Training Level Two</label>
                <input
                  type="text"
                  name="trainingLevelTwo"
                  value={employeeData.trainingLevelTwo}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Training Level Three</label>
                <input
                  type="text"
                  name="trainingLevelThree"
                  value={employeeData.trainingLevelThree}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Onboarding Status</label>
                <input
                  type="text"
                  name="onboardingStatus"
                  value={employeeData.onboardingStatus}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Travelers</label>
                <input
                  type="text"
                  name="travelers"
                  value={employeeData.travelers}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Travel Allowance</label>
                <input
                  type="number"
                  step="0.01"
                  name="travelAllowance"
                  value={employeeData.travelAllowance}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Evaluation Score</label>
                <input
                  type="number"
                  step="0.01"
                  name="evaluationScore"
                  value={employeeData.evaluationScore}
                  onChange={handleInputChange}
                />
              </div>
            </section>
          )}

          <div className={styles.buttons}>
            {viewSection !== "Employee Info" && (
              <button
                type="button"
                className={styles.backButton}
                onClick={(e) => {
                  e.preventDefault();
                  handlePreviousSection();
                }}
              >
                Back
              </button>
            )}
            {viewSection !== "Notes" ? (
              <button
                type="button"
                className={styles.nextButton}
                onClick={(e) => {
                  e.preventDefault();
                  handleNextSection();
                }}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isSubmitting}
              >
                {isEdit ? "Update Employee" : "Add Employee"}
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

export default EmployeeForm;
