# Hospital Management System — Auth / Core API (FastAPI)

Production-style auth API for the Hospital Management System.

## Location

```
Demo Project 1/
├── backend/
│   └── auth_server/     ← this service
└── frontend/
```

## Roles (Phase 1)

| Role | Username (seed) | Password |
|------|-----------------|----------|
| admin | `admin` | `Admin@123` |
| doctor | `doctor` | `Doctor@123` |
| receptionist | `reception` | `Reception@123` |
| patient | `patient` | `Patient@123` |

## Run

```powershell
cd "d:\Demo Project 1\backend\auth_server"
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

## Database migrations (Alembic)

```powershell
# Apply migrations (creates users table if missing)
alembic upgrade head

# If the users table already exists from earlier create_all:
alembic stamp head
```

## Seed demo users (all roles)

```powershell
python -m scripts.seed_hms_users
```

Legacy admin-only seed still works: `python -m scripts.seed_admin`

## Key endpoints

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/v1/auth/login` | Returns JWT + user |
| POST | `/api/v1/auth/refresh` | New access token |
| GET | `/api/v1/auth/me` | Current user |
| GET | `/api/v1/users/` | Admin-only list users |
| POST | `/api/v1/users/` | Admin-only create user |

| GET | `/api/v1/dashboard/admin` | Admin dashboard summary |
| GET/POST | `/api/v1/patients/` | List / create patients |
| GET/PUT | `/api/v1/patients/{id}` | Get / update patient |
| PATCH | `/api/v1/patients/{id}/activate\|deactivate` | Soft status |

## Clinical demo seed

```powershell
python -m scripts.seed_clinical_demo
```
