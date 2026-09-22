import { Navigate, Link } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { EmptyDashboard } from "@/components/EmptyDashboard";
import { useAppSelector } from "@/store/hooks";
import { RECEPTION_NAV } from "@/constants/nav";

export function ReceptionistDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  if (!user) return <Navigate to="/login" replace />;

  return (
    <RoleLayout
      user={user}
      subtitle="Front desk"
      navItems={RECEPTION_NAV}
      title="Receptionist Dashboard"
    >
      <EmptyDashboard
        heading={`Welcome, ${user.full_name || user.username}`}
        description="Register patients and manage front-desk workflows from here."
        cards={[
          { label: "Patients", value: "Open", hint: "Use Patients in the sidebar" },
          { label: "Appointments", value: "—", hint: "Phase 6" },
          { label: "Billing", value: "—", hint: "Phase 8" },
        ]}
      />
      <div className="mt-4">
        <Link to="/receptionist/patients" className="ui-btn ui-btn-primary">
          Go to Patients
        </Link>
      </div>
    </RoleLayout>
  );
}
