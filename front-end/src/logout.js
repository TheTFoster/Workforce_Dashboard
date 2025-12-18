// src/logout.js
import axios from "axios";
import { BASENAME } from "./api";

export async function logout() {
  localStorage.removeItem("auth");
  try {
    const host = (import.meta.env.VITE_API_BASE?.trim()) || "http://localhost:8086";
    await axios.post(`${host}/api/v1/auth/logout`, {}, { withCredentials: true });
  } catch {}
  window.location.assign(`${BASENAME}/login`);
}
