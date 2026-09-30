from datetime import datetime, timezone
from math import ceil
from typing import Annotated, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_

from app.audit.deps import DbSession, IngestAuth, TokenUser, require_roles
from app.audit.models.audit import AuditEvent
from app.audit.schemas.audit import (
    AuditEventCreate,
    AuditEventListResponse,
    AuditEventPublic,
    MessageResponse,
)

AdminOnly = Annotated[TokenUser, Depends(require_roles("admin"))]

router = APIRouter(prefix="/audit", tags=["audit"])


def _to_public(row: AuditEvent) -> AuditEventPublic:
    return AuditEventPublic.model_validate(row)


@router.post(
    "/events",
    response_model=MessageResponse,
    status_code=201,
    summary="Ingest an audit event (trusted services only)",
)
def create_audit_event(
    payload: AuditEventCreate,
    db: DbSession,
    _: IngestAuth,
) -> MessageResponse:
    event_id = str(uuid4())
    row = AuditEvent(
        event_id=event_id,
        occurred_at=payload.occurred_at or datetime.now(timezone.utc),
        service=payload.service.strip().lower(),
        action=payload.action.strip(),
        entity_type=payload.entity_type,
        entity_id=str(payload.entity_id) if payload.entity_id is not None else None,
        actor_user_id=payload.actor_user_id,
        actor_username=payload.actor_username,
        actor_role=payload.actor_role,
        actor_email=payload.actor_email,
        ip_address=payload.ip_address,
        user_agent=payload.user_agent,
        summary=payload.summary,
        before_data=payload.before_data,
        after_data=payload.after_data,
        metadata_json=payload.metadata,
    )
    db.add(row)
    db.commit()
    return MessageResponse(message="Audit event recorded", event_id=event_id)


@router.get(
    "/events",
    response_model=AuditEventListResponse,
    summary="List audit events (admin only)",
)
def list_audit_events(
    db: DbSession,
    _: AdminOnly,
    search: Optional[str] = None,
    service: Optional[str] = None,
    action: Optional[str] = None,
    actor: Optional[str] = None,
    entity_type: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
) -> AuditEventListResponse:
    query = db.query(AuditEvent)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                AuditEvent.summary.ilike(term),
                AuditEvent.actor_username.ilike(term),
                AuditEvent.actor_email.ilike(term),
                AuditEvent.action.ilike(term),
                AuditEvent.entity_id.ilike(term),
            )
        )
    if service:
        query = query.filter(AuditEvent.service == service.strip().lower())
    if action:
        query = query.filter(AuditEvent.action == action.strip())
    if actor:
        term = f"%{actor.strip()}%"
        query = query.filter(
            or_(
                AuditEvent.actor_username.ilike(term),
                AuditEvent.actor_email.ilike(term),
            )
        )
    if entity_type:
        query = query.filter(AuditEvent.entity_type == entity_type.strip())
    if date_from:
        query = query.filter(AuditEvent.occurred_at >= date_from)
    if date_to:
        query = query.filter(AuditEvent.occurred_at <= date_to)

    query = query.order_by(AuditEvent.occurred_at.desc(), AuditEvent.id.desc())
    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()

    return AuditEventListResponse(
        items=[_to_public(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total else 0,
    )


@router.get(
    "/events/{event_ref}",
    response_model=AuditEventPublic,
    summary="Get one audit event (admin only)",
)
def get_audit_event(event_ref: str, db: DbSession, _: AdminOnly) -> AuditEventPublic:
    row = db.query(AuditEvent).filter(AuditEvent.event_id == event_ref).first()
    if not row and event_ref.isdigit():
        row = db.query(AuditEvent).filter(AuditEvent.id == int(event_ref)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Audit event not found")
    return _to_public(row)


@router.get("/meta/actions", summary="Distinct actions for filters (admin only)")
def list_actions(db: DbSession, _: AdminOnly) -> dict[str, list[str]]:
    actions = [
        row[0]
        for row in db.query(AuditEvent.action).distinct().order_by(AuditEvent.action).all()
    ]
    services = [
        row[0]
        for row in db.query(AuditEvent.service).distinct().order_by(AuditEvent.service).all()
    ]
    return {"actions": actions, "services": services}
