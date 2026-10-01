/** HMS role constants and dashboard home paths.
 * Assignable role labels for user management come from
 * GET /api/v1/users/roles (auth backend). These locals are for
 * route guards and post-login navigation only.
 */

export const ROLES = {
  ADMIN: "admin",
  DOCTOR: "doctor",
  RECEPTIONIST: "receptionist",
  PATIENT: "patient",
};

export const ROLE_HOME = {
  admin: "/admin",
  doctor: "/doctor",
  receptionist: "/receptionist",
  patient: "/patient",
};

export function getRoleHome(role) {
  return ROLE_HOME[role] ?? "/login";
}

/** Role workspace root for staff/doctor dashboards. */
export function getRoleBasePath(role) {
  return ROLE_HOME[role] ?? null;
}

/** Prescriptions list/detail base path for the signed-in role. */
export function getPrescriptionsBasePath(role) {
  const base = getRoleBasePath(role);
  if (!base || role === ROLES.PATIENT) return null;
  return `${base}/prescriptions`;
}

export function roleLabel(role) {
  if (!role) return "";
  return String(role).charAt(0).toUpperCase() + String(role).slice(1);
}
