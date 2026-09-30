from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_serializer

from app.core.roles import RoleLiteral


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at")
    def serialize_timestamps(self, value: datetime) -> str:
        """Stable ISO wall-clock timestamps for the admin UI."""
        return value.replace(microsecond=0).isoformat()


class LoginRequest(BaseModel):
    """Login identifier may be username or email (same JSON field for compatibility)."""

    username: str = Field(
        min_length=3,
        max_length=255,
        description="Username or email address",
    )
    password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserPublic


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserCreateRequest(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: Optional[str] = Field(default=None, max_length=150)
    role: RoleLiteral = "patient"
    is_active: bool = True


class UserUpdateRequest(BaseModel):
    """Partial update for admin user management. Username is immutable."""

    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(default=None, max_length=150)
    role: Optional[RoleLiteral] = None
    is_active: Optional[bool] = None


class PasswordResetRequest(BaseModel):
    password: str = Field(min_length=8, max_length=128)


class RoleOption(BaseModel):
    value: str
    label: str


class RolesCatalogResponse(BaseModel):
    roles: list[RoleOption]
    default_role: RoleLiteral = "patient"


class MessageResponse(BaseModel):
    message: str
