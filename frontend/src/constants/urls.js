/**
 * Backend API base — single unified all_backend_server.
 * Configured only via Vite env (no hardcoded hosts).
 */
function trimSlash(value) {
  return String(value || "").replace(/\/$/, "");
}

const API_BASE = trimSlash(
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
);

if (!API_BASE) {
  throw new Error("Missing required env: VITE_API_URL");
}

export const AUTH_API_BASE = API_BASE;
export const SCHEDULE_API_BASE = API_BASE;
export const AUDIT_API_BASE = API_BASE;

export const APP_NAME =
  import.meta.env.VITE_APP_NAME ?? "Hospital Management System";

export const API_URLS = {
  authBase: API_BASE,
  scheduleBase: API_BASE,
  auditBase: API_BASE,
  health: {
    auth: `${API_BASE}/health`,
    schedule: `${API_BASE}/health`,
    audit: `${API_BASE}/health`,
  },
  audit: {
    events: `${API_BASE}/api/v1/audit/events`,
    eventDetail: (ref) => `${API_BASE}/api/v1/audit/events/${ref}`,
    meta: `${API_BASE}/api/v1/audit/meta/actions`,
  },
  auth: {
    login: `${API_BASE}/api/v1/auth/login`,
    refresh: `${API_BASE}/api/v1/auth/refresh`,
    me: `${API_BASE}/api/v1/auth/me`,
    logout: `${API_BASE}/api/v1/auth/logout`,
  },
  users: {
    list: `${API_BASE}/api/v1/users/`,
    create: `${API_BASE}/api/v1/users/`,
    roles: `${API_BASE}/api/v1/users/roles`,
    detail: (id) => `${API_BASE}/api/v1/users/${id}`,
    activate: (id) => `${API_BASE}/api/v1/users/${id}/activate`,
    deactivate: (id) => `${API_BASE}/api/v1/users/${id}/deactivate`,
    resetPassword: (id) => `${API_BASE}/api/v1/users/${id}/reset-password`,
  },
  dashboard: {
    admin: `${API_BASE}/api/v1/dashboard/admin`,
    doctorAvailability: `${API_BASE}/api/v1/dashboard/doctor-availability`,
  },
  patients: {
    list: `${API_BASE}/api/v1/patients/`,
    create: `${API_BASE}/api/v1/patients/`,
    detail: (id) => `${API_BASE}/api/v1/patients/${id}`,
    deactivate: (id) => `${API_BASE}/api/v1/patients/${id}/deactivate`,
    activate: (id) => `${API_BASE}/api/v1/patients/${id}/activate`,
  },
  departments: {
    list: `${API_BASE}/api/v1/departments/`,
    create: `${API_BASE}/api/v1/departments/`,
    detail: (id) => `${API_BASE}/api/v1/departments/${id}`,
    deactivate: (id) => `${API_BASE}/api/v1/departments/${id}/deactivate`,
  },
  doctors: {
    list: `${API_BASE}/api/v1/doctors/`,
    create: `${API_BASE}/api/v1/doctors/`,
    detail: (id) => `${API_BASE}/api/v1/doctors/${id}`,
    deactivate: (id) => `${API_BASE}/api/v1/doctors/${id}/deactivate`,
    activate: (id) => `${API_BASE}/api/v1/doctors/${id}/activate`,
  },
  appointments: {
    list: `${API_BASE}/api/v1/appointments/`,
    create: `${API_BASE}/api/v1/appointments/`,
    detail: (id) => `${API_BASE}/api/v1/appointments/${id}`,
    status: (id) => `${API_BASE}/api/v1/appointments/${id}/status`,
    reschedule: (id) => `${API_BASE}/api/v1/appointments/${id}/reschedule`,
    availability: `${API_BASE}/api/v1/appointments/availability`,
    doctorSlots: (doctorId) =>
      `${API_BASE}/api/v1/appointments/availability/${doctorId}/slots`,
    mineToday: `${API_BASE}/api/v1/appointments/mine/today`,
    mineUpcoming: `${API_BASE}/api/v1/appointments/mine/upcoming`,
  },
  prescriptions: {
    list: `${API_BASE}/api/v1/prescriptions/`,
    create: `${API_BASE}/api/v1/prescriptions/`,
    detail: (id) => `${API_BASE}/api/v1/prescriptions/${id}`,
  },
  doctorWorkspace: {
    me: `${API_BASE}/api/v1/doctor-workspace/me`,
    availability: `${API_BASE}/api/v1/doctor-workspace/me/availability`,
  },
};
