from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.dependencies import get_current_org, require_role
from backend.app.models.organisation import Organisation
from backend.app.services.seed_service import seed_novastack_demo_data

router = APIRouter(prefix="/demo", tags=["Demo"])


@router.post("/reset", status_code=status.HTTP_200_OK)
def reset_demo_organisation(
    include_anomaly: bool = False,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
    _: None = Depends(require_role(["owner", "admin"])),
):
    """Reset demo organisation back to the 12-month Novastack Technologies benchmark.
    Restricted to demo organisations only.
    """
    if not current_org.is_demo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Reset operation is permitted only on Demo organisations.",
        )

    res = seed_novastack_demo_data(db, current_org.id, include_anomaly=include_anomaly)
    return res

