import logging
import sys
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text

from app.api.v1 import api_router
from app.core.config import get_settings
from app.core.rate_limit import limiter

settings = get_settings()


def ensure_schema() -> None:
    """Create missing tables on each domain DB (idempotent)."""
    # Auth
    from app.auth import db as auth_db
    from app.auth.models import clinical as _auth_clinical  # noqa: F401
    from app.auth.models import department as _auth_department  # noqa: F401
    from app.auth.models import user as _auth_user  # noqa: F401

    auth_db.Base.metadata.create_all(bind=auth_db.engine)

    # Schedule
    from app.schedule import db as schedule_db
    from app.schedule.models import clinical as _schedule_clinical  # noqa: F401

    schedule_db.Base.metadata.create_all(bind=schedule_db.engine)

    # Audit
    from app.audit import db as audit_db
    from app.audit.models import audit as _audit_model  # noqa: F401

    audit_db.Base.metadata.create_all(bind=audit_db.engine)


ensure_schema()

LOG_DIR = Path(__file__).resolve().parents[1] / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / "access.log"

logger = logging.getLogger("all_backend_server")
logger.setLevel(logging.INFO)
logger.handlers.clear()
_formatter = logging.Formatter("%(asctime)s | %(message)s")
_stream = logging.StreamHandler(sys.stdout)
_stream.setFormatter(_formatter)
logger.addHandler(_stream)
_file = logging.FileHandler(LOG_FILE, encoding="utf-8")
_file.setFormatter(_formatter)
logger.addHandler(_file)

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Audit-Token"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    client = request.client.host if request.client else "-"
    logger.info(
        "%s %s %s -> %s",
        client,
        request.method,
        request.url.path,
        response.status_code,
    )
    return response


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "all_backend",
        "env": settings.app_env,
    }


@app.get("/ready", tags=["system"])
def ready() -> JSONResponse:
    from app.audit.db import engine as audit_engine
    from app.auth.db import engine as auth_engine
    from app.schedule.db import engine as schedule_engine

    checks = {
        "auth": auth_engine,
        "schedule": schedule_engine,
        "audit": audit_engine,
    }
    status_map: dict[str, str] = {}
    errors: dict[str, str] = {}
    for name, engine in checks.items():
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            status_map[name] = "up"
        except Exception as exc:  # noqa: BLE001
            status_map[name] = "down"
            errors[name] = str(exc) if settings.debug else "unavailable"

    if any(v != "up" for v in status_map.values()):
        return JSONResponse(
            status_code=503,
            content={
                "status": "not_ready",
                "databases": status_map,
                "detail": errors,
            },
        )
    return JSONResponse(
        {"status": "ready", "service": "all_backend", "databases": status_map}
    )
