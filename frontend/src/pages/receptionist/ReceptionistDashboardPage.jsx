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
      lockViewport
    >
      <EmptyDashboard
        heading={`Welcome, ${user.full_name || user.username}`}
        description="Register patients and schedule doctor appointments from the front desk."
        cards={[
          { label: "Patients", value: "Open", hint: "Register and update patients" },
          {
            label: "Appointments",
            value: "Open",
            hint: "Book available doctors by date and slot",
          },
          { label: "Billing", value: "—", hint: "Coming later" },
        ]}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/receptionist/appointments" className="ui-btn ui-btn-primary">
          Schedule appointment
        </Link>
        <Link to="/receptionist/patients" className="ui-btn ui-btn-ghost">
          Go to Patients
        </Link>
      </div>
    </RoleLayout>
  );
}
