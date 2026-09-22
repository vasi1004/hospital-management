import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { BookAppointmentModal } from "@/components/BookAppointmentModal";
import { RescheduleAppointmentModal } from "@/components/RescheduleAppointmentModal";
import { useAppSelector } from "@/store/hooks";
import { ADMIN_NAV, RECEPTION_NAV } from "@/constants/nav";
import { ROLES } from "@/constants/roles";
import {
  listAppointmentsRequest,
  listDoctorsRequest,
  listPatientsRequest,
  updateAppointmentStatusRequest,
} from "@/services/hmsApi";
import "./AppointmentsPage.css";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(value) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

const TERMINAL = new Set(["completed", "cancelled", "no_show"]);

function statusTone(status) {
  const key = String(status || "").toLowerCase();
  if (key === "completed") return "ok";
  if (key === "cancelled" || key === "no_show") return "danger";
  if (key === "in_progress" || key === "confirmed") return "info";
  return "warn";
}

function statusBadgeClass(status) {
  const tone = statusTone(status);
  if (tone === "ok") return "ui-badge-ok";
  if (tone === "danger") return "ui-badge-danger";
  if (tone === "info") return "ui-badge-info";
  return "ui-badge-warn";
}

export function AppointmentsPage() {
  const { user, accessToken } = useAppSelector((state) => state.auth);
  const [items, setItems] = useState([]);
  const [patients, setPatients] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [shifting, setShifting] = useState(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isAdmin = user?.role === ROLES.ADMIN;
  const navItems = isAdmin ? ADMIN_NAV : RECEPTION_NAV;

  async function loadListAndPatients() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [apts, pats, docs] = await Promise.all([
        listAppointmentsRequest(accessToken, { page: 1, page_size: 100 }),
        listPatientsRequest(accessToken, {
          status: "active",
          page: 1,
          page_size: 100,
        }),
        listDoctorsRequest(accessToken, {
          status: "active",
          page: 1,
          page_size: 100,
        }),
      ]);
      setItems(apts.items || []);
      setPatients(pats.items || []);
      setAllDoctors(docs.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadListAndPatients();
  }, [accessToken]);

  if (!user) return <Navigate to="/login" replace />;
  if (![ROLES.ADMIN, ROLES.RECEPTIONIST].includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  async function cancelAppointment(row) {
    setBusyId(row.id);
    setError(null);
    try {
      await updateAppointmentStatusRequest(accessToken, row.id, "cancelled");
      await loadListAndPatients();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setBusyId(null);
    }
  }

  const openCount = useMemo(
    () => items.filter((row) => !TERMINAL.has(row.status)).length,
    [items],
  );

  const todayCount = useMemo(() => {
    const today = todayIso();
    return items.filter((row) => row.appointment_date === today).length;
  }, [items]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((row) => {
      if (statusFilter === "open" && TERMINAL.has(row.status)) return false;
      if (statusFilter === "today" && row.appointment_date !== todayIso()) {
        return false;
      }
      if (statusFilter !== "all" && statusFilter !== "open" && statusFilter !== "today") {
        if (row.status !== statusFilter) return false;
      }
      if (!term) return true;
      const hay = [
        row.appointment_code,
        row.patient_name,
        row.doctor_name,
        row.status,
        row.appointment_date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [items, search, statusFilter]);

  return (
    <RoleLayout
      user={user}
      subtitle={isAdmin ? "Admin console" : "Front desk"}
      navItems={navItems}
      title="Appointments"
    >
      <div className="apts-shell">
        <header className="screen-toolbar">
          <div>
            <p className="screen-kicker">Scheduling</p>
            <h2 className="ui-title screen-toolbar__title">Appointments</h2>
            <p className="ui-muted screen-toolbar__sub">
              Full schedule board. Use Book appointment to open the booking
              popup — slots come from live doctor availability.
            </p>
          </div>
          <div className="screen-toolbar__aside">
            <div className="screen-toolbar__stats">
              <div className="screen-stat">
                <span className="screen-stat__label">Listed</span>
                <strong className="screen-stat__value">
                  {loading ? "…" : items.length}
                </strong>
              </div>
              <div className="screen-stat">
                <span className="screen-stat__label">Open</span>
                <strong className="screen-stat__value">
                  {loading ? "…" : openCount}
                </strong>
              </div>
              <div className="screen-stat">
                <span className="screen-stat__label">Today</span>
                <strong className="screen-stat__value">
                  {loading ? "…" : todayCount}
                </strong>
              </div>
            </div>
            <button
              type="button"
              className="ui-btn ui-btn-primary apts-book-btn"
              onClick={() => {
                setSuccess(null);
                setError(null);
                setBookingOpen(true);
              }}
            >
              Book appointment
            </button>
          </div>
        </header>

        <section className="screen-panel apts-board">
          <div className="screen-panel__head">
            <div>
              <p className="screen-kicker">Board</p>
              <h3 className="ui-title text-base">Scheduled appointments</h3>
              <p className="ui-muted mt-1 text-sm">
                {loading
                  ? "Loading…"
                  : `${filteredItems.length} of ${items.length} shown`}
              </p>
            </div>
            <button
              type="button"
              className="ui-btn ui-btn-ghost"
              onClick={loadListAndPatients}
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          <div className="apts-filters">
            <label className="ui-label">
              Search
              <input
                className="ui-input"
                type="search"
                placeholder="Code, patient, doctor…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="ui-label">
              Filter
              <select
                className="ui-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All appointments</option>
                <option value="open">Open only</option>
                <option value="today">Today</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>

          {error ? (
            <p className="ui-alert-error mb-3" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="ui-alert-success mb-3" role="status">
              {success}
            </p>
          ) : null}

          <div className="ui-table-wrap apts-table-wrap">
            <table className="ui-table apts-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>When</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="ui-muted text-center">
                      Loading appointments…
                    </td>
                  </tr>
                ) : null}
                {!loading && filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="ui-muted text-center">
                      {items.length === 0
                        ? "No appointments yet. Click Book appointment to create one."
                        : "No appointments match the current filters."}
                    </td>
                  </tr>
                ) : null}
                {filteredItems.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="apts-code">{row.appointment_code}</span>
                    </td>
                    <td>
                      <div className="apts-when">
                        <strong>{row.appointment_date}</strong>
                        <span>{formatTime(row.appointment_time)}</span>
                      </div>
                    </td>
                    <td>{row.patient_name}</td>
                    <td>{row.doctor_name}</td>
                    <td>
                      <span className={`ui-badge ${statusBadgeClass(row.status)}`}>
                        {String(row.status).replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      <div className="apts-actions">
                        {!TERMINAL.has(row.status) ? (
                          <>
                            <button
                              type="button"
                              className="ui-btn ui-btn-ghost"
                              onClick={() => setShifting(row)}
                            >
                              Shift
                            </button>
                            <button
                              type="button"
                              className="ui-btn ui-btn-ghost apts-action-danger"
                              disabled={busyId === row.id}
                              onClick={() => cancelAppointment(row)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <span className="ui-muted text-sm">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {bookingOpen ? (
        <BookAppointmentModal
          accessToken={accessToken}
          patients={patients}
          onClose={() => setBookingOpen(false)}
          onSuccess={async (created) => {
            setSuccess(
              created?.appointment_code
                ? `Appointment ${created.appointment_code} booked.`
                : "Appointment booked.",
            );
            setBookingOpen(false);
            await loadListAndPatients();
          }}
        />
      ) : null}

      {shifting ? (
        <RescheduleAppointmentModal
          accessToken={accessToken}
          appointment={shifting}
          allowDoctorChange
          doctors={allDoctors}
          onClose={() => setShifting(null)}
          onSuccess={async () => {
            setSuccess("Appointment shifted.");
            setShifting(null);
            await loadListAndPatients();
          }}
        />
      ) : null}
    </RoleLayout>
  );
}
