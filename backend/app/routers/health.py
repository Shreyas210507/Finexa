from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.config import settings
from backend.app.schemas.common import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unreachable: {str(e)[:50]}"

    supabase_status = "configured" if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY else "unconfigured"

    return HealthResponse(
        status="healthy" if db_status == "ok" else "degraded",
        database=db_status,
        supabase=supabase_status,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

