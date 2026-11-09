from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.profile import Profile
from backend.app.models.organisation import Organisation, OrganisationMember
from backend.app.schemas.organisation import (
    OrganisationResponse,
    OrganisationUpdate,
    MemberResponse,
    InviteMemberRequest,
)
from backend.app.dependencies import get_current_org, require_role

router = APIRouter(prefix="/organisations", tags=["Organisations"])


@router.get("/current", response_model=OrganisationResponse)
def get_current_organisation(
    org: Organisation = Depends(get_current_org),
):
    return OrganisationResponse.model_validate(org)


@router.patch("/current", response_model=OrganisationResponse)
def update_current_organisation(
    req: OrganisationUpdate,
    org: Organisation = Depends(get_current_org),
    _ = Depends(require_role(["owner", "admin"])),
    db: Session = Depends(get_db),
):
    if req.name is not None:
        org.name = req.name
    if req.currency is not None:
        org.currency = req.currency
    if req.settings is not None:
        org.settings = req.settings

    db.commit()
    db.refresh(org)
    return OrganisationResponse.model_validate(org)


@router.get("/current/members", response_model=List[MemberResponse])
def get_organisation_members(
    org: Organisation = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    members = (
        db.query(OrganisationMember)
        .filter(OrganisationMember.organisation_id == org.id)
        .all()
    )
    res = []
    for m in members:
        res.append(
            MemberResponse(
                id=m.id,
                user_id=m.user_id,
                name=m.profile.name if m.profile else "Unknown",
                role=m.role,
                created_at=m.created_at,
            )
        )
    return res


@router.post("/current/members/invite", response_model=MemberResponse)
def invite_organisation_member(
    req: InviteMemberRequest,
    org: Organisation = Depends(get_current_org),
    _ = Depends(require_role(["owner", "admin"])),
    db: Session = Depends(get_db),
):
    # Check if already member
    existing = (
        db.query(OrganisationMember)
        .filter(
            OrganisationMember.organisation_id == org.id,
            OrganisationMember.user_id == req.user_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this organisation",
        )

    # Ensure profile exists
    profile = db.query(Profile).filter(Profile.id == req.user_id).first()
    if not profile:
        profile = Profile(id=req.user_id, name="Invited Member")
        db.add(profile)
        db.flush()

    member = OrganisationMember(
        user_id=req.user_id,
        organisation_id=org.id,
        role=req.role,
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    return MemberResponse(
        id=member.id,
        user_id=member.user_id,
        name=profile.name,
        role=member.role,
        created_at=member.created_at,
    )

