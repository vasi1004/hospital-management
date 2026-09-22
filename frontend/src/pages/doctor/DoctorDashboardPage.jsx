import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { useAppSelector } from "@/store/hooks";
import { DOCTOR_NAV } from "@/constants/nav";
import {
  fetchMyDoctorProfile,
  listMyTodayAppointmentsRequest,
  listMyUpcomingAppointmentsRequest,
} from "@/services/hmsApi";

function formatTime(value) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

export function DoctorDashboardPage() {
  const { user, accessToken } = useAppSelector((state) => state.auth);
  const [profile, setProfile] = useState(null);
  const [today, setToday] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [me, todayRows, upcomingRows] = await Promise.all([
          fetchMyDoctorProfile(accessToken),
          listMyTodayAppointmentsRequest(accessToken),
          listMyUpcomingAppointmentsRequest(accessToken, 14),
        ]);
        if (cancelled) return;
        setProfile(me);
        setToday(Array.isArray(todayRows) ? todayRows : []);
        setUpcoming(Array.isArray(upcomingRows) ? upcomingRows : []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load workspace");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  if (!user) return <Navigate to="/login" replace />;

  const pendingToday = today.filter((row) =>
    ["scheduled", "confirmed", "in_progress"].includes(row.status),
  ).length;

  return (
    <RoleLayout
      user={user}
      subtitle="Doctor workspace"
      navItems={DOCTOR_NAV}
      title="Doctor Dashboard"
      lockViewport
    >
      <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
        {error ? <p className="ui-alert-error shrink-0">{error}</p> : null}

        <section className="ui-panel ui-panel-pad shrink-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            Clinical day
          </p>
          <h2 className="ui-title mt-1 text-lg">
            {loading
              ? "Loading…"
              : `Welcome, Dr. ${profile?.last_name || user.full_name || user.username}`}
          </h2>
          <p className="ui-muted mt-1 text-sm">
            {profile?.specialization
              ? `${profile.specialization}${profile.department_name ? ` · ${profile.department_name}` : ""}`
              : "Your linked doctor profile drives today’s list and schedule."}
          </p>
        </section>

        <div className="grid shrink-0 gap-3 sm:grid-cols-3">
          <article className="ui-panel ui-panel-pad ui-stat">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
              Today&apos;s patients
            </p>
            <p className="mt-2 font-display text-2xl font-bold tabular-nums">
              {loading ? "…" : today.length}
            </p>
          </article>
          <article className="ui-panel ui-panel-pad ui-stat">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
              Pending today
            </p>
            <p className="mt-2 font-display text-2xl font-bold tabular-nums">
              {loading ? "…" : pendingToday}
            </p>
          </article>
          <article className="ui-panel ui-panel-pad ui-stat">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
              Next 14 days
            </p>
            <p className="mt-2 font-display text-2xl font-bold tabular-nums">
              {loading ? "…" : upcoming.length}
            </p>
          </article>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden xl:grid-cols-2">
          <section className="ui-panel ui-panel-pad flex min-h-0 flex-col overflow-hidden">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="ui-title text-base">Today</h3>
              <Link to="/doctor/today" className="ui-link text-sm">
                Open list
              </Link>
            </div>
            <div className="ui-table-wrap min-h-0 flex-1 overflow-auto">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && today.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="ui-muted">
                        No appointments today.
                      </td>
                    </tr>
                  ) : null}
                  {today.slice(0, 8).map((row) => (
                    <tr key={row.id}>
                      <td className="font-semibold">{formatTime(row.appointment_time)}</td>
                      <td>{row.patient_name}</td>
                      <td>{String(row.status).replaceAll("_", " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="ui-panel ui-panel-pad flex min-h-0 flex-col overflow-hidden">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="ui-title text-base">Upcoming schedule</h3>
              <Link to="/doctor/schedule" className="ui-link text-sm">
                Full schedule
              </Link>
            </div>
            <div className="ui-table-wrap min-h-0 flex-1 overflow-auto">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Patient</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && upcoming.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="ui-muted">
                        No upcoming appointments.
                      </td>
                    </tr>
                  ) : null}
                  {upcoming.slice(0, 10).map((row) => (
                    <tr key={row.id}>
                      <td>{row.appointment_date}</td>
                      <td>{formatTime(row.appointment_time)}</td>
                      <td>{row.patient_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </RoleLayout>
  );
}
