from datetime import date

from sqlalchemy.orm import Session


def calc_age(dob: date) -> int:
    today = date.today()
    years = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        years -= 1
    return max(years, 0)


def next_patient_code(db: Session) -> str:
    from app.schedule.models.clinical import Patient

    last = db.query(Patient).order_by(Patient.id.desc()).first()
    next_num = (last.id + 1) if last else 1
    return f"P{10000 + next_num}"


def next_doctor_code(db: Session) -> str:
    from app.schedule.models.clinical import Doctor

    last = db.query(Doctor).order_by(Doctor.id.desc()).first()
    next_num = (last.id + 1) if last else 1
    return f"D{20000 + next_num}"


def next_appointment_code(db: Session, day: date | None = None) -> str:
    from app.schedule.models.clinical import Appointment

    day = day or date.today()
    stamp = day.strftime("%Y%m%d")
    count = (
        db.query(Appointment).filter(Appointment.appointment_date == day).count()
    )
    return f"APT-{stamp}-{count + 1:03d}"


def next_prescription_code(db: Session, day: date | None = None) -> str:
    from app.schedule.models.clinical import Prescription

    day = day or date.today()
    stamp = day.strftime("%Y%m%d")
    count = db.query(Prescription).filter(Prescription.prescribed_on == day).count()
    return f"RX-{stamp}-{count + 1:03d}"
