"""Doctor availability windows, free slots, and booking conflict checks."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Iterable, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.schedule.models.clinical import Appointment, Doctor

# Matches admin DoctorsPage storage: Mon,Tue,Wed,...
_DAY_ALIASES: dict[str, str] = {
    "mon": "Mon",
    "monday": "Mon",
    "tue": "Tue",
    "tues": "Tue",
    "tuesday": "Tue",
    "wed": "Wed",
    "wednesday": "Wed",
    "thu": "Thu",
    "thur": "Thu",
    "thurs": "Thu",
    "thursday": "Thu",
    "fri": "Fri",
    "friday": "Fri",
    "sat": "Sat",
    "saturday": "Sat",
    "sun": "Sun",
    "sunday": "Sun",
}

_WEEKDAY_TO_SHORT = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")

# Statuses that still occupy a slot.
ACTIVE_BOOKING_STATUSES = (
    "scheduled",
    "confirmed",
    "in_progress",
)


def weekday_short(day: date) -> str:
    return _WEEKDAY_TO_SHORT[day.weekday()]


def parse_available_days(raw: Optional[str]) -> set[str]:
    if not raw or not str(raw).strip():
        return set()
    days: set[str] = set()
    for part in str(raw).replace(";", ",").split(","):
        token = part.strip().lower()
        if not token:
            continue
        mapped = _DAY_ALIASES.get(token)
        if mapped:
            days.add(mapped)
    return days


def slot_minutes() -> int:
    minutes = int(get_settings().appointment_slot_minutes)
    return max(5, min(minutes, 120))


def doctor_works_on(doctor: Doctor, day: date) -> bool:
    days = parse_available_days(doctor.available_days)
    if not days:
        # No schedule configured → treat as unavailable for booking.
        return False
    return weekday_short(day) in days


def time_in_window(doctor: Doctor, when: time) -> bool:
    start = doctor.available_from
    end = doctor.available_to
    if start is None or end is None:
        return False
    if start > end:
        # Overnight windows are not supported in this product.
        return False
    return start <= when < end


def generate_slot_times(doctor: Doctor) -> list[time]:
    start = doctor.available_from
    end = doctor.available_to
    if start is None or end is None or start >= end:
        return []
    step = timedelta(minutes=slot_minutes())
    cursor = datetime.combine(date.today(), start)
    limit = datetime.combine(date.today(), end)
    slots: list[time] = []
    while cursor < limit:
        slots.append(cursor.time().replace(second=0, microsecond=0))
        cursor += step
    return slots


def booked_times_for_doctor(
    db: Session,
    doctor_id: int,
    day: date,
    *,
    exclude_appointment_id: Optional[int] = None,
) -> set[time]:
    query = db.query(Appointment.appointment_time).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date == day,
        Appointment.status.in_(ACTIVE_BOOKING_STATUSES),
    )
    if exclude_appointment_id is not None:
        query = query.filter(Appointment.id != exclude_appointment_id)
    booked: set[time] = set()
    for (slot,) in query.all():
        if slot is None:
            continue
        booked.add(slot.replace(second=0, microsecond=0))
    return booked


def free_slots_for_doctor(
    db: Session,
    doctor: Doctor,
    day: date,
    *,
    exclude_appointment_id: Optional[int] = None,
) -> list[time]:
    if not doctor.is_active or not doctor_works_on(doctor, day):
        return []
    booked = booked_times_for_doctor(
        db,
        doctor.id,
        day,
        exclude_appointment_id=exclude_appointment_id,
    )
    today = date.today()
    now = datetime.now().time().replace(second=0, microsecond=0)
    free: list[time] = []
    for slot in generate_slot_times(doctor):
        if slot in booked:
            continue
        if day < today:
            continue
        if day == today and slot <= now:
            continue
        free.append(slot)
    return free


def assert_slot_bookable(
    db: Session,
    doctor: Doctor,
    day: date,
    when: time,
    *,
    exclude_appointment_id: Optional[int] = None,
) -> None:
    if not doctor.is_active:
        raise HTTPException(status_code=400, detail="Doctor is not active")
    if day < date.today():
        raise HTTPException(
            status_code=400,
            detail="Appointment date cannot be in the past",
        )
    if not doctor.available_days or doctor.available_from is None or doctor.available_to is None:
        raise HTTPException(
            status_code=400,
            detail="Doctor has no availability schedule configured",
        )
    if not doctor_works_on(doctor, day):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Doctor is not available on {weekday_short(day)}. "
                f"Available days: {doctor.available_days}"
            ),
        )
    when_norm = when.replace(second=0, microsecond=0)
    if not time_in_window(doctor, when_norm):
        start = doctor.available_from.strftime("%H:%M")
        end = doctor.available_to.strftime("%H:%M")
        raise HTTPException(
            status_code=400,
            detail=f"Time must be within doctor hours ({start}–{end})",
        )
    allowed = set(generate_slot_times(doctor))
    if when_norm not in allowed:
        minutes = slot_minutes()
        raise HTTPException(
            status_code=400,
            detail=f"Time must align to a {minutes}-minute slot within doctor hours",
        )
    if day == date.today():
        now = datetime.now().time().replace(second=0, microsecond=0)
        if when_norm <= now:
            raise HTTPException(
                status_code=400,
                detail="Appointment time must be in the future",
            )
    conflict = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor.id,
            Appointment.appointment_date == day,
            Appointment.appointment_time == when_norm,
            Appointment.status.in_(ACTIVE_BOOKING_STATUSES),
        )
    )
    if exclude_appointment_id is not None:
        conflict = conflict.filter(Appointment.id != exclude_appointment_id)
    if conflict.first():
        raise HTTPException(
            status_code=409,
            detail="This doctor already has an appointment at that date and time",
        )


def doctors_available_on(
    doctors: Iterable[Doctor],
    day: date,
) -> list[Doctor]:
    return [
        doc
        for doc in doctors
        if doc.is_active and doctor_works_on(doc, day)
    ]
