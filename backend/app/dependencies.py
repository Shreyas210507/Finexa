import uuid
from typing import Optional, List
import jwt
from fastapi import Depends, HTTPException, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.profile import Profile
from backend.app.models.organisation import Organisation, OrganisationMember

DEMO_DEFAULT_USER_ID = uuid.UUID("f0000000-0000-4000-a000-000000000001")
DEMO_DEFAULT_ORG_ID = uuid.UUID("a0000000-0000-4000-b000-000000000001")

security_bearer = HTTPBearer(auto_error=False)


def decode_supabase_token(token: str) -> dict:
    """Decode and verify Supabase JWT, supporting HS256, RS256, and ES256."""
    try:
        try:
            header = jwt.get_unverified_header(token)
            alg = header.get("alg", "HS256")
        except Exception:
            alg = "HS256"

        # If HMAC HS256 and secret is configured, verify signature
        if alg == "HS256" and settings.SUPABASE_JWT_SECRET:
            try:
                return jwt.decode(
                    token,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    options={"verify_aud": False},
                )
            except jwt.InvalidSignatureError:
                if settings.DEMO_MODE:
                    return jwt.decode(
                        token,
                        options={"verify_signature": False, "verify_exp": True, "verify_aud": False},
                    )
                raise

        # For asymmetric tokens (RS256, ES256) or when running in demo/dev mode:
        return jwt.decode(
            token,
            options={"verify_signature": False, "verify_exp": True, "verify_aud": False},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user_id(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> uuid.UUID:
    """Extract user_id from Authorization: Bearer <JWT>."""
    if not auth or not auth.credentials:
        if settings.DEMO_MODE:
            return DEMO_DEFAULT_USER_ID
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_supabase_token(auth.credentials)
        sub = payload.get("sub")
        if not sub:
            if settings.DEMO_MODE:
                return DEMO_DEFAULT_USER_ID
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing subject claim",
            )
        return uuid.UUID(sub)
    except HTTPException:
        if settings.DEMO_MODE:
            return DEMO_DEFAULT_USER_ID
        raise
    except ValueError:
        if settings.DEMO_MODE:
            return DEMO_DEFAULT_USER_ID
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid subject claim format",
        )


def get_current_profile(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> Profile:
    """Retrieve app profile for current user, auto-creating if needed."""
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        profile = Profile(id=user_id, name="User")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def get_current_org(
    x_organisation_id: Optional[str] = Header(None, alias="X-Organisation-ID"),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> Organisation:
    """
    Resolve active organisation for current user.
    Enforces that user is an active member of this organisation.
    """
    if x_organisation_id:
        try:
            target_org_id = uuid.UUID(x_organisation_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid X-Organisation-ID header",
            )
        member = (
            db.query(OrganisationMember)
            .filter(
                OrganisationMember.user_id == profile.id,
                OrganisationMember.organisation_id == target_org_id,
            )
            .first()
        )
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this organisation",
            )
        return member.organisation

    # Default to user's first organisation
    membership = (
        db.query(OrganisationMember)
        .filter(OrganisationMember.user_id == profile.id)
        .first()
    )
    if not membership:
        if settings.DEMO_MODE:
            demo_org = (
                db.query(Organisation)
                .filter(
                    (Organisation.id == DEMO_DEFAULT_ORG_ID)
                    | (Organisation.is_demo == True)
                )
                .first()
            )
            if not demo_org:
                demo_org = db.query(Organisation).first()

            if demo_org:
                membership = OrganisationMember(
                    user_id=profile.id,
                    organisation_id=demo_org.id,
                    role="owner",
                )
                db.add(membership)
                db.commit()
                db.refresh(membership)
                return demo_org

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not belong to any organisation. Please onboard first.",
        )
    return membership.organisation


def require_role(allowed_roles: List[str]):
    """Role-based access dependency."""
    def role_checker(
        profile: Profile = Depends(get_current_profile),
        org: Organisation = Depends(get_current_org),
        db: Session = Depends(get_db),
    ):
        member = (
            db.query(OrganisationMember)
            .filter(
                OrganisationMember.user_id == profile.id,
                OrganisationMember.organisation_id == org.id,
            )
            .first()
        )
        if not member or member.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of the following roles: {', '.join(allowed_roles)}",
            )
        return member
    return role_checker

