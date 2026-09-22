import { API_URLS } from "@/constants/urls";

function extractErrorMessage(body, fallback) {
  if (!body?.detail) return fallback;
  if (typeof body.detail === "string") return body.detail;
  if (Array.isArray(body.detail) && body.detail[0]?.msg) {
    return body.detail[0].msg;
  }
  return fallback;
}

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function authHeaders(accessToken) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

async function request(url, { method = "GET", accessToken, body } = {}) {
  const headers = { ...authHeaders(accessToken) };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(extractErrorMessage(data, "Request failed."));
  }
  return data;
}

export async function fetchAdminDashboard(accessToken) {
  return request(API_URLS.dashboard.admin, { accessToken });
}

export async function listPatientsRequest(accessToken, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  return request(`${API_URLS.patients.list}?${query}`, { accessToken });
}

export async function getPatientRequest(accessToken, patientId) {
  return request(API_URLS.patients.detail(patientId), { accessToken });
}

export async function createPatientRequest(accessToken, payload) {
  return request(API_URLS.patients.create, {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export async function updatePatientRequest(accessToken, patientId, payload) {
  return request(API_URLS.patients.detail(patientId), {
    method: "PUT",
    accessToken,
    body: payload,
  });
}

export async function setPatientActiveRequest(accessToken, patientId, active) {
  const path = active
    ? API_URLS.patients.activate(patientId)
    : API_URLS.patients.deactivate(patientId);
  return request(path, { method: "PATCH", accessToken });
}

export async function listDepartmentsRequest(accessToken, activeOnly = true) {
  const query = activeOnly ? "" : "?active_only=false";
  return request(`${API_URLS.departments.list}${query}`, { accessToken });
}

export async function createDepartmentRequest(accessToken, payload) {
  return request(API_URLS.departments.create, {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export async function updateDepartmentRequest(accessToken, id, payload) {
  return request(API_URLS.departments.detail(id), {
    method: "PUT",
    accessToken,
    body: payload,
  });
}

export async function deactivateDepartmentRequest(accessToken, id) {
  return request(API_URLS.departments.deactivate(id), {
    method: "PATCH",
    accessToken,
  });
}

export async function listDoctorsRequest(accessToken, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  return request(`${API_URLS.doctors.list}?${query}`, { accessToken });
}

export async function getDoctorRequest(accessToken, id) {
  return request(API_URLS.doctors.detail(id), { accessToken });
}

export async function createDoctorRequest(accessToken, payload) {
  return request(API_URLS.doctors.create, {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export async function updateDoctorRequest(accessToken, id, payload) {
  return request(API_URLS.doctors.detail(id), {
    method: "PUT",
    accessToken,
    body: payload,
  });
}

export async function setDoctorActiveRequest(accessToken, id, active) {
  const path = active
    ? API_URLS.doctors.activate(id)
    : API_URLS.doctors.deactivate(id);
  return request(path, { method: "PATCH", accessToken });
}

export async function fetchMyDoctorProfile(accessToken) {
  return request(API_URLS.doctorWorkspace.me, { accessToken });
}

export async function listAppointmentsRequest(accessToken, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const suffix = query.toString() ? `?${query}` : "";
  return request(`${API_URLS.appointments.list}${suffix}`, { accessToken });
}

export async function listMyTodayAppointmentsRequest(accessToken) {
  return request(API_URLS.appointments.mineToday, { accessToken });
}

export async function listMyUpcomingAppointmentsRequest(accessToken, days = 14) {
  return request(`${API_URLS.appointments.mineUpcoming}?days=${days}`, {
    accessToken,
  });
}

export async function createAppointmentRequest(accessToken, payload) {
  return request(API_URLS.appointments.create, {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export async function listAvailableDoctorsRequest(accessToken, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const suffix = query.toString() ? `?${query}` : "";
  return request(`${API_URLS.appointments.availability}${suffix}`, {
    accessToken,
  });
}

export async function listDoctorFreeSlotsRequest(
  accessToken,
  doctorId,
  params = {},
) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const suffix = query.toString() ? `?${query}` : "";
  return request(
    `${API_URLS.appointments.doctorSlots(doctorId)}${suffix}`,
    { accessToken },
  );
}

export async function rescheduleAppointmentRequest(
  accessToken,
  appointmentId,
  payload,
) {
  return request(API_URLS.appointments.reschedule(appointmentId), {
    method: "PATCH",
    accessToken,
    body: payload,
  });
}

export async function updateAppointmentStatusRequest(
  accessToken,
  appointmentId,
  statusValue,
) {
  return request(API_URLS.appointments.status(appointmentId), {
    method: "PATCH",
    accessToken,
    body: { status: statusValue },
  });
}

export async function listPrescriptionsRequest(accessToken, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const suffix = query.toString() ? `?${query}` : "";
  return request(`${API_URLS.prescriptions.list}${suffix}`, { accessToken });
}

export async function getPrescriptionRequest(accessToken, id) {
  return request(API_URLS.prescriptions.detail(id), { accessToken });
}

export async function createPrescriptionRequest(accessToken, payload) {
  return request(API_URLS.prescriptions.create, {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export async function listAuditEventsRequest(accessToken, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const suffix = query.toString() ? `?${query}` : "";
  return request(`${API_URLS.audit.events}${suffix}`, { accessToken });
}

export async function getAuditEventRequest(accessToken, eventRef) {
  return request(API_URLS.audit.eventDetail(eventRef), { accessToken });
}

export async function fetchAuditMetaRequest(accessToken) {
  return request(API_URLS.audit.meta, { accessToken });
}
