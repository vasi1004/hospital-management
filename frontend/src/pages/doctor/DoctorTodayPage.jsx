import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { RescheduleAppointmentModal } from "@/components/RescheduleAppointmentModal";
import { useAppSelector } from "@/store/hooks";
import { DOCTOR_NAV } from "@/constants/nav";
import {
  listMyTodayAppointmentsRequest,
  updateAppointmentStatusRequest,
} from "@/services/hmsApi";

function formatTime(value) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

function statusClass(status) {
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

const TERMINAL = new Set(["completed", "cancelled", "no_show"]);

export function DoctorTodayPage() {
  const { user, accessToken } = useAppSelector((state) => state.auth);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [shifting, setShifting] = useState(null);
  const [success, setSuccess] = useState(null);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listMyTodayAppointmentsRequest(accessToken);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load today");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [accessToken]);

  if (!user) return <Navigate to="/login" replace />;

  async function markStatus(row, statusValue) {
    setBusyId(row.id);
    setError(null);
    try {
      await updateAppointmentStatusRequest(accessToken, row.id, statusValue);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <RoleLayout
      user={user}
      subtitle="Doctor workspace"
      navItems={DOCTOR_NAV}
      title="Today's patients"
    >
      <div className="ui-panel ui-panel-pad">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="ui-title text-base">Patients to treat today</h2>
            <p className="ui-muted mt-1 text-sm">
              {loading ? "Loading…" : `${rows.length} appointment(s)`}
            </p>
          </div>
          <button type="button" className="ui-btn ui-btn-ghost" onClick={load}>
            Refresh
          </button>
        </div>

        {error ? <p className="ui-alert-error mb-3">{error}</p> : null}
        {success ? <p className="ui-alert-success mb-3">{success}</p> : null}

        <div className="ui-table-wrap">
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
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="ui-muted text-center">
                    No patients scheduled for today.
                  </td>
                </tr>
              ) : null}
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="font-semibold">{formatTime(row.appointment_time)}</td>
                  <td>
                    <div className="grid gap-0.5">
                      <strong>{row.patient_name}</strong>
                      <span className="ui-muted text-sm">{row.patient_code}</span>
                    </div>
                  </td>
                  <td>{row.reason}</td>
                  <td>
                    <span className={`ui-badge ${statusClass(row.status)}`}>
                      {String(row.status).replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        className="ui-btn ui-btn-primary"
                        to={`/doctor/prescriptions/new?appointmentId=${row.id}`}
                      >
                        {row.has_prescription ? "View / Rx" : "Write Rx"}
                      </Link>
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
                      {row.status !== "completed" ? (
                        <button
                          type="button"
                          className="ui-btn ui-btn-ghost"
                          disabled={busyId === row.id}
                          onClick={() => markStatus(row, "completed")}
                        >
                          Complete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
