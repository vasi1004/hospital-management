/**
 * Backend service bases — configured only via Vite env (no hardcoded hosts).
 */
function trimSlash(value) {
  return String(value || "").replace(/\/$/, "");
}

function requireEnv(name, fallback) {
  const value = import.meta.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return trimSlash(value);
}

export const AUTH_API_BASE = requireEnv(
  "VITE_AUTH_API_URL",
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000",
);

export const SCHEDULE_API_BASE = requireEnv(
  "VITE_SCHEDULE_API_URL",
  "http://127.0.0.1:8001",
);

export const APP_NAME =
  import.meta.env.VITE_APP_NAME ?? "Hospital Management System";

export const API_URLS = {
  authBase: AUTH_API_BASE,
  scheduleBase: SCHEDULE_API_BASE,
  health: {
    auth: `${AUTH_API_BASE}/health`,
    schedule: `${SCHEDULE_API_BASE}/health`,
  },
  auth: {
    login: `${AUTH_API_BASE}/api/v1/auth/login`,
    refresh: `${AUTH_API_BASE}/api/v1/auth/refresh`,
    me: `${AUTH_API_BASE}/api/v1/auth/me`,
    logout: `${AUTH_API_BASE}/api/v1/auth/logout`,
  },
  users: {
    list: `${AUTH_API_BASE}/api/v1/users/`,
    create: `${AUTH_API_BASE}/api/v1/users/`,
  },
  dashboard: {
    admin: `${SCHEDULE_API_BASE}/api/v1/dashboard/admin`,
  },
  patients: {
    list: `${SCHEDULE_API_BASE}/api/v1/patients/`,
    create: `${SCHEDULE_API_BASE}/api/v1/patients/`,
    detail: (id) => `${SCHEDULE_API_BASE}/api/v1/patients/${id}`,
    deactivate: (id) => `${SCHEDULE_API_BASE}/api/v1/patients/${id}/deactivate`,
    activate: (id) => `${SCHEDULE_API_BASE}/api/v1/patients/${id}/activate`,
  },
  departments: {
    list: `${SCHEDULE_API_BASE}/api/v1/departments/`,
    create: `${SCHEDULE_API_BASE}/api/v1/departments/`,
    detail: (id) => `${SCHEDULE_API_BASE}/api/v1/departments/${id}`,
    deactivate: (id) =>
      `${SCHEDULE_API_BASE}/api/v1/departments/${id}/deactivate`,
  },
  doctors: {
    list: `${SCHEDULE_API_BASE}/api/v1/doctors/`,
    create: `${SCHEDULE_API_BASE}/api/v1/doctors/`,
    detail: (id) => `${SCHEDULE_API_BASE}/api/v1/doctors/${id}`,
    deactivate: (id) => `${SCHEDULE_API_BASE}/api/v1/doctors/${id}/deactivate`,
    activate: (id) => `${SCHEDULE_API_BASE}/api/v1/doctors/${id}/activate`,
  },
};
