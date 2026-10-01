"""Best-effort notification emitters. Safe to call from BackgroundTasks (primitives only)."""

from __future__ import annotations

import logging
from datetime import date, time
from decimal import Decimal
from typing import Any, Mapping, Optional

from app.core.config import get_settings
from app.core.roles import ROLE_LABELS
from app.notifications.client import send_email
from app.notifications.recipients import resolve_doctor_recipient_email
from app.notifications.templates import (
    build_appointment_booked_email,
    build_user_created_email,
)

logger = logging.getLogger("all_backend_server.email")


def _format_date(value: Any) -> str:
    if isinstance(value, date):
        return value.strftime("%d %b %Y")
    return str(value) if value is not None else ""


def _format_time(value: Any) -> str:
    if isinstance(value, time):
        return value.strftime("%I:%M %p").lstrip("0")
    return str(value) if value is not None else ""


def _format_fee(value: Any) -> str:
    if value is None:
        return ""
    try:
        return f"{Decimal(str(value)):.2f}"
    except Exception:  # noqa: BLE001
        return str(value)


def _booked_by_label(booked_by: Optional[Mapping[str, Any]]) -> Optional[str]:
    if not booked_by:
        return None
    name = (booked_by.get("full_name") or booked_by.get("username") or "").strip()
    role_raw = (booked_by.get("role") or "").strip().lower()
    role = ROLE_LABELS.get(role_raw, role_raw.replace("_", " ").title() if role_raw else "")
    if name and role:
        return f"{name} ({role})"
    return name or role or None


def appointment_email_payload(
    *,
    doctor: Any,
    appointment: Any,
    patient: Any = None,
    booked_by: Optional[Mapping[str, Any]] = None,
) -> Optional[dict[str, Any]]:
    """
    Build a JSON-serializable payload while the DB session is still open.
    Returns None when the doctor has no resolvable email.
    """
    to_email = resolve_doctor_recipient_email(doctor)
    if not to_email:
        logger.warning(
            "Appointment email skipped: no doctor recipient email "
            "(doctor_id=%s auth_user_id=%s)",
            getattr(doctor, "id", None),
            getattr(doctor, "auth_user_id", None),
        )
        return None

    patient_obj = patient or getattr(appointment, "patient", None)
    doctor_first = (getattr(doctor, "first_name", None) or "").strip()
    doctor_last = (getattr(doctor, "last_name", None) or "").strip()
    doctor_name = f"{doctor_first} {doctor_last}".strip() or "Doctor"

    patient_name = ""
    patient_code = ""
    if patient_obj is not None:
        patient_name = (
            f"{getattr(patient_obj, 'first_name', '')} "
            f"{getattr(patient_obj, 'last_name', '')}"
        ).strip()
        patient_code = getattr(patient_obj, "patient_code", None) or ""

    department_name = None
    dept = getattr(doctor, "department", None)
    if dept is not None:
        department_name = getattr(dept, "name", None)
    if not department_name and getattr(appointment, "department", None) is not None:
        department_name = getattr(appointment.department, "name", None)

    return {
        "to_email": to_email,
        "doctor_name": doctor_name,
        "details": {
            "appointment_code": getattr(appointment, "appointment_code", None),
            "appointment_date": _format_date(getattr(appointment, "appointment_date", None)),
            "appointment_time": _format_time(getattr(appointment, "appointment_time", None)),
            "patient_name": patient_name,
            "patient_code": patient_code,
            "department_name": department_name,
            "specialty": getattr(doctor, "specialization", None),
            "appointment_type": getattr(appointment, "appointment_type", None),
            "priority": getattr(appointment, "priority", None),
            "status": getattr(appointment, "status", None),
            "reason": getattr(appointment, "reason", None),
            "consultation_fee": _format_fee(getattr(appointment, "consultation_fee", None)),
            "notes": getattr(appointment, "notes", None),
            "booked_by": _booked_by_label(booked_by),
            "appointment_id": getattr(appointment, "id", None),
        },
    }


def notify_user_created(
    *,
    to_email: str,
    username: str,
    role: str,
    full_name: Optional[str] = None,
    specialty: Optional[str] = None,
) -> None:
    """Send welcome / account-created email. Never raises into the API."""
    try:
        settings = get_settings()
        subject, html_body, text_body = build_user_created_email(
            settings=settings,
            full_name=full_name,
            username=username,
            role=role,
            email=to_email,
            specialty=specialty,
        )
        send_email(to=to_email, subject=subject, html=html_body, text=text_body)
    except Exception as exc:  # noqa: BLE001 — never break user create
        logger.warning("User-created email failed for %s: %s", to_email, exc)


def notify_appointment_booked(
    *,
    to_email: str,
    doctor_name: str,
    details: Mapping[str, Any],
) -> None:
    """Send appointment-booked email from a primitive payload. Never raises."""
    try:
        settings = get_settings()
        subject, html_body, text_body = build_appointment_booked_email(
            settings=settings,
            doctor_name=doctor_name,
            details=details,
        )
        send_email(to=to_email, subject=subject, html=html_body, text=text_body)
    except Exception as exc:  # noqa: BLE001 — never break appointment create
        logger.warning(
            "Appointment email failed (appointment_id=%s): %s",
            details.get("appointment_id"),
            exc,
        )
