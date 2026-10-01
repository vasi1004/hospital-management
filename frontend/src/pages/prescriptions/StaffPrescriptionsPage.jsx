import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { BackendLoader } from "@/components/BackendLoader";
import { RoleLayout } from "@/layouts/RoleLayout";
import { useAppSelector } from "@/store/hooks";
import { ADMIN_NAV, RECEPTION_NAV } from "@/constants/nav";
import {
  getPrescriptionsBasePath,
  ROLES,
} from "@/constants/roles";
import {
  listPatientsRequest,
  listPrescriptionsRequest,
} from "@/services/hmsApi";

export function StaffPrescriptionsPage() {
  const { user, accessToken } = useAppSelector((state) => state.auth);
  const [searchParams, setSearchParams] = useSearchParams();
  const patientFilter = searchParams.get("patient_id") || "";

  const [items, setItems] = useState([]);
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const navItems = useMemo(() => {
    if (user?.role === ROLES.ADMIN) return ADMIN_NAV;
    if (user?.role === ROLES.RECEPTIONIST) return RECEPTION_NAV;
    return [];
  }, [user]);

  const basePath = getPrescriptionsBasePath(user?.role);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    async function loadPatients() {
      try {
        const data = await listPatientsRequest(accessToken, {
          status: "all",
          page: 1,
          page_size: 100,
          sort_by: "first_name",
          sort_dir: "asc",
        });
        if (!cancelled) setPatients(data.items || []);
      } catch {
        /* patient filter is optional — list still works */
      }
    }

    loadPatients();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await listPrescriptionsRequest(accessToken, {
          patient_id: patientFilter || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        });
        if (!cancelled) setItems(data.items || []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load prescriptions",
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
  }, [accessToken, patientFilter, dateFrom, dateTo]);

  if (!user) return <Navigate to="/login" replace />;
  if (![ROLES.ADMIN, ROLES.RECEPTIONIST].includes(user.role) || !basePath) {
    return <Navigate to="/login" replace />;
  }

  const grouped = useMemo(() => {
    const map = new Map();
    items.forEach((row) => {
      const key = row.prescribed_on || "Unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    });
    return [...map.entries()];
  }, [items]);

  return (
    <RoleLayout
      user={user}
      subtitle={user.role === ROLES.ADMIN ? "Admin console" : "Front desk"}
      navItems={navItems}
      title="Prescriptions"
    >
      <div className="ui-panel ui-panel-pad space-y-4">
        <div>
          <h2 className="ui-title text-base">Hospital prescription records</h2>
          <p className="ui-muted mt-1 text-sm">
            Read-only view of prescriptions written by doctors. Filter by patient
            or date — data comes live from the server.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="ui-label">
            Patient
            <select
              className="ui-select"
              value={patientFilter}
              onChange={(e) => {
                const next = new URLSearchParams(searchParams);
                if (e.target.value) next.set("patient_id", e.target.value);
                else next.delete("patient_id");
                setSearchParams(next, { replace: true });
              }}
            >
              <option value="">All patients</option>
              {patients.map((patient) => (
                <option key={patient.id} value={String(patient.id)}>
                  {patient.first_name} {patient.last_name}
                  {patient.patient_code ? ` (${patient.patient_code})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="ui-label">
            From date
            <input
              type="date"
              className="ui-input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label className="ui-label">
            To date
            <input
              type="date"
              className="ui-input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              className="ui-btn ui-btn-ghost"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                const next = new URLSearchParams(searchParams);
                next.delete("patient_id");
                setSearchParams(next, { replace: true });
              }}
            >
              Clear filters
            </button>
          </div>
        </div>

        {error ? (
          <p className="ui-alert-error" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? (
          <BackendLoader variant="inline" label="Loading prescriptions…" />
        ) : null}
        {!loading && grouped.length === 0 ? (
          <p className="ui-muted">No prescriptions match the current filters.</p>
        ) : null}

        <div className="grid gap-4">
          {grouped.map(([day, rows]) => (
            <section
              key={day}
              className="rounded-2xl border border-[var(--line)] p-4"
            >
              <h3 className="font-display text-base font-bold">
                {day} · {rows.length} prescription{rows.length === 1 ? "" : "s"}
              </h3>
              <div className="ui-table-wrap mt-3">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>Rx</th>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Diagnosis</th>
                      <th>Visit</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="font-semibold">{row.prescription_code}</td>
                        <td>
                          {row.patient_name}
                          <div className="ui-muted text-sm">{row.patient_code}</div>
                        </td>
                        <td>
                          {row.doctor_name || "—"}
                          {row.doctor_specialization ? (
                            <div className="ui-muted text-sm">
                              {row.doctor_specialization}
                            </div>
                          ) : null}
                        </td>
                        <td>{row.diagnosis}</td>
                        <td>
                          {row.appointment_date || "—"}
                          {row.appointment_code ? (
                            <div className="ui-muted text-sm">
                              {row.appointment_code}
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <Link className="ui-link" to={`${basePath}/${row.id}`}>
                            View details
                          </Link>
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
    </RoleLayout>
  );
}
