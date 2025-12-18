// front-end/src/components/FieldImportUpload.jsx
import React, { useState } from "react";
import api from "../api"; // your axios instance with baseURL
import styles from "../stylesheets/FieldImportUpload.module.css";

const getXsrfToken = () =>
  document.cookie.split("; ").find(c => c.startsWith("XSRF-TOKEN="))?.split("=")[1];

export default function FieldImportUpload() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const onUpload = async () => {
    if (!file) { setError("Pick a CSV first."); return; }
    setError(""); setBusy(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/api/v1/field-import/upload", fd, {
        headers: { "Content-Type": "multipart/form-data", "X-XSRF-TOKEN": getXsrfToken() },
        withCredentials: true
      });
      setResult(res.data);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.card}>
      <h3>Update Employees (CSV)</h3>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        disabled={busy}
      />
      <button onClick={onUpload} disabled={busy || !file}>
        {busy ? "Uploading…" : "Upload & Apply"}
      </button>

      {error && <p className={styles.error}>{error}</p>}

      {result && (
        <div className={styles.result}>
          <div><b>Rows loaded to staging:</b> {result.rowsLoaded || 0}</div>
          <div><b>Employees updated:</b> {result.rowsUpdated || 0}</div>
          <div><b>New employees inserted:</b> {result.rowsInserted || 0}</div>
          {result.message && <div style={{marginTop: 8, fontSize: 13}}>{result.message}</div>}
          
          {/* Show inserted employees */}
          {result.insertedEmployees && result.insertedEmployees.length > 0 && (
            <details style={{marginTop: 12, border: '1px solid #3a4a6a', padding: 8, borderRadius: 4}}>
              <summary style={{cursor: 'pointer', fontWeight: 'bold', color: '#4ade80'}}>
                ✓ {result.insertedEmployees.length} New Employee{result.insertedEmployees.length !== 1 ? 's' : ''} Added
              </summary>
              <div style={{maxHeight: '400px', overflowY: 'auto', marginTop: 8}}>
                <ul style={{fontSize: 12}}>
                  {result.insertedEmployees.map((emp, i) => (
                    <li key={i}>
                      <strong>{emp.employeeCode}</strong> - {emp.name} ({emp.position || 'No position'}) - {emp.status}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}

          {/* Show updated employees */}
          {result.updatedEmployees && result.updatedEmployees.length > 0 && (
            <details style={{marginTop: 12, border: '1px solid #3a4a6a', padding: 8, borderRadius: 4}}>
              <summary style={{cursor: 'pointer', fontWeight: 'bold', color: '#fbbf24'}}>
                ⚠ {result.updatedEmployees.length} Employee{result.updatedEmployees.length !== 1 ? 's' : ''} Updated
              </summary>
              <div style={{maxHeight: '400px', overflowY: 'auto', marginTop: 8}}>
                <ul style={{fontSize: 12}}>
                  {result.updatedEmployees.map((emp, i) => (
                    <li key={i}>
                      <strong>{emp.employeeCode}</strong> - {emp.name}
                      {emp.changes && emp.changes.length > 0 && (
                        <ul style={{marginLeft: 16, marginTop: 4}}>
                          {emp.changes.map((change, j) => (
                            <li key={j} style={{color: '#94a3b8'}}>{change}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
