"""Appointment APIs — create/mutate by admin/receptionist; doctors read/reschedule scoped list."""

from datetime import date, timedelta
from math import ceil
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import joinedload

from app.schedule.deps import DbSession, LinkedDoctor, TokenUser, require_roles
from app.schedule.models.clinical import Appointment, Department, Doctor, Patient, Prescription
from app.schedule.schemas.clinical import (
    AppointmentCreate,
    AppointmentListResponse,
    AppointmentPublic,
    AppointmentReschedule,
    AppointmentStatusUpdate,
    DoctorAvailabilityItem,
    DoctorAvailabilityResponse,
    DoctorSlotsResponse,
)
from app.schedule.services.availability import (
    ACTIVE_BOOKING_STATUSES,
    assert_slot_bookable,
    doctors_available_on,
    free_slots_for_doctor,
    slot_minutes,
    weekday_short,
)
from app.schedule.services.codes import next_appointment_code

MutateRoles = Annotated[TokenUser, Depends(require_roles("admin", "receptionist"))]
StaffRoles = Annotated[
    TokenUser, Depends(require_roles("admin", "receptionist", "doctor"))
]
RescheduleRoles = Annotated[
    TokenUser, Depends(require_roles("admin", "receptionist", "doctor"))
]

router = APIRouter(prefix="/appointments", tags=["appointments"])

_TERMINAL_STATUSES = frozenset({"completed", "cancelled", "no_show"})


def _to_public(row: Appointment, *, has_prescription: bool = False) -> AppointmentPublic:
    patient_name = None
    patient_code = None
    if row.patient:
        patient_name = f"{row.patient.first_name} {row.patient.last_name}".strip()
        patient_code = row.patient.patient_code
    doctor_name = None
    if row.doctor:
        doctor_name = f"{row.doctor.first_name} {row.doctor.last_name}".strip()
    dept_name = row.doctor.department.name if row.doctor and row.doctor.department else None
    data = AppointmentPublic.model_validate(row)
    return data.model_copy(
        update={
            "patient_name": patient_name,
            "patient_code": patient_code,
            "doctor_name": doctor_name,
            "department_name": dept_name,
            "has_prescription": has_prescription,
        }
    )


def _prescription_ids(db: DbSession, appointment_ids: list[int]) -> set[int]:
    if not appointment_ids:
        return set()
    rows = (
        db.query(Prescription.appointment_id)
        .filter(Prescription.appointment_id.in_(appointment_ids))
        .all()
    )
    return {row[0] for row in rows}


def _linked_doctor_or_404(db: DbSession, user: TokenUser) -> Doctor:
    linked = (
        db.query(Doctor)
        .filter(
            Doctor.auth_user_id == user.user_id,
            Doctor.is_active.is_(True),
        )
        .first()
    )
    if not linked:
        raise HTTPException(
            status_code=404,
            detail="No active doctor profile is linked to this login.",
        )
    return linked


