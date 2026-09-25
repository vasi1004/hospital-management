import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { DoctorFormModal } from "@/components/DoctorFormModal";
import { useAppSelector } from "@/store/hooks";
import {
  listDepartmentsRequest,
  listDoctorsRequest,
  setDoctorActiveRequest,
} from "@/services/hmsApi";
import { listUsersRequest } from "@/features/login/loginApi";
import { ADMIN_NAV } from "@/constants/nav";
import "./AdminCatalog.css";

function formatAvailability(doc) {
  if (
    !doc?.available_days ||
    doc.available_from == null ||
    doc.available_to == null
  ) {
    return "Not set by doctor";
  }
  const from = String(doc.available_from).slice(0, 5);
  const to = String(doc.available_to).slice(0, 5);
  return `${doc.available_days} · ${from}–${to}`;
}

function hasAvailability(doc) {
  return Boolean(
    doc?.available_days &&
      doc.available_from != null &&
      doc.available_to != null,
  );
}

export function DoctorsPage() {
  const { user, accessToken } = useAppSelector((state) => state.auth);
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctorUsers, setDoctorUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [modal, setModal] = useState(null);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [docs, deps, users] = await Promise.all([
        listDoctorsRequest(accessToken, {
          search,
          status,
          page: 1,
          page_size: 50,
        }),
        listDepartmentsRequest(accessToken, true),
        listUsersRequest(accessToken, { role: "doctor", status: "active" }),
      ]);
      setItems(docs.items || []);
      setDepartments(Array.isArray(deps) ? deps : []);
      setDoctorUsers(Array.isArray(users) ? users : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = window.setTimeout(load, 200);
    return () => window.clearTimeout(t);
  }, [accessToken, search, status]);

  const activeCount = useMemo(
    () => items.filter((row) => row.is_active).length,
    [items],
  );
  const bookableCount = useMemo(
    () => items.filter((row) => hasAvailability(row)).length,
    [items],
  );

  if (!user) return <Navigate to="/login" replace />;

  async function toggleActive(doc) {
    setActionId(doc.id);
    setError(null);
    setSuccess(null);
    try {
      await setDoctorActiveRequest(accessToken, doc.id, !doc.is_active);
      setSuccess(
        `Doctor ${doc.first_name} ${doc.last_name} is now ${
          doc.is_active ? "inactive" : "active"
        }.`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActionId(null);
    }
  }

  return (
    <RoleLayout
      user={user}
      subtitle="Admin console"
      navItems={ADMIN_NAV}
      title="Doctors"
    >
      <div className="admin-catalog">
        <header className="screen-toolbar">
          <div>
            <p className="screen-kicker">Clinical staff</p>
            <h2 className="ui-title screen-toolbar__title">Doctors directory</h2>
            <p className="ui-muted screen-toolbar__sub">
              Manage doctor profiles and login links. Booking hours are
              published only by each doctor.
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
                <span className="screen-stat__label">Active</span>
                <strong className="screen-stat__value">
                  {loading ? "…" : activeCount}
                </strong>
              </div>
              <div className="screen-stat">
                <span className="screen-stat__label">Bookable</span>
                <strong className="screen-stat__value">
                  {loading ? "…" : bookableCount}
                </strong>
              </div>
            </div>
            <button
              type="button"
              className="ui-btn ui-btn-primary admin-catalog__create"
              onClick={() => {
                setSuccess(null);
                setError(null);
                setModal({ mode: "create" });
              }}
            >
              Add doctor
            </button>
          </div>
        </header>

        <section className="screen-panel admin-catalog__board">
          <div className="screen-panel__head">
            <div>
              <p className="screen-kicker">Directory</p>
              <h3 className="ui-title text-base">Doctor profiles</h3>
              <p className="ui-muted mt-1 text-sm">
                {loading
                  ? "Loading…"
                  : `${items.length} doctor${items.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <button
              type="button"
              className="ui-btn ui-btn-ghost"
              onClick={load}
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          <div className="admin-catalog__filters">
            <label className="ui-label">
              Search
              <input
                className="ui-input"
                type="search"
                placeholder="Name, code, specialization…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="ui-label">
              Status
              <select
                className="ui-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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

          <div className="ui-table-wrap admin-catalog__table-wrap">
            <table className="ui-table admin-catalog__table">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Specialization</th>
                  <th>Department</th>
                  <th>Availability</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="ui-muted text-center">
                      Loading doctors…
                    </td>
                  </tr>
                ) : null}
                {!loading && items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="ui-muted text-center">
                      No doctors found. Click Add doctor to create one.
                    </td>
                  </tr>
                ) : null}
                {!loading
                  ? items.map((doc) => {
                      const busy = actionId === doc.id;
                      const bookable = hasAvailability(doc);
                      return (
                        <tr key={doc.id}>
                          <td>
                            <div className="admin-catalog__person">
                              <strong>
                                Dr. {doc.first_name} {doc.last_name}
                              </strong>
                              <span className="ui-muted text-sm">
                                {doc.doctor_code}
                              </span>
                            </div>
                          </td>
                          <td>{doc.specialization}</td>
                          <td>{doc.department_name || "—"}</td>
                          <td>
                            <span
                              className={`ui-badge ${
                                bookable ? "ui-badge-ok" : "ui-badge-muted"
                              }`}
                              title={formatAvailability(doc)}
                            >
                              {bookable ? "Published" : "Not set"}
                            </span>
                          </td>
                          <td>{doc.phone}</td>
                          <td>
                            <span
                              className={`ui-badge ${
                                doc.is_active ? "ui-badge-ok" : "ui-badge-muted"
                              }`}
                            >
                              {doc.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            <div className="admin-catalog__actions">
                              <button
                                type="button"
                                className="ui-btn ui-btn-ghost"
                                disabled={busy}
                                onClick={() => {
                                  setSuccess(null);
                                  setError(null);
                                  setModal({ mode: "edit", doctor: doc });
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className={`ui-btn ui-btn-ghost${
                                  doc.is_active ? " admin-catalog__danger" : ""
                                }`}
                                disabled={busy}
                                onClick={() => toggleActive(doc)}
                              >
                                {busy
                                  ? "…"
                                  : doc.is_active
                                    ? "Deactivate"
                                    : "Activate"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {modal ? (
        <DoctorFormModal
          key={
            modal.mode === "edit" ? `edit-${modal.doctor?.id}` : "create-doctor"
          }
          mode={modal.mode}
          accessToken={accessToken}
          departments={departments}
          doctorUsers={doctorUsers}
          editingDoctor={modal.doctor || null}
          onClose={() => setModal(null)}
          onSuccess={async (saved, mode) => {
            setSuccess(
              mode === "edit"
                ? `Doctor ${saved.first_name} ${saved.last_name} updated.`
                : `Doctor ${saved.first_name} ${saved.last_name} created.`,
            );
            setModal(null);
            await load();
          }}
        />
      ) : null}
    </RoleLayout>
  );
}
