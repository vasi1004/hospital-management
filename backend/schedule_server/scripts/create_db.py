import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

conn = psycopg2.connect(
    dbname="postgres",
    user="postgres",
    password="V@si0410",
    host="localhost",
    port=5432,
)
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
cur = conn.cursor()
cur.execute("SELECT 1 FROM pg_database WHERE datname=%s", ("hms_schedule",))
if cur.fetchone():
    print("DB hms_schedule already exists")
else:
    cur.execute("CREATE DATABASE hms_schedule")
    print("Created DB hms_schedule")
cur.close()
conn.close()
