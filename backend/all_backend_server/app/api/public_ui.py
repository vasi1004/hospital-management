"""Public UI configuration (no auth) for frontend branding and loaders."""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.config import get_settings

router = APIRouter(prefix="/public", tags=["public"])


class UiLoaderMaterial(BaseModel):
    roughness: int = Field(default=100, ge=0, le=100)
    reflect: int = Field(default=100, ge=0, le=100)


class UiLoaderMotion(BaseModel):
    spin: int = Field(default=90, ge=0, le=360)
    fold: int = Field(default=90, ge=0, le=180)
    hold: int = Field(default=50, ge=0, le=100)


class UiLoaderCamera(BaseModel):
    tilt: int = Field(default=18, ge=0, le=90)
    side_tilt: int = Field(default=0, ge=-45, le=45)


class UiLoaderConfig(BaseModel):
    enabled: bool = True
    mode: Literal["login", "api", "both"] = "both"
    background: str = "rgba(244, 244, 245, 0.94)"
    base_color: str = "#059669"
    speed: int = Field(default=50, ge=0, le=200)
    distance: float = Field(default=11.0, ge=4.0, le=24.0)
    material: UiLoaderMaterial = Field(default_factory=UiLoaderMaterial)
    motion: UiLoaderMotion = Field(default_factory=UiLoaderMotion)
    camera: UiLoaderCamera = Field(default_factory=UiLoaderCamera)


class OfflinePlayGameConfig(BaseModel):
    background: str = "#00484C"
    ink: str = "#FFFFFF"
    start_speed: int = Field(default=620, ge=100, le=2000)
    jump: int = Field(default=1840, ge=400, le=4000)


class OfflinePlayConfig(BaseModel):
    """Login-only experience while GET /health is unreachable."""

    enabled: bool = True
    offline_message: str = "Can't reach the server — play while we reconnect"
    reconnect_message: str = "Server is back — continue"
    reconnect_notice_ms: int = Field(default=1000, ge=250, le=10000)
    fail_threshold: int = Field(default=2, ge=1, le=10)
    success_threshold: int = Field(default=1, ge=1, le=10)
    poll_interval_online_ms: int = Field(default=15000, ge=2000, le=120000)
    poll_interval_offline_ms: int = Field(default=4000, ge=1000, le=60000)
    request_timeout_ms: int = Field(default=4000, ge=500, le=30000)
    game: OfflinePlayGameConfig = Field(default_factory=OfflinePlayGameConfig)


class PublicUiConfigResponse(BaseModel):
    hospital_display_name: str
    loader: UiLoaderConfig
    offline_play: OfflinePlayConfig


def _loader_mode(raw: str) -> Literal["login", "api", "both"]:
    mode = (raw or "both").strip().lower()
    if mode in ("login", "api", "both"):
        return mode  # type: ignore[return-value]
    return "both"


@router.get("/ui-config", response_model=PublicUiConfigResponse)
def get_public_ui_config() -> PublicUiConfigResponse:
    settings = get_settings()
    return PublicUiConfigResponse(
        hospital_display_name=settings.hospital_display_name,
        loader=UiLoaderConfig(
            enabled=settings.ui_loader_enabled,
            mode=_loader_mode(settings.ui_loader_mode),
            background=settings.ui_loader_background,
            base_color=settings.ui_loader_base_color,
            speed=settings.ui_loader_speed,
            distance=settings.ui_loader_distance,
            material=UiLoaderMaterial(
                roughness=settings.ui_loader_material_roughness,
                reflect=settings.ui_loader_material_reflect,
            ),
            motion=UiLoaderMotion(
                spin=settings.ui_loader_motion_spin,
                fold=settings.ui_loader_motion_fold,
                hold=settings.ui_loader_motion_hold,
            ),
            camera=UiLoaderCamera(
                tilt=settings.ui_loader_camera_tilt,
                side_tilt=settings.ui_loader_camera_side_tilt,
            ),
        ),
        offline_play=OfflinePlayConfig(
            enabled=settings.ui_offline_play_enabled,
            offline_message=settings.ui_offline_message,
            reconnect_message=settings.ui_offline_reconnect_message,
            reconnect_notice_ms=settings.ui_offline_reconnect_notice_ms,
            fail_threshold=settings.ui_offline_fail_threshold,
            success_threshold=settings.ui_offline_success_threshold,
            poll_interval_online_ms=settings.ui_offline_poll_interval_online_ms,
            poll_interval_offline_ms=settings.ui_offline_poll_interval_offline_ms,
            request_timeout_ms=settings.ui_offline_request_timeout_ms,
            game=OfflinePlayGameConfig(
                background=settings.ui_offline_game_background,
                ink=settings.ui_offline_game_ink,
                start_speed=settings.ui_offline_game_start_speed,
                jump=settings.ui_offline_game_jump,
            ),
        ),
    )
