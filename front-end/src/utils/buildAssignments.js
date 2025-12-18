/**
 * Build Gantt assignments from employee records.
 * Output items have: employee, employeeId, start: Date, end: Date, project
 */
export function buildAssignments(employees = []) {
  const out = [];

  const toDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d) ? null : d;
  };

  const getName = (e) =>
    (e?.employeename ??
      e?.employee_name ??
      e?.name ??
      [e?.firstName, e?.lastName].filter(Boolean).join(" ") ??
      "—") || "—";

  const getId = (e) => e?.employeeid ?? e?.employeeId ?? e?.empId ?? e?.id ?? null;

  for (const e of Array.isArray(employees) ? employees : []) {
    const name = getName(e);
    const id = getId(e);

    // 1) single assignment directly on the employee object
    if (e?.project && (e?.start || e?.start_date || e?.startDate)) {
      const s = toDate(e.start ?? e.start_date ?? e.startDate);
      const ed = toDate(e.end ?? e.end_date ?? e.endDate) ?? (s ? new Date(s) : null);
      if (s && ed) {
        out.push({
          employee: name,
          employeeId: id,
          start: s,
          end: ed,
          project: String(e.project),
        });
      }
    }

    // 2) array-based history: transfers/assignments/etc.
    const hist =
      e?.transfers ??
      e?.transfer_history ??
      e?.history ??
      e?.assignments ??
      [];

    if (Array.isArray(hist)) {
      for (const h of hist) {
        const s = toDate(h?.start ?? h?.start_date ?? h?.from);
        const ed = toDate(h?.end ?? h?.end_date ?? h?.to);
        const p =
          h?.project ?? h?.project_key ?? h?.projectId ?? h?.job ?? h?.code;
        if (s && ed && p != null) {
          out.push({
            employee: name,
            employeeId: id,
            start: s,
            end: ed,
            project: String(p),
          });
        }
      }
    }
  }

  return out;
}

export default buildAssignments;
