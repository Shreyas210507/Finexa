import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class ProfileBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    avatar_url: Optional[str] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    avatar_url: Optional[str] = None


class ProfileResponse(ProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class OnboardRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="User full name")
    org_name: str = Field(..., min_length=1, max_length=255, description="Initial organization name")
    currency: str = Field(default="INR", max_length=3)


class OrganisationBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    currency: str
    is_demo: bool
    role: str


class CurrentUserResponse(BaseModel):
    profile: ProfileResponse
    current_org: Optional[OrganisationBrief] = None
    organisations: List[OrganisationBrief] = []

