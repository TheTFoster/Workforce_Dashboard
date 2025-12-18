import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { ackAlert, listAlerts, resolveAlert } from "../api/alerts";

const AlertsCtx = createContext(null);

export function AlertsProvider({ children }) {
  const [list, setList] = useState([]); // alerts
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [filters, setFilters] = useState({
    by: "empCode", // "empCode" | "name" | "id" | "any"
    q: "",
    from: "", // yyyy-mm-dd
    to: "", // yyyy-mm-dd
  });

  // prevent overlapping refreshes
  const refreshBusy = useRef(false);

  const safeStr = (v) =>
    v === null || v === undefined ? "" : String(v).trim();

  const parseDetails = (raw) => {
    const payload = raw?.details || raw?.details_json;
    if (payload && typeof payload === "object") return payload;
    const text = raw?.detailsJson ?? raw?.details_json;
    if (!text || typeof text !== "string") return null;
    try {
      return JSON.parse(text);
    } catch (_e) {
      return null;
    }
  };

  const normalizeAlert = (raw = {}) => {
    const details = parseDetails(raw);
    const empCode =
      raw.empCode ?? raw.emp_code ?? details?.emp_code ?? details?.empCode ?? "";
    const empName =
      raw.empName ??
      raw.emp_name ??
      details?.emp_name ??
      details?.employeeName ??
      details?.name ??
      "";
    const message =
      raw.message ?? raw.subject ?? details?.message ?? details?.subject ?? "";
    const createdAt =
      raw.occurredOn ??
      raw.createdOn ??
      raw.created_at ??
      raw.createdAt ??
      raw.firstSeenAt ??
      raw.lastSeenAt ??
      details?.occurredOn ??
      "";
    const status =
      raw.status ||
      (raw.resolved ? "resolved" : raw.acked ? "acked" : "open");

    return {
      ...raw,
      empCode,
      empName,
      message,
      createdAt,
      status,
      acked: Boolean(raw.acked) || status === "acked" || status === "resolved",
      resolved: Boolean(raw.resolved) || status === "resolved",
      detailsJson:
        raw.detailsJson ?? raw.details_json ?? (details && JSON.stringify(details)),
    };
  };

  async function refreshList(partial = null) {
    if (refreshBusy.current) return;
    refreshBusy.current = true;
    setListError("");
    setListLoading(true);
    try {
      const f = { ...(partial ? { ...filters, ...partial } : filters) };
      const q = safeStr(f.q);
      const params = {
        from: f.from || undefined,
        to: f.to || undefined,
        status: "open",
      };

      if (q) {
        switch (f.by) {
          case "id": {
            const n = Number(q);
            if (!Number.isNaN(n)) params.employeeId = n;
            else params.empCode = q;
            break;
          }
          case "empCode":
            params.empCode = q;
            break;
          case "name":
          case "any":
          default:
            // backend supports empCode/employeeId filters; broaden client-side
            params.empCode = q;
            break;
        }
      }

      const payload = await listAlerts(params);
      const normalized = (Array.isArray(payload) ? payload : payload?.items ?? []).map(
        normalizeAlert
      );

      const filtered =
        q && (f.by === "name" || f.by === "any")
          ? normalized.filter((a) => {
              const hay = [
                safeStr(a.empName).toLowerCase(),
                safeStr(a.empCode).toLowerCase(),
                safeStr(a.message).toLowerCase(),
              ];
              const probe = q.toLowerCase();
              return hay.some((h) => h.includes(probe));
            })
          : normalized;

      setList(filtered);
    } catch (e) {
      console.error(e);
      setListError("Failed to fetch alerts.");
      setList([]);
    } finally {
      setListLoading(false);
      refreshBusy.current = false;
    }
  }

  async function ackOne(id) {
    try {
      await ackAlert(id, "ui");
      setList((cur) =>
        cur.map((a) =>
          a.id === id ? { ...a, acked: true, status: "acked" } : a
        )
      );
    } catch (e) {
      console.error(e);
      alert("Acknowledge failed.");
    }
  }

  async function resolveOne(id) {
    try {
      await resolveAlert(id);
      setList((cur) =>
        cur.map((a) =>
          a.id === id ? { ...a, resolved: true, status: "resolved" } : a
        )
      );
    } catch (e) {
      console.error(e);
      alert("Resolve failed.");
    }
  }

  async function ackBulk(ids) {
    if (!ids?.length) return;
    try {
      await Promise.all(ids.map((id) => ackAlert(id, "ui")));
      const setIds = new Set(ids);
      setList((cur) =>
        cur.map((a) =>
          setIds.has(a.id) ? { ...a, acked: true, status: "acked" } : a
        )
      );
    } catch (e) {
      console.error(e);
      alert("Bulk acknowledge failed.");
    }
  }

  async function resolveBulk(ids) {
    if (!ids?.length) return;
    try {
      await Promise.all(ids.map((id) => resolveAlert(id)));
      const setIds = new Set(ids);
      setList((cur) =>
        cur.map((a) =>
          setIds.has(a.id) ? { ...a, resolved: true, status: "resolved" } : a
        )
      );
    } catch (e) {
      console.error(e);
      alert("Bulk resolve failed.");
    }
  }

  // unread/open count for badges
  const count = useMemo(
    () => list.filter((a) => a.status !== "resolved").length,
    [list]
  );

  const value = {
    list,
    listLoading,
    listError,
    refreshList,
    ackOne,
    resolveOne,
    ackBulk,
    resolveBulk,
    filters,
    setFilters,
    safeStr,
    count,
  };

  return <AlertsCtx.Provider value={value}>{children}</AlertsCtx.Provider>;
}

export const useAlerts = () => useContext(AlertsCtx);
