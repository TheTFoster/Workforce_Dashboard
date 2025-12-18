// src/components/AddTransfer.jsx
import React, { useEffect, useState } from "react";
import Footer from "./Footer";
// Simple Modal component
function ConfirmModal({ open, onConfirm, onCancel, message }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.7)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#181a20",
          borderRadius: 10,
          padding: 32,
          minWidth: 340,
          boxShadow: "0 2px 24px rgba(0,0,0,0.7)",
          color: "#fff",
          border: "1px solid #23242a",
        }}
      >
        <div
          style={{
            marginBottom: 24,
            color: "#fff",
            fontSize: 17,
            letterSpacing: 0.1,
          }}
        >
          {message ||
            "Are you sure you want to abandon this draft? Unsaved changes will be lost."}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "7px 22px",
              background: "#23242a",
              color: "#fff",
              border: "none",
              borderRadius: 5,
              fontWeight: 500,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            No
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "7px 22px",
              background: "#c00",
              color: "#fff",
              border: "none",
              borderRadius: 5,
              fontWeight: 500,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Yes, Abandon
          </button>
        </div>
      </div>
    </div>
  );
}
import { useNavigate } from "react-router-dom";
import api from "../api";
import styles from "../stylesheets/Transfers.module.css";
import { BsArrowLeftRight } from "react-icons/bs";

// normalize for comparing codes
function normKey(v) {
  if (!v) return "";
  return String(v).replace(/\s+/g, "").toUpperCase();
}

// small helper for tolerant property lookups
function firstDefined(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && `${v}`.trim() !== "") return v;
  }
  return undefined;
}

