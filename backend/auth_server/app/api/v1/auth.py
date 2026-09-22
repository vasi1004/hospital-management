from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import or_

from app.core.config import get_settings
from app.core.deps import CurrentUser, DbSession, require_roles
from app.core.rate_limit import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    safe_decode_token,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import (
    AccessTokenResponse,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    TokenResponse,
    UserCreateRequest,
    UserPublic,
)

AdminUser = Annotated[User, Depends(require_roles("admin"))]

router = APIRouter(prefix="/auth", tags=["auth"])
users_router = APIRouter(prefix="/users", tags=["users"])


def _build_token_response(user: User) -> TokenResponse:
    settings = get_settings()
    return TokenResponse(
        access_token=create_access_token(user.username, user.role),
        refresh_token=create_refresh_token(user.username),
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserPublic.model_validate(user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive JWT tokens",
)
@limiter.limit(get_settings().login_rate_limit)
def login(payload: LoginRequest, request: Request, db: DbSession) -> TokenResponse:
    user = db.query(User).filter(User.username == payload.username).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
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
        access_token=create_access_token(user.username, user.role),
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
def logout(current_user: CurrentUser) -> MessageResponse:
    # Stateless JWT logout: client discards tokens.
    # For stronger revocation, store refresh tokens server-side later.
    _ = current_user
    return MessageResponse(message="Logged out successfully. Discard client tokens.")


@users_router.get(
    "/",
    response_model=list[UserPublic],
    summary="List users (admin only)",
)
def list_users(db: DbSession, _: AdminUser) -> list[User]:
    return db.query(User).order_by(User.id.asc()).all()


@users_router.post(
    "/",
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create a user (admin only)",
)
def create_user(
    payload: UserCreateRequest,
    db: DbSession,
    _: AdminUser,
) -> User:
    existing = (
        db.query(User)
        .filter(or_(User.username == payload.username, User.email == payload.email))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already exists",
        )

    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        is_active=payload.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
