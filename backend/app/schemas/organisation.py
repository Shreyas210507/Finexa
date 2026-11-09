import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class OrganisationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    currency: str = Field(default="INR", min_length=3, max_length=3)


class OrganisationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    settings: Optional[Dict[str, Any]] = None


class OrganisationResponse(OrganisationBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_demo: bool
    settings: Dict[str, Any]
    created_at: datetime
    updated_at: datetime


class MemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    role: str
    created_at: datetime


class InviteMemberRequest(BaseModel):
    user_id: uuid.UUID
    role: str = Field(default="member", pattern="^(owner|admin|member)$")

