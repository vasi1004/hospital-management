# Unified HMS backend — auth + schedule + audit in one FastAPI process.
#
# Same API paths as before (/api/v1/auth, /users, /appointments, /audit, …).
# Keeps the three PostgreSQL databases; only the process/port is unified.
#
# Setup:
#   python -m venv venv
#   .\venv\Scripts\pip.exe install -r requirements.txt
#   copy .env.example .env   # then fill DB URLs + SECRET_KEY
#   python run.py
#
# Default port: 8000
# Health: GET /health
# Ready:  GET /ready  (checks all three DBs)
