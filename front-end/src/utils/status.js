// utils/status.js
export function statusNorm(e) {
  const raw = (e?.employeeStatus ?? '').toString().trim().toLowerCase();
  const end = e?.endDate;

  const endStr = end == null ? '' : String(end).trim();
  const hasRealEnd =
    endStr !== '' &&
    !/^0+[-\/]0+[-\/]0+(?:\s+0{2}:\s*0{2}:\s*0{2})?$/i.test(endStr) && // "0000-00-00" variants
    !/^null|undefined$/i.test(endStr);

  if (hasRealEnd) return 'terminated';
  if (['terminated','term','termed','separated','fired'].includes(raw)) return 'terminated';
  if (['inactive','on leave','on_leave','leave'].includes(raw)) return 'inactive';
  if (raw === 'active') return 'active';
  return 'other';
}
