from datetime import date, timedelta
from decimal import Decimal
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import joinedload

from app.schedule.deps import DbSession, TokenUser, require_roles
from app.schedule.models.clinical import Appointment, Department, Doctor, Patient
from app.schedule.schemas.clinical import (
    AppointmentStatPoint,
    DashboardSummary,
    DoctorAvailabilityDay,
    DoctorAvailabilityDayDoctor,
    DoctorAvailabilityOverview,
    DoctorAvailabilityOverviewSummary,
    TodayAppointmentItem,
)
from app.schedule.services.availability import (
    doctors_available_on,
    free_slots_for_doctor,
    slot_minutes,
    weekday_short,
)

AdminOnly = Annotated[TokenUser, Depends(require_roles("admin"))]
DeskRoles = Annotated[TokenUser, Depends(require_roles("admin", "receptionist"))]

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _day_label(day: date, today: date) -> str:
    if day == today:
        return "Today"
    if day == today + timedelta(days=1):
        return "Tomorrow"
    return day.strftime("%a")


@router.get("/admin", response_model=DashboardSummary)
def admin_dashboard(db: DbSession, _: AdminOnly) -> DashboardSummary:
    today = date.today()
    total_patients = db.query(func.count(Patient.id)).scalar() or 0
    total_doctors = (
        db.query(func.count(Doctor.id)).filter(Doctor.is_active.is_(True)).scalar() or 0
    )
    total_departments = (
        db.query(func.count(Department.id))
        .filter(Department.is_active.is_(True))
        .scalar()
        or 0
    )

    todays_q = db.query(Appointment).filter(Appointment.appointment_date == today)
    todays_appointments = todays_q.count()
    pending_appointments = todays_q.filter(
        Appointment.status.in_(("scheduled", "confirmed", "in_progress"))
    ).count()
    completed_appointments = todays_q.filter(Appointment.status == "completed").count()

    revenue = (
        db.query(func.coalesce(func.sum(Appointment.consultation_fee), 0))
        .filter(Appointment.status == "completed")
        .scalar()
    )
    total_revenue = Decimal(str(revenue or 0))

    rows = (
        db.query(Appointment)
        .filter(Appointment.appointment_date == today)
        .order_by(Appointment.appointment_time.asc())
        .limit(20)
        .all()
    )
    todays_list = [
        TodayAppointmentItem(
            id=appt.id,
            appointment_code=appt.appointment_code,
            appointment_time=appt.appointment_time,
            patient_name=f"{appt.patient.first_name} {appt.patient.last_name}",
            doctor_name=f"Dr. {appt.doctor.first_name} {appt.doctor.last_name}",
            status=appt.status,
            reason=appt.reason,
        )
        for appt in rows
    ]

    stats: list[AppointmentStatPoint] = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        count = (
            db.query(func.count(Appointment.id))
            .filter(Appointment.appointment_date == day)
            .scalar()
            or 0
        )
        stats.append(AppointmentStatPoint(label=day.strftime("%a"), count=int(count)))

    return DashboardSummary(
        total_patients=int(total_patients),
        total_doctors=int(total_doctors),
        total_departments=int(total_departments),
        todays_appointments=int(todays_appointments),
        pending_appointments=int(pending_appointments),
        completed_appointments=int(completed_appointments),
        total_revenue=total_revenue,
        todays_list=todays_list,
        appointment_stats=stats,
    )


@router.get("/doctor-availability", response_model=DoctorAvailabilityOverview)
def doctor_availability_overview(
    db: DbSession,
    _: DeskRoles,
    days: int = Query(default=7, ge=1, le=14),
    department_id: Optional[int] = None,
) -> DoctorAvailabilityOverview:
    """
    Live doctor availability for today and upcoming days.

    Built from each doctor's self-published schedule + free appointment slots.
    Used by Admin and Reception dashboards (no hardcoded calendars).
    """
    today = date.today()
    query = (
        db.query(Doctor)
        .options(joinedload(Doctor.department))
        .filter(Doctor.is_active.is_(True))
    )
    if department_id is not None:
        query = query.filter(Doctor.department_id == department_id)
    doctors = query.order_by(Doctor.first_name.asc(), Doctor.last_name.asc()).all()

    day_rows: list[DoctorAvailabilityDay] = []
    unique_doctor_ids: set[int] = set()
    week_doctor_days = 0
    week_free_slots = 0
    today_available_doctors = 0
    today_free_slots = 0

    for offset in range(days):
        day = today + timedelta(days=offset)
        available = doctors_available_on(doctors, day)
        day_doctors: list[DoctorAvailabilityDayDoctor] = []
        day_slots = 0

        for doctor in available:
            slots = free_slots_for_doctor(db, doctor, day)
            if not slots:
                continue
            slot_count = len(slots)
            day_slots += slot_count
            unique_doctor_ids.add(doctor.id)
            dept_name = doctor.department.name if doctor.department else None
            day_doctors.append(
                DoctorAvailabilityDayDoctor(
                    id=doctor.id,
                    doctor_code=doctor.doctor_code,
                    first_name=doctor.first_name,
                    last_name=doctor.last_name,
                    specialization=doctor.specialization,
                    department_id=doctor.department_id,
                    department_name=dept_name,
                    available_from=doctor.available_from,
                    available_to=doctor.available_to,
                    free_slot_count=slot_count,
                )
            )

        doctor_count = len(day_doctors)
        week_doctor_days += doctor_count
        week_free_slots += day_slots
        if day == today:
            today_available_doctors = doctor_count
            today_free_slots = day_slots

        day_rows.append(
            DoctorAvailabilityDay(
                date=day,
                weekday=weekday_short(day),
                label=_day_label(day, today),
                is_today=day == today,
                available_doctor_count=doctor_count,
                total_free_slots=day_slots,
                doctors=day_doctors,
            )
        )

    return DoctorAvailabilityOverview(
        generated_on=today,
        days_requested=days,
        slot_minutes=slot_minutes(),
        summary=DoctorAvailabilityOverviewSummary(
            today_available_doctors=today_available_doctors,
            today_free_slots=today_free_slots,
            week_available_doctor_days=week_doctor_days,
            week_unique_doctors=len(unique_doctor_ids),
            week_free_slots=week_free_slots,
        ),
        days=day_rows,
    )
