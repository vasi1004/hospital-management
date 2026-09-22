# Hospital Management System

Unified backend (`all_backend_server`) — one FastAPI process for auth, schedule, and audit.

| Service | Port | Databases | Venv |
|---------|------|-----------|------|
| `all_backend_server` | 8000 | auth DB + `hms_schedule` + `audit_server` | `backend/all_backend_server/venv` |

Frontend uses a single API base:

- `VITE_API_URL`

## Demo logins

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `Admin@123` |
| Doctor | `doctor` | `Doctor@123` |
| Receptionist | `reception` | `Reception@123` |
| Patient | `patient` | `Patient@123` |

## 1. Backend

```powershell
cd "d:\Demo Project 1\backend\all_backend_server"
.\venv\Scripts\Activate.ps1
python run.py
```

## 2. Frontend

```powershell
cd "d:\Demo Project 1\frontend"
npm install
npm run dev
```

Open http://127.0.0.1:3000/login
