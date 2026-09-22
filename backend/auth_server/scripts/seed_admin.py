"""
One-time Admin bootstrap script.

Usage (from backend/):
  .\\venv\\Scripts\\Activate.ps1
  python -m scripts.seed_admin
"""

from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import or_

# Ensure backend/ is on sys.path when run as a module or script.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User


def seed_admin() -> None:
    settings = get_settings()
    db = SessionLocal()

    try:
        existing = (
            db.query(User)
            .filter(
                or_(
                    User.username == settings.admin_username,
                    User.email == settings.admin_email,
                )
            )
            .first()
        )
        if existing:
            print(
                f"Admin already exists: username={existing.username}, "
                f"role={existing.role}, id={existing.id}"
            )
            return

        admin = User(
            username=settings.admin_username,
            email=settings.admin_email,
            password_hash=hash_password(settings.admin_password),
            full_name=settings.admin_full_name,
            role="admin",
            is_active=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("Admin user created successfully.")
        print(f"  id:       {admin.id}")
        print(f"  username: {admin.username}")
        print(f"  email:    {admin.email}")
        print(f"  role:     {admin.role}")
        print("Password was hashed with bcrypt and stored in password_hash.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
