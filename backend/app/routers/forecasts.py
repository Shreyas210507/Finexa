from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.dependencies import get_current_org, get_current_profile
from backend.app.financial_engine import (
    calculate_average_expenses,
    calculate_cash_flow_forecast,
    calculate_net_income,
    simulate_scenario,
    MonthlyFigure,
)
from backend.app.models.financial_scenario import FinancialScenario
from backend.app.models.invoice import Invoice
from backend.app.models.organisation import Organisation
from backend.app.models.profile import Profile
from backend.app.models.transaction import Transaction
from backend.app.services.dashboard_service import get_dashboard_summary

router = APIRouter(prefix="/forecasts", tags=["Forecasting & Simulator"])


class SimulateRequest(BaseModel):
    scenario_name: str = "Simulation Run"
    scenario_type: str = "hiring"
    hire_count: int = Field(default=0, ge=0)
    salary_per_hire: float = Field(default=6000.0, ge=0)
    expense_increase_pct: float = Field(default=0.0)
    revenue_change_pct: float = Field(default=0.0)
    investment_amount: float = Field(default=0.0, ge=0)


class SaveScenarioRequest(SimulateRequest):
    save_to_db: bool = True


def _get_org_monthly_history(db: Session, org_id: uuid.UUID) -> List[MonthlyFigure]:
    """Retrieve all historical monthly figures for an organisation with engine-derived net income."""
    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.organisation_id == org_id,
            Transaction.is_deleted == False,
        )
        .all()
    )
    monthly_data: Dict[str, Dict[str, Decimal]] = {}
    for tx in transactions:
        m = tx.date.strftime("%Y-%m")
        if m not in monthly_data:
            monthly_data[m] = {"rev": Decimal("0.00"), "exp": Decimal("0.00")}
        if tx.type == "income":
            monthly_data[m]["rev"] += tx.amount
        else:
            monthly_data[m]["exp"] += tx.amount

    return [
        MonthlyFigure(
            month_key=k,
            revenue=monthly_data[k]["rev"],
            expenses=monthly_data[k]["exp"],
            net_income=calculate_net_income(monthly_data[k]["rev"], monthly_data[k]["exp"]),
        )
        for k in sorted(monthly_data.keys())
    ]


