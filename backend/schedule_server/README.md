# HMS Schedule Service

Clinical domain API (patients, doctors, departments, appointments, dashboard).

Uses a **dedicated PostgreSQL database** (`hms_schedule`) and its **own virtualenv**.
Validates JWTs issued by `auth_server` using the shared `SECRET_KEY`.

## Setup (one-time)

```powershell
cd "d:\Demo Project 1\backend\schedule_server"
python -m venv venv
.\venv\Scripts\pip.exe install -r requirements.txt
.\venv\Scripts\python.exe scripts\create_db.py
.\venv\Scripts\python.exe -m scripts.seed_schedule_demo
```

## Run

```powershell
cd "d:\Demo Project 1\backend\schedule_server"
.\venv\Scripts\Activate.ps1
python run.py
```

Or without activating:

```powershell
.\venv\Scripts\python.exe run.py
```

Default: `http://127.0.0.1:8001`

## Key endpoints

| Method | Path |
|--------|------|
| GET | `/api/v1/dashboard/admin` |
| CRUD | `/api/v1/patients/` |
| CRUD | `/api/v1/departments/` |
| CRUD | `/api/v1/doctors/` |
