import React, { useState } from "react";
import api from "../api";

export default function ForgotPassword() {
  const [employeeCode, setCode] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!employeeCode.trim()) return setMsg({t:"e",x:"Enter your CEC ID"});
    try {
      setBusy(true);
      await api.post("/api/v1/auth/forgot-password", { employeeCode });
      setMsg({ t:"s", x:"If the account exists, a reset link has been sent." });
    } catch {
      setMsg({ t:"s", x:"If the account exists, a reset link has been sent." });
    } finally { setBusy(false); }
  };

  return (
    <div style={{maxWidth:420, margin:"40px auto"}}>
      <h2>Forgot Password</h2>
      <form onSubmit={submit}>
        <label>Employee Code (CEC ID)</label>
        <input value={employeeCode} onChange={e=>setCode(e.target.value)} />
        <button disabled={busy} type="submit" style={{marginTop:12}}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>
      {msg && <p style={{marginTop:12, color: msg.t==="e" ? "#d33" : "#2d7"}}>{msg.x}</p>}
    </div>
  );
}
