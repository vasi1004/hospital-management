import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { useAppSelector } from "@/store/hooks";
import {
  listPatientsRequest,
  setPatientActiveRequest,
} from "@/services/hmsApi";
import { ADMIN_NAV, RECEPTION_NAV } from "@/constants/nav";
import { ROLES } from "@/constants/roles";

export function PatientsPage({ basePath }) {
  const navigate = useNavigate();
  const { user, accessToken } = useAppSelector((state) => state.auth);
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  const [status, setStatus] = useState("active");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const navItems = useMemo(() => {
    if (user?.role === ROLES.ADMIN) return ADMIN_NAV;
    if (user?.role === ROLES.RECEPTIONIST) return RECEPTION_NAV;
    return [];
  }, [user]);

  const canMutate =
    user?.role === ROLES.ADMIN || user?.role === ROLES.RECEPTIONIST;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const result = await listPatientsRequest(accessToken, {
          search,
          gender,
          status,
          sort_by: sortBy,
          sort_dir: sortDir,
          page,
          page_size: 10,
        });
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const timer = window.setTimeout(load, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [accessToken, search, gender, status, sortBy, sortDir, page]);

  if (!user) return <Navigate to="/login" replace />;
  if (![ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR].includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  async function toggleActive(patient) {
    if (!canMutate || !accessToken) return;
    try {
      await setPatientActiveRequest(accessToken, patient.id, !patient.is_active);
      setPage(1);
      const result = await listPatientsRequest(accessToken, {
        search,
        gender,
        status,
        sort_by: sortBy,
        sort_dir: sortDir,
        page: 1,
        page_size: 10,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <RoleLayout
      user={user}
      subtitle={user.role === ROLES.ADMIN ? "Admin console" : "Front desk"}
      navItems={navItems}
      title="Patients"
    >
      <div className="space-y-4">
        <div className="ui-panel ui-panel-pad flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="ui-label">
              Search
              <input
                className="ui-input"
                placeholder="Name, ID, phone…"
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
              />
            </label>
            <label className="ui-label">
              Gender
              <select
                className="ui-select"
                value={gender}
                onChange={(e) => {
                  setPage(1);
                  setGender(e.target.value);
                }}
              >
                <option value="">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="ui-label">
              Status
              <select
                className="ui-select"
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value);
                }}
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="ui-label">
              Sort
              <select
                className="ui-select"
                value={`${sortBy}:${sortDir}`}
                onChange={(e) => {
                  const [by, dir] = e.target.value.split(":");
                  setSortBy(by);
                  setSortDir(dir);
                  setPage(1);
                }}
              >
                <option value="created_at:desc">Newest</option>
                <option value="created_at:asc">Oldest</option>
                <option value="first_name:asc">Name A–Z</option>
                <option value="first_name:desc">Name Z–A</option>
                <option value="patient_code:asc">Patient ID</option>
              </select>
            </label>
          </div>
          {canMutate ? (
            <Link to={`${basePath}/new`} className="ui-btn ui-btn-primary">
              + Add Patient
            </Link>
          ) : null}
        </div>

        {error ? <p className="ui-alert-error">{error}</p> : null}

        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="ui-muted">
                    Loading patients…
                  </td>
                </tr>
              ) : (data?.items || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="ui-muted">
                    No patients found.
                  </td>
                </tr>
              ) : (
                data.items.map((patient) => (
                  <tr key={patient.id}>
                    <td className="font-semibold">{patient.patient_code}</td>
                    <td>
                      {patient.first_name} {patient.last_name}
                    </td>
                    <td>{patient.age}</td>
                    <td className="capitalize">{patient.gender}</td>
                    <td>{patient.phone}</td>
                    <td>
                      <span
                        className={`ui-badge ${
                          patient.is_active ? "ui-badge-ok" : "ui-badge-muted"
                        }`}
                      >
                        {patient.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="ui-link"
                          onClick={() => navigate(`${basePath}/${patient.id}`)}
                        >
                          View
                        </button>
                        {canMutate ? (
                          <>
                            <button
                              type="button"
                              className="ui-link"
                              onClick={() =>
                                navigate(`${basePath}/${patient.id}/edit`)
                              }
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="ui-link text-[var(--coral)]"
                              onClick={() => toggleActive(patient)}
                            >
                              {patient.is_active ? "Deactivate" : "Activate"}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="ui-muted text-sm">
            {data
              ? `Page ${data.page} of ${data.total_pages || 1} · ${data.total} total`
              : null}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="ui-btn ui-btn-ghost"
              disabled={!data || data.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-ghost"
              disabled={!data || data.page >= data.total_pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </RoleLayout>
  );
}
