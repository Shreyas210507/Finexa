from typing import Optional, Any
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    database: str
    supabase: str
    timestamp: str


class APIError(BaseModel):
    detail: str
    error_code: Optional[str] = None
    request_id: Optional[str] = None

