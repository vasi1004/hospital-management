import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { useAppSelector } from "@/store/hooks";
import "../StaffDashboard.css";

const NAV = [{ to: "/patient", label: "Dashboard", end: true }];

function greetingForNow(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function PatientDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const greeting = useMemo(() => greetingForNow(), []);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <RoleLayout
      user={user}
      subtitle="Patient portal"
      navItems={NAV}
      title="My care"
      lockViewport
    >
      <div className="ops">
        <section className="ops__mast">
          <div className="ops__intro">
            <h2>
              {greeting}, {user.full_name || user.username}
            </h2>
            <p>
              Appointments, prescriptions, and records will land here as care
              features open.
            </p>
          </div>

          <div className="ops__pulse">
            <article className="ops-pulse ops-pulse--dark">
              <p className="ops-pulse__label">Visits</p>
              <p className="ops-pulse__value">-</p>
              <p className="ops-pulse__hint">Coming soon</p>
            </article>
            <article className="ops-pulse">
              <p className="ops-pulse__label">Prescriptions</p>
              <p className="ops-pulse__value">-</p>
              <p className="ops-pulse__hint">Coming soon</p>
            </article>
            <article className="ops-pulse">
              <p className="ops-pulse__label">Records</p>
              <p className="ops-pulse__value">-</p>
              <p className="ops-pulse__hint">Coming soon</p>
            </article>
          </div>
        </section>
      </div>
    </RoleLayout>
  );
}
