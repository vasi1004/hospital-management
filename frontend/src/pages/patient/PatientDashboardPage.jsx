import { Navigate } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { EmptyDashboard } from "@/components/EmptyDashboard";
import { useAppSelector } from "@/store/hooks";

const NAV = [{ to: "/patient", label: "Dashboard", end: true }];

export function PatientDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  if (!user) return <Navigate to="/login" replace />;

  return (
    <RoleLayout
      user={user}
      subtitle="Patient portal"
      navItems={NAV}
      title="Patient Dashboard"
      lockViewport
    >
      <EmptyDashboard
        heading={`Hello, ${user.full_name || user.username}`}
        description="View your appointments, prescriptions, and medical records here in upcoming phases."
        cards={[
          { label: "Upcoming visits", value: "—", hint: "Phase 6" },
          { label: "Prescriptions", value: "—", hint: "Phase 7" },
          { label: "Medical records", value: "—", hint: "Phase 7" },
        ]}
      />
    </RoleLayout>
  );
}
