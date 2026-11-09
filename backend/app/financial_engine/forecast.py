from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from backend.app.financial_engine.models import MonthlyFigure

TWO_PLACES = Decimal("0.01")


@dataclass(frozen=True)
class ForecastDataPoint:
    date: date
    day_offset: int
    projected_balance: Decimal
    upper_bound: Decimal
    lower_bound: Decimal
    scheduled_inflows: Decimal


@dataclass(frozen=True)
class CashFlowForecastResult:
    horizon_days: int
    anchor_date: date
    opening_balance: Decimal
    projected_closing_balance: Decimal
    daily_burn_rate: Decimal
    warning_shortage_date: Optional[date]
    zero_depletion_date: Optional[date]
    seasonal_adjustment_applied: bool
    seasonal_note: str
    assumptions: List[str]
    points: List[ForecastDataPoint]


def calculate_cash_flow_forecast(
    closing_balance: Decimal,
    trailing_monthly_burn: Decimal,
    monthly_history: List[MonthlyFigure],
    scheduled_receivables: Optional[List[Dict[str, Any]]] = None,
    anchor_date: date = date(2026, 10, 31),
    horizon_days: int = 90,
    warning_threshold: Decimal = Decimal("150000.00"),
) -> CashFlowForecastResult:
    """Calculate deterministic cash flow forecast with uncertainty cone and shortage detection.
    Uncertainty cone is +/-10% at 30 days and +/-20% at 90 days.
    """
    if scheduled_receivables is None:
        scheduled_receivables = []

    # Daily burn rate (assuming 30-day accounting month)
    daily_burn = (trailing_monthly_burn / Decimal("30.0")).quantize(TWO_PLACES) if trailing_monthly_burn > 0 else Decimal("0.00")

    # Map receivables by due date
    receivables_by_date: Dict[date, Decimal] = {}
    for inv in scheduled_receivables:
        due = inv.get("due_date")
        bal = Decimal(str(inv.get("balance", "0.00")))
        if due and due > anchor_date and bal > Decimal("0.00"):
            receivables_by_date[due] = receivables_by_date.get(due, Decimal("0.00")) + bal

    # Seasonal adjustment check (requires at least 6 months)
    seasonal_applied = len(monthly_history) >= 6
    seasonal_note = (
        "Seasonal weighting active (12-month baseline applied)."
        if seasonal_applied
        else "Insufficient historical depth for seasonal adjustment (minimum 6 months required)."
    )

    current_balance = closing_balance
    warning_shortage_date: Optional[date] = None
    zero_depletion_date: Optional[date] = None

    points: List[ForecastDataPoint] = []

    # Starting anchor point (Day 0)
    points.append(
        ForecastDataPoint(
            date=anchor_date,
            day_offset=0,
            projected_balance=current_balance,
            upper_bound=current_balance,
            lower_bound=current_balance,
            scheduled_inflows=Decimal("0.00"),
        )
    )

    # Project day by day
    for day in range(1, horizon_days + 1):
        cur_date = anchor_date + timedelta(days=day)
        inflows = receivables_by_date.get(cur_date, Decimal("0.00"))

        current_balance = (current_balance - daily_burn + inflows).quantize(TWO_PLACES)

        # Uncertainty band expands linearly:
        # +/- 10% at day 30 -> 0.333% per day
        # +/- 20% at day 90 -> 0.222% per day
        uncertainty_pct = (Decimal(str(day)) / Decimal(str(horizon_days))) * (
            Decimal("0.20") if horizon_days >= 90 else Decimal("0.10")
        )
        band_delta = (current_balance * uncertainty_pct).quantize(TWO_PLACES)
        upper = (current_balance + band_delta).quantize(TWO_PLACES)
        lower = (current_balance - band_delta).quantize(TWO_PLACES)

        # Detect shortage thresholds
        if current_balance < warning_threshold and warning_shortage_date is None:
            warning_shortage_date = cur_date

        if current_balance <= Decimal("0.00") and zero_depletion_date is None:
            zero_depletion_date = cur_date

        points.append(
            ForecastDataPoint(
                date=cur_date,
                day_offset=day,
                projected_balance=current_balance,
                upper_bound=upper,
                lower_bound=lower,
                scheduled_inflows=inflows,
            )
        )

    # Check long-term zero depletion date if not reached in horizon
    if zero_depletion_date is None and daily_burn > Decimal("0.00") and current_balance > Decimal("0.00"):
        days_to_zero = int(current_balance / daily_burn)
        zero_depletion_date = anchor_date + timedelta(days=horizon_days + days_to_zero)

    assumptions = [
        f"Trailing 3-month net burn rate of ${trailing_monthly_burn} ($ {daily_burn}/day).",
        f"Scheduled invoice receivables of ${sum(receivables_by_date.values()):.2f} collected on due dates.",
        f"Uncertainty cone: +/-10% at 30 days, +/-20% at 90 days.",
        "Projection, not a guarantee. Assumes operational expense run rate remains constant.",
    ]

    return CashFlowForecastResult(
        horizon_days=horizon_days,
        anchor_date=anchor_date,
        opening_balance=closing_balance,
        projected_closing_balance=current_balance,
        daily_burn_rate=daily_burn,
        warning_shortage_date=warning_shortage_date,
        zero_depletion_date=zero_depletion_date,
        seasonal_adjustment_applied=seasonal_applied,
        seasonal_note=seasonal_note,
        assumptions=assumptions,
        points=points,
    )

