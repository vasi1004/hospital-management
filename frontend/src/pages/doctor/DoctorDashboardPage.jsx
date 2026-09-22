import { Navigate } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { EmptyDashboard } from "@/components/EmptyDashboard";
import { useAppSelector } from "@/store/hooks";

const NAV = [{ to: "/doctor", label: "Dashboard", end: true }];

export function DoctorDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  if (!user) return <Navigate to="/login" replace />;

  return (
    <RoleLayout
      user={user}
      subtitle="Doctor workspace"
      navItems={NAV}
      title="Doctor Dashboard"
    >
      <EmptyDashboard
        heading={`Good day, ${user.full_name || "Doctor"}`}
        description="Your schedule, consultations, prescriptions, and medical records will appear here in later phases."
        cards={[
          { label: "Today's appointments", value: "—", hint: "Phase 6–7" },
          { label: "Pending patients", value: "—", hint: "Phase 7" },
          { label: "Completed today", value: "—", hint: "Phase 7" },
        ]}
      />
    </RoleLayout>
  );
}
