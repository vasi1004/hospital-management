import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { DoctorAvailabilityBoard } from "@/components/DoctorAvailabilityBoard";
import { useAppSelector } from "@/store/hooks";
import { RECEPTION_NAV } from "@/constants/nav";
import "../StaffDashboard.css";

function greetingForNow(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function ReceptionistDashboardPage() {
  const { user, accessToken } = useAppSelector((state) => state.auth);
  const greeting = useMemo(() => greetingForNow(), []);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <RoleLayout
      user={user}
      subtitle="Front desk"
      navItems={RECEPTION_NAV}
      title="Booking floor"
      lockViewport
    >
      <div className="ops ops--reception">
        <section className="ops__mast">
          <div className="ops__intro">
            <h2>
              {greeting}, {user.full_name || user.username}
            </h2>
            <p>
              Book from live free slots. Coverage for today and the week ahead
              is below.
            </p>
            <div className="ops__intro-actions">
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
          </div>

          <div className="ops__pulse" aria-label="Desk shortcuts">
            <article className="ops-pulse ops-pulse--dark">
              <p className="ops-pulse__label">Focus</p>
              <p className="ops-pulse__value">Front desk</p>
              <p className="ops-pulse__hint">Live booking</p>
            </article>
            <article className="ops-pulse">
              <p className="ops-pulse__label">Horizon</p>
              <p className="ops-pulse__value">7 days</p>
              <p className="ops-pulse__hint">Doctor coverage</p>
            </article>
            <article className="ops-pulse">
              <p className="ops-pulse__label">Action</p>
              <p className="ops-pulse__value">Book</p>
              <p className="ops-pulse__hint">Free slots only</p>
            </article>
          </div>
        </section>

        <section className="ops-panel ops-panel--cover">
          <div className="ops-panel__body">
            <DoctorAvailabilityBoard
              accessToken={accessToken}
              days={7}
              bookAppointmentsPath="/receptionist/appointments"
            />
          </div>
        </section>
      </div>
    </RoleLayout>
  );
}
