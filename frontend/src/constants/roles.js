/** HMS role constants and dashboard home paths. */

export const ROLES = {
  ADMIN: "admin",
  DOCTOR: "doctor",
  RECEPTIONIST: "receptionist",
  PATIENT: "patient",
};

export const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "doctor", label: "Doctor" },
  { value: "receptionist", label: "Receptionist" },
  { value: "patient", label: "Patient" },
];

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
  const found = ROLE_OPTIONS.find((item) => item.value === role);
  return found?.label ?? role;
}
