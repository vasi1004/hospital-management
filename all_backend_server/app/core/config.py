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

    # Appointment booking grid (minutes). Used for free-slot generation + validation.
    appointment_slot_minutes: int = Field(default=30, ge=5, le=120)

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
