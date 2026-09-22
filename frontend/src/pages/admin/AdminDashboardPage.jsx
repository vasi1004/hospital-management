import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
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
import { useAppSelector } from "@/store/hooks";
import { fetchAdminDashboard } from "@/services/hmsApi";
import { ADMIN_NAV } from "@/constants/nav";

function formatMoney(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatTime(value) {
  if (!value) return "—";
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

  if (!user) return <Navigate to="/login" replace />;

  const cards = [
    { label: "Patients", value: data?.total_patients ?? "—" },
    { label: "Doctors", value: data?.total_doctors ?? "—" },
    { label: "Departments", value: data?.total_departments ?? "—" },
    { label: "Today", value: data?.todays_appointments ?? "—" },
    { label: "Pending", value: data?.pending_appointments ?? "—" },
    { label: "Completed", value: data?.completed_appointments ?? "—" },
    { label: "Revenue", value: data ? formatMoney(data.total_revenue) : "—" },
  ];

  return (
    <RoleLayout
      user={user}
      subtitle="Admin console"
      navItems={ADMIN_NAV}
      title="Admin Dashboard"
    >
      <div className="space-y-5">
        <section className="ui-panel ui-panel-pad ui-rise">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            Today&apos;s pulse
          </p>
          <h2 className="ui-title mt-1 text-xl">
            Welcome, {user.full_name || user.username}
          </h2>
          <p className="ui-muted mt-2 max-w-2xl">
            Live hospital overview across patients, clinicians, and appointments.
          </p>
        </section>

        {error ? <p className="ui-alert-error">{error}</p> : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card, index) => (
            <article
              key={card.label}
              className={`ui-panel ui-panel-pad ui-stat ui-rise ${
                index < 3 ? `ui-rise-delay-${(index % 3) + 1}` : ""
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                {card.label}
              </p>
              <p className="mt-2 font-display text-2xl font-bold tabular-nums">
                {loading ? "…" : card.value}
              </p>
            </article>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="ui-panel ui-panel-pad ui-rise ui-rise-delay-2">
            <h3 className="ui-title text-base">Today&apos;s appointments</h3>
            <div className="ui-table-wrap mt-3">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.todays_list || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="ui-muted">
                        {loading ? "Loading…" : "No appointments today."}
                      </td>
                    </tr>
                  ) : (
                    data.todays_list.map((row) => (
                      <tr key={row.id}>
                        <td className="font-semibold">
                          {formatTime(row.appointment_time)}
                        </td>
                        <td>{row.patient_name}</td>
                        <td>{row.doctor_name}</td>
                        <td>
                          <span className={`ui-badge ${statusBadge(row.status)}`}>
                            {String(row.status).replaceAll("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="ui-panel ui-panel-pad ui-rise ui-rise-delay-3">
            <h3 className="ui-title text-base">Appointments · 7 days</h3>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.appointment_stats || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d5e0e6" />
                  <XAxis dataKey="label" tick={{ fill: "#5b6b75", fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#5b6b75", fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2b6cb0" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>
    </RoleLayout>
  );
}
