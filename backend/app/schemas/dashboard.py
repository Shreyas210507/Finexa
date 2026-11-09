from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional
from pydantic import BaseModel


class MetricDelta(BaseModel):
    value: Decimal
    period: str


class DashboardSummaryResponse(BaseModel):
    period: str  # e.g. "30d", "oct2026"
    currency: str  # "USD"
    revenue: Decimal
    expenses: Decimal
    net_income: Decimal
    closing_balance: Decimal
    monthly_burn: Decimal
    runway_months: Optional[Decimal]
    runway_display: str
    outstanding_receivables: Decimal
    overdue_receivables: Decimal
    revenue_growth_mom: Optional[Decimal] = None
    expense_growth_mom: Optional[Decimal] = None
    expense_breakdown: Dict[str, Decimal] = {}


class CashFlowPoint(BaseModel):
    period_label: str
    date: date
    inflows: Decimal
    outflows: Decimal
    net: Decimal
    closing_balance: Decimal


class CashFlowTimelineResponse(BaseModel):
    opening_balance: Decimal
    closing_balance: Decimal
    total_inflows: Decimal
    total_outflows: Decimal
    net_cash_flow: Decimal
    points: List[CashFlowPoint]

