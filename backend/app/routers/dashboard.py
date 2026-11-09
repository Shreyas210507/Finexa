from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.dependencies import get_current_org
from backend.app.models.organisation import Organisation
from backend.app.schemas.dashboard import (
    CashFlowTimelineResponse,
    DashboardSummaryResponse,
)
from backend.app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    period: str = Query("30d", pattern="^(7d|30d|90d|12m)$"),
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Retrieve financial summary KPIs calculated by the Python Decimal Financial Engine."""
    return dashboard_service.get_dashboard_summary(
        db=db,
        org_id=current_org.id,
        period=period,
    )


@router.get("/cashflow", response_model=CashFlowTimelineResponse)
def get_cashflow_timeline(
    period: str = Query("30d", pattern="^(7d|30d|90d|12m)$"),
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Retrieve time series cash flow data with opening and closing balance."""
    return dashboard_service.get_cashflow_timeline(
        db=db,
        org_id=current_org.id,
        period=period,
    )
