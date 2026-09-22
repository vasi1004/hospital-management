from collections.abc import Generator
from typing import Annotated, Callable, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.core.security import safe_decode_token
from app.schedule.db import SessionLocal
from app.schedule.models.clinical import Doctor

bearer_scheme = HTTPBearer(auto_error=False)


class TokenUser(BaseModel):
    username: str
    role: str
    user_id: Optional[int] = None


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
) -> TokenUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = safe_decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username = payload.get("sub")
    role = payload.get("role")
    if not username or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    raw_uid = payload.get("uid")
    user_id = int(raw_uid) if raw_uid is not None else None

    return TokenUser(username=str(username), role=str(role), user_id=user_id)


CurrentUser = Annotated[TokenUser, Depends(get_current_user)]


def require_roles(*allowed_roles: str) -> Callable[[TokenUser], TokenUser]:
    allowed = {role.lower() for role in allowed_roles}

    def dependency(current_user: CurrentUser) -> TokenUser:
        if current_user.role.lower() not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return dependency


def get_linked_doctor(db: DbSession, current_user: CurrentUser) -> Doctor:
    """Resolve the clinical doctor row linked to the authenticated auth user."""
    if current_user.role.lower() != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctor role required",
        )
    if not current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Access token is missing user id. Sign out and sign in again "
                "to refresh your session."
            ),
        )

    doctor = (
        db.query(Doctor)
        .options(joinedload(Doctor.department))
        .filter(Doctor.auth_user_id == current_user.user_id, Doctor.is_active.is_(True))
        .first()
    )
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No active doctor profile is linked to this login. "
                "Ask an administrator to link your account on the Doctors page."
            ),
        )
    return doctor


LinkedDoctor = Annotated[Doctor, Depends(get_linked_doctor)]
