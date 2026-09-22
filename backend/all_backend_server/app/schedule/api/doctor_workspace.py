"""Doctor workspace helpers."""

from fastapi import APIRouter

from app.schedule.deps import DbSession, LinkedDoctor
from app.schedule.schemas.clinical import DoctorPublic

router = APIRouter(prefix="/doctor-workspace", tags=["doctor-workspace"])


@router.get("/me", response_model=DoctorPublic)
def get_my_doctor_profile(doctor: LinkedDoctor, db: DbSession) -> DoctorPublic:
    _ = db
    data = DoctorPublic.model_validate(doctor)
    dept_name = doctor.department.name if doctor.department else None
    return data.model_copy(update={"department_name": dept_name})
