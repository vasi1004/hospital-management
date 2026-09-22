from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class AuditEventCreate(BaseModel):
    service: str = Field(min_length=2, max_length=40)
    action: str = Field(min_length=2, max_length=80)
    entity_type: Optional[str] = Field(default=None, max_length=80)
    entity_id: Optional[str] = Field(default=None, max_length=80)
    actor_user_id: Optional[int] = None
    actor_username: Optional[str] = Field(default=None, max_length=120)
    actor_role: Optional[str] = Field(default=None, max_length=50)
    actor_email: Optional[str] = Field(default=None, max_length=255)
    ip_address: Optional[str] = Field(default=None, max_length=64)
    user_agent: Optional[str] = Field(default=None, max_length=512)
    summary: Optional[str] = Field(default=None, max_length=500)
    before_data: Optional[dict[str, Any]] = None
    after_data: Optional[dict[str, Any]] = None
    metadata: Optional[dict[str, Any]] = None
    occurred_at: Optional[datetime] = None


class AuditEventPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: str
    occurred_at: datetime
    service: str
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    actor_user_id: Optional[int] = None
    actor_username: Optional[str] = None
    actor_role: Optional[str] = None
    actor_email: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    summary: Optional[str] = None
    before_data: Optional[dict[str, Any]] = None
    after_data: Optional[dict[str, Any]] = None
    metadata: Optional[dict[str, Any]] = Field(
        default=None, validation_alias="metadata_json"
    )
    created_at: datetime


class AuditEventListResponse(BaseModel):
    items: list[AuditEventPublic]
    total: int
    page: int
    page_size: int
    total_pages: int


class MessageResponse(BaseModel):
    message: str
    event_id: Optional[str] = None
