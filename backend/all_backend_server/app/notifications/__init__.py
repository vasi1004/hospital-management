"""Transactional email notifications (Resend). Best-effort; never breaks API flows."""

from app.notifications.service import (
    appointment_email_payload,
    notify_appointment_booked,
    notify_user_created,
)

__all__ = [
    "appointment_email_payload",
    "notify_appointment_booked",
    "notify_user_created",
]
