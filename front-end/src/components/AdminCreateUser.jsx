import React, { useState, useEffect } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import styles from "../stylesheets/AdminCreateUser.module.css";

export default function AdminCreateUser() {
  // ID is usually auto-assigned server-side; prefill it but allow override
  const [id, setId] = useState(null);
  const [name, setName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [mustChange, setMustChange] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/api/v1/admin/users/next-id", { withCredentials: true });
        const next = res?.data?.nextId;
        if (mounted && (next || next === 0)) setId(next);
      } catch (err) {
        // ignore — UI will still work and server will assign
      }
    })();
    return () => (mounted = false);
  }, []);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      setBusy(true);
      const body = {
        id: id ? Number(id) : 0,
        name,
        employeeCode,
        password,
        mustChangePassword: mustChange,
        isAdmin: isAdmin,
      };
      await api.post("/api/v1/admin/users", body);
      setMsg({ t: "s", x: "User created" });
      setTimeout(() => navigate("/home"), 800);
    } catch (err) {
      const server = err?.response?.data?.message || err?.message;
      setMsg({ t: "e", x: server || "Create failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card} tabIndex={-1}>
        <h2 className={styles.title}>Create User (Admin)</h2>
        <form onSubmit={submit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>ID (int)</label>
            <input
              className={styles.input}
              type="number"
              value={id ?? ""}
              onChange={(e) => setId(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Name</label>
            <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Employee Code</label>
            <input className={styles.input} value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Initial Password</label>
            <input className={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className={styles.checkboxRow}>
            <label>
              <input type="checkbox" checked={mustChange} onChange={(e) => setMustChange(e.target.checked)} />
              <span className={styles.checkboxLabel}>Must change password</span>
            </label>
          </div>
          <div className={styles.checkboxRow}>
            <label>
              <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
              <span className={styles.checkboxLabel}>Grant admin rights</span>
            </label>
          </div>
          <div className={styles.actions}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={busy}>{busy ? "Creating…" : "Create user"}</button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} type="button" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </form>
        {msg && (
          <div className={msg.t === "e" ? styles.msgError : styles.msgSuccess}>{msg.x}</div>
        )}
        <div className={styles.footerNote}>IDs should be unique. Initial password will be bcrypt-hashed on the server.</div>
      </div>
    </div>
  );
}
