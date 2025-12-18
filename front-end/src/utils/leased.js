// front-end/src/utils/leased.js
import { /* optional */ } from "./status"; // if you need getCecId from somewhere else, copy that helper here

const getCecId = (e) => e?.employeeCode || e?.empCode || e?.emp_code || "";

/**
 * leasedNorm(e): returns boolean
 * Priority:
 *   1) Explicit server truth: e.isLeased / e.leased / e.leased_flag (any boolean-ish)
 *   2) Heuristic score from common fields (vendor/agency/type/notes/ID patterns)
 */
export function leasedNorm(e) {
  // 1) explicit server truth
  const explicit =
    e?.isLeased ?? e?.leased ?? e?.leased_flag ?? e?.leasedLabor ?? null;
  if (explicit !== null && explicit !== undefined) {
    return String(explicit).toLowerCase() === "true" || explicit === 1 || explicit === true;
  }

  // 2) heuristics (conservative; tweak as you learn your data)
  const s = (v) => String(v || "").trim().toLowerCase();

  const hints = [
    s(e.employmentType), s(e.employeeType), s(e.workerType),
    s(e.vendor), s(e.agency), s(e.supplier), s(e.staffingFirm),
    s(e.notes), s(e.moreNotes), s(e.employeeVerify), s(e.workGroup), s(e.project)
  ].join(" • ");

  // keyword signals
  const kw = /(leased|lease labor|lease-labor|contract(or)?|staffing|temp( |-|$)|agency|consultant)/i;
  const hasKW = kw.test(hints);

  // ID pattern hint (optional; remove if you don’t use patterns)
  const id = String(getCecId(e)).toUpperCase();
  const idHint = /^(LL-|AGY-|TMP-)/.test(id);

  // explicit W2 or FTE (negative signal)
  const isW2 = /\b(w[-\s]?2|fte|full[-\s]?time)\b/i.test(hints);

  // score
  let score = 0;
  if (hasKW) score += 2;         // strong signal
  if (idHint) score += 1;        // weak signal
  if (s(e.vendor) || s(e.agency) || s(e.supplier)) score += 2; // strong
  if (/\b(1099|contract)\b/i.test(hints)) score += 1;

  if (isW2) score -= 2;          // W-2/FTE likely not leased

  return score >= 2;
}
