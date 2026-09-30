from collections.abc import Generator
from typing import Annotated, Callable, Optional

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import safe_decode_token
from app.audit.db import SessionLocal

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


def require_ingest_token(
    x_audit_token: Annotated[Optional[str], Header(alias="X-Audit-Token")] = None,
) -> None:
    settings = get_settings()
    if not x_audit_token or x_audit_token != settings.audit_service_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid audit ingest token",
        )


IngestAuth = Annotated[None, Depends(require_ingest_token)]
