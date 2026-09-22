from app.db.session import Base
from app.models.clinical import Appointment, Department, Doctor, Patient

__all__ = ["Base", "Department", "Doctor", "Patient", "Appointment"]
