import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { useAppSelector } from "@/store/hooks";
import { DOCTOR_NAV } from "@/constants/nav";
import {
  fetchMyDoctorProfile,
  listMyTodayAppointmentsRequest,
  listMyUpcomingAppointmentsRequest,
} from "@/services/hmsApi";
import "../StaffDashboard.css";

function formatTime(value) {
  if (!value) return "-";
  return String(value).slice(0, 5);
}

function greetingForNow(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function statusBadge(status) {
  const map = {
    confirmed: "ui-badge-ok",
    scheduled: "ui-badge-warn",
    completed: "ui-badge-muted",
    in_progress: "ui-badge-info",
    cancelled: "ui-badge-danger",
    no_show: "ui-badge-danger",
  };
  return map[status] || "ui-badge-muted";
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
          setError(
            err instanceof Error ? err.message : "Unable to load workspace",
          );
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

  const greeting = useMemo(() => greetingForNow(), []);

  if (!user) return <Navigate to="/login" replace />;

  const pendingToday = today.filter((row) =>
    ["scheduled", "confirmed", "in_progress"].includes(row.status),
  ).length;

  const doctorName = profile
    ? `Dr. ${profile.first_name} ${profile.last_name}`.trim()
    : user.full_name || user.username;

  return (
    <RoleLayout
      user={user}
      subtitle="Clinical workspace"
      navItems={DOCTOR_NAV}
      title="Clinic queue"
      lockViewport
    >
      <div className="ops ops--doctor">
        {error ? <p className="ui-alert-error shrink-0">{error}</p> : null}

        <section className="ops__mast">
          <div className="ops__intro">
            <h2>
              {loading ? "Loading…" : `${greeting}, ${doctorName}`}
            </h2>
            <p>
              {profile?.specialization
                ? `${profile.specialization}${
                    profile.department_name
                      ? ` · ${profile.department_name}`
                      : ""
                  }`
                : "Your linked doctor profile drives today’s list and schedule."}
            </p>
            <div className="ops__intro-actions">
              <Link to="/doctor/today" className="ui-btn ui-btn-primary">
                Today&apos;s list
              </Link>
              <Link to="/doctor/schedule" className="ui-btn ui-btn-ghost">
                Full schedule
              </Link>
            </div>
          </div>

          <div className="ops__pulse" aria-label="Clinic pulse">
            <article className="ops-pulse ops-pulse--dark">
              <p className="ops-pulse__label">Today</p>
              <p className="ops-pulse__value">
                {loading ? "…" : today.length}
              </p>
              <p className="ops-pulse__hint">Patients</p>
            </article>
            <article className="ops-pulse">
              <p className="ops-pulse__label">Pending</p>
              <p className="ops-pulse__value">
                {loading ? "…" : pendingToday}
              </p>
              <p className="ops-pulse__hint">Still open</p>
            </article>
            <article className="ops-pulse">
              <p className="ops-pulse__label">Next 14 days</p>
              <p className="ops-pulse__value">
                {loading ? "…" : upcoming.length}
              </p>
              <p className="ops-pulse__hint">Upcoming</p>
            </article>
          </div>
        </section>

        <div className="ops__bento">
          <section className="ops-panel ops-panel--tickets">
            <div className="ops-panel__head">
              <div>
                <h3 className="ops-panel__title">Today&apos;s tickets</h3>
                <p className="ops-panel__sub">Your visit queue</p>
              </div>
              <Link to="/doctor/today" className="ops-panel__link">
                Open list
              </Link>
            </div>
            <div className="ops-panel__body">
              {!loading && today.length === 0 ? (
                <p className="ops-empty">No appointments today.</p>
              ) : (
                <div className="ops-tickets">
                  {today.slice(0, 8).map((row) => (
                    <article key={row.id} className="ops-ticket">
                      <span className="ops-ticket__time">
                        {formatTime(row.appointment_time)}
                      </span>
                      <div>
                        <p className="ops-ticket__who">{row.patient_name}</p>
                        <p className="ops-ticket__meta">
                          {row.appointment_code || "Visit"}
                        </p>
                      </div>
                      <span className={`ui-badge ${statusBadge(row.status)}`}>
                        {String(row.status).replaceAll("_", " ")}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="ops-panel ops-panel--side">
            <div className="ops-panel__head">
              <div>
                <h3 className="ops-panel__title">Coming up</h3>
                <p className="ops-panel__sub">Next two weeks</p>
              </div>
              <Link to="/doctor/schedule" className="ops-panel__link">
                Schedule
              </Link>
            </div>
            <div className="ops-panel__body">
              {!loading && upcoming.length === 0 ? (
                <p className="ops-empty">No upcoming appointments.</p>
              ) : (
                <div className="ops-tickets">
                  {upcoming.slice(0, 10).map((row) => (
                    <article key={row.id} className="ops-ticket">
                      <span className="ops-ticket__time">
                        {formatTime(row.appointment_time)}
                      </span>
                      <div>
                        <p className="ops-ticket__who">{row.patient_name}</p>
                        <p className="ops-ticket__meta">{row.appointment_date}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </RoleLayout>
  );
}
