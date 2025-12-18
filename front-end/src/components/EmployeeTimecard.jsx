import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import { startOfWeek, endOfWeek, format, parseISO } from "date-fns";

export default function EmployeeTimecard({ eeCode }) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const end = new Date();
        const start = new Date(end);
        start.setMonth(end.getMonth() - 1); 
        const q = {
          start: format(start, "yyyy-MM-dd"),
          end: format(end, "yyyy-MM-dd"),
          eeCode,
        };
        const resp = await api.get("/api/v1/timecards/raw", { params: q });
        setRows(Array.isArray(resp?.data?.rows) ? resp.data.rows : []);
        setErr(null);
      } catch (e) {
        setErr(e?.response?.data?.message || e.message);
        setRows([]);
      }
    })();
  }, [eeCode]);

  const weeks = useMemo(() => {
    const map = new Map(); // key = yyyy-ww
    for (const r of rows) {
      const d = parseISO(r.work_date);
      const ws = startOfWeek(d, { weekStartsOn: 1 });
      const we = endOfWeek(d, { weekStartsOn: 1 });
      const key = `${format(ws, "yyyy-MM-dd")}→${format(we, "yyyy-MM-dd")}`;
      const agg = map.get(key) || { start: ws, end: we, total: 0, days: [] };
      agg.total += Number(r.earn_hours || 0);
      const missingPunch =
        (!r.in_punch_time && r.out_punch_time) ||
        (r.in_punch_time && !r.out_punch_time);
      agg.days.push({
        date: d,
        job: r.dist_job_code,
        act: r.dist_activity_code,
        hours: Number(r.earn_hours || 0),
        missingPunch,
      });
      map.set(key, agg);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1].start - b[1].start)
      .map(([k, v]) => ({ key: k, ...v }));
  }, [rows]);

  if (err) return <div style={{ color: "#ff9c9c" }}>{err}</div>;
  if (!rows.length) return <div>No timecard rows in the selected window.</div>;

  return (
    <div>
      {weeks.map((w) => (
        <div
          key={w.key}
          style={{
            marginBottom: 16,
            padding: 12,
            border: "1px solid #2b3b5c",
            borderRadius: 8,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            Week {format(w.start, "MMM d")} – {format(w.end, "MMM d")} • Total:{" "}
            {w.total.toFixed(2)} h
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {w.days
              .sort((a, b) => a.date - b.date)
              .map((d, i) => (
                <li
                  key={i}
                  style={{ color: d.missingPunch ? "#ffb37a" : undefined }}
                >
                  {format(d.date, "EEE, MMM d")} — {d.hours.toFixed(2)} h
                  {d.job ? ` • Job ${d.job}` : ""}
                  {d.act ? ` / Act ${d.act}` : ""}
                  {d.missingPunch ? "  (⚠ missing punch)" : ""}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