def _load_appointment(db: DbSession, appointment_id: int) -> Appointment:
    row = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor).joinedload(Doctor.department),
        )
        .filter(Appointment.id == appointment_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return row


@router.get("/availability", response_model=DoctorAvailabilityResponse)
def list_available_doctors(
    db: DbSession,
    _: MutateRoles,
    on_date: date = Query(..., alias="date"),
    specialization: Optional[str] = Query(
        default=None,
        description="Optional specialty filter (case-insensitive exact match)",
    ),
) -> DoctorAvailabilityResponse:
    """Doctors who work on the given date, with free-slot counts (front desk booking)."""
    query = db.query(Doctor).options(joinedload(Doctor.department)).filter(
        Doctor.is_active.is_(True)
    )
    if specialization and specialization.strip():
        query = query.filter(
            Doctor.specialization.ilike(specialization.strip())
        )
    doctors = query.order_by(Doctor.first_name.asc(), Doctor.last_name.asc()).all()
    available = doctors_available_on(doctors, on_date)
    items: list[DoctorAvailabilityItem] = []
    for doctor in available:
        slots = free_slots_for_doctor(db, doctor, on_date)
        if not slots:
            continue
        dept_name = doctor.department.name if doctor.department else None
        items.append(
            DoctorAvailabilityItem(
                id=doctor.id,
                doctor_code=doctor.doctor_code,
                first_name=doctor.first_name,
                last_name=doctor.last_name,
                specialization=doctor.specialization,
                department_id=doctor.department_id,
                department_name=dept_name,
                experience_years=int(doctor.experience_years or 0),
                available_days=doctor.available_days,
                available_from=doctor.available_from,
                available_to=doctor.available_to,
                consultation_fee=doctor.consultation_fee,
                free_slot_count=len(slots),
            )
        )
    return DoctorAvailabilityResponse(
        date=on_date,
        weekday=weekday_short(on_date),
        slot_minutes=slot_minutes(),
        doctors=items,
    )


@router.get("/availability/{doctor_id}/slots", response_model=DoctorSlotsResponse)
def list_doctor_free_slots(
    doctor_id: int,
    db: DbSession,
    current_user: StaffRoles,
    on_date: date = Query(..., alias="date"),
    exclude_appointment_id: Optional[int] = Query(default=None),
) -> DoctorSlotsResponse:
    """Free slots for a doctor on a date. Doctors may only query their own profile."""
    doctor = (
        db.query(Doctor)
        .options(joinedload(Doctor.department))
        .filter(Doctor.id == doctor_id)
        .first()
    )
    if not doctor or not doctor.is_active:
        raise HTTPException(status_code=404, detail="Active doctor not found")

    if current_user.role.lower() == "doctor":
        linked = _linked_doctor_or_404(db, current_user)
        if linked.id != doctor.id:
            raise HTTPException(
                status_code=403,
                detail="Doctors can only view their own availability slots",
            )

    slots = free_slots_for_doctor(
        db,
        doctor,
        on_date,
        exclude_appointment_id=exclude_appointment_id,
    )
    return DoctorSlotsResponse(
        doctor_id=doctor.id,
        doctor_name=f"{doctor.first_name} {doctor.last_name}".strip(),
        date=on_date,
        weekday=weekday_short(on_date),
        available_days=doctor.available_days,
        available_from=doctor.available_from,
        available_to=doctor.available_to,
        slot_minutes=slot_minutes(),
        slots=slots,
    )


@router.get("/", response_model=AppointmentListResponse)
def list_appointments(
    db: DbSession,
    current_user: StaffRoles,
    doctor_id: Optional[int] = None,
    patient_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status_filter: Optional[str] = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
) -> AppointmentListResponse:
    query = db.query(Appointment).options(
        joinedload(Appointment.patient),
        joinedload(Appointment.doctor).joinedload(Doctor.department),
    )

    # Doctors only see their own appointments.
    if current_user.role.lower() == "doctor":
        linked = _linked_doctor_or_404(db, current_user)
        query = query.filter(Appointment.doctor_id == linked.id)
    elif doctor_id:
        query = query.filter(Appointment.doctor_id == doctor_id)

    if patient_id:
        query = query.filter(Appointment.patient_id == patient_id)
    if date_from:
        query = query.filter(Appointment.appointment_date >= date_from)
    if date_to:
        query = query.filter(Appointment.appointment_date <= date_to)
    if status_filter and status_filter != "all":
        query = query.filter(Appointment.status == status_filter)

    query = query.order_by(
        Appointment.appointment_date.asc(),
        Appointment.appointment_time.asc(),
    )
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    rx_ids = _prescription_ids(db, [item.id for item in items])

    return AppointmentListResponse(
        items=[_to_public(item, has_prescription=item.id in rx_ids) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total else 0,
    )


@router.get("/mine/today", response_model=list[AppointmentPublic])
def list_my_today_appointments(
    db: DbSession,
    doctor: LinkedDoctor,
) -> list[AppointmentPublic]:
    today = date.today()
    items = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor).joinedload(Doctor.department),
        )
        .filter(
            Appointment.doctor_id == doctor.id,
            Appointment.appointment_date == today,
        )
        .order_by(Appointment.appointment_time.asc())
        .all()
    )
    rx_ids = _prescription_ids(db, [item.id for item in items])
    return [_to_public(item, has_prescription=item.id in rx_ids) for item in items]


@router.get("/mine/upcoming", response_model=list[AppointmentPublic])
def list_my_upcoming_appointments(
    db: DbSession,
    doctor: LinkedDoctor,
    days: int = Query(default=14, ge=1, le=60),
) -> list[AppointmentPublic]:
    start = date.today()
    end = start + timedelta(days=days)
    items = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor).joinedload(Doctor.department),
        )
        .filter(
            Appointment.doctor_id == doctor.id,
            Appointment.appointment_date >= start,
            Appointment.appointment_date <= end,
            Appointment.status.notin_(["cancelled"]),
        )
        .order_by(
            Appointment.appointment_date.asc(),
            Appointment.appointment_time.asc(),
        )
        .all()
    )
    rx_ids = _prescription_ids(db, [item.id for item in items])
    return [_to_public(item, has_prescription=item.id in rx_ids) for item in items]


