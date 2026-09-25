import { useEffect, useMemo, useState } from "react";
import {
  createAppointmentRequest,
  listAvailableDoctorsRequest,
  listDoctorFreeSlotsRequest,
} from "@/services/hmsApi";
import "./BookAppointmentModal.css";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Next N calendar days as ISO strings (local). */
function upcomingDates(count = 14) {
  const out = [];
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  for (let i = 0; i < count; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function formatDayChip(iso) {
  const d = new Date(`${iso}T12:00:00`);
  const weekday = d.toLocaleDateString("en-IN", { weekday: "short" });
  const day = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return { weekday, day };
}

function formatTime(value) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

function formatTimeLabel(value) {
  const raw = formatTime(value);
  if (!raw || raw === "—") return "—";
  const [h, m] = raw.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return raw;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatFee(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

function initials(first, last) {
  const a = String(first || "").trim()[0] || "";
  const b = String(last || "").trim()[0] || "";
  return `${a}${b}`.toUpperCase() || "DR";
}

const EMPTY = {
  patient_id: "",
  specialization: "",
  doctor_id: "",
  appointment_date: todayIso(),
  appointment_time: "",
  reason: "",
  appointment_type: "consultation",
  priority: "normal",
  status: "scheduled",
  notes: "",
};

/**
 * Apollo-style book appointment: specialty chips → doctor cards → slot pills.
 * Uses button/chip UI (not native selects) so controls stay clickable over
 * modal overlays. All doctor/slot data comes from availability APIs.
 */
export function BookAppointmentModal({
  accessToken,
  patients = [],
  onClose,
  onSuccess,
}) {
  const [form, setForm] = useState(EMPTY);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [slotMeta, setSlotMeta] = useState(null);
  const [availabilityMeta, setAvailabilityMeta] = useState(null);
  const [error, setError] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientOpen, setPatientOpen] = useState(false);

  const dateOptions = useMemo(() => upcomingDates(14), []);

  useEffect(() => {
    if (!accessToken || !form.appointment_date) {
      setAvailableDoctors([]);
      setAvailabilityMeta(null);
      return;
    }
    let cancelled = false;
    async function loadAvailability() {
      setLoadingAvailability(true);
      setError(null);
      try {
        const data = await listAvailableDoctorsRequest(accessToken, {
          date: form.appointment_date,
        });
        if (cancelled) return;
        setAvailabilityMeta(data);
        const docs = data.doctors || [];
        setAvailableDoctors(docs);
        setForm((prev) => {
          const next = { ...prev };
          const specialtyStillValid =
            !prev.specialization ||
            docs.some(
              (d) =>
                String(d.specialization).toLowerCase() ===
                String(prev.specialization).toLowerCase(),
            );
          if (!specialtyStillValid) {
            next.specialization = "";
            next.doctor_id = "";
            next.appointment_time = "";
            return next;
          }
          const filtered = prev.specialization
            ? docs.filter(
                (d) =>
                  String(d.specialization).toLowerCase() ===
                  String(prev.specialization).toLowerCase(),
              )
            : docs;
          if (
            prev.doctor_id &&
            filtered.some((d) => String(d.id) === String(prev.doctor_id))
          ) {
            return next;
          }
          next.doctor_id = "";
          next.appointment_time = "";
          return next;
        });
      } catch (err) {
        if (!cancelled) {
          setAvailableDoctors([]);
          setAvailabilityMeta(null);
          setError(
            err instanceof Error ? err.message : "Unable to load availability",
          );
        }
      } finally {
        if (!cancelled) setLoadingAvailability(false);
      }
    }
    loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [accessToken, form.appointment_date]);

  useEffect(() => {
    if (!accessToken || !form.doctor_id || !form.appointment_date) {
      setSlots([]);
      setSlotMeta(null);
      return;
    }
    let cancelled = false;
    async function loadSlots() {
      setLoadingSlots(true);
      try {
        const data = await listDoctorFreeSlotsRequest(
          accessToken,
          form.doctor_id,
          { date: form.appointment_date },
        );
        if (cancelled) return;
        setSlotMeta(data);
        const next = (data.slots || []).map((t) => formatTime(t));
        setSlots(next);
        setForm((prev) => ({
          ...prev,
          appointment_time: next.includes(prev.appointment_time)
            ? prev.appointment_time
            : "",
        }));
      } catch (err) {
        if (!cancelled) {
          setSlots([]);
          setSlotMeta(null);
          setError(err instanceof Error ? err.message : "Unable to load slots");
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    }
    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [accessToken, form.doctor_id, form.appointment_date]);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape" && !saving) onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const specialties = useMemo(() => {
    const set = new Set();
    availableDoctors.forEach((doc) => {
      const value = String(doc.specialization || "").trim();
      if (value) set.add(value);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [availableDoctors]);

  const filteredDoctors = useMemo(() => {
    if (!form.specialization) return availableDoctors;
    return availableDoctors.filter(
      (d) =>
        String(d.specialization).toLowerCase() ===
        String(form.specialization).toLowerCase(),
    );
  }, [availableDoctors, form.specialization]);

  const selectedDoctor = filteredDoctors.find(
    (d) => String(d.id) === String(form.doctor_id),
  );

  const selectedPatient = patients.find(
    (p) => String(p.id) === String(form.patient_id),
  );

  const filteredPatients = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => {
      const hay = `${p.first_name} ${p.last_name} ${p.patient_code}`.toLowerCase();
      return hay.includes(q);
    });
  }, [patients, patientQuery]);

  function update(name, value) {
    setError(null);
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "appointment_date") {
        next.specialization = "";
        next.doctor_id = "";
        next.appointment_time = "";
      }
      if (name === "specialization") {
        next.doctor_id = "";
        next.appointment_time = "";
      }
      if (name === "doctor_id") {
        next.appointment_time = "";
      }
      return next;
    });
  }

  function selectPatient(patient) {
    update("patient_id", String(patient.id));
    setPatientQuery("");
    setPatientOpen(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (
      !form.patient_id ||
      !form.doctor_id ||
      !form.appointment_time ||
      !form.reason.trim()
    ) {
      setError("Patient, doctor, time slot, and reason are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fee = selectedDoctor
        ? Number(selectedDoctor.consultation_fee || 0)
        : 0;
      const created = await createAppointmentRequest(accessToken, {
        patient_id: Number(form.patient_id),
        doctor_id: Number(form.doctor_id),
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        reason: form.reason.trim(),
        appointment_type: form.appointment_type,
        priority: form.priority,
        status: form.status,
        notes: form.notes.trim() || null,
        consultation_fee: fee,
      });
      onSuccess?.(created);
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  const canBook =
    Boolean(form.patient_id) &&
    Boolean(form.doctor_id) &&
    Boolean(form.appointment_time) &&
    Boolean(form.reason.trim());

  return (
    <div
      className="book-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose?.();
      }}
    >
      <form
        className="book-modal"
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-modal-title"
      >
        <header className="book-modal__head">
          <div>
            <p className="book-modal__kicker">Book consultation</p>
            <h2 id="book-modal-title" className="book-modal__title">
              Schedule appointment
            </h2>
            <p className="book-modal__sub">
              Pick a date, specialty, and doctor — then choose a free slot from
              live availability.
            </p>
          </div>
          <button
            type="button"
            className="ui-btn ui-btn-ghost book-modal__close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            Close
          </button>
        </header>

        <div className="book-modal__layout">
          <div className="book-modal__main">
            {/* Patient */}
            <section className="book-section">
              <div className="book-section__label">
                <span>1</span> Patient
              </div>
              <div className="book-patient">
                <button
                  type="button"
                  className={[
                    "book-patient__trigger",
                    form.patient_id ? "is-filled" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setPatientOpen((open) => !open)}
                  aria-expanded={patientOpen}
                >
                  {selectedPatient ? (
                    <span>
                      <strong>
                        {selectedPatient.first_name} {selectedPatient.last_name}
                      </strong>
                      <em>{selectedPatient.patient_code}</em>
                    </span>
                  ) : (
                    <span className="book-patient__placeholder">
                      Select patient
                    </span>
                  )}
                  <span aria-hidden="true">{patientOpen ? "▴" : "▾"}</span>
                </button>
                {patientOpen ? (
                  <div className="book-patient__panel" role="listbox">
                    <input
                      className="book-patient__search"
                      type="search"
                      placeholder="Search name or code…"
                      value={patientQuery}
                      onChange={(e) => setPatientQuery(e.target.value)}
                      autoFocus
                    />
                    <div className="book-patient__list">
                      {filteredPatients.length === 0 ? (
                        <p className="book-empty">No patients match</p>
                      ) : (
                        filteredPatients.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            role="option"
                            aria-selected={String(p.id) === String(form.patient_id)}
                            className={[
                              "book-patient__option",
                              String(p.id) === String(form.patient_id)
                                ? "is-active"
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => selectPatient(p)}
                          >
                            <strong>
                              {p.first_name} {p.last_name}
                            </strong>
                            <span>{p.patient_code}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            {/* Date */}
            <section className="book-section">
              <div className="book-section__label">
                <span>2</span> Consultation date
              </div>
              <div className="book-date-strip" role="listbox" aria-label="Date">
                {dateOptions.map((iso) => {
                  const chip = formatDayChip(iso);
                  const active = form.appointment_date === iso;
                  return (
                    <button
                      key={iso}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={[
                        "book-date-chip",
                        active ? "is-active" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => update("appointment_date", iso)}
                    >
                      <em>{chip.weekday}</em>
                      <strong>{chip.day}</strong>
                    </button>
                  );
                })}
              </div>
              {availabilityMeta ? (
                <p className="book-hint">
                  {availabilityMeta.weekday} · {availabilityMeta.slot_minutes}
                  -min slots · {availableDoctors.length} doctor
                  {availableDoctors.length === 1 ? "" : "s"} available
                </p>
              ) : null}
            </section>

            {/* Specialty */}
            <section className="book-section">
              <div className="book-section__label">
                <span>3</span> Specialty
              </div>
              {loadingAvailability ? (
                <p className="book-hint">Loading specialties…</p>
              ) : specialties.length === 0 ? (
                <p className="book-empty">
                  No doctors have free slots on this date. Choose another day or
                  ask doctors to publish availability.
                </p>
              ) : (
                <div className="book-chip-row" role="listbox" aria-label="Specialty">
                  <button
                    type="button"
                    role="option"
                    aria-selected={!form.specialization}
                    className={[
                      "book-chip",
                      !form.specialization ? "is-active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => update("specialization", "")}
                  >
                    All specialties
                  </button>
                  {specialties.map((spec) => {
                    const active =
                      String(form.specialization).toLowerCase() ===
                      String(spec).toLowerCase();
                    return (
                      <button
                        key={spec}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={[
                          "book-chip",
                          active ? "is-active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => update("specialization", spec)}
                      >
                        {spec}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Doctors */}
            <section className="book-section">
              <div className="book-section__label">
                <span>4</span> Choose doctor
              </div>
              {loadingAvailability ? (
                <p className="book-hint">Checking who is free…</p>
              ) : filteredDoctors.length === 0 ? (
                <p className="book-empty">
                  No doctors match this specialty for the selected date.
                </p>
              ) : (
                <div className="book-doctor-list" role="listbox" aria-label="Doctors">
                  {filteredDoctors.map((doc) => {
                    const active = String(doc.id) === String(form.doctor_id);
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={[
                          "book-doctor-row",
                          active ? "is-active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => update("doctor_id", String(doc.id))}
                      >
                        <div className="book-doctor-row__avatar" aria-hidden="true">
                          {initials(doc.first_name, doc.last_name)}
                        </div>
                        <div className="book-doctor-row__body">
                          <div className="book-doctor-row__top">
                            <h3>
                              Dr. {doc.first_name} {doc.last_name}
                            </h3>
                            <span className="book-doctor-row__fee">
                              {formatFee(doc.consultation_fee)}
                            </span>
                          </div>
                          <p className="book-doctor-row__spec">
                            {doc.specialization}
                            {doc.doctor_code ? ` · ${doc.doctor_code}` : ""}
                          </p>
                          <div className="book-doctor-row__meta">
                            <span>
                              {Number(doc.experience_years || 0)} yrs exp
                            </span>
                            <span>
                              {formatTimeLabel(doc.available_from)}–
                              {formatTimeLabel(doc.available_to)}
                            </span>
                            <span className="book-doctor-row__slots">
                              {doc.free_slot_count} slot
                              {doc.free_slot_count === 1 ? "" : "s"} free
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Slots */}
            <section className="book-section">
              <div className="book-section__label">
                <span>5</span> Free time slot
              </div>
              {!form.doctor_id ? (
                <p className="book-empty">Select a doctor to see open slots.</p>
              ) : loadingSlots ? (
                <p className="book-hint">Loading free slots…</p>
              ) : slots.length === 0 ? (
                <p className="book-empty">No free slots left for this doctor.</p>
              ) : (
                <>
                  <div className="book-slot-grid" role="listbox" aria-label="Time slots">
                    {slots.map((slot) => {
                      const active = form.appointment_time === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          role="option"
                          aria-selected={active}
                          className={[
                            "book-slot",
                            active ? "is-active" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => update("appointment_time", slot)}
                        >
                          {formatTimeLabel(slot)}
                        </button>
                      );
                    })}
                  </div>
                  {slotMeta?.slot_minutes ? (
                    <p className="book-hint">
                      Each slot is {slotMeta.slot_minutes} minutes
                    </p>
                  ) : null}
                </>
              )}
            </section>

            {/* Reason */}
            <section className="book-section">
              <div className="book-section__label">
                <span>6</span> Visit details
              </div>
              <label className="ui-label">
                Reason *
                <input
                  className="ui-input"
                  value={form.reason}
                  onChange={(e) => update("reason", e.target.value)}
                  placeholder="e.g. Follow-up for fever"
                  required
                />
              </label>
              <label className="ui-label">
                Notes
                <input
                  className="ui-input"
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Optional front-desk note"
                />
              </label>
            </section>
          </div>

          <aside className="book-modal__summary" aria-live="polite">
            {selectedDoctor ? (
              <div className="book-summary-card">
                <p className="book-summary-card__eyebrow">Your booking</p>
                <div className="book-summary-card__doctor">
                  <div className="book-summary-card__avatar" aria-hidden="true">
                    {initials(
                      selectedDoctor.first_name,
                      selectedDoctor.last_name,
                    )}
                  </div>
                  <div>
                    <h3>
                      Dr. {selectedDoctor.first_name}{" "}
                      {selectedDoctor.last_name}
                    </h3>
                    <p>{selectedDoctor.specialization}</p>
                  </div>
                </div>

                <dl className="book-summary-card__stats">
                  <div>
                    <dt>Experience</dt>
                    <dd>
                      {Number(selectedDoctor.experience_years || 0)} yrs
                    </dd>
                  </div>
                  <div>
                    <dt>Fee</dt>
                    <dd>{formatFee(selectedDoctor.consultation_fee)}</dd>
                  </div>
                  <div>
                    <dt>Date</dt>
                    <dd>
                      {form.appointment_date
                        ? formatDayChip(form.appointment_date).day
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Time</dt>
                    <dd>
                      {form.appointment_time
                        ? formatTimeLabel(form.appointment_time)
                        : "Pick a slot"}
                    </dd>
                  </div>
                </dl>

                {selectedPatient ? (
                  <p className="book-summary-card__patient">
                    Patient: {selectedPatient.first_name}{" "}
                    {selectedPatient.last_name}
                  </p>
                ) : (
                  <p className="book-summary-card__patient is-muted">
                    Select a patient to continue
                  </p>
                )}
              </div>
            ) : (
              <div className="book-summary-card book-summary-card--empty">
                <p className="book-summary-card__eyebrow">Doctor profile</p>
                <h3>Select a doctor</h3>
                <p>
                  Browse available specialists for this date. Fee, experience,
                  and open hours come from the server.
                </p>
              </div>
            )}
          </aside>
        </div>

        {error ? (
          <p className="ui-alert-error book-modal__alert" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="book-modal__foot">
          <button
            type="button"
            className="ui-btn ui-btn-ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
            disabled={saving || !canBook}
          >
            {saving
              ? "Booking…"
              : selectedDoctor
                ? `Confirm · ${formatFee(selectedDoctor.consultation_fee)}`
                : "Confirm appointment"}
          </button>
        </footer>
      </form>
    </div>
  );
}
