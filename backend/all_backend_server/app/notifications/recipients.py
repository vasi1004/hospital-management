"""Resolve notification recipients across auth / schedule DBs."""

from __future__ import annotations

import logging
from typing import Any, Optional

logger = logging.getLogger("all_backend_server.email")


def resolve_auth_user_email(auth_user_id: Optional[int]) -> Optional[str]:
    """Look up login email from the auth DB by users.id. Never raises."""
    if auth_user_id is None:
        return None
    try:
        from app.auth.db import SessionLocal
        from app.auth.models.user import User

        db = SessionLocal()
        try:
            user = (
                db.query(User)
                .filter(User.id == int(auth_user_id), User.is_active.is_(True))
                .first()
            )
            if not user:
                return None
            email = (user.email or "").strip()
            return email or None
        finally:
            db.close()
    except Exception as exc:  # noqa: BLE001 — never break callers
        logger.warning("Auth email lookup failed for user_id=%s: %s", auth_user_id, exc)
        return None


def resolve_doctor_recipient_email(doctor: Any) -> Optional[str]:
    """
    Prefer linked login User.email (always set for accounts),
    then fall back to clinical Doctor.email.
    """
    auth_user_id = getattr(doctor, "auth_user_id", None)
    login_email = resolve_auth_user_email(auth_user_id)
    if login_email:
        return login_email
    profile_email = (getattr(doctor, "email", None) or "").strip()
    return profile_email or None
