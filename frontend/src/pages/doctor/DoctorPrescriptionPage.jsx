import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { useAppSelector } from "@/store/hooks";
import { DOCTOR_NAV } from "@/constants/nav";
import { APP_NAME } from "@/constants/urls";
import { AppLogo } from "@/components/AppLogo";
import {
  createPrescriptionRequest,
  fetchMyDoctorProfile,
  getPrescriptionRequest,
  listAppointmentsRequest,
  listPrescriptionsRequest,
} from "@/services/hmsApi";
import "./PrescriptionCard.css";

const EMPTY_ITEM = {
  medicine_name: "",
  dose: "",
  frequency: "",
  duration: "",
  instructions: "",
};

export function DoctorPrescriptionPage() {
  const { prescriptionId } = useParams();
  const [searchParams] = useSearchParams();
  const appointmentIdParam = searchParams.get("appointmentId");
  const isCreate = !prescriptionId;

  const navigate = useNavigate();
  const { user, accessToken } = useAppSelector((state) => state.auth);

  const [profile, setProfile] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [existing, setExisting] = useState(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const me = await fetchMyDoctorProfile(accessToken);
        if (cancelled) return;
        setProfile(me);

        if (prescriptionId) {
          const rx = await getPrescriptionRequest(accessToken, prescriptionId);
          if (cancelled) return;
          setExisting(rx);
          setDiagnosis(rx.diagnosis || "");
          setAdvice(rx.advice || "");
          setNotes(rx.notes || "");
          setItems(
            (rx.items || []).map((item) => ({
              medicine_name: item.medicine_name,
              dose: item.dose,
              frequency: item.frequency,
              duration: item.duration,
              instructions: item.instructions || "",
            })),
          );
        } else if (appointmentIdParam) {
          const list = await listAppointmentsRequest(accessToken, {
            page: 1,
            page_size: 100,
          });
          const found = (list.items || []).find(
            (row) => String(row.id) === String(appointmentIdParam),
          );
          if (!found) throw new Error("Appointment not found for this doctor");
          setAppointment(found);

          const rxList = await listPrescriptionsRequest(accessToken);
          const prior = (rxList.items || []).find(
            (row) => String(row.appointment_id) === String(appointmentIdParam),
          );
          if (prior) {
            navigate(`/doctor/prescriptions/${prior.id}`, { replace: true });
          }
        } else {
          throw new Error("Missing appointment for new prescription");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load prescription");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, prescriptionId, appointmentIdParam, navigate]);

  const cardMeta = useMemo(() => {
    if (existing) {
      return {
        code: existing.prescription_code,
        patientName: existing.patient_name,
        patientCode: existing.patient_code,
        date: existing.prescribed_on,
        doctorName: existing.doctor_name,
        specialization: existing.doctor_specialization,
      };
    }
    return {
      code: "Draft",
      patientName: appointment?.patient_name,
      patientCode: appointment?.patient_code,
      date: new Date().toISOString().slice(0, 10),
      doctorName: profile
        ? `Dr. ${profile.first_name} ${profile.last_name}`
        : user?.full_name,
      specialization: profile?.specialization,
    };
  }, [existing, appointment, profile, user]);

  if (!user) return <Navigate to="/login" replace />;

  function updateItem(index, key, value) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isCreate || !appointment) return;
    const cleaned = items
      .map((item) => ({
        medicine_name: item.medicine_name.trim(),
        dose: item.dose.trim(),
        frequency: item.frequency.trim(),
        duration: item.duration.trim(),
        instructions: item.instructions.trim() || null,
      }))
      .filter((item) => item.medicine_name && item.dose && item.frequency && item.duration);

    if (!diagnosis.trim() || cleaned.length === 0) {
      setError("Diagnosis and at least one complete medicine row are required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createPrescriptionRequest(accessToken, {
        appointment_id: appointment.id,
        diagnosis: diagnosis.trim(),
        advice: advice.trim() || null,
        notes: notes.trim() || null,
        items: cleaned,
      });
      navigate(`/doctor/prescriptions/${created.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save prescription");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleLayout
      user={user}
      subtitle="Doctor workspace"
      navItems={DOCTOR_NAV}
      title={isCreate ? "Write prescription" : "Prescription card"}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <Link to="/doctor/today" className="ui-btn ui-btn-ghost">
          Back to today
        </Link>
        <Link to="/doctor/history" className="ui-btn ui-btn-ghost">
          History
        </Link>
      </div>

      {error ? <p className="ui-alert-error mb-3">{error}</p> : null}
      {loading ? <p className="ui-muted">Loading…</p> : null}

      {!loading ? (
        <form className="rx-layout" onSubmit={handleSubmit}>
          <article className="rx-card" aria-label="Digital prescription">
            <header className="rx-card__header">
              <div className="rx-card__brand">
                <AppLogo variant="mark" effect3d className="rx-card__logo" decorative />
                <div>
                  <p className="rx-card__clinic">{APP_NAME}</p>
                  <h2 className="rx-card__title">Prescription</h2>
                </div>
              </div>
              <div className="rx-card__meta">
                <p>
                  <strong>Rx #</strong> {cardMeta.code}
                </p>
                <p>
                  <strong>Date</strong> {cardMeta.date}
                </p>
              </div>
            </header>

            <section className="rx-card__parties">
              <div>
                <p className="rx-label">Doctor</p>
                <p className="rx-value">{cardMeta.doctorName}</p>
                <p className="rx-sub">{cardMeta.specialization || "—"}</p>
              </div>
              <div>
                <p className="rx-label">Patient</p>
                <p className="rx-value">{cardMeta.patientName || "—"}</p>
                <p className="rx-sub">{cardMeta.patientCode || "—"}</p>
              </div>
            </section>

            <label className="rx-field">
              <span className="rx-label">Diagnosis</span>
              {isCreate ? (
                <input
                  className="ui-input"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  required
                />
              ) : (
                <p className="rx-value">{diagnosis}</p>
              )}
            </label>

            <div className="rx-meds">
              <div className="rx-meds__head">
                <span>Medicine</span>
                <span>Dose</span>
                <span>Frequency</span>
                <span>Duration</span>
                <span>Notes</span>
              </div>
              {items.map((item, index) => (
                <div className="rx-meds__row" key={`med-${index}`}>
                  {isCreate ? (
                    <>
                      <input
                        className="ui-input"
                        placeholder="Medicine"
                        value={item.medicine_name}
                        onChange={(e) =>
                          updateItem(index, "medicine_name", e.target.value)
                        }
                      />
                      <input
                        className="ui-input"
                        placeholder="e.g. 500mg"
                        value={item.dose}
                        onChange={(e) => updateItem(index, "dose", e.target.value)}
                      />
                      <input
                        className="ui-input"
                        placeholder="e.g. 1-0-1"
                        value={item.frequency}
                        onChange={(e) =>
                          updateItem(index, "frequency", e.target.value)
                        }
                      />
                      <input
                        className="ui-input"
                        placeholder="e.g. 5 days"
                        value={item.duration}
                        onChange={(e) =>
                          updateItem(index, "duration", e.target.value)
                        }
                      />
                      <input
                        className="ui-input"
                        placeholder="After food"
                        value={item.instructions}
                        onChange={(e) =>
                          updateItem(index, "instructions", e.target.value)
                        }
                      />
                    </>
                  ) : (
                    <>
                      <span>{item.medicine_name}</span>
                      <span>{item.dose}</span>
                      <span>{item.frequency}</span>
                      <span>{item.duration}</span>
                      <span>{item.instructions || "—"}</span>
                    </>
                  )}
                </div>
              ))}
            </div>

            {isCreate ? (
              <button
                type="button"
                className="ui-btn ui-btn-ghost mt-3"
                onClick={() => setItems((prev) => [...prev, { ...EMPTY_ITEM }])}
              >
                Add medicine
              </button>
            ) : null}

            <label className="rx-field mt-4">
              <span className="rx-label">Advice</span>
              {isCreate ? (
                <textarea
                  className="ui-textarea"
                  rows={3}
                  value={advice}
                  onChange={(e) => setAdvice(e.target.value)}
                />
              ) : (
                <p className="rx-value">{advice || "—"}</p>
              )}
            </label>

            <label className="rx-field">
              <span className="rx-label">Clinical notes</span>
              {isCreate ? (
                <textarea
                  className="ui-textarea"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              ) : (
                <p className="rx-value">{notes || "—"}</p>
              )}
            </label>

            <footer className="rx-card__footer">
              <p>Digitally signed by {cardMeta.doctorName}</p>
              <p className="rx-script">℞</p>
            </footer>
          </article>

          {isCreate ? (
            <div className="rx-actions">
              <button
                type="submit"
                className="ui-btn ui-btn-primary"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save prescription"}
              </button>
            </div>
          ) : null}
        </form>
      ) : null}
    </RoleLayout>
  );
}
