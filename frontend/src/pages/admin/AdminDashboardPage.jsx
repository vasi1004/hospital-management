import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RoleLayout } from "@/layouts/RoleLayout";
import { DoctorAvailabilityBoard } from "@/components/DoctorAvailabilityBoard";
import { useAppSelector } from "@/store/hooks";
import { fetchAdminDashboard } from "@/services/hmsApi";
import { ADMIN_NAV } from "@/constants/nav";
import "../StaffDashboard.css";

function formatMoney(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatTime(value) {
  if (!value) return "-";
  const text = String(value);
  return text.length >= 5 ? text.slice(0, 5) : text;
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

function greetingForNow(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function AdminDashboardPage() {
  const { user, accessToken } = useAppSelector((state) => state.auth);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const summary = await fetchAdminDashboard(accessToken);
        if (!cancelled) setData(summary);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
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

  const census = [
    { label: "Patients", value: data?.total_patients ?? "-" },
    { label: "Doctors", value: data?.total_doctors ?? "-" },
    { label: "Departments", value: data?.total_departments ?? "-" },
    { label: "Completed", value: data?.completed_appointments ?? "-" },
  ];

  return (
    <RoleLayout
      user={user}
      subtitle="Hospital operations"
      navItems={ADMIN_NAV}
      title="Operations board"
      lockViewport
    >
      <div className="ops">
        <section className="ops__mast">
          <div className="ops__intro">
            <h2>
              {greeting}, {user.full_name || user.username}
            </h2>
            <p>
              Today&apos;s ward board: live visits, census, and doctor coverage
              from hospital records.
            </p>
            <div className="ops__intro-actions">
              <Link to="/admin/appointments" className="ui-btn ui-btn-primary">
                Open appointments
              </Link>
              <Link to="/admin/patients" className="ui-btn ui-btn-ghost">
                Patient directory
              </Link>
            </div>
          </div>

          <div className="ops__pulse" aria-label="Today pulse">
            <article className="ops-pulse ops-pulse--dark">
              <p className="ops-pulse__label">Today</p>
              <p className="ops-pulse__value">
                {loading ? "…" : (data?.todays_appointments ?? "-")}
              </p>
              <p className="ops-pulse__hint">Visits booked</p>
            </article>
            <article className="ops-pulse">
              <p className="ops-pulse__label">Pending</p>
              <p className="ops-pulse__value">
                {loading ? "…" : (data?.pending_appointments ?? "-")}
              </p>
              <p className="ops-pulse__hint">Awaiting care</p>
            </article>
            <article className="ops-pulse">
              <p className="ops-pulse__label">Revenue</p>
              <p className="ops-pulse__value">
                {loading ? "…" : data ? formatMoney(data.total_revenue) : "-"}
              </p>
              <p className="ops-pulse__hint">Collected</p>
            </article>
          </div>
        </section>

        {error ? <p className="ui-alert-error shrink-0">{error}</p> : null}

        <div className="ops__bento">
          <section className="ops-panel ops-panel--tickets">
            <div className="ops-panel__head">
              <div>
                <h3 className="ops-panel__title">Visit queue</h3>
                <p className="ops-panel__sub">Patients in clinic today</p>
              </div>
              <Link to="/admin/appointments" className="ops-panel__link">
                All visits
              </Link>
            </div>
            <div className="ops-panel__body">
              {(data?.todays_list || []).length === 0 ? (
                <p className="ops-empty">
                  {loading ? "Loading visits…" : "No appointments today."}
                </p>
              ) : (
                <div className="ops-tickets">
                  {data.todays_list.map((row) => (
                    <article key={row.id} className="ops-ticket">
                      <span className="ops-ticket__time">
                        {formatTime(row.appointment_time)}
                      </span>
                      <div>
                        <p className="ops-ticket__who">{row.patient_name}</p>
                        <p className="ops-ticket__meta">{row.doctor_name}</p>
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
                <h3 className="ops-panel__title">Census</h3>
                <p className="ops-panel__sub">Hospital register</p>
              </div>
            </div>
            <div className="ops-panel__body">
              <div className="ops-stats">
                {census.map((row) => (
                  <div key={row.label} className="ops-stat-row">
                    <p className="ops-stat-row__label">{row.label}</p>
                    <p className="ops-stat-row__value">
                      {loading ? "…" : row.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="ops-panel ops-panel--chart">
            <div className="ops-panel__head">
              <div>
                <h3 className="ops-panel__title">Flow this week</h3>
                <p className="ops-panel__sub">Appointment volume</p>
              </div>
            </div>
            <div className="ops-panel__body" style={{ minHeight: "11rem" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.appointment_stats || []}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e4e4e7"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#71717a", fontSize: 12 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#71717a", fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#059669" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="ops-panel ops-panel--cover">
            <div className="ops-panel__body">
              <DoctorAvailabilityBoard
                accessToken={accessToken}
                days={7}
                bookAppointmentsPath="/admin/appointments"
                compact
              />
            </div>
          </section>
        </div>
      </div>
    </RoleLayout>
  );
}
