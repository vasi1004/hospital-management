from fastapi import APIRouter

from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.departments import router as departments_router
from app.api.v1.doctors import router as doctors_router
from app.api.v1.patients import router as patients_router

api_router = APIRouter()
api_router.include_router(dashboard_router)
api_router.include_router(patients_router)
api_router.include_router(departments_router)
api_router.include_router(doctors_router)
