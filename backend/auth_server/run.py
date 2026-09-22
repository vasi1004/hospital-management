"""Start the auth server using this project's venv Python.

Usage (from backend/auth_server):
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
            "Virtual environment not found.\n"
            f"Expected: {VENV_PYTHON}\n"
            "Create it with:\n"
            "  python -m venv venv\n"
            "  .\\venv\\Scripts\\pip.exe install -r requirements.txt"
        )

    # If launched with global/wrong Python, re-run with project venv.
    if not _running_in_project_venv():
        raise SystemExit(
            subprocess.call(
                [str(VENV_PYTHON), str(ROOT / "run.py"), *sys.argv[1:]],
            )
        )

    import uvicorn

    # reload=False so request logs appear in THIS terminal on Windows.
    # Set AUTH_RELOAD=1 if you want auto-reload while developing.
    use_reload = os.getenv("AUTH_RELOAD", "0") == "1"

    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=use_reload,
        access_log=True,
        log_level="info",
    )


if __name__ == "__main__":
    main()
