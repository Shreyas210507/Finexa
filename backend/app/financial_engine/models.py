"""Data models for FINEXA Financial Engine.
All monetary fields MUST use Python Decimal. No floats allowed.
"""

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional


@dataclass(frozen=True)
class MonthlyFigure:
    month_key: str  # Format: "YYYY-MM" (e.g., "2026-10")
    revenue: Decimal
    expenses: Decimal
    net_income: Decimal
    opening_balance: Optional[Decimal] = None
    closing_balance: Optional[Decimal] = None
    expense_breakdown: Dict[str, Decimal] = field(default_factory=dict)


@dataclass(frozen=True)
class CashFlowSummary:
    opening_balance: Decimal
    total_inflows: Decimal
    total_outflows: Decimal
    net_cash_flow: Decimal
    closing_balance: Decimal


@dataclass(frozen=True)
class BurnRunwayResult:
    trailing_months: int
    average_monthly_burn: Decimal  # Positive decimal representing cash burn rate
    closing_balance: Decimal
    runway_months: Optional[Decimal]  # None if burn is zero or negative (profitable)
    runway_display: str  # e.g., "4.8" or "Not applicable"


@dataclass(frozen=True)
class ReceivablesSummary:
    total_outstanding: Decimal
    total_overdue: Decimal
    aging_0_30: Decimal
    aging_31_60: Decimal
    aging_61_90: Decimal
    aging_90_plus: Decimal


@dataclass(frozen=True)
class FinancialRatios:
    profit_margin: Optional[Decimal]  # Percentage e.g. 20.6%
    expense_ratio: Optional[Decimal]  # Percentage
    revenue_growth_mom: Optional[Decimal]  # Percentage e.g. +8.4%
    expense_growth_mom: Optional[Decimal]  # Percentage e.g. +12.0%


@dataclass(frozen=True)
class InvoiceTotalsResult:
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total: Decimal
    balance: Decimal


@dataclass(frozen=True)
class PaymentSettlementResult:
    new_amount_paid: Decimal
    new_balance: Decimal
    is_fully_paid: bool


@dataclass(frozen=True)
class TaxEstimateResult:
    taxable_profit: Decimal
    tax_rate: Decimal
    estimated_tax: Decimal


@dataclass(frozen=True)
class DashboardEngineFigures:
    revenue: Decimal
    expenses: Decimal
    net_income: Decimal
    closing_balance: Decimal
    monthly_burn: Decimal
    runway_months: Optional[Decimal]
    runway_display: str
    outstanding_receivables: Decimal
    overdue_receivables: Decimal
    revenue_growth_mom: Optional[Decimal]
    expense_growth_mom: Optional[Decimal]
    trailing_average_expenses: Decimal
