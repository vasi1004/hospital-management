from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


GenderLiteral = Literal["male", "female", "other"]
AppointmentStatusLiteral = Literal[
    "scheduled",
    "confirmed",
    "in_progress",
    "completed",
    "cancelled",
    "no_show",
]


class PatientBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    date_of_birth: date
    gender: GenderLiteral
    blood_group: Optional[str] = Field(default=None, max_length=5)
    phone: str = Field(min_length=10, max_length=15)
    email: Optional[EmailStr] = None
    address: Optional[str] = Field(default=None, max_length=255)
    city: Optional[str] = Field(default=None, max_length=80)
    state: Optional[str] = Field(default=None, max_length=80)
    country: Optional[str] = Field(default=None, max_length=80)
    pincode: Optional[str] = Field(default=None, max_length=10)
    emergency_contact_name: Optional[str] = Field(default=None, max_length=120)
    emergency_relationship: Optional[str] = Field(default=None, max_length=80)
    emergency_contact_number: Optional[str] = Field(default=None, max_length=15)
    allergies: Optional[str] = None
    existing_conditions: Optional[str] = None
    medical_history: Optional[str] = None
    is_active: bool = True

    @field_validator("phone", "emergency_contact_number")
    @classmethod
    def validate_phone(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None
        digits = "".join(ch for ch in value if ch.isdigit())
        if len(digits) != 10:
            raise ValueError("Phone number must be 10 digits")
        return digits

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None
        if not value.isdigit() or len(value) != 6:
            raise ValueError("Pincode must be 6 digits")
        return value

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return value


class PatientCreate(PatientBase):
    pass


class PatientUpdate(PatientBase):
    pass


class PatientPublic(PatientBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_code: str
    age: int
    created_at: datetime
    updated_at: datetime


class PatientListResponse(BaseModel):
    items: list[PatientPublic]
    total: int
    page: int
    page_size: int
    total_pages: int


class DoctorPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    doctor_code: str
    first_name: str
    last_name: str
    specialization: str
    department_id: Optional[int] = None
    experience_years: int
    phone: str
    email: Optional[str] = None
    consultation_fee: Decimal
    is_active: bool


class TodayAppointmentItem(BaseModel):
    id: int
    appointment_code: str
    appointment_time: time
    patient_name: str
    doctor_name: str
    status: str
    reason: str


class AppointmentStatPoint(BaseModel):
    label: str
    count: int


class DashboardSummary(BaseModel):
    total_patients: int
    total_doctors: int
    todays_appointments: int
    pending_appointments: int
    completed_appointments: int
    total_revenue: Decimal
    todays_list: list[TodayAppointmentItem]
    appointment_stats: list[AppointmentStatPoint]
