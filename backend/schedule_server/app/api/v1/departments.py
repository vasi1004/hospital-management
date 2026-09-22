from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_

from app.core.deps import DbSession, TokenUser, require_roles
from app.models.clinical import Department
from app.schemas.clinical import DepartmentCreate, DepartmentPublic, DepartmentUpdate

AdminOnly = Annotated[TokenUser, Depends(require_roles("admin"))]
StaffRoles = Annotated[
    TokenUser, Depends(require_roles("admin", "receptionist", "doctor"))
]

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("/", response_model=list[DepartmentPublic])
def list_departments(
    db: DbSession,
    _: StaffRoles,
    active_only: bool = True,
) -> list[Department]:
    query = db.query(Department).order_by(Department.name.asc())
    if active_only:
        query = query.filter(Department.is_active.is_(True))
    return query.all()


@router.post("/", response_model=DepartmentPublic, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate, db: DbSession, _: AdminOnly
) -> Department:
    existing = (
        db.query(Department)
        .filter(
            or_(
                Department.code == payload.code.upper(),
                Department.name == payload.name,
            )
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Department name or code exists")

    dept = Department(
        name=payload.name.strip(),
        code=payload.code.strip().upper(),
        description=payload.description,
        is_active=payload.is_active,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.put("/{department_id}", response_model=DepartmentPublic)
def update_department(
    department_id: int, payload: DepartmentUpdate, db: DbSession, _: AdminOnly
) -> Department:
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    conflict = (
        db.query(Department)
        .filter(
            Department.id != department_id,
            or_(
                Department.code == payload.code.upper(),
                Department.name == payload.name,
            ),
        )
        .first()
    )
    if conflict:
        raise HTTPException(status_code=409, detail="Department name or code exists")

    dept.name = payload.name.strip()
    dept.code = payload.code.strip().upper()
    dept.description = payload.description
    dept.is_active = payload.is_active
    db.commit()
    db.refresh(dept)
    return dept


@router.patch("/{department_id}/deactivate", response_model=DepartmentPublic)
def deactivate_department(
    department_id: int, db: DbSession, _: AdminOnly
) -> Department:
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    dept.is_active = False
    db.commit()
    db.refresh(dept)
    return dept
