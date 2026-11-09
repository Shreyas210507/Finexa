from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Dict, List, Optional

TWO_PLACES = Decimal("0.01")
ONE_PLACE = Decimal("0.1")


@dataclass(frozen=True)
class SimulationResult:
    scenario_name: str
    scenario_type: str
    baseline_burn: Decimal
    simulated_burn: Decimal
    delta_burn: Decimal
    baseline_runway_months: Decimal
    simulated_runway_months: Decimal
    delta_runway_months: Decimal
    closing_balance: Decimal
    risk_level: str  # critical, high, medium, low
    explanation: str
    parameters: Dict[str, Any]


def get_risk_level(runway_months: Decimal) -> str:
    """Categorize runway risk level:
    - critical: < 3.0 months
    - high: 3.0 to 6.0 months
    - medium: 6.0 to 12.0 months
    - low: > 12.0 months
    """
    if runway_months < Decimal("3.0"):
        return "critical"
    elif runway_months <= Decimal("6.0"):
        return "high"
    elif runway_months <= Decimal("12.0"):
        return "medium"
    else:
        return "low"


def simulate_scenario(
    closing_balance: Decimal,
    baseline_burn: Decimal,
    trailing_3m_average_expenses: Decimal,
    scenario_type: str,
    parameters: Dict[str, Any],
    scenario_name: str = "Custom Scenario",
) -> SimulationResult:
    """Deterministic what-if scenario simulator using pure Decimal precision.
    Supports: hiring, expense_surge, delayed_payment, investment, revenue_change.
    """
    hire_count = int(parameters.get("hire_count", 0))
    salary_per_hire = Decimal(str(parameters.get("salary_per_hire", "6000.00")))
    expense_increase_pct = Decimal(str(parameters.get("expense_increase_pct", "0.0")))
    revenue_change_pct = Decimal(str(parameters.get("revenue_change_pct", "0.0")))
    investment_amount = Decimal(str(parameters.get("investment_amount", "0.00")))

    # Base values
    simulated_balance = closing_balance + investment_amount
    additional_monthly_burn = Decimal("0.00")

    # 1. Hiring scenario
    if hire_count > 0:
        additional_monthly_burn += Decimal(str(hire_count)) * salary_per_hire

    # 2. General OpEx surge (% on trailing 3-month average expenses)
    if expense_increase_pct != Decimal("0.0"):
        additional_monthly_burn += (trailing_3m_average_expenses * (expense_increase_pct / Decimal("100.0"))).quantize(TWO_PLACES)

    # 3. Revenue change (if revenue increases, net burn decreases; if revenue drops, net burn increases)
    if revenue_change_pct != Decimal("0.0"):
        # Assuming baseline revenue is expenses - burn
        approx_monthly_rev = trailing_3m_average_expenses - baseline_burn
        rev_delta = (approx_monthly_rev * (revenue_change_pct / Decimal("100.0"))).quantize(TWO_PLACES)
        additional_monthly_burn -= rev_delta

    simulated_burn = (baseline_burn + additional_monthly_burn).quantize(TWO_PLACES)
    if simulated_burn < Decimal("0.00"):
        simulated_burn = Decimal("0.00")

    delta_burn = (simulated_burn - baseline_burn).quantize(TWO_PLACES)

    # Baseline runway
    base_runway = (closing_balance / baseline_burn).quantize(ONE_PLACE) if baseline_burn > Decimal("0.00") else Decimal("999.0")

    # Simulated runway
    if simulated_burn > Decimal("0.00"):
        sim_runway = (simulated_balance / simulated_burn).quantize(ONE_PLACE)
    else:
        sim_runway = Decimal("999.0")

    delta_runway = (sim_runway - base_runway).quantize(ONE_PLACE)
    risk = get_risk_level(sim_runway)

    # Plain-English explanation
    parts = []
    if hire_count > 0:
        parts.append(f"hiring {hire_count} team members at ${salary_per_hire:.2f}/mo (+${hire_count * salary_per_hire:.2f}/mo)")
    if expense_increase_pct != Decimal("0.0"):
        parts.append(f"a {expense_increase_pct:+.1f}% OpEx shift on trailing average expenses (+${(trailing_3m_average_expenses * (expense_increase_pct / Decimal('100.0'))):.2f}/mo)")
    if investment_amount > Decimal("0.00"):
        parts.append(f"an investment injection of +${investment_amount:.2f}")

    scenario_desc = ", ".join(parts) if parts else "scenario parameter adjustments"

    delta_burn_str = f"+${delta_burn:.2f}" if delta_burn >= Decimal("0.00") else f"-${abs(delta_burn):.2f}"
    explanation = (
        f"Under {scenario_desc}, your monthly net cash burn changes from ${baseline_burn} to ${simulated_burn} "
        f"({delta_burn_str} / month). Your operational cash runway shifts from {base_runway} to {sim_runway} months "
        f"({delta_runway:+.1f} months), placing the organization at a '{risk.upper()}' risk level."
    )

    return SimulationResult(
        scenario_name=scenario_name,
        scenario_type=scenario_type,
        baseline_burn=baseline_burn,
        simulated_burn=simulated_burn,
        delta_burn=delta_burn,
        baseline_runway_months=base_runway,
        simulated_runway_months=sim_runway,
        delta_runway_months=delta_runway,
        closing_balance=simulated_balance,
        risk_level=risk,
        explanation=explanation,
        parameters=parameters,
    )
