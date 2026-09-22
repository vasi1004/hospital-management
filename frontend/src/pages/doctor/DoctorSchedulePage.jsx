import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { RescheduleAppointmentModal } from "@/components/RescheduleAppointmentModal";
import { useAppSelector } from "@/store/hooks";
import { DOCTOR_NAV } from "@/constants/nav";
import { listMyUpcomingAppointmentsRequest } from "@/services/hmsApi";

function formatTime(value) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

const TERMINAL = new Set(["completed", "cancelled", "no_show"]);

export function DoctorSchedulePage() {
  const { user, accessToken } = useAppSelector((state) => state.auth);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shifting, setShifting] = useState(null);
  const [success, setSuccess] = useState(null);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listMyUpcomingAppointmentsRequest(accessToken, 14);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load schedule");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [accessToken]);

  const grouped = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const key = row.appointment_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    });
    return [...map.entries()];
  }, [rows]);

  if (!user) return <Navigate to="/login" replace />;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <RoleLayout
      user={user}
      subtitle="Doctor workspace"
      navItems={DOCTOR_NAV}
      title="2-week schedule"
    >
      <div className="ui-panel ui-panel-pad">
        <h2 className="ui-title text-base">Upcoming appointments</h2>
        <p className="ui-muted mt-1 text-sm">
          Next 14 days · booked by admin / receptionist. You can shift a visit
          to another free slot in your availability.
        </p>

        {error ? <p className="ui-alert-error mt-3">{error}</p> : null}
        {success ? <p className="ui-alert-success mt-3">{success}</p> : null}
        {loading ? <p className="ui-muted mt-4">Loading…</p> : null}

        {!loading && grouped.length === 0 ? (
          <p className="ui-muted mt-4">No appointments in the next two weeks.</p>
        ) : null}

        <div className="mt-4 grid gap-4">
          {grouped.map(([day, items]) => (
            <section
              key={day}
              className="rounded-2xl border border-[var(--line)] bg-white/80 p-4"
            >
              <h3 className="font-display text-base font-bold">{day}</h3>
              <div className="ui-table-wrap mt-3">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Patient</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => (
                      <tr key={row.id}>
                        <td className="font-semibold">
                          {formatTime(row.appointment_time)}
                        </td>
                        <td>{row.patient_name}</td>
                        <td>{row.reason}</td>
                        <td>{String(row.status).replaceAll("_", " ")}</td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            {!TERMINAL.has(row.status) ? (
                              <button
                                type="button"
                                className="ui-btn ui-btn-ghost"
                                onClick={() => {
                                  setSuccess(null);
                                  setShifting(row);
                                }}
                              >
                                Shift
                              </button>
                            ) : null}
                            {row.appointment_date === today ? (
                              <Link
                                className="ui-link"
                                to={`/doctor/prescriptions/new?appointmentId=${row.id}`}
                              >
                                Write Rx
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </div>

      {shifting ? (
        <RescheduleAppointmentModal
          accessToken={accessToken}
          appointment={shifting}
          onClose={() => setShifting(null)}
          onSuccess={async () => {
            setSuccess(`Shifted ${shifting.appointment_code}.`);
            setShifting(null);
            await load();
          }}
        />
      ) : null}
    </RoleLayout>
  );
}
