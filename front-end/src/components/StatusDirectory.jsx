import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import styles from "../stylesheets/StatusDirectory.module.css";

import { BsPersonXFill, BsPersonDashFill } from "react-icons/bs";

export default function StatusDirectory({ title, statuses }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Decide which header icon to render based on statuses
  const lower = (statuses || []).map((s) => String(s).toLowerCase());
  const isTerminated = lower.includes("terminated");
  const isInactiveOrLeave =
    lower.includes("inactive") || lower.includes("on leave") || lower.includes("not hired");

  const HeaderIcon = isTerminated ? BsPersonXFill : BsPersonDashFill; // default to “away”

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/v1/employee/list");
        const wanted = lower;
        const list = (res.data || [])
          .filter((e) => wanted.includes((e.employeeStatus || "").toLowerCase()))
          .sort((a, b) => (a.employeename || "").localeCompare(b.employeename || ""));
        setEmployees(list);
      } catch (err) {
        console.error("Failed to load employees by status", err);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [title]); 

  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return "No Number Entered.";
    const cleaned = ("" + phoneNumber).replace(/\D/g, "");
    if (cleaned.length === 10) return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
    return phoneNumber;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <HeaderIcon
            className={`${styles.icon} ${isTerminated ? styles.iconDanger : styles.iconWarning}`}
            size={32}
            aria-hidden="true"
          />
          <h1 className={styles.title}>{title}</h1>
        </div>
        <div className={styles.headerRight}>
          <button onClick={() => navigate("/home")} className={styles.backButton}>
            ← Back to Home
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.skeletonWrap}>
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
          </div>
        ) : employees.length === 0 ? (
          <p className={styles.noData}>No employees found for these statuses.</p>
        ) : (
          <div className={styles.list}>
            {employees.map((e) => (
              <div key={e.employeeid} className={styles.card}>
                <div className={styles.info}>
                  <div className={styles.rowTop}>
                    <span className={styles.name}>{e.employeename}</span>
                    {e.employeeStatus && (
                      <span
                        className={`${styles.badge} ${
                          /terminated/i.test(e.employeeStatus) ? styles.badgeDanger
                          : /leave|inactive|not hired/i.test(e.employeeStatus) ? styles.badgeWarning
                          : styles.badgeNeutral
                        }`}
                        title={e.employeeStatus}
                      >
                        {e.employeeStatus}
                      </span>
                    )}
                  </div>
                  <div className={styles.rowMeta}>
                    <span className={styles.metaItem}><strong>Group:</strong> {e.workGroup || "—"}</span>
                    <span className={styles.metaItem}><strong>Rank:</strong> {e.ranked || "—"}</span>
                    <span className={styles.metaItem}><strong>Project:</strong> {e.project || "—"}</span>
                    <span className={styles.metaItem}><strong>Phone:</strong> {formatPhoneNumber(e.phoneNumber)}</span>
                  </div>
                </div>
                <div className={styles.actions}>
                  <button
                    className={styles.detailsButton}
                    onClick={() => navigate(`/employee-details/${e.employeeid}`)}
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>© 2024 CEC Employee Database. All rights reserved.</p>
      </footer>
    </div>
  );
}