@router.get("", status_code=status.HTTP_200_OK)
def get_forecast(
    horizon: int = Query(default=90, ge=7, le=180),
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Retrieve deterministic cash flow projection with uncertainty cone and shortage detection."""
    summary = get_dashboard_summary(db, current_org.id, period="30d")

    # Fetch scheduled receivables
    invoices = (
        db.query(Invoice)
        .filter(
            Invoice.organisation_id == current_org.id,
            Invoice.status.notin_(["Paid", "Draft", "Cancelled"]),
        )
        .all()
    )
    scheduled_rec = [
        {"due_date": inv.due_date, "balance": inv.balance, "invoice_number": inv.invoice_number}
        for inv in invoices
    ]

    monthly_history = _get_org_monthly_history(db, current_org.id)

    result = calculate_cash_flow_forecast(
        closing_balance=summary.closing_balance,
        trailing_monthly_burn=summary.monthly_burn,
        monthly_history=monthly_history,
        scheduled_receivables=scheduled_rec,
        horizon_days=horizon,
    )

    return {
        "horizon_days": result.horizon_days,
        "anchor_date": str(result.anchor_date),
        "opening_balance": str(result.opening_balance),
        "projected_closing_balance": str(result.projected_closing_balance),
        "daily_burn_rate": str(result.daily_burn_rate),
        "warning_shortage_date": str(result.warning_shortage_date) if result.warning_shortage_date else None,
        "zero_depletion_date": str(result.zero_depletion_date) if result.zero_depletion_date else None,
        "seasonal_adjustment_applied": result.seasonal_adjustment_applied,
        "seasonal_note": result.seasonal_note,
        "assumptions": result.assumptions,
        "points": [
            {
                "date": str(pt.date),
                "day_offset": pt.day_offset,
                "projected_balance": str(pt.projected_balance),
                "upper_bound": str(pt.upper_bound),
                "lower_bound": str(pt.lower_bound),
                "scheduled_inflows": str(pt.scheduled_inflows),
            }
            for pt in result.points
        ],
    }


@router.post("/simulate", status_code=status.HTTP_200_OK)
def run_simulation(
    req: SimulateRequest,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Stress-test runway and burn rate under what-if scenario assumptions."""
    summary = get_dashboard_summary(db, current_org.id, period="30d")
    monthly_history = _get_org_monthly_history(db, current_org.id)
    trailing_3m_expenses = calculate_average_expenses(monthly_history, trailing_n=3)

    sim_res = simulate_scenario(
        closing_balance=summary.closing_balance,
        baseline_burn=summary.monthly_burn,
        trailing_3m_average_expenses=trailing_3m_expenses,
        scenario_type=req.scenario_type,
        parameters=req.model_dump(),
        scenario_name=req.scenario_name,
    )

    return {
        "scenario_name": sim_res.scenario_name,
        "scenario_type": sim_res.scenario_type,
        "baseline_burn": str(sim_res.baseline_burn),
        "simulated_burn": str(sim_res.simulated_burn),
        "delta_burn": str(sim_res.delta_burn),
        "baseline_runway_months": str(sim_res.baseline_runway_months),
        "simulated_runway_months": str(sim_res.simulated_runway_months),
        "delta_runway_months": str(sim_res.delta_runway_months),
        "closing_balance": str(sim_res.closing_balance),
        "risk_level": sim_res.risk_level,
        "explanation": sim_res.explanation,
        "parameters": sim_res.parameters,
    }


@router.post("/scenarios/save", status_code=status.HTTP_201_CREATED)
def save_scenario(
    req: SaveScenarioRequest,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
    current_profile: Profile = Depends(get_current_profile),
):
    """Persist a simulated scenario for later comparison."""
    summary = get_dashboard_summary(db, current_org.id, period="30d")
    monthly_history = _get_org_monthly_history(db, current_org.id)
    trailing_3m_expenses = calculate_average_expenses(monthly_history, trailing_n=3)

    sim_res = simulate_scenario(
        closing_balance=summary.closing_balance,
        baseline_burn=summary.monthly_burn,
        trailing_3m_average_expenses=trailing_3m_expenses,
        scenario_type=req.scenario_type,
        parameters=req.model_dump(),
        scenario_name=req.scenario_name,
    )

    db_scenario = FinancialScenario(
        organisation_id=current_org.id,
        user_id=current_profile.id,
        name=req.scenario_name,
        scenario_type=req.scenario_type,
        parameters=req.model_dump(),
        results={
            "simulated_burn": str(sim_res.simulated_burn),
            "simulated_runway": str(sim_res.simulated_runway_months),
            "risk_level": sim_res.risk_level,
        },
    )
    db.add(db_scenario)
    db.commit()
    db.refresh(db_scenario)

    return {
        "id": str(db_scenario.id),
        "name": db_scenario.name,
        "scenario_type": db_scenario.scenario_type,
        "parameters": db_scenario.parameters,
        "results": db_scenario.results,
        "created_at": db_scenario.created_at,
    }


@router.get("/scenarios", status_code=status.HTTP_200_OK)
def list_saved_scenarios(
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """List saved what-if scenarios for the organization."""
    scenarios = (
        db.query(FinancialScenario)
        .filter(FinancialScenario.organisation_id == current_org.id)
        .order_by(FinancialScenario.created_at.desc())
        .all()
    )
    return [
        {
            "id": str(s.id),
            "name": s.name,
            "scenario_type": s.scenario_type,
            "parameters": s.parameters,
            "results": s.results,
            "created_at": s.created_at,
        }
        for s in scenarios
    ]

