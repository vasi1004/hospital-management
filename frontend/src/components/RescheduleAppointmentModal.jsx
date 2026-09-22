import { useEffect, useState } from "react";
import {
  listDoctorFreeSlotsRequest,
  rescheduleAppointmentRequest,
} from "@/services/hmsApi";

function formatTime(value) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Modal to shift an appointment to a new date/time using backend free slots.
 * Doctors keep the same doctor; front desk may pass allowDoctorChange + doctors list.
 */
export function RescheduleAppointmentModal({
  accessToken,
  appointment,
  onClose,
  onSuccess,
  allowDoctorChange = false,
  doctors = [],
}) {
  const [dateValue, setDateValue] = useState(
    appointment?.appointment_date || todayIso(),
  );
  const [doctorId, setDoctorId] = useState(
    String(appointment?.doctor_id || ""),
  );
  const [slots, setSlots] = useState([]);
  const [slotMeta, setSlotMeta] = useState(null);
  const [timeValue, setTimeValue] = useState("");
  const [notes, setNotes] = useState(appointment?.notes || "");
  const [error, setError] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accessToken || !doctorId || !dateValue) {
      setSlots([]);
      setSlotMeta(null);
      return;
    }
    let cancelled = false;
    async function loadSlots() {
      setLoadingSlots(true);
      setError(null);
      try {
        const data = await listDoctorFreeSlotsRequest(accessToken, doctorId, {
          date: dateValue,
          exclude_appointment_id: appointment?.id,
        });
        if (cancelled) return;
        setSlotMeta(data);
        const nextSlots = (data.slots || []).map((t) => formatTime(t));
        setSlots(nextSlots);
        setTimeValue((prev) => (nextSlots.includes(prev) ? prev : ""));
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
  }, [accessToken, doctorId, dateValue, appointment?.id]);

  if (!appointment) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!dateValue || !timeValue) {
      setError("Pick a date and an available time slot");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        appointment_date: dateValue,
        appointment_time: timeValue,
        notes: notes.trim() || null,
      };
      if (allowDoctorChange && doctorId) {
        payload.doctor_id = Number(doctorId);
      }
      const updated = await rescheduleAppointmentRequest(
        accessToken,
        appointment.id,
        payload,
      );
      onSuccess?.(updated);
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reschedule failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        className="ui-panel ui-panel-pad w-full max-w-md shadow-xl"
        onSubmit={handleSubmit}
      >
        <h2 className="ui-title text-base">Shift appointment</h2>
        <p className="ui-muted mt-1 text-sm">
          {appointment.appointment_code}
          {appointment.patient_name ? ` · ${appointment.patient_name}` : ""}
        </p>
        <p className="ui-muted mt-1 text-sm">
          Current: {appointment.appointment_date}{" "}
          {formatTime(appointment.appointment_time)}
        </p>

        <div className="mt-4 grid gap-3">
          {allowDoctorChange ? (
            <label className="ui-label">
              Doctor *
              <select
                className="ui-select"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                required
              >
                <option value="">Select doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.first_name} {d.last_name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm font-semibold">
              Doctor: {appointment.doctor_name || "You"}
            </p>
          )}

          <label className="ui-label">
            New date *
            <input
              type="date"
              className="ui-input"
              min={todayIso()}
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              required
            />
          </label>

          <label className="ui-label">
            Available time *
            <select
              className="ui-select"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              required
              disabled={loadingSlots || slots.length === 0}
            >
              <option value="">
                {loadingSlots
                  ? "Loading slots…"
                  : slots.length
                    ? "Select a free slot"
                    : "No free slots this day"}
              </option>
              {slots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>

          {slotMeta?.available_from && slotMeta?.available_to ? (
            <p className="ui-muted text-xs">
              Hours {formatTime(slotMeta.available_from)}–
              {formatTime(slotMeta.available_to)}
              {slotMeta.slot_minutes
                ? ` · ${slotMeta.slot_minutes}-min slots`
                : ""}
              {slotMeta.available_days
                ? ` · Days: ${slotMeta.available_days}`
                : ""}
            </p>
          ) : null}

          <label className="ui-label">
            Notes
            <input
              className="ui-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional note about the shift"
            />
          </label>
        </div>

        {error ? <p className="ui-alert-error mt-3">{error}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
            disabled={saving || !timeValue}
          >
            {saving ? "Saving…" : "Confirm shift"}
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
