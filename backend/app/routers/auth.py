from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.profile import Profile
from backend.app.models.organisation import Organisation, OrganisationMember
from backend.app.schemas.auth import (
    ProfileResponse,
    ProfileUpdate,
    OnboardRequest,
    CurrentUserResponse,
    OrganisationBrief,
)
from backend.app.dependencies import get_current_user_id, get_current_profile

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.get("/me", response_model=CurrentUserResponse)
def get_current_user(
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    memberships = (
        db.query(OrganisationMember)
        .filter(OrganisationMember.user_id == profile.id)
        .all()
    )

    org_briefs = []
    current_org_brief = None

    for m in memberships:
        brief = OrganisationBrief(
            id=m.organisation.id,
            name=m.organisation.name,
            currency=m.organisation.currency,
            is_demo=m.organisation.is_demo,
            role=m.role,
        )
        org_briefs.append(brief)
        if current_org_brief is None:
            current_org_brief = brief

    return CurrentUserResponse(
        profile=ProfileResponse.model_validate(profile),
        current_org=current_org_brief,
        organisations=org_briefs,
    )


@router.patch("/profile", response_model=ProfileResponse)
def update_profile(
    req: ProfileUpdate,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    if req.name is not None:
        profile.name = req.name
    if req.avatar_url is not None:
        profile.avatar_url = req.avatar_url

    db.commit()
    db.refresh(profile)
    return ProfileResponse.model_validate(profile)


@router.post("/onboard", response_model=CurrentUserResponse)
def onboard_user(
    req: OnboardRequest,
    user_id = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    # Ensure profile exists
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        profile = Profile(id=user_id, name=req.name)
        db.add(profile)
    else:
        profile.name = req.name

    # Create organization
    org = Organisation(
        name=req.org_name,
        currency=req.currency,
        is_demo=False,
    )
    db.add(org)
    db.flush()

    # Add user as owner
    member = OrganisationMember(
        user_id=profile.id,
        organisation_id=org.id,
        role="owner",
    )
    db.add(member)
    db.commit()
    db.refresh(profile)
    db.refresh(org)

    org_brief = OrganisationBrief(
        id=org.id,
        name=org.name,
        currency=org.currency,
        is_demo=org.is_demo,
        role="owner",
    )

    return CurrentUserResponse(
        profile=ProfileResponse.model_validate(profile),
        current_org=org_brief,
        organisations=[org_brief],
    )

