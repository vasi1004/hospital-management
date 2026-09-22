from datetime import date, timedelta
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func

from app.core.deps import DbSession, require_roles
from app.models.clinical import Appointment, Doctor, Patient
from app.models.user import User
from app.schemas.clinical import (
    AppointmentStatPoint,
    DashboardSummary,
    TodayAppointmentItem,
)

AdminOrStaff = Annotated[
    User, Depends(require_roles("admin", "receptionist", "doctor"))
]
AdminOnly = Annotated[User, Depends(require_roles("admin"))]

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/admin", response_model=DashboardSummary)
def admin_dashboard(db: DbSession, _: AdminOnly) -> DashboardSummary:
    today = date.today()
    total_patients = db.query(func.count(Patient.id)).scalar() or 0
    total_doctors = (
        db.query(func.count(Doctor.id)).filter(Doctor.is_active.is_(True)).scalar()
        or 0
    )

    todays_q = db.query(Appointment).filter(Appointment.appointment_date == today)
    todays_appointments = todays_q.count()
    pending_appointments = todays_q.filter(
        Appointment.status.in_(("scheduled", "confirmed", "in_progress"))
    ).count()
    completed_appointments = todays_q.filter(
        Appointment.status == "completed"
    ).count()

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
    todays_list: list[TodayAppointmentItem] = []
    for appt in rows:
        patient = appt.patient
        doctor = appt.doctor
        todays_list.append(
            TodayAppointmentItem(
                id=appt.id,
                appointment_code=appt.appointment_code,
                appointment_time=appt.appointment_time,
                patient_name=f"{patient.first_name} {patient.last_name}",
                doctor_name=f"Dr. {doctor.first_name} {doctor.last_name}",
                status=appt.status,
                reason=appt.reason,
            )
        )

    # Last 7 days appointment counts for chart
    stats: list[AppointmentStatPoint] = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        count = (
            db.query(func.count(Appointment.id))
            .filter(Appointment.appointment_date == day)
            .scalar()
            or 0
        )
        stats.append(
            AppointmentStatPoint(label=day.strftime("%a"), count=int(count))
        )

    return DashboardSummary(
        total_patients=int(total_patients),
        total_doctors=int(total_doctors),
        todays_appointments=int(todays_appointments),
        pending_appointments=int(pending_appointments),
        completed_appointments=int(completed_appointments),
        total_revenue=total_revenue,
        todays_list=todays_list,
        appointment_stats=stats,
    )
