"""
Seed departments, doctors, patients, and today's appointments for Phase 3–4 demos.

Usage:
  python -m scripts.seed_clinical_demo
"""

from __future__ import annotations

import sys
from datetime import date, time, timedelta
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.models.clinical import Appointment, Doctor, Patient
from app.models.department import Department
from app.models.user import User
from app.services.codes import next_appointment_code, next_doctor_code, next_patient_code

DEPARTMENTS = (
    ("Cardiology", "CARD"),
    ("Neurology", "NEURO"),
    ("Orthopedics", "ORTHO"),
    ("General Medicine", "GEN"),
    ("Pediatrics", "PED"),
)

PATIENTS = (
    {
        "first_name": "Arun",
        "last_name": "Kumar",
        "date_of_birth": date(1991, 5, 12),
        "gender": "male",
        "blood_group": "O+",
        "phone": "9876543210",
        "email": "arun.kumar@example.com",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
        "pincode": "600001",
        "allergies": "None",
    },
    {
        "first_name": "Priya",
        "last_name": "Sharma",
        "date_of_birth": date(1998, 8, 21),
        "gender": "female",
        "blood_group": "A+",
        "phone": "9876543211",
        "email": "priya.sharma@example.com",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
        "pincode": "600002",
    },
    {
        "first_name": "Ravi",
        "last_name": "Menon",
        "date_of_birth": date(1974, 1, 3),
        "gender": "male",
        "blood_group": "B+",
        "phone": "9876543212",
        "email": "ravi.menon@example.com",
        "city": "Madurai",
        "state": "Tamil Nadu",
        "country": "India",
        "pincode": "625001",
        "is_active": False,
    },
    {
        "first_name": "Anu",
        "last_name": "Joseph",
        "date_of_birth": date(2000, 11, 9),
        "gender": "female",
        "blood_group": "AB+",
        "phone": "9876543213",
        "email": "anu.joseph@example.com",
        "city": "Coimbatore",
        "state": "Tamil Nadu",
        "country": "India",
        "pincode": "641001",
    },
)


def seed_clinical_demo() -> None:
    db = SessionLocal()
    try:
        # Departments
        dept_map: dict[str, Department] = {}
        for name, code in DEPARTMENTS:
            dept = db.query(Department).filter(Department.code == code).first()
            if not dept:
                dept = Department(name=name, code=code, description=f"{name} department")
                db.add(dept)
                db.commit()
                db.refresh(dept)
                print(f"Created department {code}")
            dept_map[code] = dept

        # Doctors (link doctor user if present)
        doctor_user = db.query(User).filter(User.username == "doctor").first()
        doctors = db.query(Doctor).all()
        if not doctors:
            docs = [
                Doctor(
                    doctor_code=next_doctor_code(db),
                    user_id=doctor_user.id if doctor_user else None,
                    department_id=dept_map["GEN"].id,
                    first_name="Kumar",
                    last_name="Raj",
                    specialization="General Physician",
                    experience_years=12,
                    phone="9000000001",
                    email="doctor@hospital.local",
                    license_number="TN-MED-1001",
                    consultation_fee=500,
                ),
                Doctor(
                    doctor_code=next_doctor_code(db),
                    department_id=dept_map["CARD"].id,
                    first_name="Priya",
                    last_name="Nair",
                    specialization="Cardiologist",
                    experience_years=9,
                    phone="9000000002",
                    email="priya.nair@hospital.local",
                    license_number="TN-MED-1002",
                    consultation_fee=800,
                ),
            ]
            for d in docs:
                # next_doctor_code needs commit between if based on id - set codes manually
                db.add(d)
            # Fix codes before flush
            docs[0].doctor_code = "D20001"
            docs[1].doctor_code = "D20002"
            db.commit()
            print("Created doctors D20001, D20002")
            doctors = db.query(Doctor).order_by(Doctor.id.asc()).all()
        else:
            print(f"Doctors already present: {len(doctors)}")

        # Patients
        patient_user = db.query(User).filter(User.username == "patient").first()
        existing_patients = db.query(Patient).count()
        if existing_patients == 0:
            for idx, item in enumerate(PATIENTS):
                payload = dict(item)
                is_active = payload.pop("is_active", True)
                patient = Patient(
                    patient_code=f"P{10001 + idx}",
                    user_id=patient_user.id if idx == 0 and patient_user else None,
                    is_active=is_active,
                    **payload,
                )
                db.add(patient)
            db.commit()
            print(f"Created {len(PATIENTS)} patients")
        else:
            print(f"Patients already present: {existing_patients}")

        patients = db.query(Patient).order_by(Patient.id.asc()).all()
        doctors = db.query(Doctor).order_by(Doctor.id.asc()).all()
        if not patients or not doctors:
            print("Skip appointments — need patients and doctors")
            return

        today = date.today()
        existing_today = (
            db.query(Appointment)
            .filter(Appointment.appointment_date == today)
            .count()
        )
        if existing_today == 0:
            samples = [
                (patients[0], doctors[0], time(9, 0), "confirmed", "Fever follow-up", 500),
                (patients[1], doctors[1], time(10, 30), "scheduled", "Chest pain review", 800),
                (patients[3] if len(patients) > 3 else patients[0], doctors[0], time(11, 0), "completed", "General checkup", 500),
                (patients[2] if len(patients) > 2 else patients[0], doctors[1], time(14, 0), "in_progress", "ECG review", 800),
            ]
            for i, (pat, doc, t, st, reason, fee) in enumerate(samples, start=1):
                appt = Appointment(
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
                db.add(appt)

            # Past few days for chart
            for offset in range(1, 5):
                day = today - timedelta(days=offset)
                appt = Appointment(
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
                db.add(appt)
                db.flush()

            db.commit()
            print("Created today's appointments + recent history")
        else:
            print(f"Today's appointments already present: {existing_today}")

        print("Clinical demo seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_clinical_demo()
