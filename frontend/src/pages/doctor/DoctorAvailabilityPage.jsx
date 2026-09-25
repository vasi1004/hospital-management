import { useEffect, useId, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { useAppSelector } from "@/store/hooks";
import { DOCTOR_NAV } from "@/constants/nav";
import {
  clearMyDoctorAvailabilityRequest,
  fetchMyDoctorProfile,
  updateMyDoctorAvailabilityRequest,
} from "@/services/hmsApi";
import "./DoctorAvailabilityPage.css";

const WEEKDAYS = [
  { value: "Mon", short: "Mon", full: "Monday" },
  { value: "Tue", short: "Tue", full: "Tuesday" },
  { value: "Wed", short: "Wed", full: "Wednesday" },
  { value: "Thu", short: "Thu", full: "Thursday" },
  { value: "Fri", short: "Fri", full: "Friday" },
  { value: "Sat", short: "Sat", full: "Saturday" },
  { value: "Sun", short: "Sun", full: "Sunday" },
];

const WEEKDAY_VALUES = WEEKDAYS.slice(0, 5).map((d) => d.value);
const ALL_DAY_VALUES = WEEKDAYS.map((d) => d.value);
const MINUTE_OPTIONS = ["00", "15", "30", "45"];

function formatHourOption(hour) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12} ${suffix}`;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour).padStart(2, "0"),
  label: formatHourOption(hour),
}));

const HOUR_PRESETS = [
  { id: "standard", label: "9:00 – 5:00", from: "09:00", to: "17:00" },
  { id: "morning", label: "9:00 – 1:00", from: "09:00", to: "13:00" },
  { id: "extended", label: "10:00 – 6:00", from: "10:00", to: "18:00" },
  { id: "evening", label: "2:00 – 8:00", from: "14:00", to: "20:00" },
];

function formatTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function splitTime(value) {
  const raw = formatTime(value) || "09:00";
  const [hour = "09", minute = "00"] = raw.split(":");
  const snapped = MINUTE_OPTIONS.includes(minute) ? minute : "00";
  return { hour: hour.padStart(2, "0"), minute: snapped };
}

function joinTime(hour, minute) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeTime(value, fallback = "09:00") {
  const parts = splitTime(value || fallback);
  return joinTime(parts.hour, parts.minute);
}

function parseDays(raw) {
  if (!raw) return [];
  const allowed = new Set(ALL_DAY_VALUES);
  return String(raw)
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter((day) => allowed.has(day));
}

function formatTimeLabel(value) {
  const raw = formatTime(value);
  if (!raw) return "—";
  const [h, m] = raw.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return raw;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function minutesBetween(from, to) {
  const [fh, fm] = String(from || "")
    .split(":")
    .map(Number);
  const [th, tm] = String(to || "")
    .split(":")
    .map(Number);
  if ([fh, fm, th, tm].some((n) => Number.isNaN(n))) return null;
  return th * 60 + tm - (fh * 60 + fm);
}

function formatDuration(mins) {
  if (mins == null || mins <= 0) return null;
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${minutes} min`;
}

function TimeCard({
  tone,
  label,
  hint,
  value,
  disabled,
  hourId,
  minuteId,
  onChange,
}) {
  const { hour, minute } = splitTime(value);

  return (
    <div className={`doc-avail__clock doc-avail__clock--${tone}`}>
      <div className="doc-avail__clock-top">
        <p className="doc-avail__clock-label">{label}</p>
        <p className="doc-avail__clock-hint">{hint}</p>
      </div>
      <p className="doc-avail__clock-face" aria-hidden="true">
        {formatTimeLabel(value)}
      </p>
      <div className="doc-avail__clock-controls">
        <label className="doc-avail__clock-select" htmlFor={hourId}>
          <span>Hour</span>
          <select
            id={hourId}
            value={hour}
            disabled={disabled}
            onChange={(event) => onChange(joinTime(event.target.value, minute))}
          >
            {HOUR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <span className="doc-avail__clock-colon" aria-hidden="true">
          :
        </span>
        <label className="doc-avail__clock-select" htmlFor={minuteId}>
          <span>Min</span>
          <select
            id={minuteId}
            value={minute}
            disabled={disabled}
            onChange={(event) => onChange(joinTime(hour, event.target.value))}
          >
            {MINUTE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

export function DoctorAvailabilityPage() {
  const { user, accessToken } = useAppSelector((state) => state.auth);
  const fromHourId = useId();
  const fromMinuteId = useId();
  const toHourId = useId();
  const toMinuteId = useId();

  const [profile, setProfile] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);
  const [availableFrom, setAvailableFrom] = useState("09:00");
  const [availableTo, setAvailableTo] = useState("17:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyDoctorProfile(accessToken);
      setProfile(data);
      setSelectedDays(parseDays(data?.available_days));
      setAvailableFrom(normalizeTime(data?.available_from, "09:00"));
      setAvailableTo(normalizeTime(data?.available_to, "17:00"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load your profile.",
      );
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [accessToken]);

  const hasSchedule = useMemo(() => {
    return Boolean(
      profile?.available_days &&
        profile?.available_from != null &&
        profile?.available_to != null,
    );
  }, [profile]);

  const durationMins = useMemo(
    () => minutesBetween(availableFrom, availableTo),
    [availableFrom, availableTo],
  );
  const durationLabel = useMemo(
    () => formatDuration(durationMins),
    [durationMins],
  );

  const rangePercent = useMemo(() => {
    if (durationMins == null || durationMins <= 0) {
      return { start: 0, width: 0 };
    }
    const dayMinutes = 24 * 60;
    const [fh, fm] = availableFrom.split(":").map(Number);
    const start = ((fh * 60 + fm) / dayMinutes) * 100;
    const width = (durationMins / dayMinutes) * 100;
    return {
      start: Math.max(0, Math.min(100, start)),
      width: Math.max(2, Math.min(100 - start, width)),
    };
  }, [availableFrom, durationMins]);

  const previewDays = useMemo(() => {
    const set = new Set(selectedDays);
    return WEEKDAYS.filter((d) => set.has(d.value)).map((d) => d.full);
  }, [selectedDays]);

  const canSave =
    !saving &&
    selectedDays.length > 0 &&
    Boolean(availableFrom) &&
    Boolean(availableTo) &&
    availableFrom < availableTo;

  if (!user) return <Navigate to="/login" replace />;

  function clearMessages() {
    setSuccess(null);
    setError(null);
  }

  function toggleDay(day) {
    clearMessages();
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function applyPreset(values) {
    clearMessages();
    setSelectedDays(values);
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!accessToken) return;
    if (selectedDays.length === 0) {
      setError("Select at least one working day.");
      return;
    }
    if (!availableFrom || !availableTo) {
      setError("Set both start and end times.");
      return;
    }
    if (availableFrom >= availableTo) {
      setError("Start time must be earlier than end time.");
      return;
    }

    setSaving(true);
    clearMessages();
    try {
      const updated = await updateMyDoctorAvailabilityRequest(accessToken, {
        available_days: selectedDays.join(","),
        available_from: availableFrom,
        available_to: availableTo,
      });
      setProfile(updated);
      setSelectedDays(parseDays(updated.available_days));
      setAvailableFrom(normalizeTime(updated.available_from, "09:00"));
      setAvailableTo(normalizeTime(updated.available_to, "17:00"));
      setSuccess(
        "Availability published. Admin and reception can book you in this window.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save availability.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    if (!accessToken || !hasSchedule) return;
    const confirmed = window.confirm(
      "Clear your availability?\n\nAdmin and reception will not be able to book you until you set it again.",
    );
    if (!confirmed) return;

    setSaving(true);
    clearMessages();
    try {
      const updated = await clearMyDoctorAvailabilityRequest(accessToken);
      setProfile(updated);
      setSelectedDays([]);
      setAvailableFrom("09:00");
      setAvailableTo("17:00");
      setSuccess(
        "Availability cleared. You are not bookable until you publish new hours.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to clear availability.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleLayout
      user={user}
      subtitle="Doctor workspace"
      navItems={DOCTOR_NAV}
      title="Availability"
    >
      <div className="doc-avail">
        <header className="doc-avail__hero">
          <div className="doc-avail__hero-copy">
            <p className="screen-kicker">Clinic hours</p>
            <h2 className="ui-title doc-avail__title">Your booking window</h2>
            <p className="ui-muted doc-avail__lead">
              Choose the days and hours patients can be booked with you. Only
              you control this — admin and reception use it when assigning
              appointments.
            </p>
          </div>
          <div
            className={`doc-avail__status${
              hasSchedule ? " is-live" : " is-idle"
            }`}
            aria-live="polite"
          >
            <span className="doc-avail__status-dot" aria-hidden="true" />
            <div>
              <p className="doc-avail__status-label">Booking status</p>
              <p className="doc-avail__status-value">
                {loading ? "Checking…" : hasSchedule ? "Live · Bookable" : "Not published"}
              </p>
              {!loading && hasSchedule && profile ? (
                <p className="doc-avail__status-meta">
                  {profile.available_days} ·{" "}
                  {formatTimeLabel(profile.available_from)}–
                  {formatTimeLabel(profile.available_to)}
                </p>
              ) : (
                <p className="doc-avail__status-meta">
                  Publish hours to appear in booking.
                </p>
              )}
            </div>
          </div>
        </header>

        {loading ? (
          <section className="doc-avail__board doc-avail__board--loading">
            <p className="ui-muted">Loading your schedule from the server…</p>
          </section>
        ) : (
          <form className="doc-avail__board" onSubmit={handleSave} noValidate>
            <section className="doc-avail__main" aria-labelledby="days-heading">
              <div className="doc-avail__section-head">
                <div>
                  <p className="doc-avail__step">Step 1</p>
                  <h3 id="days-heading" className="ui-title text-base">
                    Working days
                  </h3>
                  <p className="ui-muted text-sm mt-1">
                    Tap days you accept appointments. Selected days use the same
                    clinic hours below.
                  </p>
                </div>
                <div className="doc-avail__presets" role="group" aria-label="Day presets">
                  <button
                    type="button"
                    className="doc-avail__chip"
                    disabled={saving}
                    onClick={() => applyPreset(WEEKDAY_VALUES)}
                  >
                    Weekdays
                  </button>
                  <button
                    type="button"
                    className="doc-avail__chip"
                    disabled={saving}
                    onClick={() => applyPreset(ALL_DAY_VALUES)}
                  >
                    All week
                  </button>
                  <button
                    type="button"
                    className="doc-avail__chip"
                    disabled={saving || selectedDays.length === 0}
                    onClick={() => applyPreset([])}
                  >
                    Clear days
                  </button>
                </div>
              </div>

              <div className="doc-avail__week" role="group" aria-label="Working days">
                {WEEKDAYS.map((day) => {
                  const active = selectedDays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      className={`doc-avail__day${active ? " is-active" : ""}`}
                      aria-pressed={active}
                      disabled={saving}
                      onClick={() => toggleDay(day.value)}
                    >
                      <span className="doc-avail__day-short">{day.short}</span>
                      <span className="doc-avail__day-full">{day.full}</span>
                      <span className="doc-avail__day-state">
                        {active ? "On" : "Off"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="doc-avail__hours" aria-labelledby="hours-heading">
                <div className="doc-avail__section-head doc-avail__section-head--tight">
                  <div>
                    <p className="doc-avail__step">Step 2</p>
                    <h3 id="hours-heading" className="ui-title text-base">
                      Clinic hours
                    </h3>
                    <p className="ui-muted text-sm mt-1">
                      Set when your clinic opens and closes each selected day.
                    </p>
                  </div>
                  {durationLabel ? (
                    <span className="doc-avail__duration">{durationLabel} / day</span>
                  ) : (
                    <span className="doc-avail__duration is-warn">
                      End must be after start
                    </span>
                  )}
                </div>

                <div
                  className="doc-avail__hour-presets"
                  role="group"
                  aria-label="Common clinic hours"
                >
                  {HOUR_PRESETS.map((preset) => {
                    const active =
                      availableFrom === preset.from &&
                      availableTo === preset.to;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        className={`doc-avail__hour-preset${
                          active ? " is-active" : ""
                        }`}
                        disabled={saving}
                        onClick={() => {
                          clearMessages();
                          setAvailableFrom(preset.from);
                          setAvailableTo(preset.to);
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                <div className="doc-avail__time-row">
                  <TimeCard
                    tone="open"
                    label="Opens"
                    hint="Start of day"
                    value={availableFrom}
                    disabled={saving}
                    hourId={fromHourId}
                    minuteId={fromMinuteId}
                    onChange={(next) => {
                      clearMessages();
                      setAvailableFrom(next);
                    }}
                  />
                  <div className="doc-avail__time-bridge" aria-hidden="true">
                    <span className="doc-avail__time-bridge-line" />
                    <span className="doc-avail__time-bridge-badge">to</span>
                    <span className="doc-avail__time-bridge-line" />
                  </div>
                  <TimeCard
                    tone="close"
                    label="Closes"
                    hint="End of day"
                    value={availableTo}
                    disabled={saving}
                    hourId={toHourId}
                    minuteId={toMinuteId}
                    onChange={(next) => {
                      clearMessages();
                      setAvailableTo(next);
                    }}
                  />
                </div>

                <div className="doc-avail__timeline" aria-hidden="true">
                  <div className="doc-avail__timeline-track">
                    <div
                      className="doc-avail__timeline-fill"
                      style={{
                        left: `${rangePercent.start}%`,
                        width: `${rangePercent.width}%`,
                      }}
                    />
                  </div>
                  <div className="doc-avail__timeline-labels">
                    <span>12 AM</span>
                    <span>6 AM</span>
                    <span>12 PM</span>
                    <span>6 PM</span>
                    <span>12 AM</span>
                  </div>
                </div>
              </div>
            </section>

            <aside className="doc-avail__aside" aria-label="Preview and actions">
              <div className="doc-avail__preview">
                <p className="doc-avail__step">Preview</p>
                <h3 className="ui-title text-base">What will be published</h3>
                {selectedDays.length === 0 ? (
                  <p className="doc-avail__preview-empty">
                    No days selected yet. Pick at least one working day.
                  </p>
                ) : (
                  <ul className="doc-avail__preview-list">
                    {previewDays.map((name) => (
                      <li key={name}>
                        <strong>{name}</strong>
                        <span>
                          {formatTimeLabel(availableFrom)} –{" "}
                          {formatTimeLabel(availableTo)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="doc-avail__preview-note">
                  Slots are generated from these hours when admin or reception
                  books you.
                </p>
              </div>

              {error ? (
                <p className="ui-alert-error" role="alert">
                  {error}
                </p>
              ) : null}
              {success ? (
                <p className="ui-alert-success" role="status">
                  {success}
                </p>
              ) : null}

              <div className="doc-avail__actions">
                <button
                  type="submit"
                  className="ui-btn ui-btn-primary doc-avail__save"
                  disabled={!canSave}
                >
                  {saving ? "Publishing…" : "Publish availability"}
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-ghost"
                  onClick={handleClear}
                  disabled={saving || !hasSchedule}
                >
                  Clear published hours
                </button>
              </div>
            </aside>
          </form>
        )}
      </div>
    </RoleLayout>
  );
}
