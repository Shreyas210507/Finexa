"""Ratio calculations for FINEXA Financial Engine.
All math in Python Decimal with zero floats.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

TWO_PLACES = Decimal("0.01")
ONE_PLACE = Decimal("0.1")


def calculate_profit_margin(net_profit: Decimal, revenue: Decimal) -> Optional[Decimal]:
    """Calculate Profit Margin percentage: (net_profit / revenue) * 100.
    Returns None if revenue is missing or zero.
    """
    if revenue is None or revenue == Decimal("0"):
        return None
    margin = (net_profit / revenue) * Decimal("100")
    return margin.quantize(ONE_PLACE, rounding=ROUND_HALF_UP)


def calculate_expense_ratio(total_expenses: Decimal, revenue: Decimal) -> Optional[Decimal]:
    """Calculate Expense Ratio percentage: (total_expenses / revenue) * 100.
    Returns None if revenue is missing or zero.
    """
    if revenue is None or revenue == Decimal("0"):
        return None
    ratio = (total_expenses / revenue) * Decimal("100")
    return ratio.quantize(ONE_PLACE, rounding=ROUND_HALF_UP)


def calculate_growth_rate(current_val: Optional[Decimal], prior_val: Optional[Decimal]) -> Optional[Decimal]:
    """Calculate Period-over-Period growth percentage:
    ((current_val - prior_val) / abs(prior_val)) * 100.
    Returns None if either is missing or prior_val is zero.
    """
    if current_val is None or prior_val is None or prior_val == Decimal("0"):
        return None
    growth = ((current_val - prior_val) / abs(prior_val)) * Decimal("100")
    return growth.quantize(ONE_PLACE, rounding=ROUND_HALF_UP)

