from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


GenderLiteral = Literal["male", "female", "other"]


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


class DepartmentBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    code: str = Field(min_length=2, max_length=20)
    description: Optional[str] = None
    is_active: bool = True


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(DepartmentBase):
    pass


class DepartmentPublic(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class DoctorBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    specialization: str = Field(min_length=2, max_length=120)
    department_id: Optional[int] = None
    experience_years: int = Field(default=0, ge=0, le=60)
    phone: str = Field(min_length=10, max_length=15)
    email: Optional[EmailStr] = None
    license_number: Optional[str] = Field(default=None, max_length=80)
    consultation_fee: Decimal = Field(default=Decimal("0"))
    auth_user_id: Optional[int] = None
    is_active: bool = True

    @field_validator("phone")
    @classmethod
    def validate_doctor_phone(cls, value: str) -> str:
        digits = "".join(ch for ch in value if ch.isdigit())
        if len(digits) != 10:
            raise ValueError("Phone number must be 10 digits")
        return digits


class DoctorCreate(DoctorBase):
    auth_user_id: int = Field(..., description="Linked auth users.id (role=doctor)")


class DoctorUpdate(DoctorBase):
    auth_user_id: int = Field(..., description="Linked auth users.id (role=doctor)")


class DoctorAvailabilityUpdate(BaseModel):
    """Doctor-owned schedule. Admin/reception cannot set these fields."""

    available_days: str = Field(
        ...,
        min_length=1,
        max_length=120,
        description="Comma-separated weekdays, e.g. Mon,Tue,Wed",
    )
    available_from: time
    available_to: time

    @model_validator(mode="after")
    def validate_window(self) -> "DoctorAvailabilityUpdate":
        if self.available_from >= self.available_to:
            raise ValueError("available_from must be earlier than available_to")
        return self


class DoctorPublic(DoctorBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    doctor_code: str
    department_name: Optional[str] = None
    available_days: Optional[str] = None
    available_from: Optional[time] = None
    available_to: Optional[time] = None
    created_at: datetime
    updated_at: datetime


class DoctorListResponse(BaseModel):
    items: list[DoctorPublic]
    total: int
    page: int
    page_size: int
    total_pages: int


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
    total_departments: int
    todays_appointments: int
    pending_appointments: int
    completed_appointments: int
    total_revenue: Decimal
    todays_list: list[TodayAppointmentItem]
    appointment_stats: list[AppointmentStatPoint]


class DoctorAvailabilityDayDoctor(BaseModel):
    id: int
    doctor_code: str
    first_name: str
    last_name: str
    specialization: str
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    available_from: Optional[time] = None
    available_to: Optional[time] = None
    free_slot_count: int


class DoctorAvailabilityDay(BaseModel):
    date: date
    weekday: str
    label: str
    is_today: bool
    available_doctor_count: int
    total_free_slots: int
    doctors: list[DoctorAvailabilityDayDoctor]


class DoctorAvailabilityOverviewSummary(BaseModel):
    today_available_doctors: int
    today_free_slots: int
    week_available_doctor_days: int
    week_unique_doctors: int
    week_free_slots: int


class DoctorAvailabilityOverview(BaseModel):
    generated_on: date
    days_requested: int
    slot_minutes: int
    summary: DoctorAvailabilityOverviewSummary
    days: list[DoctorAvailabilityDay]


AppointmentStatusLiteral = Literal[
    "scheduled",
    "confirmed",
    "in_progress",
    "completed",
    "cancelled",
    "no_show",
]


class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    department_id: Optional[int] = None
    appointment_date: date
    appointment_time: time
    reason: str = Field(min_length=2, max_length=255)
    appointment_type: str = Field(default="consultation", max_length=40)
    priority: str = Field(default="normal", max_length=20)
    status: AppointmentStatusLiteral = "scheduled"
    notes: Optional[str] = None
    consultation_fee: Decimal = Field(default=Decimal("0"))


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatusLiteral


class AppointmentReschedule(BaseModel):
    """Shift an appointment to a new date/time (optionally another doctor for front desk)."""

    appointment_date: date
    appointment_time: time
    doctor_id: Optional[int] = None
    notes: Optional[str] = Field(default=None, max_length=2000)


class DoctorAvailabilityItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    doctor_code: str
    first_name: str
    last_name: str
    specialization: str
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    experience_years: int = 0
    available_days: Optional[str] = None
    available_from: Optional[time] = None
    available_to: Optional[time] = None
    consultation_fee: Decimal
    free_slot_count: int = 0


class DoctorAvailabilityResponse(BaseModel):
    date: date
    weekday: str
    slot_minutes: int
    doctors: list[DoctorAvailabilityItem]


class DoctorSlotsResponse(BaseModel):
    doctor_id: int
    doctor_name: str
    date: date
    weekday: str
    available_days: Optional[str] = None
    available_from: Optional[time] = None
    available_to: Optional[time] = None
    slot_minutes: int
    slots: list[time]


class AppointmentPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    appointment_code: str
    patient_id: int
    doctor_id: int
    department_id: Optional[int] = None
    appointment_date: date
    appointment_time: time
    reason: str
    appointment_type: str
    priority: str
    status: str
    notes: Optional[str] = None
    consultation_fee: Decimal
    created_at: datetime
    updated_at: datetime
    patient_name: Optional[str] = None
    patient_code: Optional[str] = None
    doctor_name: Optional[str] = None
    department_name: Optional[str] = None
    has_prescription: bool = False


class AppointmentListResponse(BaseModel):
    items: list[AppointmentPublic]
    total: int
    page: int
    page_size: int
    total_pages: int


class PrescriptionItemIn(BaseModel):
    medicine_name: str = Field(min_length=1, max_length=150)
    dose: str = Field(min_length=1, max_length=80)
    frequency: str = Field(min_length=1, max_length=80)
    duration: str = Field(min_length=1, max_length=80)
    instructions: Optional[str] = Field(default=None, max_length=255)


class PrescriptionCreate(BaseModel):
    appointment_id: int
    diagnosis: str = Field(min_length=2, max_length=255)
    advice: Optional[str] = None
    notes: Optional[str] = None
    items: list[PrescriptionItemIn] = Field(min_length=1)


class PrescriptionItemPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    medicine_name: str
    dose: str
    frequency: str
    duration: str
    instructions: Optional[str] = None
    sort_order: int


class PrescriptionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    prescription_code: str
    appointment_id: int
    patient_id: int
    doctor_id: int
    diagnosis: str
    advice: Optional[str] = None
    notes: Optional[str] = None
    prescribed_on: date
    created_at: datetime
    updated_at: datetime
    patient_name: Optional[str] = None
    patient_code: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_specialization: Optional[str] = None
    appointment_code: Optional[str] = None
    appointment_date: Optional[date] = None
    items: list[PrescriptionItemPublic] = []


class PrescriptionListResponse(BaseModel):
    items: list[PrescriptionPublic]
    total: int
