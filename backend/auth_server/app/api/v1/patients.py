from math import ceil
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_

from app.core.deps import DbSession, require_roles
from app.models.clinical import Patient
from app.models.user import User
from app.schemas.clinical import (
    PatientCreate,
    PatientListResponse,
    PatientPublic,
    PatientUpdate,
)
from app.services.codes import next_patient_code

StaffRoles = Annotated[
    User, Depends(require_roles("admin", "receptionist", "doctor"))
]
MutateRoles = Annotated[User, Depends(require_roles("admin", "receptionist"))]

router = APIRouter(prefix="/patients", tags=["patients"])


def _to_public(patient: Patient) -> PatientPublic:
    return PatientPublic.model_validate(patient)


@router.get("/", response_model=PatientListResponse)
def list_patients(
    db: DbSession,
    _: StaffRoles,
    search: Optional[str] = Query(default=None),
    gender: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    sort_by: str = Query(default="created_at"),
    sort_dir: str = Query(default="desc"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
) -> PatientListResponse:
    query = db.query(Patient)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Patient.patient_code.ilike(term),
                Patient.first_name.ilike(term),
                Patient.last_name.ilike(term),
                Patient.phone.ilike(term),
                Patient.email.ilike(term),
            )
        )

    if gender:
        query = query.filter(Patient.gender == gender.lower())

    if status_filter == "active":
        query = query.filter(Patient.is_active.is_(True))
    elif status_filter == "inactive":
        query = query.filter(Patient.is_active.is_(False))

    sort_map = {
        "created_at": Patient.created_at,
        "first_name": Patient.first_name,
        "last_name": Patient.last_name,
        "patient_code": Patient.patient_code,
        "date_of_birth": Patient.date_of_birth,
    }
    sort_col = sort_map.get(sort_by, Patient.created_at)
    query = query.order_by(sort_col.asc() if sort_dir == "asc" else sort_col.desc())

    total = query.count()
    items = (
        query.offset((page - 1) * page_size).limit(page_size).all()
    )
    total_pages = ceil(total / page_size) if total else 0

    return PatientListResponse(
        items=[_to_public(p) for p in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{patient_id}", response_model=PatientPublic)
def get_patient(patient_id: int, db: DbSession, _: StaffRoles) -> PatientPublic:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _to_public(patient)


@router.post("/", response_model=PatientPublic, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate, db: DbSession, _: MutateRoles
) -> PatientPublic:
    patient = Patient(
        patient_code=next_patient_code(db),
        **payload.model_dump(),
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return _to_public(patient)


@router.put("/{patient_id}", response_model=PatientPublic)
def update_patient(
    patient_id: int, payload: PatientUpdate, db: DbSession, _: MutateRoles
) -> PatientPublic:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    for key, value in payload.model_dump().items():
        setattr(patient, key, value)

    db.commit()
    db.refresh(patient)
    return _to_public(patient)


@router.patch("/{patient_id}/deactivate", response_model=PatientPublic)
def deactivate_patient(
    patient_id: int, db: DbSession, _: MutateRoles
) -> PatientPublic:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient.is_active = False
    db.commit()
    db.refresh(patient)
    return _to_public(patient)


@router.patch("/{patient_id}/activate", response_model=PatientPublic)
def activate_patient(patient_id: int, db: DbSession, _: MutateRoles) -> PatientPublic:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient.is_active = True
    db.commit()
    db.refresh(patient)
    return _to_public(patient)
