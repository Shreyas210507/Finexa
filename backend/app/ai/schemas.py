from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class DataKind(str, Enum):
    VERIFIED = "verified"
    CALCULATED = "calculated"
    FORECAST = "forecast"
    ASSUMPTION = "assumption"


class ToolResult(BaseModel):
    tool_name: str
    data_kind: DataKind
    data: Dict[str, Any]
    summary: str


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[uuid.UUID] = None


class ChatMessageResponse(BaseModel):
    conversation_id: uuid.UUID
    message_id: uuid.UUID
    content: str
    tools_used: List[ToolResult] = []
    tokens_used: int = 0
    latency_ms: int = 0
    created_at: datetime


class ConversationBrief(BaseModel):
    id: uuid.UUID
    title: Optional[str]
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class AgentExecutionResponse(BaseModel):
    id: uuid.UUID
    agent_type: str
    status: str  # running, completed, needs_approval, failed
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]] = None
    tools_used: Optional[List[str]] = None
    error: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ApprovalActionRequest(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")
    reason: Optional[str] = None

