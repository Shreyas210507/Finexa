import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from backend.app.config import settings

logger = logging.getLogger(__name__)

# Database engine setup
# Translates standard postgresql:// to postgresql+psycopg:// if needed
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

try:
    if "sqlite" in db_url:
        engine = create_engine(db_url, connect_args={"check_same_thread": False})
    else:
        # Validate connection to primary DB (e.g. Supabase Postgres) with quick 2s timeout
        test_engine = create_engine(
            db_url,
            pool_pre_ping=True,
            echo=False,
            connect_args={"connect_timeout": 2},
        )
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine = test_engine
except Exception as e:
    logger.warning(
        f"Primary database connection unavailable ({e}). Gracefully falling back to local SQLite engine."
    )
    engine = create_engine("sqlite:///./finexa.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
