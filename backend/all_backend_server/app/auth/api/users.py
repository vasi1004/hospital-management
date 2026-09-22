"""Admin user access-control endpoints (list / create / update / activate)."""

from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError

from app.auth.deps import DbSession, require_roles
from app.core.roles import ROLE_LABELS, ROLES
from app.core.security import hash_password
from app.auth.models.clinical import Doctor, Patient
from app.auth.models.user import User
from app.auth.schemas.auth import (
    MessageResponse,
    PasswordResetRequest,
    RoleOption,
    RolesCatalogResponse,
    UserCreateRequest,
    UserPublic,
    UserUpdateRequest,
)
from app.auth.services.audit_client import (
    changed_snapshot,
    emit_audit_event,
    snapshot_user,
)

AdminUser = Annotated[User, Depends(require_roles("admin"))]

users_router = APIRouter(prefix="/users", tags=["users"])


def _db_now(db: DbSession) -> datetime:
    """Use the database clock so created_at / updated_at stay consistent."""
    value = db.scalar(select(func.now()))
    if value is None:
        return datetime.now().replace(microsecond=0)
    # TIMESTAMP WITHOUT TIME ZONE stores wall-clock. Keep DB local wall time
    # (do not convert to UTC) so updated_at matches created_at display.
    if getattr(value, "tzinfo", None) is not None:
        return value.replace(tzinfo=None, microsecond=0)
    return value.replace(microsecond=0)


def _touch_updated_at(db: DbSession, user: User) -> None:
    user.updated_at = _db_now(db)

def _get_user_or_404(db: DbSession, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


def _count_active_admins(db: DbSession, *, exclude_user_id: Optional[int] = None) -> int:
    query = db.query(User).filter(User.role == "admin", User.is_active.is_(True))
    if exclude_user_id is not None:
        query = query.filter(User.id != exclude_user_id)
    return query.count()


def _ensure_not_locking_out_admins(
    db: DbSession,
    target: User,
    *,
    next_role: Optional[str] = None,
    next_active: Optional[bool] = None,
) -> None:
    """Prevent removing the last active admin account."""
    role = next_role if next_role is not None else target.role
    active = next_active if next_active is not None else target.is_active

    was_active_admin = target.role == "admin" and target.is_active
    will_be_active_admin = role == "admin" and active

    if was_active_admin and not will_be_active_admin:
        if _count_active_admins(db, exclude_user_id=target.id) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove or deactivate the last active admin",
            )


def _ensure_email_unique(
    db: DbSession,
    email: str,
    *,
    exclude_user_id: Optional[int] = None,
) -> None:
    query = db.query(User).filter(User.email == email)
    if exclude_user_id is not None:
        query = query.filter(User.id != exclude_user_id)
    if query.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists",
        )


@users_router.get(
    "/roles",
    response_model=RolesCatalogResponse,
    summary="List assignable roles (admin only)",
)
def list_roles(_: AdminUser) -> RolesCatalogResponse:
    return RolesCatalogResponse(
        roles=[
            RoleOption(value=role, label=ROLE_LABELS.get(role, role.title()))
            for role in ROLES
        ],
        default_role="patient",
    )


@users_router.get(
    "/",
    response_model=list[UserPublic],
    summary="List users (admin only)",
)
def list_users(
    db: DbSession,
    _: AdminUser,
    search: Optional[str] = Query(default=None, max_length=120),
    role: Optional[str] = Query(default=None, max_length=50),
    status_filter: Optional[str] = Query(
        default=None,
        alias="status",
        pattern="^(active|inactive|all)$",
        description="Filter by account status",
    ),
) -> list[User]:
    query = db.query(User)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.username.ilike(term),
                User.email.ilike(term),
                User.full_name.ilike(term),
            )
        )

    if role and role != "all":
        if role not in ROLES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid role. Allowed: {', '.join(ROLES)}",
            )
        query = query.filter(User.role == role)

    if status_filter == "active":
        query = query.filter(User.is_active.is_(True))
    elif status_filter == "inactive":
        query = query.filter(User.is_active.is_(False))

    return query.order_by(User.id.asc()).all()


