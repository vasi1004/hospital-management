"""
Seed HMS demo users for all four roles.

Usage (from backend/auth_server with venv active):
  python -m scripts.seed_hms_users
"""

from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import or_

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User

DEMO_USERS = (
    {
        "username": "admin",
        "email": "admin@hospital.local",
        "password": "Admin@123",
        "full_name": "System Administrator",
        "role": "admin",
    },
    {
        "username": "doctor",
        "email": "doctor@hospital.local",
        "password": "Doctor@123",
        "full_name": "Dr. Kumar",
        "role": "doctor",
    },
    {
        "username": "reception",
        "email": "reception@hospital.local",
        "password": "Reception@123",
        "full_name": "Front Desk",
        "role": "receptionist",
    },
    {
        "username": "patient",
        "email": "patient@hospital.local",
        "password": "Patient@123",
        "full_name": "Arun Kumar",
        "role": "patient",
    },
)


def seed_hms_users() -> None:
    # Ensure settings load (and .env is present) before opening DB.
    get_settings()
    db = SessionLocal()

    try:
        created = 0
        skipped = 0
        for item in DEMO_USERS:
            existing = (
                db.query(User)
                .filter(
                    or_(
                        User.username == item["username"],
                        User.email == item["email"],
                    )
                )
                .first()
            )
            if existing:
                print(
                    f"Skip  {item['role']:<13} already exists "
                    f"(username={existing.username}, id={existing.id})"
                )
                skipped += 1
                continue

            user = User(
                username=item["username"],
                email=item["email"],
                password_hash=hash_password(item["password"]),
                full_name=item["full_name"],
                role=item["role"],
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(
                f"Create {item['role']:<13} username={user.username} "
                f"password={item['password']} id={user.id}"
            )
            created += 1

        print(f"Done. created={created}, skipped={skipped}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_hms_users()
