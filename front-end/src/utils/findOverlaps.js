/**
 * Given normalized assignments, returns a list of overlaps:
 * [{ employee, a: Assignment, b: Assignment }]
 * Overlap rule: (a.start < b.end) && (b.start < a.end)
 */
export function findOverlaps(assignments = []) {
  const byEmployee = new Map();

  for (const a of assignments) {
    if (!a || !(a.start instanceof Date) || !(a.end instanceof Date)) continue;
    if (!byEmployee.has(a.employee)) byEmployee.set(a.employee, []);
    byEmployee.get(a.employee).push(a);
  }

  const overlaps = [];

  for (const [employee, arr] of byEmployee) {
    arr.sort((x, y) => x.start - y.start);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const A = arr[i], B = arr[j];
        if (A.end <= B.start) break; // sorted by start; nothing beyond j will overlap A
        if (A.start < B.end && B.start < A.end) {
          overlaps.push({ employee, a: A, b: B });
        }
      }
    }
  }

  return overlaps;
}

export default findOverlaps;
