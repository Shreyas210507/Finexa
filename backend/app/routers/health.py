import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.config import settings
from backend.app.schemas.common import HealthResponse
from backend.app.ai.gemini_client import gemini_service
from backend.app.services.paypal_client import _is_configured as paypal_is_configured

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    db_status = "ok"
    latency_ms = None
    t0 = time.time()
    try:
        db.execute(text("SELECT 1"))
        latency_ms = round((time.time() - t0) * 1000, 2)
    except Exception as e:
        db_status = f"unreachable: {str(e)[:50]}"

    supabase_status = "configured" if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY else "unconfigured"

    return HealthResponse(
        status="healthy" if db_status == "ok" else "degraded",
        database=db_status,
        database_latency_ms=latency_ms,
        supabase=supabase_status,
        gemini_configured=gemini_service.is_configured(),
        gemini_model=settings.GEMINI_MODEL,
        paypal_configured=paypal_is_configured(),
        paypal_mode=settings.PAYPAL_MODE,
        webhooks_configured=bool(settings.PAYPAL_WEBHOOK_ID),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
