import { Link, Navigate } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { DoctorAvailabilityBoard } from "@/components/DoctorAvailabilityBoard";
import { useAppSelector } from "@/store/hooks";
import { RECEPTION_NAV } from "@/constants/nav";
import "../StaffDashboard.css";

export function ReceptionistDashboardPage() {
  const { user, accessToken } = useAppSelector((state) => state.auth);
  if (!user) return <Navigate to="/login" replace />;

  return (
    <RoleLayout
      user={user}
      subtitle="Front desk"
      navItems={RECEPTION_NAV}
      title="Receptionist Dashboard"
      lockViewport
    >
      <div className="staff-dash staff-dash--reception">
        <section className="ui-panel ui-panel-pad ui-rise staff-dash__hero">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              Front desk
            </p>
            <h2 className="ui-title mt-0.5 text-lg">
              Welcome, {user.full_name || user.username}
            </h2>
            <p className="ui-muted mt-1 max-w-2xl text-sm">
              See which doctors are bookable today and later this week, then
              schedule from live free slots.
            </p>
          </div>
          <div className="staff-dash__hero-actions">
            <Link
              to="/receptionist/appointments"
              className="ui-btn ui-btn-primary"
            >
              Schedule appointment
            </Link>
            <Link to="/receptionist/patients" className="ui-btn ui-btn-ghost">
              Patients
            </Link>
          </div>
        </section>

        <div className="staff-dash__reception-main ui-rise ui-rise-delay-1">
          <DoctorAvailabilityBoard
            accessToken={accessToken}
            days={7}
            bookAppointmentsPath="/receptionist/appointments"
          />
        </div>
      </div>
    </RoleLayout>
  );
}
