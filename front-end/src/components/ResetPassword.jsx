import React, { useEffect, useState } from "react";
import api from "../api";

export default function ResetPassword() {
  const [tokenId, setTokenId] = useState("");
  const [token, setToken] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setTokenId(p.get("tokenId") || "");
    setToken(p.get("token") || "");
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!tokenId || !token) return setMsg({t:"e",x:"Reset link is invalid."});
    if (pw !== pw2) return setMsg({t:"e",x:"Passwords do not match."});
    if (pw.length < 12) return setMsg({t:"e",x:"Use at least 12 characters."});

    try {
      setBusy(true);
      await api.post("/api/v1/auth/reset-password",
        { tokenId, token, newPassword: pw });
      setMsg({ t:"s", x:"Password updated. Please sign in." });
      setTimeout(()=>window.location.assign("/login"), 800);
    } catch (err) {
      const x = err?.response?.data?.message || "Reset failed. Request a new link.";
      setMsg({ t:"e", x });
    } finally { setBusy(false); }
  };

  return (
    <div style={{maxWidth:420, margin:"40px auto"}}>
      <h2>Reset Password</h2>
      <form onSubmit={submit}>
        <label>New password</label>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} />
        <label>Confirm new password</label>
        <input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} />
        <button disabled={busy} type="submit" style={{marginTop:12}}>
          {busy ? "Saving…" : "Set new password"}
        </button>
      </form>
      {msg && <p style={{marginTop:12, color: msg.t==="e" ? "#d33" : "#2d7"}}>{msg.x}</p>}
    </div>
  );
}
