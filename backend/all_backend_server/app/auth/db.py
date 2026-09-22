"""Auth database engine / session (users + legacy clinical unlink tables)."""

from urllib.parse import unquote

from sqlalchemy import create_engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings

settings = get_settings()

_url = make_url(settings.auth_database_url)
if _url.database:
    _url = _url.set(database=unquote(_url.database))
if _url.password:
    _url = _url.set(password=unquote(_url.password))

engine = create_engine(_url, pool_pre_ping=True, pool_size=5, max_overflow=10)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass
