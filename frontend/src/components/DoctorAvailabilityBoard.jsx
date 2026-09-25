import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDoctorAvailabilityOverview } from "@/services/hmsApi";
import "./DoctorAvailabilityBoard.css";

function formatTime(value) {
  if (!value) return "—";
  const raw = String(value).slice(0, 5);
  const [h, m] = raw.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return raw;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatDateLabel(isoDate) {
  if (!isoDate) return "";
  try {
    const date = new Date(`${isoDate}T00:00:00`);
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return isoDate;
  }
}

/**
 * Shared Admin/Reception board: doctors available today + upcoming week.
 * Data comes only from GET /dashboard/doctor-availability.
 */
export function DoctorAvailabilityBoard({
  accessToken,
  days = 7,
  bookAppointmentsPath = null,
  compact = false,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const overview = await fetchDoctorAvailabilityOverview(accessToken, {
        days,
      });
      setData(overview);
      const todayRow = (overview?.days || []).find((row) => row.is_today);
      setSelectedDate(
        todayRow?.date || overview?.days?.[0]?.date || null,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load doctor availability.",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [accessToken, days]);

  const selectedDay = useMemo(() => {
    if (!data?.days?.length) return null;
    return (
      data.days.find((row) => row.date === selectedDate) || data.days[0]
    );
  }, [data, selectedDate]);

  const summary = data?.summary;

  return (
    <section
      className={`doc-avail-board${compact ? " doc-avail-board--compact" : ""}`}
    >
      <div className="doc-avail-board__head">
        <div>
          <p className="screen-kicker">Live coverage</p>
          <h3 className="ui-title text-base">Doctor availability</h3>
          <p className="ui-muted mt-1 text-sm">
            Today and the next {Math.max(0, days - 1)} days — from doctors who
            published their hours
            {data?.slot_minutes
              ? ` · ${data.slot_minutes}-min slots`
              : ""}
            .
          </p>
        </div>
        <div className="doc-avail-board__head-actions">
          <button
            type="button"
            className="ui-btn ui-btn-ghost"
            onClick={load}
            disabled={loading}
          >
            Refresh
          </button>
          {bookAppointmentsPath ? (
            <Link className="ui-btn ui-btn-primary" to={bookAppointmentsPath}>
              Book appointment
            </Link>
          ) : null}
        </div>
      </div>

      <div className="doc-avail-board__summary">
        <div className="doc-avail-board__stat">
          <span>Today doctors</span>
          <strong>{loading ? "…" : summary?.today_available_doctors ?? 0}</strong>
        </div>
        <div className="doc-avail-board__stat">
          <span>Today free slots</span>
          <strong>{loading ? "…" : summary?.today_free_slots ?? 0}</strong>
        </div>
        <div className="doc-avail-board__stat">
          <span>Week doctors</span>
          <strong>{loading ? "…" : summary?.week_unique_doctors ?? 0}</strong>
        </div>
        <div className="doc-avail-board__stat">
          <span>Week free slots</span>
          <strong>{loading ? "…" : summary?.week_free_slots ?? 0}</strong>
        </div>
      </div>

      {error ? (
        <p className="ui-alert-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="doc-avail-board__days" role="tablist" aria-label="Days">
        {(data?.days || []).map((day) => {
          const active = selectedDay?.date === day.date;
          return (
            <button
              key={day.date}
              type="button"
              role="tab"
              aria-selected={active}
              className={`doc-avail-board__day${active ? " is-active" : ""}${
                day.is_today ? " is-today" : ""
              }`}
              disabled={loading}
              onClick={() => setSelectedDate(day.date)}
            >
              <span className="doc-avail-board__day-label">{day.label}</span>
              <span className="doc-avail-board__day-date">
                {formatDateLabel(day.date)}
              </span>
              <span className="doc-avail-board__day-count">
                {day.available_doctor_count} doctor
                {day.available_doctor_count === 1 ? "" : "s"}
              </span>
            </button>
          );
        })}
        {loading && !data ? (
          <p className="ui-muted doc-avail-board__loading">Loading week…</p>
        ) : null}
      </div>

      <div className="doc-avail-board__list-wrap">
        {!loading && selectedDay && selectedDay.doctors.length === 0 ? (
          <p className="ui-muted doc-avail-board__empty">
            No doctors have free slots on {selectedDay.label.toLowerCase()}.
            They must publish availability first.
          </p>
        ) : null}
        <ul className="doc-avail-board__list">
          {(selectedDay?.doctors || []).map((doc) => (
            <li key={`${selectedDay.date}-${doc.id}`}>
              <div>
                <strong>
                  Dr. {doc.first_name} {doc.last_name}
                </strong>
                <p>
                  {doc.specialization}
                  {doc.department_name ? ` · ${doc.department_name}` : ""}
                </p>
              </div>
              <div className="doc-avail-board__meta">
                <span>
                  {formatTime(doc.available_from)}–{formatTime(doc.available_to)}
                </span>
                <span className="ui-badge ui-badge-ok">
                  {doc.free_slot_count} free
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
