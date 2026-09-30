"""Doctor workspace helpers — profile + self-managed availability."""

from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import joinedload

from app.schedule.deps import DbSession, LinkedDoctor
from app.schedule.models.clinical import Doctor
from app.schedule.schemas.clinical import DoctorAvailabilityUpdate, DoctorPublic
from app.schedule.services.availability import parse_available_days

router = APIRouter(prefix="/doctor-workspace", tags=["doctor-workspace"])


def _to_public(doctor: Doctor) -> DoctorPublic:
    data = DoctorPublic.model_validate(doctor)
    dept_name = doctor.department.name if doctor.department else None
    return data.model_copy(update={"department_name": dept_name})


def _reload(db: DbSession, doctor_id: int) -> Doctor:
    return (
        db.query(Doctor)
        .options(joinedload(Doctor.department))
        .filter(Doctor.id == doctor_id)
        .one()
    )


@router.get("/me", response_model=DoctorPublic)
def get_my_doctor_profile(doctor: LinkedDoctor, db: DbSession) -> DoctorPublic:
    _ = db
    return _to_public(doctor)


@router.put("/me/availability", response_model=DoctorPublic)
def update_my_availability(
    payload: DoctorAvailabilityUpdate,
    doctor: LinkedDoctor,
    db: DbSession,
) -> DoctorPublic:
    """Only the signed-in doctor may set their booking availability."""
    days = parse_available_days(payload.available_days)
    if not days:
        raise HTTPException(
            status_code=400,
            detail="Select at least one valid weekday (Mon–Sun).",
        )
    order = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
    doctor.available_days = ",".join(day for day in order if day in days)
    doctor.available_from = payload.available_from.replace(second=0, microsecond=0)
    doctor.available_to = payload.available_to.replace(second=0, microsecond=0)
    db.add(doctor)
    db.commit()
    return _to_public(_reload(db, doctor.id))


@router.delete("/me/availability", response_model=DoctorPublic)
def clear_my_availability(doctor: LinkedDoctor, db: DbSession) -> DoctorPublic:
    """Clear schedule so admin/reception cannot book this doctor."""
    doctor.available_days = None
    doctor.available_from = None
    doctor.available_to = None
    db.add(doctor)
    db.commit()
    return _to_public(_reload(db, doctor.id))
