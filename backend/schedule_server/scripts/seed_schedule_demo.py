"""
Seed schedule DB: departments, doctors, patients, appointments.

Usage:
  python -m scripts.seed_schedule_demo
"""

from __future__ import annotations

import sys
from datetime import date, time, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models.clinical import Appointment, Department, Doctor, Patient
from app.services.codes import next_appointment_code

DEPARTMENTS = (
    ("Cardiology", "CARD", "Heart and vascular care"),
    ("Neurology", "NEURO", "Brain and nervous system"),
    ("Orthopedics", "ORTHO", "Bones and joints"),
    ("General Medicine", "GEN", "Primary care"),
    ("Pediatrics", "PED", "Child health"),
    ("Dermatology", "DERM", "Skin care"),
    ("ENT", "ENT", "Ear, nose and throat"),
)


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        dept_map: dict[str, Department] = {}
        for name, code, desc in DEPARTMENTS:
            dept = db.query(Department).filter(Department.code == code).first()
            if not dept:
                dept = Department(name=name, code=code, description=desc)
                db.add(dept)
                db.commit()
                db.refresh(dept)
                print(f"Department {code}")
            dept_map[code] = dept

        if db.query(Doctor).count() == 0:
            doctors = [
                Doctor(
                    doctor_code="D20001",
                    department_id=dept_map["GEN"].id,
                    first_name="Kumar",
                    last_name="Raj",
                    specialization="General Physician",
                    experience_years=12,
                    phone="9000000001",
                    email="kumar.raj@example.com",
                    license_number="TN-MED-1001",
                    available_days="Mon,Tue,Wed,Thu,Fri",
                    available_from=time(9, 0),
                    available_to=time(17, 0),
                    consultation_fee=500,
                ),
                Doctor(
                    doctor_code="D20002",
                    department_id=dept_map["CARD"].id,
                    first_name="Priya",
                    last_name="Nair",
                    specialization="Cardiologist",
                    experience_years=9,
                    phone="9000000002",
                    email="priya.nair@example.com",
                    license_number="TN-MED-1002",
                    available_days="Mon,Wed,Fri",
                    available_from=time(10, 0),
                    available_to=time(16, 0),
                    consultation_fee=800,
                ),
                Doctor(
                    doctor_code="D20003",
                    department_id=dept_map["PED"].id,
                    first_name="Anand",
                    last_name="Iyer",
                    specialization="Pediatrician",
                    experience_years=7,
                    phone="9000000003",
                    email="anand.iyer@example.com",
                    license_number="TN-MED-1003",
                    available_days="Tue,Thu,Sat",
                    available_from=time(9, 30),
                    available_to=time(13, 30),
                    consultation_fee=600,
                ),
            ]
            db.add_all(doctors)
            db.commit()
            print("Doctors seeded")

        if db.query(Patient).count() == 0:
            patients = [
                Patient(
                    patient_code="P10001",
                    first_name="Arun",
                    last_name="Kumar",
                    date_of_birth=date(1991, 5, 12),
                    gender="male",
                    blood_group="O+",
                    phone="9876543210",
                    email="arun.kumar@example.com",
                    city="Chennai",
                    state="Tamil Nadu",
                    country="India",
                    pincode="600001",
                ),
                Patient(
                    patient_code="P10002",
                    first_name="Priya",
                    last_name="Sharma",
                    date_of_birth=date(1998, 8, 21),
                    gender="female",
                    blood_group="A+",
                    phone="9876543211",
                    email="priya.sharma@example.com",
                    city="Chennai",
                    state="Tamil Nadu",
                    country="India",
                    pincode="600002",
                ),
                Patient(
                    patient_code="P10003",
                    first_name="Ravi",
                    last_name="Menon",
                    date_of_birth=date(1974, 1, 3),
                    gender="male",
                    blood_group="B+",
                    phone="9876543212",
                    email="ravi.menon@example.com",
                    city="Madurai",
                    state="Tamil Nadu",
                    country="India",
                    pincode="625001",
                    is_active=False,
                ),
                Patient(
                    patient_code="P10004",
                    first_name="Anu",
                    last_name="Joseph",
                    date_of_birth=date(2000, 11, 9),
                    gender="female",
                    blood_group="AB+",
                    phone="9876543213",
                    email="anu.joseph@example.com",
                    city="Coimbatore",
                    state="Tamil Nadu",
                    country="India",
                    pincode="641001",
                ),
            ]
            db.add_all(patients)
            db.commit()
            print("Patients seeded")

        patients = db.query(Patient).order_by(Patient.id.asc()).all()
        doctors = db.query(Doctor).order_by(Doctor.id.asc()).all()
        today = date.today()
        if (
            patients
            and doctors
            and db.query(Appointment)
            .filter(Appointment.appointment_date == today)
            .count()
            == 0
        ):
            samples = [
                (patients[0], doctors[0], time(9, 0), "confirmed", "Fever follow-up", 500),
                (patients[1], doctors[1], time(10, 30), "scheduled", "Chest pain", 800),
                (patients[3], doctors[0], time(11, 0), "completed", "Checkup", 500),
                (patients[2], doctors[1], time(14, 0), "in_progress", "ECG", 800),
            ]
            for i, (pat, doc, t, st, reason, fee) in enumerate(samples, start=1):
                db.add(
                    Appointment(
                        appointment_code=f"APT-{today.strftime('%Y%m%d')}-{i:03d}",
                        patient_id=pat.id,
                        doctor_id=doc.id,
                        department_id=doc.department_id,
                        appointment_date=today,
                        appointment_time=t,
                        reason=reason,
                        status=st,
                        consultation_fee=fee,
                    )
                )
            for offset in range(1, 5):
                day = today - timedelta(days=offset)
                db.add(
                    Appointment(
                        appointment_code=next_appointment_code(db, day),
                        patient_id=patients[0].id,
                        doctor_id=doctors[0].id,
                        department_id=doctors[0].department_id,
                        appointment_date=day,
                        appointment_time=time(10, 0),
                        reason="Routine visit",
                        status="completed",
                        consultation_fee=500,
                    )
                )
                db.flush()
            db.commit()
            print("Appointments seeded")

        print("Schedule demo seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
