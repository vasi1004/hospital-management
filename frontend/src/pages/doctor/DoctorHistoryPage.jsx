import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { useAppSelector } from "@/store/hooks";
import { DOCTOR_NAV } from "@/constants/nav";
import { listPrescriptionsRequest } from "@/services/hmsApi";

export function DoctorHistoryPage() {
  const { user, accessToken } = useAppSelector((state) => state.auth);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await listPrescriptionsRequest(accessToken);
        if (!cancelled) setItems(data.items || []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load history");
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

  const grouped = useMemo(() => {
    const map = new Map();
    items.forEach((row) => {
      const key = row.prescribed_on;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    });
    return [...map.entries()];
  }, [items]);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <RoleLayout
      user={user}
      subtitle="Doctor workspace"
      navItems={DOCTOR_NAV}
      title="Treatment history"
    >
      <div className="ui-panel ui-panel-pad">
        <h2 className="ui-title text-base">Day-by-day prescription history</h2>
        <p className="ui-muted mt-1 text-sm">
          Patients you have treated and digital prescriptions written.
        </p>

        {error ? <p className="ui-alert-error mt-3">{error}</p> : null}
        {loading ? <p className="ui-muted mt-4">Loading…</p> : null}
        {!loading && grouped.length === 0 ? (
          <p className="ui-muted mt-4">No prescriptions yet.</p>
        ) : null}

        <div className="mt-4 grid gap-4">
          {grouped.map(([day, rows]) => (
            <section key={day} className="rounded-2xl border border-[var(--line)] p-4">
              <h3 className="font-display text-base font-bold">
                {day} · {rows.length} patient{rows.length === 1 ? "" : "s"}
              </h3>
              <div className="ui-table-wrap mt-3">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>Rx</th>
                      <th>Patient</th>
                      <th>Diagnosis</th>
                      <th>Medicines</th>
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
                        <td>{row.diagnosis}</td>
                        <td>{row.items?.length || 0}</td>
                        <td>
                          <Link className="ui-link" to={`/doctor/prescriptions/${row.id}`}>
                            Open card
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
