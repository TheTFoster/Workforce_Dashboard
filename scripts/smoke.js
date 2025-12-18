#!/usr/bin/env node
/**
 * Lightweight smoke tester for the EmployeeDB API.
 *
 * Usage (PowerShell):
 *   $env:SMOKE_BASE_URL="http://localhost:8086"
 *   $env:SMOKE_USER="A41B"
 *   $env:SMOKE_PASS="YourPasswordHere"
 *   # optional; defaults to SMOKE_USER
 *   $env:SMOKE_EMP_CODE="A41B"
 *   node scripts/smoke.js
 *
 * The script is read-only: it logs in, hits common GET/POST reads, and reports status codes.
 */

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:8086";
const user = process.env.SMOKE_USER;
const pass = process.env.SMOKE_PASS;
const empCode = process.env.SMOKE_EMP_CODE || user;
const adminOnly = process.env.SMOKE_ADMIN === "true"; // gate admin calls
const writeProbes = process.env.SMOKE_WRITE === "true"; // gate mutating/dry-run-ish probes
const SMOKE_HEADER = { "X-Smoke-Test": "true" };

if (!user || !pass) {
  console.error("Set SMOKE_USER and SMOKE_PASS env vars before running.");
  process.exit(1);
}

/** Naive cookie jar */
const jar = {};

function setCookies(res) {
  const raw = res.headers.getSetCookie?.() || res.headers.raw?.()["set-cookie"] || [];
  for (const line of raw) {
    const [pair] = line.split(";");
    const [k, v] = pair.split("=").map((s) => s.trim());
    if (k && v !== undefined) jar[k] = v;
  }
}

function cookieHeader() {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function request(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const headers = { ...(opts.headers || {}) };
  if (Object.keys(jar).length) headers.Cookie = cookieHeader();
  const res = await fetch(url, { ...opts, headers });
  setCookies(res);
  return res;
}

async function jsonOrText(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("json")) return res.json().catch(() => null);
  return res.text().catch(() => null);
}