@router.get("/{appointment_id}", response_model=AppointmentPublic)
def get_appointment(
    appointment_id: int,
    db: DbSession,
    current_user: StaffRoles,
) -> AppointmentPublic:
    row = _load_appointment(db, appointment_id)

    if current_user.role.lower() == "doctor":
        linked = _linked_doctor_or_404(db, current_user)
        if row.doctor_id != linked.id:
            raise HTTPException(status_code=403, detail="Not your appointment")

    has_rx = (
        db.query(Prescription.id)
        .filter(Prescription.appointment_id == row.id)
        .first()
        is not None
    )
    return _to_public(row, has_prescription=has_rx)


@router.post("/", response_model=AppointmentPublic, status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: AppointmentCreate,
    db: DbSession,
    _: MutateRoles,
) -> AppointmentPublic:
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient or not patient.is_active:
        raise HTTPException(status_code=400, detail="Active patient is required")

    doctor = db.query(Doctor).filter(Doctor.id == payload.doctor_id).first()
    if not doctor or not doctor.is_active:
        raise HTTPException(status_code=400, detail="Active doctor is required")

    department_id = payload.department_id or doctor.department_id
    if department_id:
        dept = db.query(Department).filter(Department.id == department_id).first()
        if not dept:
            raise HTTPException(status_code=400, detail="Department not found")

    when = payload.appointment_time.replace(second=0, microsecond=0)
    assert_slot_bookable(db, doctor, payload.appointment_date, when)

    row = Appointment(
        appointment_code=next_appointment_code(db, payload.appointment_date),
        patient_id=payload.patient_id,
        doctor_id=payload.doctor_id,
        department_id=department_id,
        appointment_date=payload.appointment_date,
        appointment_time=when,
        reason=payload.reason,
        appointment_type=payload.appointment_type,
        priority=payload.priority,
        status=payload.status,
        notes=payload.notes,
        consultation_fee=payload.consultation_fee
        if payload.consultation_fee is not None
        else doctor.consultation_fee,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row = _load_appointment(db, row.id)
    return _to_public(row, has_prescription=False)


@router.patch("/{appointment_id}/reschedule", response_model=AppointmentPublic)
def reschedule_appointment(
    appointment_id: int,
    payload: AppointmentReschedule,
    db: DbSession,
    current_user: RescheduleRoles,
) -> AppointmentPublic:
    """
    Shift appointment date/time.
    - Admin / receptionist: may also reassign doctor.
    - Doctor: own appointments only; doctor_id cannot change.
    """
    row = _load_appointment(db, appointment_id)
    role = current_user.role.lower()

    if row.status in _TERMINAL_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reschedule a {row.status.replace('_', ' ')} appointment",
        )

    target_doctor_id = row.doctor_id
    if role == "doctor":
        linked = _linked_doctor_or_404(db, current_user)
        if row.doctor_id != linked.id:
            raise HTTPException(status_code=403, detail="Not your appointment")
        if payload.doctor_id is not None and payload.doctor_id != linked.id:
            raise HTTPException(
                status_code=403,
                detail="Doctors cannot reassign appointments to another doctor",
            )
        target_doctor_id = linked.id
    elif payload.doctor_id is not None:
        target_doctor_id = payload.doctor_id

    doctor = db.query(Doctor).filter(Doctor.id == target_doctor_id).first()
    if not doctor or not doctor.is_active:
        raise HTTPException(status_code=400, detail="Active doctor is required")

    when = payload.appointment_time.replace(second=0, microsecond=0)
    assert_slot_bookable(
        db,
        doctor,
        payload.appointment_date,
        when,
        exclude_appointment_id=row.id,
    )

    row.doctor_id = doctor.id
    row.department_id = doctor.department_id
    row.appointment_date = payload.appointment_date
    row.appointment_time = when
    if payload.notes is not None:
        row.notes = payload.notes
    # Keep workflow status, but normalize back to scheduled after a shift.
    if row.status in ACTIVE_BOOKING_STATUSES:
        row.status = "scheduled"

    db.commit()
    db.refresh(row)
    row = _load_appointment(db, row.id)
    has_rx = (
        db.query(Prescription.id)
        .filter(Prescription.appointment_id == row.id)
        .first()
        is not None
    )
    return _to_public(row, has_prescription=has_rx)


@router.patch("/{appointment_id}/status", response_model=AppointmentPublic)
def update_appointment_status(
    appointment_id: int,
    payload: AppointmentStatusUpdate,
    db: DbSession,
    current_user: StaffRoles,
) -> AppointmentPublic:
    row = _load_appointment(db, appointment_id)

    if current_user.role.lower() == "doctor":
        linked = _linked_doctor_or_404(db, current_user)
        if row.doctor_id != linked.id:
            raise HTTPException(status_code=403, detail="Not your appointment")

    row.status = payload.status
    db.commit()
    db.refresh(row)
    has_rx = (
        db.query(Prescription.id)
        .filter(Prescription.appointment_id == row.id)
        .first()
        is not None
    )
    return _to_public(row, has_prescription=has_rx)
