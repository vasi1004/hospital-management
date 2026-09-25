from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import func, or_

from app.core.config import get_settings
from app.auth.deps import CurrentUser, DbSession
from app.core.rate_limit import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    safe_decode_token,
    verify_password,
)
from app.auth.models.user import User
from app.auth.schemas.auth import (
    AccessTokenResponse,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    TokenResponse,
    UserPublic,
)
from app.auth.services.audit_client import emit_audit_event, snapshot_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _build_token_response(user: User) -> TokenResponse:
    settings = get_settings()
    return TokenResponse(
        access_token=create_access_token(
            user.username, user.role, user_id=user.id
        ),
        refresh_token=create_refresh_token(user.username),
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserPublic.model_validate(user),
    )


def _find_user_by_login_identifier(db: DbSession, identifier: str) -> User | None:
    """Resolve login by username (exact) or email (case-insensitive)."""
    value = identifier.strip()
    if not value:
        return None
    return (
        db.query(User)
        .filter(
            or_(
                User.username == value,
                func.lower(User.email) == value.lower(),
            )
        )
        .first()
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate with username or email and receive JWT tokens",
)
@limiter.limit(get_settings().login_rate_limit)
def login(payload: LoginRequest, request: Request, db: DbSession) -> TokenResponse:
    user = _find_user_by_login_identifier(db, payload.username)

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    emit_audit_event(
        action="auth.login",
        entity_type="user",
        entity_id=user.id,
        actor=user,
        after_data=snapshot_user(user),
        summary=f'User "{user.username}" signed in',
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return _build_token_response(user)


@router.post(
    "/refresh",
    response_model=AccessTokenResponse,
    summary="Exchange a refresh token for a new access token",
)
def refresh_access_token(payload: RefreshRequest, db: DbSession) -> AccessTokenResponse:
    settings = get_settings()
    token_data = safe_decode_token(payload.refresh_token)

    if not token_data or token_data.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    username = token_data.get("sub")
    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token subject",
        )

    return AccessTokenResponse(
        access_token=create_access_token(
            user.username, user.role, user_id=user.id
        ),
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.get(
    "/me",
    response_model=UserPublic,
    summary="Return the currently authenticated user",
)
def read_me(current_user: CurrentUser) -> User:
    return current_user


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Client-side logout helper",
)
def logout(current_user: CurrentUser, request: Request) -> MessageResponse:
    # Stateless JWT logout: client discards tokens.
    emit_audit_event(
        action="auth.logout",
        entity_type="user",
        entity_id=current_user.id,
        actor=current_user,
        after_data=snapshot_user(current_user),
        summary=f'User "{current_user.username}" signed out',
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return MessageResponse(message="Logged out successfully. Discard client tokens.")
