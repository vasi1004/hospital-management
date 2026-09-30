from fastapi import APIRouter

from app.auth.api.auth import router as auth_router
from app.auth.api.users import users_router
from app.audit.api.events import router as audit_router
from app.schedule.api.appointments import router as appointments_router
from app.schedule.api.dashboard import router as dashboard_router
from app.schedule.api.departments import router as departments_router
from app.schedule.api.doctor_workspace import router as doctor_workspace_router
from app.schedule.api.doctors import router as doctors_router
from app.schedule.api.patients import router as patients_router
from app.schedule.api.prescriptions import router as prescriptions_router

api_router = APIRouter()

# Auth domain (was auth_server :8000)
api_router.include_router(auth_router)
api_router.include_router(users_router)

# Schedule / clinical domain (was schedule_server :8001)
api_router.include_router(dashboard_router)
api_router.include_router(patients_router)
api_router.include_router(departments_router)
api_router.include_router(doctors_router)
api_router.include_router(appointments_router)
api_router.include_router(prescriptions_router)
api_router.include_router(doctor_workspace_router)

# Audit domain (was audit_server :8002)
api_router.include_router(audit_router)
