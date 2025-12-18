import api from "../api";

export async function fetchTimeline(employeeId) {
  const { data } = await api.get(`/api/v1/employee/id/${employeeId}/timeline`);
  return data;
}
