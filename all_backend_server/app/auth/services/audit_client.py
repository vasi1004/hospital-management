"""In-process audit emitter (same process as audit DB — no HTTP hop)."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from app.core.config import get_settings

logger = logging.getLogger("all_backend.audit")


def _public_user_snapshot(user: Any) -> dict[str, Any]:
    return {
        "id": getattr(user, "id", None),
        "username": getattr(user, "username", None),
        "email": getattr(user, "email", None),
        "full_name": getattr(user, "full_name", None),
        "role": getattr(user, "role", None),
        "is_active": getattr(user, "is_active", None),
        "created_at": str(getattr(user, "created_at", None) or ""),
        "updated_at": str(getattr(user, "updated_at", None) or ""),
    }


def changed_snapshot(before: dict[str, Any], after: dict[str, Any]) -> tuple[dict, dict]:
    """Return only keys whose values changed."""
    keys = set(before) | set(after)
    before_out: dict[str, Any] = {}
    after_out: dict[str, Any] = {}
    for key in keys:
        if before.get(key) != after.get(key):
            before_out[key] = before.get(key)
            after_out[key] = after.get(key)
    return before_out, after_out


def snapshot_user(user: Any) -> dict[str, Any]:
    return _public_user_snapshot(user)


def emit_audit_event(
    *,
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str | int] = None,
    actor: Any = None,
    before_data: Optional[dict[str, Any]] = None,
    after_data: Optional[dict[str, Any]] = None,
    summary: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
    service: str = "auth",
) -> None:
    """Best-effort write to audit DB; never raises into the business flow."""
    settings = get_settings()
    if not settings.audit_emit_enabled:
        return

    try:
        from app.audit.db import SessionLocal
        from app.audit.models.audit import AuditEvent

        db = SessionLocal()
        try:
            row = AuditEvent(
                event_id=str(uuid4()),
                occurred_at=datetime.now(timezone.utc),
                service=service.strip().lower(),
                action=action.strip(),
                entity_type=entity_type,
                entity_id=str(entity_id) if entity_id is not None else None,
                actor_user_id=getattr(actor, "id", None) if actor is not None else None,
                actor_username=getattr(actor, "username", None) if actor is not None else None,
                actor_role=getattr(actor, "role", None) if actor is not None else None,
                actor_email=getattr(actor, "email", None) if actor is not None else None,
                ip_address=ip_address,
                user_agent=user_agent,
                summary=summary,
                before_data=before_data,
                after_data=after_data,
                metadata_json=metadata,
            )
            db.add(row)
            db.commit()
        finally:
            db.close()
    except Exception as exc:  # noqa: BLE001 — never break auth flows
        logger.warning("Audit emit error: %s", exc)
