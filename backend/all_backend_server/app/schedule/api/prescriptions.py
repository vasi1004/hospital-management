"""Doctor prescription APIs — digital prescription cards."""

from datetime import date
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import joinedload

from app.schedule.deps import DbSession, LinkedDoctor, TokenUser, require_roles
from app.schedule.models.clinical import Appointment, Doctor, Prescription, PrescriptionItem
from app.schedule.schemas.clinical import (
    PrescriptionCreate,
    PrescriptionListResponse,
    PrescriptionPublic,
)
from app.schedule.services.codes import next_prescription_code

DoctorOnly = Annotated[TokenUser, Depends(require_roles("doctor"))]
StaffRoles = Annotated[
    TokenUser, Depends(require_roles("admin", "receptionist", "doctor"))
]

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])


def _to_public(row: Prescription) -> PrescriptionPublic:
    patient_name = None
    patient_code = None
    if row.patient:
        patient_name = f"{row.patient.first_name} {row.patient.last_name}".strip()
        patient_code = row.patient.patient_code
    doctor_name = None
    specialization = None
    if row.doctor:
        doctor_name = f"{row.doctor.first_name} {row.doctor.last_name}".strip()
        specialization = row.doctor.specialization
    appointment_code = row.appointment.appointment_code if row.appointment else None
    appointment_date = row.appointment.appointment_date if row.appointment else None
    data = PrescriptionPublic.model_validate(row)
    return data.model_copy(
        update={
            "patient_name": patient_name,
            "patient_code": patient_code,
            "doctor_name": doctor_name,
            "doctor_specialization": specialization,
            "appointment_code": appointment_code,
            "appointment_date": appointment_date,
            "items": row.items or [],
        }
    )


def _load_prescription(db: DbSession, prescription_id: int) -> Prescription | None:
    return (
        db.query(Prescription)
        .options(
            joinedload(Prescription.items),
            joinedload(Prescription.patient),
            joinedload(Prescription.doctor),
            joinedload(Prescription.appointment),
        )
        .filter(Prescription.id == prescription_id)
        .first()
    )


@router.get("/", response_model=PrescriptionListResponse)
def list_prescriptions(
    db: DbSession,
    current_user: StaffRoles,
    patient_id: Optional[int] = None,
    doctor_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> PrescriptionListResponse:
    query = db.query(Prescription).options(
        joinedload(Prescription.items),
        joinedload(Prescription.patient),
        joinedload(Prescription.doctor),
        joinedload(Prescription.appointment),
    )

    if current_user.role.lower() == "doctor":
        linked = (
            db.query(Doctor)
            .filter(Doctor.auth_user_id == current_user.user_id)
            .first()
        )
        if not linked:
            raise HTTPException(status_code=404, detail="Doctor profile not linked")
        query = query.filter(Prescription.doctor_id == linked.id)
    elif doctor_id:
        query = query.filter(Prescription.doctor_id == doctor_id)

    if patient_id:
        query = query.filter(Prescription.patient_id == patient_id)
    if date_from:
        query = query.filter(Prescription.prescribed_on >= date_from)
    if date_to:
        query = query.filter(Prescription.prescribed_on <= date_to)

    items = query.order_by(Prescription.prescribed_on.desc(), Prescription.id.desc()).all()
    return PrescriptionListResponse(
        items=[_to_public(item) for item in items],
        total=len(items),
    )


@router.get("/{prescription_id}", response_model=PrescriptionPublic)
def get_prescription(
    prescription_id: int,
    db: DbSession,
    current_user: StaffRoles,
) -> PrescriptionPublic:
    row = _load_prescription(db, prescription_id)
    if not row:
        raise HTTPException(status_code=404, detail="Prescription not found")

    if current_user.role.lower() == "doctor":
        linked = (
            db.query(Doctor)
            .filter(Doctor.auth_user_id == current_user.user_id)
            .first()
        )
        if not linked or row.doctor_id != linked.id:
            raise HTTPException(status_code=403, detail="Not your prescription")

    return _to_public(row)


@router.post("/", response_model=PrescriptionPublic, status_code=status.HTTP_201_CREATED)
def create_prescription(
    payload: PrescriptionCreate,
    db: DbSession,
    doctor: LinkedDoctor,
) -> PrescriptionPublic:
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == payload.appointment_id)
        .first()
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appointment.doctor_id != doctor.id:
        raise HTTPException(
            status_code=403,
            detail="You can only prescribe for your own appointments",
        )

    existing = (
        db.query(Prescription)
        .filter(Prescription.appointment_id == appointment.id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="A prescription already exists for this appointment",
        )

    today = date.today()
    prescription = Prescription(
        prescription_code=next_prescription_code(db, today),
        appointment_id=appointment.id,
        patient_id=appointment.patient_id,
        doctor_id=doctor.id,
        diagnosis=payload.diagnosis.strip(),
        advice=(payload.advice or "").strip() or None,
        notes=(payload.notes or "").strip() or None,
        prescribed_on=today,
    )
    db.add(prescription)
    db.flush()

    for index, item in enumerate(payload.items):
        db.add(
            PrescriptionItem(
                prescription_id=prescription.id,
                medicine_name=item.medicine_name.strip(),
                dose=item.dose.strip(),
                frequency=item.frequency.strip(),
                duration=item.duration.strip(),
                instructions=(item.instructions or "").strip() or None,
                sort_order=index,
            )
        )

    # Mark visit in progress/completed when Rx is written
    if appointment.status in {"scheduled", "confirmed"}:
        appointment.status = "in_progress"

    db.commit()
    row = _load_prescription(db, prescription.id)
    return _to_public(row)
