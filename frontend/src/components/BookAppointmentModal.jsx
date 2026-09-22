import { useEffect, useState } from "react";
import {
  createAppointmentRequest,
  listAvailableDoctorsRequest,
  listDoctorFreeSlotsRequest,
} from "@/services/hmsApi";
import "./BookAppointmentModal.css";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(value) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

const EMPTY = {
  patient_id: "",
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
 * Popup to book a new appointment from live doctor availability + free slots.
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

  useEffect(() => {
    if (!accessToken || !form.appointment_date) {
      setAvailableDoctors([]);
      setAvailabilityMeta(null);
      return;
    }
    let cancelled = false;
    async function loadAvailability() {
      setLoadingAvailability(true);
      try {
        const data = await listAvailableDoctorsRequest(accessToken, {
          date: form.appointment_date,
        });
        if (cancelled) return;
        setAvailabilityMeta(data);
        const docs = data.doctors || [];
        setAvailableDoctors(docs);
        setForm((prev) => {
          if (
            prev.doctor_id &&
            docs.some((d) => String(d.id) === String(prev.doctor_id))
          ) {
            return prev;
          }
          return { ...prev, doctor_id: "", appointment_time: "" };
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

  function update(name, value) {
    setError(null);
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "appointment_date") {
        next.doctor_id = "";
        next.appointment_time = "";
      }
      if (name === "doctor_id") {
        next.appointment_time = "";
      }
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (
      !form.patient_id ||
      !form.doctor_id ||
      !form.appointment_time ||
      !form.reason.trim()
    ) {
      setError("Patient, available doctor, time slot, and reason are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
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
      });
      onSuccess?.(created);
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  const selectedDoctor = availableDoctors.find(
    (d) => String(d.id) === String(form.doctor_id),
  );

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
            <p className="screen-kicker">Book</p>
            <h2 id="book-modal-title" className="ui-title text-base">
              Schedule appointment
            </h2>
            <p className="ui-muted mt-1 text-sm">
              Pick a date, then only doctors free that day appear. Time slots
              come from each doctor&apos;s availability.
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

        <div className="book-modal__body">
          <label className="ui-label">
            Date *
            <input
              type="date"
              className="ui-input"
              min={todayIso()}
              value={form.appointment_date}
              onChange={(e) => update("appointment_date", e.target.value)}
              required
            />
          </label>

          <label className="ui-label">
            Available doctor *
            <select
              className="ui-select"
              value={form.doctor_id}
              onChange={(e) => update("doctor_id", e.target.value)}
              required
              disabled={loadingAvailability}
            >
              <option value="">
                {loadingAvailability
                  ? "Checking availability…"
                  : availableDoctors.length
                    ? "Select available doctor"
                    : "No doctors available this day"}
              </option>
              {availableDoctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.first_name} {d.last_name} · {d.specialization}
                  {d.department_name ? ` · ${d.department_name}` : ""}
                  {` · ${d.free_slot_count} slot(s)`}
                </option>
              ))}
            </select>
          </label>

          {availabilityMeta ? (
            <p className="apts-hint">
              {availabilityMeta.weekday} · {availabilityMeta.slot_minutes}-min
              slots · {availableDoctors.length} doctor(s) with openings
            </p>
          ) : null}

          {selectedDoctor ? (
            <p className="apts-hint">
              Hours {formatTime(selectedDoctor.available_from)}–
              {formatTime(selectedDoctor.available_to)}
              {selectedDoctor.available_days
                ? ` · Days: ${selectedDoctor.available_days}`
                : ""}
            </p>
          ) : null}

          <label className="ui-label">
            Free time slot *
            <select
              className="ui-select"
              value={form.appointment_time}
              onChange={(e) => update("appointment_time", e.target.value)}
              required
              disabled={!form.doctor_id || loadingSlots || slots.length === 0}
            >
              <option value="">
                {!form.doctor_id
                  ? "Select a doctor first"
                  : loadingSlots
                    ? "Loading slots…"
                    : slots.length
                      ? "Select a free slot"
                      : "No free slots left"}
              </option>
              {slots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>

          {slotMeta?.slot_minutes ? (
            <p className="apts-hint">
              Slot length from server: {slotMeta.slot_minutes} minutes
            </p>
          ) : null}

          <label className="ui-label">
            Patient *
            <select
              className="ui-select"
              value={form.patient_id}
              onChange={(e) => update("patient_id", e.target.value)}
              required
            >
              <option value="">Select patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.patient_code})
                </option>
              ))}
            </select>
          </label>

          <label className="ui-label">
            Reason *
            <input
              className="ui-input"
              value={form.reason}
              onChange={(e) => update("reason", e.target.value)}
              required
            />
          </label>

          <label className="ui-label">
            Notes
            <input
              className="ui-input"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </label>
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
            disabled={saving || !form.appointment_time}
          >
            {saving ? "Booking…" : "Book appointment"}
          </button>
        </footer>
      </form>
    </div>
  );
}
