export const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/patients", label: "Patients" },
  { to: "/admin/doctors", label: "Doctors" },
  { to: "/admin/departments", label: "Departments" },
  { to: "/admin/appointments", label: "Appointments" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/audit", label: "Audit Trail" },
];

export const RECEPTION_NAV = [
  { to: "/receptionist", label: "Dashboard", end: true },
  { to: "/receptionist/patients", label: "Patients" },
  { to: "/receptionist/appointments", label: "Appointments" },
];

export const DOCTOR_NAV = [
  { to: "/doctor", label: "Dashboard", end: true },
  { to: "/doctor/today", label: "Today's patients" },
  { to: "/doctor/schedule", label: "Schedule" },
  { to: "/doctor/history", label: "History" },
];