// phone number formatting
function formatPhone(raw) {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // 11 digits with leading 1
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(
      7,
      11
    )}`;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

// try really hard to build a displayable name
function buildEmployeeName(emp) {
  const display = firstDefined(
    emp,
    "displayName",
    "display_name",
    "employeename",
    "employeeName"
  );
  if (display) return display;

  const first = firstDefined(
    emp,
    "preferredFirstname",
    "preferred_firstname",
    "legalFirstname",
    "legal_firstname",
    "firstName",
    "firstname"
  );
  const last = firstDefined(
    emp,
    "legalLastname",
    "legal_lastname",
    "lastName",
    "lastname"
  );

  if (first && last) return `${first} ${last}`;
  return first || last || "";
}

export default function AddTransfer() {
  // Modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [lookupMsg, setLookupMsg] = useState("");

  // typeahead state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [form, setForm] = useState({
    empCode: "",
    xid: "",
    empName: "",
    classification: "",
    workGroup: "",
    newGroup: "",
    fromJobsite: "",
    toJobsite: "",
    jobsitesOfInterest: "",
    effectiveDate: "",
    transferStatus: "pending",
    term: "",
    rateHourly: "",
    rateType: "hourly",
    perDiem: "",
    evaluationScore: "",
    notes: "",
    email: "",
    license1: "",
    license2: "",
    license3: "",
    license4: "",
    contactPhone: "",
    locationCity: "",
    locationState: "",
    badging: "",
    level1Status: "",
    scissorLiftStatus: "",
    correctiveAction: "",
    language: "",
    updates: "",
    newHireFollowUp: "",
    hireDate: "",
    doh: "",
    lastPayChange: "",
    osha10Date: "",
    osha30Date: "",
    travelPreference: "",
  });

  // ---------------- load employees once ----------------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const { data } = await api.get("/api/v1/employee/list");

        let arr = [];
        if (Array.isArray(data)) {
          arr = data;
        } else if (Array.isArray(data?.content)) {
          arr = data.content;
        } else if (Array.isArray(data?.employees)) {
          arr = data.employees;
        } else if (Array.isArray(data?.items)) {
          arr = data.items;
        }

        console.log("AddTransfer employee list sample:", arr[0]);
        if (!alive) return;
        setEmployees(arr);
        if (!arr.length) {
          setLookupMsg(
            "Employee list returned no rows; autofill will be limited."
          );
        }
      } catch (e) {
        console.error("AddTransfer employees fetch error:", e);
        if (!alive) return;
        setErr(
          e?.response?.data?.message ||
            e?.message ||
            "Failed to fetch employees for autofill."
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Format phone number as user types
    if (name === "contactPhone") {
      setForm((prev) => ({ ...prev, [name]: formatPhone(value) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // ---------------- apply one employee into the form ----------------
  const applyEmployeeToForm = async (emp) => {
    if (!emp) return;
    const displayName = buildEmployeeName(emp);

    // Try to fetch current jobsite from timecards
    let currentJobsiteFromTimecard = "";
    const empCode = firstDefined(
      emp,
      "employee_code",
      "employeeCode",
      "emp_code",
      "empCode",
      "employee_code_new",
      "employeeCodeNew",
      "cecId",
      "cec_id"
    );

    console.log("=== Starting autofill for empCode:", empCode);

    if (empCode) {
      setLookupMsg("Fetching current jobsite from timecards...");
      try {
        console.log(`Fetching latest timecard for empCode: ${empCode}`);
        // Use the /latest endpoint which returns the most recent jobsite
        const response = await api.get(`/api/v1/timecards/latest`, {
          params: { eeCode: empCode },
        });
        console.log("Full API response:", response);
        console.log("Latest timecard data received:", response.data);

        // Extract jobsite from the response
        if (response.data && typeof response.data === "object") {
          console.log(
            "Available keys in timecard data:",
            Object.keys(response.data)
          );
          currentJobsiteFromTimecard =
            firstDefined(
              response.data,
              "jobDesc",
              "job_desc",
              "jobCode",
              "job_code",
              "jobsite",
              "project",
              "workLocation",
              "work_location"
            ) || "";
          console.log(
            "Extracted jobsite from latest timecard:",
            currentJobsiteFromTimecard
          );

          if (currentJobsiteFromTimecard) {
            setLookupMsg(
              `Found current jobsite from timecards: ${currentJobsiteFromTimecard}`
            );
          } else {
            setLookupMsg(
              "No recent timecard found, using employee record data."
            );
          }
        }
      } catch (e) {
        console.error(
          "Could not fetch latest timecard for current jobsite:",
          e
        );
        console.error("Error details:", e.response?.data || e.message);
        setLookupMsg("Could not fetch timecard data, using employee record.");
      }
    }

    console.log(
      "Final currentJobsiteFromTimecard:",
      currentJobsiteFromTimecard
    );

    setForm((prev) => {
      const next = { ...prev };

      // EE Code
      const code =
        firstDefined(
          emp,
          "employee_code",
          "employeeCode",
          "emp_code",
          "empCode",
          "employee_code_new",
          "employeeCodeNew"
        ) ??
        firstDefined(
          emp,
          "employee_code_norm",
          "employeeCodeNorm",
          "employee_code_new_norm",
          "employeeCodeNewNorm"
        );

      // XID variants
      const xid =
        firstDefined(
          emp,
          "xid",
          "tixid",
          "xid_norm",
          "tixid_norm",
          "person_xid_norm"
        ) || "";

      // Classification / rank
      const classification =
        firstDefined(
          emp,
          "classification",
          "positionTitle",
          "position_title",
          "emp_rank",
          "empRank",
          "position",
          "businessTitle",
          "business_title"
        ) || "";

      // Work Group
      const workGroup =
        firstDefined(
          emp,
          "workGroup",
          "work_group",
          "group",
          "businessUnit",
          "business_unit"
        ) || "";

      // Current jobsite - prefer timecard data, fallback to employee record
      const fromJobsite =
        currentJobsiteFromTimecard ||
        firstDefined(
          emp,
          "currentJobsite",
          "work_project",
          "workProject",
          "work_location",
          "workLocation"
        ) ||
        "";

      // Location
      const locationCity =
        firstDefined(
          emp,
          "workLocationCity",
          "work_location_city",
          "primaryCityMunicipality",
          "primary_city_municipality",
          "city"
        ) || "";

      const locationState =
        firstDefined(
          emp,
          "workLocationState",
          "work_location_state",
          "primaryStateProvince",
          "primary_state_province",
          "state"
        ) || "";

      // Contact
      const email =
        firstDefined(
          emp,
          "workEmail",
          "work_email",
          "personalEmail",
          "personal_email",
          "email",
          "emailAddress"
        ) || "";

      const phone =
        firstDefined(
          emp,
          "primaryPhone",
          "primary_phone",
          "workPhone",
          "work_phone",
          "phone",
          "phoneNumber"
        ) || "";

      // Badging
      const badging =
        firstDefined(emp, "badgeNum", "badge_num", "badging") || "";

      // Language
      const language =
        firstDefined(
          emp,
          "essLanguagePreference",
          "ess_language_preference",
          "languageSpoken",
          "language_spoken",
          "language"
        ) || "";

      // DOH
      const doh =
        firstDefined(
          emp,
          "hireDate",
          "hire_date",
          "rehireDate",
          "rehire_date"
        ) || "";

      // Hire Date (distinct from DOH)
      const hireDate =
        firstDefined(
          emp,
          "hireDate",
          "hire_date",
          "originalHireDate",
          "original_hire_date"
        ) || "";

      // Last pay change
      const lastPayChange =
        firstDefined(emp, "lastPayChange", "last_pay_change") || "";

      // Rate + per diem
      const hourlyRateRaw = firstDefined(
        emp,
        "rateHourly",
        "hourlyRate",
        "rate1",
        "rate_1",
        "payRate",
        "rate"
      );
      const perDiemRaw = firstDefined(
        emp,
        "perDiem",
        "travelAllowance",
        "travel_allowance"
      );
      const rateType =
        firstDefined(emp, "rateType", "payType", "pay_type") ||
        prev.rateType ||
        "hourly";

      // Level 1 status guess
      let lvl1Status =
        firstDefined(emp, "level1Status") || prev.level1Status || "";
      if (!lvl1Status) {
        const lvlFlag = firstDefined(emp, "lvl1_completed", "training_highest");
        if (lvlFlag) lvl1Status = "Completed";
      }

      // Travel Preference
      const travelPrefRaw = firstDefined(
        emp,
        "travelPref",
        "travel_pref",
        "travelPreference",
        "travel_preference"
      );
      const travelPreference =
        travelPrefRaw !== undefined && travelPrefRaw !== null
          ? travelPrefRaw
          : null;

      // Now stamp values in – this is intentional overwrite, because
      // picking a different EE Code should refresh the form.
      if (code) next.empCode = code;
      if (xid) next.xid = xid;
      if (displayName) next.empName = displayName;
      if (classification) next.classification = classification;
      if (workGroup) next.workGroup = workGroup;
      if (fromJobsite) next.fromJobsite = fromJobsite;
      if (locationCity) next.locationCity = locationCity;
      if (locationState) next.locationState = locationState;
      next.email = email;
      next.contactPhone = formatPhone(phone); // Format phone on autofill
      next.badging = badging;
      next.language = language;
      if (doh) next.doh = doh;
      if (hireDate) next.hireDate = hireDate;
      if (lastPayChange) next.lastPayChange = lastPayChange;
      if (hourlyRateRaw != null) next.rateHourly = String(hourlyRateRaw);
      if (perDiemRaw != null) next.perDiem = String(perDiemRaw);
      if (rateType) next.rateType = rateType;
      if (lvl1Status) next.level1Status = lvl1Status;
      if (travelPreference) next.travelPreference = travelPreference;

      return next;
    });

    setLookupMsg(
      `Autofilled from employee record${displayName ? `: ${displayName}` : ""}.`
    );
  };

  // ---------------- suggestions while typing EE Code / name ----------------
  const updateSuggestions = (query) => {
    const q = query.trim();
    if (!q || !employees.length) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const key = q.toLowerCase();
    const matches = employees
      .filter((emp) => {
        const code =
          firstDefined(
            emp,
            "employee_code",
            "employeeCode",
            "emp_code",
            "empCode",
            "employee_code_new",
            "employeeCodeNew"
          ) || "";
        const name = buildEmployeeName(emp) || "";
        return (
          code.toLowerCase().includes(key) || name.toLowerCase().includes(key)
        );
      })
      .slice(0, 12);

    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  // when you blur the EE Code field or hit Enter
  const handleEmpCodeBlur = async () => {
    const raw = form.empCode?.trim();
    if (!raw) {
      setShowSuggestions(false);
      setSuggestions([]);
      return;
    }

    if (loading) {
      setLookupMsg("Employee list is still loading; try again in a moment.");
      return;
    }

    if (!employees.length) {
      setLookupMsg("Employee list is empty; cannot autofill from EE Code.");
      return;
    }

    const targetKey = normKey(raw);
    const emp = employees.find((e) => {
      const code =
        firstDefined(
          e,
          "employee_code",
          "employeeCode",
          "emp_code",
          "empCode",
          "employee_code_new",
          "employeeCodeNew"
        ) ??
        firstDefined(
          e,
          "employee_code_norm",
          "employeeCodeNorm",
          "employee_code_new_norm",
          "employeeCodeNewNorm"
        );
      return normKey(code) === targetKey;
    });

    if (!emp) {
      setLookupMsg("No employee found for that EE Code.");
      return;
    }

    await applyEmployeeToForm(emp);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSuggestionClick = async (emp) => {
    await applyEmployeeToForm(emp);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // ---------------- submit ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      // No required fields for creation now
      const payload = {
        empCode: form.empCode?.trim() || null,
        xid: form.xid || null,
        empName: form.empName || null,
        classification: form.classification || null,
        group: form.workGroup || null,
        newGroup: form.newGroup || null,
        fromJobsite: form.fromJobsite || null,
        toJobsite: form.toJobsite || null,
        jobsitesOfInterest: form.jobsitesOfInterest || null,
        effectiveDate: form.effectiveDate || null,
        transferStatus: form.transferStatus || null,
        term: form.term || null,
        rateHourly: form.rateHourly !== "" ? Number(form.rateHourly) : null,
        rateType: form.rateType || "unknown",
        perDiem: form.perDiem !== "" ? Number(form.perDiem) : null,
        evaluationScore:
          form.evaluationScore !== "" ? Number(form.evaluationScore) : null,
        notes: form.notes || null,
        email: form.email || null,
        license1: form.license1 || null,
        license2: form.license2 || null,
        license3: form.license3 || null,
        license4: form.license4 || null,
        contactPhone: form.contactPhone || null,
        locationCity: form.locationCity || null,
        locationState: form.locationState || null,
        badging: form.badging || null,
        level1Status: form.level1Status || null,
        scissorLiftStatus: form.scissorLiftStatus || null,
        correctiveAction: form.correctiveAction || null,
        language: form.language || null,
        travelPreference:
          form.travelPreference !== "" ? Number(form.travelPreference) : null,
        updates: form.updates || null,
        newHireFollowUp: form.newHireFollowUp || null,
        hireDate: form.hireDate || null,
        doh: form.doh || null,
        lastPayChange: form.lastPayChange || null,
        osha10Date: form.osha10Date || null,
        osha30Date: form.osha30Date || null,
      };

      await api.post("/api/v1/transfers", payload);
      navigate("/transfers");
    } catch (e) {
      console.error("Create transfer error:", e);
      setErr(
        e?.response?.data?.message || e?.message || "Failed to create transfer."
      );
    } finally {
      setSaving(false);
    }
  };

  // ---------------- render ----------------
  return (
    <div className={styles.container}>
      <ConfirmModal
        open={showCancelModal}
        onConfirm={() => {
          setShowCancelModal(false);
          navigate(-1);
        }}
        onCancel={() => setShowCancelModal(false)}
        message="Are you sure you want to abandon this draft? Unsaved changes will be lost."
      />
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.titleIcon} aria-hidden="true">
            <BsArrowLeftRight />
          </span>
          New Transfer
        </h1>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setShowCancelModal(true)}
          >
            ← Cancel
          </button>
          <button
            type="submit"
            form="add-transfer-form"
            className={styles.primaryBtn}
            disabled={saving}
            style={{ background: "#1db954", color: "#fff", border: "none" }}
          >
            {saving ? "Saving..." : "Save Transfer"}
          </button>
        </div>
      </header>

      {(loading || err) && (
        <div className={styles.status}>
          {loading ? "Loading employees for autofill..." : `Error: ${err}`}
        </div>
      )}

      {lookupMsg && !err && (
        <div className={styles.status} style={{ opacity: 0.9 }}>
          {lookupMsg}
        </div>
      )}

      <form
        id="add-transfer-form"
        className={styles.form}
        onSubmit={handleSubmit}
      >
        {/* EMPLOYEE SECTION */}
        <section className={styles.formSection}>
          <h2>Employee</h2>
          <div className={styles.formGrid}>
            {/* EE Code with typeahead */}
            <div className={`${styles.formField} ${styles.empLookupField}`}>
              <label>EE Code</label>
              <input
                name="empCode"
                value={form.empCode}
                placeholder="Type EE Code or name"
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => ({ ...prev, empCode: value }));
                  updateSuggestions(value);
                }}
                onBlur={() => {
                  // delay so click on suggestion still registers
                  setTimeout(() => setShowSuggestions(false), 150);
                  handleEmpCodeBlur();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleEmpCodeBlur();
                  }
                }}
              />

              {showSuggestions && suggestions.length > 0 && (
                <ul className={styles.suggestions}>
                  {suggestions.map((emp) => {
                    const code =
                      firstDefined(
                        emp,
                        "employee_code",
                        "employeeCode",
                        "emp_code",
                        "empCode",
                        "employee_code_new",
                        "employeeCodeNew"
                      ) || "";
                    const name = buildEmployeeName(emp) || "";
                    const classification =
                      firstDefined(
                        emp,
                        "classification",
                        "positionTitle",
                        "position_title",
                        "emp_rank",
                        "empRank",
                        "position",
                        "businessTitle",
                        "business_title"
                      ) || "";
                    return (
                      <li
                        key={emp.emp_id || emp.empId || code || name}
                        className={styles.suggestionItem}
                        onMouseDown={(ev) => {
                          ev.preventDefault();
                          handleSuggestionClick(emp);
                        }}
                      >
                        <span className={styles.suggestionCode}>{code}</span>
                        <span className={styles.suggestionName}>{name}</span>
                        <span className={styles.suggestionMeta}>
                          {classification}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className={styles.formField}>
              <label>Name</label>
              <input
                name="empName"
                value={form.empName}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formField}>
              <label>Classification</label>
              <input
                name="classification"
                value={form.classification}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formField}>
              <label>Work Group</label>
              <input
                name="workGroup"
                value={form.workGroup}
                onChange={handleChange}
              />
            </div>
            <div className={styles.formField}>
              <label>New Group</label>
              <input
                name="newGroup"
                value={form.newGroup}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* TRANSFER SECTION */}
        <section className={styles.formSection}>
          <h2>Transfer</h2>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label>Current Jobsite</label>
              <input
                name="fromJobsite"
                value={form.fromJobsite}
                onChange={handleChange}
                placeholder="Optional (can be 'new hire')"
              />
            </div>
            <div className={styles.formField}>
              <label>New Jobsite</label>
              <input
                name="toJobsite"
                value={form.toJobsite}
                onChange={handleChange}
              />
            </div>
            <div className={styles.formFieldWide}>
              <label>Jobsites of Interest</label>
              <textarea
                name="jobsitesOfInterest"
                value={form.jobsitesOfInterest}
                onChange={handleChange}
                rows={2}
              />
            </div>
            <div className={styles.formField}>
              <label>Effective Date</label>
              <input
                type="date"
                name="effectiveDate"
                value={form.effectiveDate}
                onChange={handleChange}
              />
            </div>
            <div className={styles.formField}>
              <label>Status</label>
              <select
                name="transferStatus"
                value={form.transferStatus}
                onChange={handleChange}
              >
                <option value="pending">Pending</option>
                <option value="needs assignment">Needs Assignment</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className={styles.formField}>
              <label>Term</label>
              <input
                name="term"
                value={form.term}
                onChange={handleChange}
                placeholder="e.g. 3 weeks, 6 months"
              />
            </div>
          </div>
        </section>

        {/* COMPENSATION */}
        <section className={styles.formSection}>
          <h2>Compensation</h2>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label>Hourly Rate</label>
              <input
                name="rateHourly"
                type="number"
                step="0.01"
                value={form.rateHourly}
                onChange={handleChange}
              />
            </div>
            <div className={styles.formField}>
              <label>Rate Type</label>
              <select
                name="rateType"
                value={form.rateType}
                onChange={handleChange}
              >
                <option value="hourly">Hourly</option>
                <option value="salary">Salary</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div className={styles.formField}>
              <label>Per Diem</label>
              <input
                name="perDiem"
                type="number"
                step="0.01"
                value={form.perDiem}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
            <div className={styles.formField}>
              <label>Evaluation Score</label>
              <input
                name="evaluationScore"
                type="number"
                step="0.01"
                value={form.evaluationScore}
                onChange={handleChange}
                placeholder="e.g. 3.65"
              />
            </div>
          </div>
        </section>

        {/* CONTACT & LOCATION */}
        <section className={styles.formSection}>
          <h2>Contact & Location</h2>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label>Phone</label>
              <input
                name="contactPhone"
                value={form.contactPhone}
                onChange={handleChange}
              />
            </div>
            <div className={styles.formField}>
              <label>Email</label>
              <input name="email" value={form.email} onChange={handleChange} />
            </div>
            <div className={styles.formField}>
              <label>License 1</label>
              <input
                name="license1"
                value={form.license1}
                onChange={handleChange}
                placeholder="# / text"
              />
            </div>
            <div className={styles.formField}>
              <label>License 2</label>
              <input
                name="license2"
                value={form.license2}
                onChange={handleChange}
              />
            </div>
            <div className={styles.formField}>
              <label>License 3</label>
              <input
                name="license3"
                value={form.license3}
                onChange={handleChange}
              />
            </div>
            <div className={styles.formField}>
              <label>License 4</label>
              <input
                name="license4"
                value={form.license4}
                onChange={handleChange}
              />
            </div>
            <div className={styles.formField}>
              <label>City</label>
              <input
                name="locationCity"
                value={form.locationCity}
                onChange={handleChange}
              />
            </div>
            <div className={styles.formField}>
              <label>State</label>
              <select
                name="locationState"
                value={form.locationState}
                onChange={handleChange}
              >
                <option value="">Select State</option>
                <option value="AL">AL</option>
                <option value="AK">AK</option>
                <option value="AZ">AZ</option>
                <option value="AR">AR</option>
                <option value="CA">CA</option>
                <option value="CO">CO</option>
                <option value="CT">CT</option>
                <option value="DE">DE</option>
                <option value="FL">FL</option>
                <option value="GA">GA</option>
                <option value="HI">HI</option>
                <option value="ID">ID</option>
                <option value="IL">IL</option>
                <option value="IN">IN</option>
                <option value="IA">IA</option>
                <option value="KS">KS</option>
                <option value="KY">KY</option>
                <option value="LA">LA</option>
                <option value="ME">ME</option>
                <option value="MD">MD</option>
                <option value="MA">MA</option>
                <option value="MI">MI</option>
                <option value="MN">MN</option>
                <option value="MS">MS</option>
                <option value="MO">MO</option>
                <option value="MT">MT</option>
                <option value="NE">NE</option>
                <option value="NV">NV</option>
                <option value="NH">NH</option>
                <option value="NJ">NJ</option>
                <option value="NM">NM</option>
                <option value="NY">NY</option>
                <option value="NC">NC</option>
                <option value="ND">ND</option>
                <option value="OH">OH</option>
                <option value="OK">OK</option>
                <option value="OR">OR</option>
                <option value="PA">PA</option>
                <option value="RI">RI</option>
                <option value="SC">SC</option>
                <option value="SD">SD</option>
                <option value="TN">TN</option>
                <option value="TX">TX</option>
                <option value="UT">UT</option>
                <option value="VT">VT</option>
                <option value="VA">VA</option>
                <option value="WA">WA</option>
                <option value="WV">WV</option>
                <option value="WI">WI</option>
                <option value="WY">WY</option>
              </select>
            </div>
            <div className={styles.formField}>
              <label>Travel Preference</label>
              <select
                name="travelPreference"
                value={form.travelPreference}
                onChange={handleChange}
              >
                <option value="">Not Specified</option>
                <option value="1">Willing to Travel</option>
                <option value="2">Willing to Travel Within State</option>
                <option value="3">Prefers to Stay Local</option>
              </select>
            </div>
            <div className={styles.formField}>
              <label>Travel Notes</label>
              <textarea
                name="travelNotes"
                value={form.travelNotes || ""}
                onChange={handleChange}
                placeholder="Add travel-related notes (will be appended with timestamp to employee record)"
                style={{
                  minHeight: "80px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                }}
              />
            </div>
          </div>
        </section>

        {/* COMPLIANCE */}
        <section className={styles.formSection}>
          <h2>Compliance & Training</h2>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label>Badging</label>
              <input
                name="badging"
                value={form.badging}
                onChange={handleChange}
              />
            </div>
            <div className={styles.formField}>
              <label>Level 1 Status</label>
              <input
                name="level1Status"
                value={form.level1Status}
                onChange={handleChange}
              />
            </div>
            <div className={styles.formField}>
              <label>Scissor Lift Status</label>
              <input
                name="scissorLiftStatus"
                value={form.scissorLiftStatus}
                onChange={handleChange}
              />
            </div>
            <div className={styles.formField}>
              <label>Hire Date</label>
              <input
                type="date"
                name="hireDate"
                value={form.hireDate}
                onChange={handleChange}
              />
            </div>
            <div className={styles.formField}>
              <label>Last Pay Change</label>
              <input
                type="date"
                name="lastPayChange"
                value={form.lastPayChange}
                onChange={handleChange}
              />
            </div>
            <div className={styles.formField}>
              <label>OSHA 10 Date</label>
              <input
                type="date"
                name="osha10Date"
                value={form.osha10Date}
                onChange={handleChange}
              />
            </div>
            <div className={styles.formField}>
              <label>OSHA 30 Date</label>
              <input
                type="date"
                name="osha30Date"
                value={form.osha30Date}
                onChange={handleChange}
              />
            </div>
            <div className={styles.formField}>
              <label>Language</label>
              <input
                name="language"
                value={form.language}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* NOTES */}
        <section className={styles.formSection}>
          <h2>Notes & Follow-Up</h2>
          <div className={styles.formGrid}>
            <div className={styles.formFieldWide}>
              <label>Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
              />
            </div>
            <div className={styles.formFieldWide}>
              <label>Corrective Action</label>
              <textarea
                name="correctiveAction"
                value={form.correctiveAction}
                onChange={handleChange}
                rows={2}
              />
            </div>
            <div className={styles.formFieldWide}>
              <label>Updates</label>
              <textarea
                name="updates"
                value={form.updates}
                onChange={handleChange}
                rows={2}
              />
            </div>
            <div className={styles.formField}>
              <label>XID</label>
              <input name="xid" value={form.xid} onChange={handleChange} />
            </div>
            <div className={styles.formFieldWide}>
              <label>New Hire Follow Up</label>
              <textarea
                name="newHireFollowUp"
                value={form.newHireFollowUp}
                onChange={handleChange}
                rows={2}
              />
            </div>
          </div>
        </section>
        {/* Bottom action buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 16,
            marginTop: 36,
            marginBottom: 8,
          }}
        >
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setShowCancelModal(true)}
            style={{ minWidth: 110 }}
          >
            ← Cancel
          </button>
          <button
            type="submit"
            form="add-transfer-form"
            className={styles.primaryBtn}
            disabled={saving}
            style={{
              minWidth: 140,
              background: "#1db954",
              color: "#fff",
              border: "none",
            }}
          >
            {saving ? "Saving..." : "Save Transfer"}
          </button>
        </div>
      </form>
      <Footer />
    </div>
  );
}