@users_router.post(
    "/",
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create a user (admin only)",
)
def create_user(
    payload: UserCreateRequest,
    db: DbSession,
    current_admin: AdminUser,
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
        email=str(payload.email),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        is_active=payload.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    after = snapshot_user(user)
    emit_audit_event(
        action="user.create",
        entity_type="user",
        entity_id=user.id,
        actor=current_admin,
        after_data=after,
        summary=f'Admin created user "{user.username}" ({user.role})',
    )
    return user


@users_router.get(
    "/{user_id}",
    response_model=UserPublic,
    summary="Get a user by id (admin only)",
)
def get_user(user_id: int, db: DbSession, _: AdminUser) -> User:
    return _get_user_or_404(db, user_id)


@users_router.put(
    "/{user_id}",
    response_model=UserPublic,
    summary="Update a user (admin only)",
)
def update_user(
    user_id: int,
    payload: UserUpdateRequest,
    db: DbSession,
    current_admin: AdminUser,
) -> User:
    user = _get_user_or_404(db, user_id)
    before = snapshot_user(user)
    data = payload.model_dump(exclude_unset=True)

    if "email" in data and data["email"] is not None:
        email = str(data["email"])
        _ensure_email_unique(db, email, exclude_user_id=user.id)
        data["email"] = email

    next_role = data.get("role", user.role)
    next_active = data.get("is_active", user.is_active)
    _ensure_not_locking_out_admins(
        db,
        user,
        next_role=next_role,
        next_active=next_active,
    )

    # Admins may edit themselves except locking out the last admin (checked above).
    if user.id == current_admin.id and data.get("role") and data["role"] != "admin":
        _ensure_not_locking_out_admins(
            db,
            user,
            next_role=data["role"],
            next_active=next_active,
        )

    for key, value in data.items():
        setattr(user, key, value)

    _touch_updated_at(db, user)
    db.commit()
    db.refresh(user)

    after = snapshot_user(user)
    before_changed, after_changed = changed_snapshot(before, after)
    emit_audit_event(
        action="user.update",
        entity_type="user",
        entity_id=user.id,
        actor=current_admin,
        before_data=before_changed,
        after_data=after_changed,
        summary=f'Admin updated user "{user.username}"',
    )
    return user


@users_router.patch(
    "/{user_id}/activate",
    response_model=UserPublic,
    summary="Activate a user (admin only)",
)
def activate_user(user_id: int, db: DbSession, current_admin: AdminUser) -> User:
    user = _get_user_or_404(db, user_id)
    before = snapshot_user(user)
    user.is_active = True
    _touch_updated_at(db, user)
    db.commit()
    db.refresh(user)
    after = snapshot_user(user)
    before_changed, after_changed = changed_snapshot(before, after)
    emit_audit_event(
        action="user.activate",
        entity_type="user",
        entity_id=user.id,
        actor=current_admin,
        before_data=before_changed,
        after_data=after_changed,
        summary=f'Admin activated user "{user.username}"',
    )
    return user


@users_router.patch(
    "/{user_id}/deactivate",
    response_model=UserPublic,
    summary="Deactivate a user (admin only)",
)
def deactivate_user(
    user_id: int,
    db: DbSession,
    current_admin: AdminUser,
) -> User:
    user = _get_user_or_404(db, user_id)

    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )

    _ensure_not_locking_out_admins(db, user, next_active=False)

    before = snapshot_user(user)
    user.is_active = False
    _touch_updated_at(db, user)
    db.commit()
    db.refresh(user)
    after = snapshot_user(user)
    before_changed, after_changed = changed_snapshot(before, after)
    emit_audit_event(
        action="user.deactivate",
        entity_type="user",
        entity_id=user.id,
        actor=current_admin,
        before_data=before_changed,
        after_data=after_changed,
        summary=f'Admin deactivated user "{user.username}"',
    )
    return user


@users_router.post(
    "/{user_id}/reset-password",
    response_model=UserPublic,
    summary="Reset a user password (admin only)",
)
def reset_user_password(
    user_id: int,
    payload: PasswordResetRequest,
    db: DbSession,
    current_admin: AdminUser,
) -> User:
    user = _get_user_or_404(db, user_id)
    before = snapshot_user(user)
    user.password_hash = hash_password(payload.password)
    _touch_updated_at(db, user)
    db.commit()
    db.refresh(user)
    after = snapshot_user(user)
    before_changed, after_changed = changed_snapshot(before, after)
    emit_audit_event(
        action="user.password_reset",
        entity_type="user",
        entity_id=user.id,
        actor=current_admin,
        before_data=before_changed,
        after_data={**after_changed, "password": "[changed]"},
        summary=f'Admin reset password for user "{user.username}"',
        metadata={"password_changed": True},
    )
    return user


@users_router.delete(
    "/{user_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a user (admin only)",
)
def delete_user(
    user_id: int,
    db: DbSession,
    current_admin: AdminUser,
) -> MessageResponse:
    user = _get_user_or_404(db, user_id)

    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )

    _ensure_not_locking_out_admins(db, user, next_active=False)

    username = user.username
    before = snapshot_user(user)

    # Detach optional clinical links so login accounts can be removed safely.
    # Patient/doctor records remain; only the auth link is cleared.
    db.execute(
        update(Patient).where(Patient.user_id == user.id).values(user_id=None)
    )
    db.execute(
        update(Doctor).where(Doctor.user_id == user.id).values(user_id=None)
    )

    try:
        db.delete(user)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Cannot delete this user because related records still reference "
                "the account. Deactivate the account instead, or remove links first."
            ),
        ) from None

    emit_audit_event(
        action="user.delete",
        entity_type="user",
        entity_id=user_id,
        actor=current_admin,
        before_data=before,
        after_data=None,
        summary=f'Admin deleted user "{username}"',
    )
    return MessageResponse(message=f'User "{username}" deleted successfully.')
