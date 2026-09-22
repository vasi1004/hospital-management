"""Start the Schedule server using this project's own venv.

Usage (from backend/schedule_server):
  python run.py
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VENV_PYTHON = ROOT / "venv" / "Scripts" / "python.exe"


def _running_in_project_venv() -> bool:
    try:
        return Path(sys.executable).resolve() == VENV_PYTHON.resolve()
    except OSError:
        return False


def main() -> None:
    if not VENV_PYTHON.exists():
        raise SystemExit(
            "Virtual environment not found for schedule_server.\n"
            f"Expected: {VENV_PYTHON}\n"
            "Create it with:\n"
            "  python -m venv venv\n"
            "  .\\venv\\Scripts\\pip.exe install -r requirements.txt"
        )

    if not _running_in_project_venv():
        raise SystemExit(
            subprocess.call([str(VENV_PYTHON), str(ROOT / "run.py"), *sys.argv[1:]])
        )

    from app.core.config import get_settings
    import uvicorn

    settings = get_settings()
    use_reload = os.getenv("SCHEDULE_RELOAD", "0") == "1"
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=use_reload,
        access_log=True,
        log_level="info",
    )


if __name__ == "__main__":
    main()
