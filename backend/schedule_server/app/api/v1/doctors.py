from math import ceil
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_

from app.core.deps import DbSession, TokenUser, require_roles
from app.models.clinical import Department, Doctor
from app.schemas.clinical import (
    DoctorCreate,
    DoctorListResponse,
    DoctorPublic,
    DoctorUpdate,
)
from app.services.codes import next_doctor_code

AdminOnly = Annotated[TokenUser, Depends(require_roles("admin"))]
StaffRoles = Annotated[
    TokenUser, Depends(require_roles("admin", "receptionist", "doctor"))
]

router = APIRouter(prefix="/doctors", tags=["doctors"])


def _to_public(doctor: Doctor) -> DoctorPublic:
    data = DoctorPublic.model_validate(doctor)
    dept_name = doctor.department.name if doctor.department else None
    return data.model_copy(update={"department_name": dept_name})


@router.get("/", response_model=DoctorListResponse)
def list_doctors(
    db: DbSession,
    _: StaffRoles,
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    status_filter: Optional[str] = Query(default="active", alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
) -> DoctorListResponse:
    query = db.query(Doctor)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Doctor.doctor_code.ilike(term),
                Doctor.first_name.ilike(term),
                Doctor.last_name.ilike(term),
                Doctor.specialization.ilike(term),
                Doctor.phone.ilike(term),
            )
        )
    if department_id:
        query = query.filter(Doctor.department_id == department_id)
    if status_filter == "active":
        query = query.filter(Doctor.is_active.is_(True))
    elif status_filter == "inactive":
        query = query.filter(Doctor.is_active.is_(False))

    query = query.order_by(Doctor.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return DoctorListResponse(
        items=[_to_public(d) for d in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total else 0,
    )


@router.get("/{doctor_id}", response_model=DoctorPublic)
def get_doctor(doctor_id: int, db: DbSession, _: StaffRoles) -> DoctorPublic:
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return _to_public(doctor)


@router.post("/", response_model=DoctorPublic, status_code=status.HTTP_201_CREATED)
def create_doctor(payload: DoctorCreate, db: DbSession, _: AdminOnly) -> DoctorPublic:
    if payload.department_id:
        dept = (
            db.query(Department)
            .filter(Department.id == payload.department_id)
            .first()
        )
        if not dept:
            raise HTTPException(status_code=400, detail="Department not found")

    doctor = Doctor(doctor_code=next_doctor_code(db), **payload.model_dump())
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return _to_public(doctor)


@router.put("/{doctor_id}", response_model=DoctorPublic)
def update_doctor(
    doctor_id: int, payload: DoctorUpdate, db: DbSession, _: AdminOnly
) -> DoctorPublic:
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    if payload.department_id:
        dept = (
            db.query(Department)
            .filter(Department.id == payload.department_id)
            .first()
        )
        if not dept:
            raise HTTPException(status_code=400, detail="Department not found")

    for key, value in payload.model_dump().items():
        setattr(doctor, key, value)
    db.commit()
    db.refresh(doctor)
    return _to_public(doctor)


@router.patch("/{doctor_id}/deactivate", response_model=DoctorPublic)
def deactivate_doctor(doctor_id: int, db: DbSession, _: AdminOnly) -> DoctorPublic:
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    doctor.is_active = False
    db.commit()
    db.refresh(doctor)
    return _to_public(doctor)


@router.patch("/{doctor_id}/activate", response_model=DoctorPublic)
def activate_doctor(doctor_id: int, db: DbSession, _: AdminOnly) -> DoctorPublic:
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    doctor.is_active = True
    db.commit()
    db.refresh(doctor)
    return _to_public(doctor)
