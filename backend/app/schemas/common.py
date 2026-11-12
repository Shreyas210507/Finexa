from typing import Optional, Any, Dict
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    database: str
    database_latency_ms: Optional[float] = None
    supabase: str
    gemini_configured: bool = False
    gemini_model: Optional[str] = None
    paypal_configured: bool = False
    paypal_mode: str = "sandbox"
    webhooks_configured: bool = False
    timestamp: str


class APIError(BaseModel):
    detail: str
    error_code: Optional[str] = None
    request_id: Optional[str] = None
