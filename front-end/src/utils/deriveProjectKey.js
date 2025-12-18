// Builds a human + stable project key for one timecard row.
// Priority:
// 1) Distributed Job/Activity (AG/AK + AH/AL)
// 2) HomeAllocation if present (your pre-built string)
// 3) Home allocation synthesized from Q+S+U+W+Y+AA equivalents
// 4) Allocation Code (column J)
// 5) Fallback "Unknown"

export function deriveProjectKey(row = {}) {
  // 1) Dist job/activity (AG, AH, AK, AL)
  const dJob = row.dist_job_code || row.distJobCode || row.job_no || row.job_no_ag;
  const dJobDesc = row.dist_job_desc || row.distJobDesc || row.job_desc || row.job_desc_ah;
  const dAct = row.dist_activity_code || row.distActivityCode || row.activity_code || row.activity_code_ak;
  const dActDesc = row.dist_activity_desc || row.distActivityDesc || row.activity_desc || row.activity_desc_al;

  if (dJob || dAct) {
    // Example:  220145 • Structural – 0310 • Rebar
    const left = [dJob, dJobDesc].filter(Boolean).join(" • ");
    const right = [dAct, dActDesc].filter(Boolean).join(" • ");
    return [left, right].filter(Boolean).join(" – ");
  }

  // 2) Provided HomeAllocation (the Q+S+U+W+Y+AA combo if your ETL prefilled it)
  if (row.home_allocation || row.homeAllocation) {
    return String(row.home_allocation || row.homeAllocation);
  }

  // 3) Synthesize home allocation key from the “home_*” parts if present
  const homeParts = [
    row.home_department || row.homeDepartment,
    row.home_job_code || row.homeJobCode,
    row.home_section_code || row.homeSectionCode,
    row.home_activity_code || row.homeActivityCode,
    row.home_user_access_code || row.homeUserAccessCode,
    row.home_sub_department_code || row.homeSubDepartmentCode,
  ].filter(Boolean);

  if (homeParts.length) {
    return homeParts.join(" / ");
  }

  // 4) Allocation column (J)
  const alloc = row.allocation_code || row.allocation || row.charged_allocation;
  if (alloc) return String(alloc);

  // 5) Fallback
  return "Unknown";
}

export default deriveProjectKey;