function report(name, res) {
  console.log(`${name}: ${res.status} ${res.statusText}`);
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log(`Smoke against ${baseUrl}`);

  let res = await request("/api/ping");
  report("ping", res);

  res = await request("/csrf-token");
  report("csrf-token", res);
  const csrfBody = await jsonOrText(res);
  const csrfToken = csrfBody?.token;

  // Login
  res = await request("/api/v1/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
    },
    body: JSON.stringify({ employeeCode: user, password: pass }),
  });
  report("auth/login", res);
  if (!res.ok) {
    console.error("Login failed, aborting.");
    return;
  }

  res = await request("/api/v1/auth/me");
  report("auth/me", res);

  // Timecards reads
  res = await request("/api/v1/timecards/latest-by-emp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
    },
    body: JSON.stringify({ empCodes: [empCode] }),
  });
  report("timecards/latest-by-emp", res);

  res = await request("/api/v1/timecards/current-assignments/by-emp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
    },
    body: JSON.stringify({ empCodes: [empCode] }),
  });
  report("timecards/current-assignments/by-emp", res);

  // Timecards reads (safe GETs)
  res = await request("/api/v1/timecards/options");
  report("timecards/options", res);
  res = await request("/api/v1/timecards/range/sample");
  report("timecards/range/sample", res);
  res = await request(`/api/v1/timecards/latest?eeCode=${encodeURIComponent(empCode)}`);
  report("timecards/latest", res);
  // Basic search (small window)
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  res = await request(
    `/api/v1/timecards/search?startDate=${isoDate(sevenDaysAgo)}&endDate=${isoDate(
      today
    )}&page=0&size=5`
  );
  report("timecards/search", res);
  // Week detail (uses same empCode; expect empty if none in range)
  const lastSunday = new Date(today);
  const day = lastSunday.getDay(); // 0 = Sunday
  lastSunday.setDate(lastSunday.getDate() - day);
  res = await request(
    `/api/v1/timecards/week-detail?eeCode=${encodeURIComponent(empCode)}&weekEnding=${isoDate(
      lastSunday
    )}`
  );
  report("timecards/week-detail", res);

  // Employee reads
  res = await request("/api/v1/employee/list");
  report("employee/list", res);

  res = await request("/api/v1/employee/details-by-emp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
    },
    body: JSON.stringify({ empCodes: [empCode] }),
  });
  report("employee/details-by-emp", res);

  res = await request("/api/v1/employee/meta");
  report("employee/meta", res);

  // Batch sync preview (read-only)
  res = await request("/api/v1/batch-sync/preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
    },
    body: JSON.stringify({ rows: [] }),
  });
  report("batch-sync/preview", res);

  // Transfers (reads only)
  res = await request("/api/v1/transfers");
  report("transfers/list", res);
  res = await request("/api/v1/transfers/highlights");
  report("transfers/highlights", res);
  res = await request("/api/v1/transfers/archived");
  report("transfers/archived", res);

  // Alerts (reads only)
  res = await request("/api/v1/alerts?status=open&limit=5");
  report("alerts/open", res);

  // Orphan punches (auth required; keep read-only)
  res = await request("/api/v1/alerts/orphan-punches");
  report("alerts/orphan-punches", res);

  // KPI dashboard
  res = await request("/api/v1/kpis/dashboard");
  report("kpis/dashboard", res);

  // Mandown groups (list)
  res = await request("/api/v1/mandown-groups");
  report("mandown-groups", res);

  // Admin-only probes (optional)
  if (adminOnly) {
    // Only probe the read-only admin helper; user creation is POST and is skipped to avoid mutations.
    res = await request("/api/v1/admin/users/next-id", {
      method: "GET",
      headers: {
        ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
      },
    });
    report("admin/users/next-id", res);
  } else {
    console.log("Admin-only endpoints skipped (set SMOKE_ADMIN=true to include).");
  }

  if (writeProbes) {
    console.log("Write probes enabled (using inert IDs/payloads where possible).");
    // Alerts ack/resolve against a non-existent id to avoid data changes
    res = await request("/api/v1/alerts/0/ack", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
        ...SMOKE_HEADER,
      },
    });
    report("alerts/ack(id=0)", res);
    res = await request("/api/v1/alerts/0/resolve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
        ...SMOKE_HEADER,
      },
    });
    report("alerts/resolve(id=0)", res);

    // Transfers create/update/delete (smoke header short-circuits)
    res = await request("/api/v1/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
      body: JSON.stringify({ empCode: "SMOKE", empName: "Smoke Test", toJobsite: "N/A" }),
    });
    report("transfers/create (smoke)", res);
    res = await request("/api/v1/transfers/0", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
      body: JSON.stringify({ empCode: "SMOKE", empName: "Smoke Test" }),
    });
    report("transfers/update(id=0, smoke)", res);
    res = await request("/api/v1/transfers/0", {
      method: "DELETE",
      headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
    });
    report("transfers/delete(id=0, smoke)", res);

    // Transfer status patch
    res = await request("/api/v1/transfers/0/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
      body: JSON.stringify({ status: "TEST" }),
    });
    report("transfers/status(id=0, smoke)", res);

    // Highlights
    res = await request("/api/v1/transfers/highlights", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
      body: JSON.stringify({ transferId: 0, color: "#fff" }),
    });
    report("transfers/highlights upsert (smoke)", res);
    res = await request("/api/v1/transfers/highlights/0", {
      method: "DELETE",
      headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
    });
    report("transfers/highlights delete (smoke)", res);

    // Batch-sync apply
    res = await request("/api/v1/batch-sync/apply", {
      method: "POST",
      headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
    });
    report("batch-sync/apply (smoke)", res);

    // Timecards mutating endpoints
    res = await request("/api/v1/timecards/predict/rebuild", {
      method: "POST",
      headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
    });
    report("timecards/predict/rebuild (smoke)", res);

    res = await request("/api/v1/timecards/cache/refresh?start=2025-01-01&end=2025-01-02", {
      method: "POST",
      headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
    });
    report("timecards/cache/refresh (smoke)", res);

    res = await request("/api/v1/timecards/normalize", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
      body: "{}",
    });
    report("timecards/normalize (smoke)", res);

    // Timecards import/upload (multipart)
    let form = new FormData();
    form.append("file", new Blob(["smoke"], { type: "text/csv" }), "smoke.csv");
    res = await request("/api/v1/timecards/import", {
      method: "POST",
      headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
      body: form,
    });
    report("timecards/import (smoke)", res);

    form = new FormData();
    form.append("file", new Blob(["smoke"], { type: "text/csv" }), "smoke.csv");
    res = await request("/api/v1/timecards/upload", {
      method: "POST",
      headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
      body: form,
    });
    report("timecards/upload (smoke)", res);

    // Admin user create (smoke)
    res = await request("/api/v1/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
      body: JSON.stringify({
        employeeCode: "SMOKE",
        name: "Smoke Test",
        password: "SmokeTest123!",
        mustChangePassword: false,
        isAdmin: false,
        id: 0,
      }),
    });
    report("admin/users create (smoke)", res);

    // Employee save/update/delete (smoke)
    res = await request("/api/v1/employee/save", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
      body: JSON.stringify({
        employeeCode: "SMOKE",
        firstName: "Smoke",
        lastName: "Test",
        workGroup: "QA",
      }),
    });
    report("employee/save (smoke)", res);

    res = await request("/api/v1/employee/id/0", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
      body: JSON.stringify({ employeeCode: "SMOKE", workGroup: "QA-UPDATED" }),
    });
    report("employee/update(id=0, smoke)", res);

    res = await request("/api/v1/employee/id/0", {
      method: "DELETE",
      headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
    });
    report("employee/delete(id=0, smoke)", res);

    // Mandown groups (smoke)
    res = await request("/api/v1/mandown-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
      body: JSON.stringify({ name: "Smoke Group" }),
    });
    report("mandown-groups/create (smoke)", res);

    res = await request("/api/v1/mandown-groups/0", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
      body: JSON.stringify({ name: "Smoke Group Updated" }),
    });
    report("mandown-groups/update(id=0, smoke)", res);

    res = await request("/api/v1/mandown-groups/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
      body: JSON.stringify([0, 1]),
    });
    report("mandown-groups/reorder (smoke)", res);

    res = await request("/api/v1/mandown-groups/0/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
      body: JSON.stringify({ employeeIds: ["SMOKE"] }),
    });
    report("mandown-groups/add-employee (smoke)", res);

    res = await request("/api/v1/mandown-groups/0/employees/SMOKE", {
      method: "DELETE",
      headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
    });
    report("mandown-groups/remove-employee (smoke)", res);

    // Alerts run/refresh (smoke guarded)
    res = await request("/api/v1/alerts/run/no-hours", {
      method: "POST",
      headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
    });
    report("alerts/run/no-hours (smoke)", res);

    res = await request("/api/v1/alerts/run/missed-punch?smoke=true", {
      method: "POST",
      headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
    });
    report("alerts/run/missed-punch (smoke)", res);

    res = await request("/api/v1/alerts/refresh", {
      method: "POST",
      headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
    });
    report("alerts/refresh (smoke)", res);

    // Alerts admin runners (smoke)
    res = await request("/api/v1/alerts/admin/no-hours/run", {
      method: "POST",
      headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
    });
    report("alerts/admin/no-hours/run (smoke)", res);

    res = await request("/api/v1/alerts/admin/missed-punch/run", {
      method: "POST",
      headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
    });
    report("alerts/admin/missed-punch/run (smoke)", res);

    // Orphan punches delete (smoke)
    res = await request("/api/v1/alerts/orphan-punches/0", {
      method: "DELETE",
      headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
    });
    report("alerts/orphan-punches delete(id=0, smoke)", res);

    // Corrective actions (smoke)
    res = await request("/api/v1/employee/0/corrective-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
      body: JSON.stringify({ category: "ATTENDANCE", notes: "Smoke create" }),
    });
    report("corrective-actions/create (smoke)", res);

    res = await request("/api/v1/corrective-actions/0", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
      body: JSON.stringify({ category: "ATTENDANCE", notes: "Smoke update" }),
    });
    report("corrective-actions/update(id=0, smoke)", res);

    res = await request("/api/v1/corrective-actions/0", {
      method: "DELETE",
      headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
    });
    report("corrective-actions/delete(id=0, smoke)", res);

    // File imports/uploads (smoke)
    form = new FormData();
    form.append("file", new Blob(["smoke"], { type: "text/csv" }), "smoke.csv");
    res = await request("/api/v1/batch-sync/upload", {
      method: "POST",
      headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
      body: form,
    });
    report("batch-sync/upload (smoke)", res);

    form = new FormData();
    form.append("file", new Blob(["smoke"], { type: "text/csv" }), "smoke.csv");
    res = await request("/api/v1/field-import/upload", {
      method: "POST",
      headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
      body: form,
    });
    report("field-import/upload (smoke)", res);

    form = new FormData();
    form.append("file", new Blob(["smoke"], { type: "text/plain" }), "smoke.txt");
    res = await request("/api/v1/employee/0/files", {
      method: "POST",
      headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
      body: form,
    });
    report("employee/files upload (smoke)", res);

    res = await request("/api/v1/employee/0/files/0", {
      method: "DELETE",
      headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}), ...SMOKE_HEADER },
    });
    report("employee/files delete (smoke)", res);
  } else {
    console.log("Write probes skipped (set SMOKE_WRITE=true to include inert POSTs).");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
