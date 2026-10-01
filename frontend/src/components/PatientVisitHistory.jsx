import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BackendLoader } from "@/components/BackendLoader";
import { listAppointmentsRequest } from "@/services/hmsApi";

function formatTime(value) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

function statusBadgeClass(status) {
  const key = String(status || "").toLowerCase();
  if (key === "completed") return "ui-badge-ok";
  if (key === "cancelled" || key === "no_show") return "ui-badge-danger";
  if (key === "in_progress" || key === "confirmed") return "ui-badge-info";
  return "ui-badge-warn";
}

/**
 * Visit timeline for a patient — driven by appointments + prescription_id from API.
 */
export function PatientVisitHistory({
  accessToken,
  patientId,
  prescriptionsBasePath,
}) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken || !patientId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await listAppointmentsRequest(accessToken, {
          patient_id: patientId,
          page: 1,
          page_size: 100,
        });
        if (cancelled) return;
        const rows = [...(data.items || [])].sort((a, b) => {
          const dateCmp = String(b.appointment_date || "").localeCompare(
            String(a.appointment_date || ""),
          );
          if (dateCmp !== 0) return dateCmp;
          return String(b.appointment_time || "").localeCompare(
            String(a.appointment_time || ""),
          );
        });
        setItems(rows);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load visit history",
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
  }, [accessToken, patientId]);

  const visitCount = items.length;
  const rxCount = useMemo(
    () => items.filter((row) => row.prescription_id || row.has_prescription).length,
    [items],
  );

  return (
    <section className="ui-panel ui-panel-pad space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="ui-title text-base">Visit history</h2>
          <p className="ui-muted mt-1 text-sm">
            Every hospital visit for this patient, with linked prescriptions when
            written by a doctor.
          </p>
        </div>
        {!loading ? (
          <p className="ui-muted text-sm">
            {visitCount} visit{visitCount === 1 ? "" : "s"}
            {rxCount ? ` · ${rxCount} prescription${rxCount === 1 ? "" : "s"}` : ""}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="ui-alert-error" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <BackendLoader variant="inline" label="Loading visit history…" />
      ) : null}

      {!loading && items.length === 0 ? (
        <p className="ui-muted">No visits recorded yet for this patient.</p>
      ) : null}

      {!loading && items.length > 0 ? (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Visit</th>
                <th>Doctor</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Prescription</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const rxId = row.prescription_id;
                const canOpenRx = Boolean(rxId && prescriptionsBasePath);
                return (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.appointment_date}</strong>
                      <div className="ui-muted text-sm">
                        {formatTime(row.appointment_time)}
                        {row.appointment_code ? ` · ${row.appointment_code}` : ""}
                      </div>
                    </td>
                    <td>
                      {row.doctor_name || "—"}
                      {row.department_name ? (
                        <div className="ui-muted text-sm">{row.department_name}</div>
                      ) : null}
                    </td>
                    <td>{row.reason || "—"}</td>
                    <td>
                      <span className={`ui-badge ${statusBadgeClass(row.status)}`}>
                        {String(row.status || "").replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      {canOpenRx ? (
                        <Link
                          className="ui-link"
                          to={`${prescriptionsBasePath}/${rxId}`}
                        >
                          View Rx
                        </Link>
                      ) : row.has_prescription ? (
                        <span className="ui-muted text-sm">On file</span>
                      ) : (
                        <span className="ui-muted text-sm">Not written</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
