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

export function roleLabel(role) {
  if (!role) return "";
  return String(role).charAt(0).toUpperCase() + String(role).slice(1);
}
