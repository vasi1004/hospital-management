from functools import lru_cache
from typing import List

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Unified HMS backend settings (auth + schedule + audit)."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "HMS All Backend Server"
    app_env: str = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    host: str = "127.0.0.1"
    port: int = 8000

    # Three existing PostgreSQL databases (unchanged data boundaries).
    auth_database_url: str = Field(..., description="Auth / users DB")
    schedule_database_url: str = Field(..., description="Clinical / schedule DB")
    audit_database_url: str = Field(..., description="Audit trail DB")

    secret_key: str = Field(..., min_length=32)
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:5173,http://127.0.0.1:5173"
    )
    login_rate_limit: str = "10/minute"

    admin_username: str = "admin"
    admin_email: str = "admin@example.com"
    admin_password: str = "Admin@123"
    admin_full_name: str = "Administrator"

    # Optional machine ingest for external emitters (JWT admin still used for reads).
    audit_service_token: str = ""
    # When false, auth emits are skipped (emergency kill-switch).
    audit_emit_enabled: bool = True

    # Transactional email (Resend). Kill-switch + empty API key = no send.
    email_enabled: bool = True
    resend_api_key: str = ""
    email_from: str = "onboarding@resend.dev"
    email_from_name: str = "Hospital Management System"
    hospital_display_name: str = "Hospital Management System"
    frontend_login_url: str = "http://127.0.0.1:3000/login"

    # Appointment booking grid (minutes). Used for free-slot generation + validation.
    appointment_slot_minutes: int = Field(default=30, ge=5, le=120)

    # Public UI loader (Metal Unfold) — exposed via GET /api/v1/public/ui-config
    ui_loader_enabled: bool = True
    ui_loader_mode: str = "both"  # login | api | both (api = non-GET requests)
    ui_loader_background: str = "rgba(244, 244, 245, 0.94)"
    ui_loader_base_color: str = "#059669"
    ui_loader_speed: int = Field(default=50, ge=0, le=200)
    ui_loader_distance: float = Field(default=11.0, ge=4.0, le=24.0)
    ui_loader_material_roughness: int = Field(default=100, ge=0, le=100)
    ui_loader_material_reflect: int = Field(default=100, ge=0, le=100)
    ui_loader_motion_spin: int = Field(default=90, ge=0, le=360)
    ui_loader_motion_fold: int = Field(default=90, ge=0, le=180)
    ui_loader_motion_hold: int = Field(default=50, ge=0, le=100)
    ui_loader_camera_tilt: int = Field(default=18, ge=0, le=90)
    ui_loader_camera_side_tilt: int = Field(default=0, ge=-45, le=45)

    # Login offline play (GET /api/v1/public/ui-config → offline_play)
    # Used when frontend cannot reach GET /health; values are env-driven.
    ui_offline_play_enabled: bool = True
    ui_offline_message: str = "Can't reach the server — play while we reconnect"
    ui_offline_reconnect_message: str = "Server is back — continue"
    ui_offline_reconnect_notice_ms: int = Field(default=1000, ge=250, le=10000)
    ui_offline_fail_threshold: int = Field(default=2, ge=1, le=10)
    ui_offline_success_threshold: int = Field(default=1, ge=1, le=10)
    ui_offline_poll_interval_online_ms: int = Field(default=15000, ge=2000, le=120000)
    ui_offline_poll_interval_offline_ms: int = Field(default=4000, ge=1000, le=60000)
    ui_offline_request_timeout_ms: int = Field(default=4000, ge=500, le=30000)
    ui_offline_game_background: str = "#00484C"
    ui_offline_game_ink: str = "#FFFFFF"
    ui_offline_game_start_speed: int = Field(default=620, ge=100, le=2000)
    ui_offline_game_jump: int = Field(default=1840, ge=400, le=4000)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
