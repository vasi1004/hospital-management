# Hospital Management System

Split backend architecture (each service has its **own** `venv` inside the service folder — no shared `backend/venv`):

| Service | Port | Database | Venv |
|---------|------|----------|------|
| `auth_server` | 8000 | auth DB | `backend/auth_server/venv` |
| `schedule_server` | 8001 | `hms_schedule` | `backend/schedule_server/venv` |

Frontend reads URLs from env only:

- `VITE_AUTH_API_URL`
- `VITE_SCHEDULE_API_URL`

## Demo logins (auth)

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `Admin@123` |
| Doctor | `doctor` | `Doctor@123` |
| Receptionist | `reception` | `Reception@123` |
| Patient | `patient` | `Patient@123` |

## 1. Auth server (own venv)

```powershell
cd "d:\Demo Project 1\backend\auth_server"
.\venv\Scripts\Activate.ps1
python run.py
```

## 2. Schedule server (own venv)

```powershell
cd "d:\Demo Project 1\backend\schedule_server"
# first time only:
#   python -m venv venv
#   .\venv\Scripts\pip.exe install -r requirements.txt
#   .\venv\Scripts\python.exe scripts\create_db.py
#   .\venv\Scripts\python.exe -m scripts.seed_schedule_demo
.\venv\Scripts\Activate.ps1
python run.py
```

## 3. Frontend

```powershell
cd "d:\Demo Project 1\frontend"
npm install
npm run dev
```

Open http://127.0.0.1:3000/login

## Phase status

- Phase 0–1: Auth + roles
- Phase 3–4: Dashboard + Patients (Schedule)
- Phase 5: Departments + Doctors (Schedule)
- Next: Appointments calendar (Phase 6)
