import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "@/features/login";
import { UsersPage } from "@/pages/UsersPage";
import { AuditTrailPage } from "@/pages/admin/AuditTrailPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { DepartmentsPage } from "@/pages/admin/DepartmentsPage";
import { DoctorsPage } from "@/pages/admin/DoctorsPage";
import { AppointmentsPage } from "@/pages/appointments/AppointmentsPage";
import { DoctorDashboardPage } from "@/pages/doctor/DoctorDashboardPage";
import { DoctorTodayPage } from "@/pages/doctor/DoctorTodayPage";
import { DoctorSchedulePage } from "@/pages/doctor/DoctorSchedulePage";
import { DoctorHistoryPage } from "@/pages/doctor/DoctorHistoryPage";
import { DoctorPrescriptionPage } from "@/pages/doctor/DoctorPrescriptionPage";
import { ReceptionistDashboardPage } from "@/pages/receptionist/ReceptionistDashboardPage";
import { PatientDashboardPage } from "@/pages/patient/PatientDashboardPage";
import { PatientsPage } from "@/pages/patients/PatientsPage";
import { PatientFormPage } from "@/pages/patients/PatientFormPage";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { useAppSelector } from "@/store/hooks";
import { getRoleHome, ROLES } from "@/constants/roles";

function LoginRoute() {
  const { status, user } = useAppSelector((state) => state.auth);
  if (status === "authenticated" && user) {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }
  return <LoginPage />;
}

function RootRedirect() {
  const { status, user } = useAppSelector((state) => state.auth);
  if (status === "authenticated" && user) {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginRoute />} />

      <Route element={<ProtectedRoute roles={[ROLES.ADMIN]} />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/audit" element={<AuditTrailPage />} />
        <Route path="/admin/departments" element={<DepartmentsPage />} />
        <Route path="/admin/doctors" element={<DoctorsPage />} />
        <Route path="/admin/appointments" element={<AppointmentsPage />} />
        <Route
          path="/admin/patients"
          element={<PatientsPage basePath="/admin/patients" />}
        />
        <Route
          path="/admin/patients/new"
          element={<PatientFormPage basePath="/admin/patients" mode="create" />}
        />
        <Route
          path="/admin/patients/:patientId"
          element={<PatientFormPage basePath="/admin/patients" mode="view" />}
        />
        <Route
          path="/admin/patients/:patientId/edit"
          element={<PatientFormPage basePath="/admin/patients" mode="edit" />}
        />
        <Route path="/users" element={<Navigate to="/admin/users" replace />} />
      </Route>

      <Route element={<ProtectedRoute roles={[ROLES.RECEPTIONIST]} />}>
        <Route path="/receptionist" element={<ReceptionistDashboardPage />} />
        <Route
          path="/receptionist/appointments"
          element={<AppointmentsPage />}
        />
        <Route
          path="/receptionist/patients"
          element={<PatientsPage basePath="/receptionist/patients" />}
        />
        <Route
          path="/receptionist/patients/new"
          element={
            <PatientFormPage basePath="/receptionist/patients" mode="create" />
          }
        />
        <Route
          path="/receptionist/patients/:patientId"
          element={
            <PatientFormPage basePath="/receptionist/patients" mode="view" />
          }
        />
        <Route
          path="/receptionist/patients/:patientId/edit"
          element={
            <PatientFormPage basePath="/receptionist/patients" mode="edit" />
          }
        />
      </Route>

      <Route element={<ProtectedRoute roles={[ROLES.DOCTOR]} />}>
        <Route path="/doctor" element={<DoctorDashboardPage />} />
        <Route path="/doctor/today" element={<DoctorTodayPage />} />
        <Route path="/doctor/schedule" element={<DoctorSchedulePage />} />
        <Route path="/doctor/history" element={<DoctorHistoryPage />} />
        <Route
          path="/doctor/prescriptions/new"
          element={<DoctorPrescriptionPage />}
        />
        <Route
          path="/doctor/prescriptions/:prescriptionId"
          element={<DoctorPrescriptionPage />}
        />
      </Route>

      <Route element={<ProtectedRoute roles={[ROLES.PATIENT]} />}>
        <Route path="/patient" element={<PatientDashboardPage />} />
      </Route>

      <Route path="/home" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
