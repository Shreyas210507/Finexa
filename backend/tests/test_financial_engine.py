"""Unit tests for FINEXA Financial Engine.
Verifies exact Decimal precision, Novastack benchmark figures, and edge cases.
"""

from datetime import date
from decimal import Decimal
import pytest

from backend.app.financial_engine import (
    MonthlyFigure,
    calculate_burn_and_runway,
    calculate_cash_flow,
    calculate_period_ratios,
    calculate_receivables,
)


def test_cash_flow_calculation():
    """Verify Cash Flow: closing = opening + inflows - outflows."""
    opening = Decimal("834500.00")
    inflows = Decimal("142000.00")
    outflows = Decimal("200500.00")

    result = calculate_cash_flow(opening, inflows, outflows)

    assert result.opening_balance == Decimal("834500.00")
    assert result.total_inflows == Decimal("142000.00")
    assert result.total_outflows == Decimal("200500.00")
    assert result.net_cash_flow == Decimal("-58500.00")
    assert result.closing_balance == Decimal("776000.00")
    assert isinstance(result.closing_balance, Decimal)


def test_novastack_benchmark_burn_and_runway():
    """Verify Novastack benchmark trailing 3-month burn ($51,166.67) and runway (4.8 months)."""
    # Aug 2026: Rev 128k, Exp 175k -> Burn 47k
    # Sep 2026: Rev 131k, Exp 179k -> Burn 48k
    # Oct 2026: Rev 142k, Exp 200.5k -> Burn 58.5k
    records = [
        MonthlyFigure(
            month_key="2026-08",
            revenue=Decimal("128000.00"),
            expenses=Decimal("175000.00"),
            net_income=Decimal("-47000.00"),
        ),
        MonthlyFigure(
            month_key="2026-09",
            revenue=Decimal("131000.00"),
            expenses=Decimal("179000.00"),
            net_income=Decimal("-48000.00"),
        ),
        MonthlyFigure(
            month_key="2026-10",
            revenue=Decimal("142000.00"),
            expenses=Decimal("200500.00"),
            net_income=Decimal("-58500.00"),
        ),
    ]
    closing_balance = Decimal("246000.00")

    res = calculate_burn_and_runway(records, closing_balance, trailing_n=3)

    # Hand computation: (47000 + 48000 + 58500) / 3 = 153500 / 3 = 51166.67
    assert res.average_monthly_burn == Decimal("51166.67")
    # Runway: 246000 / 51166.6667 = 4.8078... -> 4.8
    assert res.runway_months == Decimal("4.8")
    assert res.runway_display == "4.8"
    assert res.trailing_months == 3


def test_profitable_or_negative_burn():
    """Verify that when a company is profitable (negative burn), runway returns None and 'Not applicable'."""
    records = [
        MonthlyFigure(
            month_key="2026-08",
            revenue=Decimal("150000.00"),
            expenses=Decimal("100000.00"),
            net_income=Decimal("50000.00"),
        ),
        MonthlyFigure(
            month_key="2026-09",
            revenue=Decimal("160000.00"),
            expenses=Decimal("100000.00"),
            net_income=Decimal("60000.00"),
        ),
        MonthlyFigure(
            month_key="2026-10",
            revenue=Decimal("170000.00"),
            expenses=Decimal("100000.00"),
            net_income=Decimal("70000.00"),
        ),
    ]
    closing_balance = Decimal("500000.00")

    res = calculate_burn_and_runway(records, closing_balance, trailing_n=3)

    assert res.average_monthly_burn < Decimal("0")
    assert res.runway_months is None
    assert res.runway_display == "Not applicable"


def test_zero_burn_edge_case():
    """Verify zero burn handled safely without ZeroDivisionError."""
    records = [
        MonthlyFigure(
            month_key="2026-10",
            revenue=Decimal("100000.00"),
            expenses=Decimal("100000.00"),
            net_income=Decimal("0.00"),
        )
    ]
    res = calculate_burn_and_runway(records, Decimal("100000.00"), trailing_n=1)
    assert res.average_monthly_burn == Decimal("0.00")
    assert res.runway_months is None
    assert res.runway_display == "Not applicable"


def test_novastack_growth_rates_and_ratios():
    """Verify October growth rates: Revenue +8.4%, Expenses +12.0%."""
    oct_rev = Decimal("142000.00")
    sep_rev = Decimal("131000.00")
    oct_exp = Decimal("200500.00")
    sep_exp = Decimal("179000.00")

    net_income, ratios = calculate_period_ratios(oct_rev, oct_exp, sep_rev, sep_exp)

    assert net_income == Decimal("-58500.00")
    # Revenue growth: (142 - 131) / 131 * 100 = 1100 / 131 = 8.3969% -> 8.4%
    assert ratios.revenue_growth_mom == Decimal("8.4")
    # Expense growth: (200.5 - 179) / 179 * 100 = 2150 / 179 = 12.011% -> 12.0%
    assert ratios.expense_growth_mom == Decimal("12.0")
    # Profit margin: (-58500 / 142000) * 100 = -41.197% -> -41.2%
    assert ratios.profit_margin == Decimal("-41.2")


def test_ratios_zero_division_guard():
    """Verify that zero revenue returns None rather than crashing."""
    net_income, ratios = calculate_period_ratios(Decimal("0.00"), Decimal("5000.00"))
    assert net_income == Decimal("-5000.00")
    assert ratios.profit_margin is None
    assert ratios.expense_ratio is None


def test_novastack_receivables_aging():
    """Verify receivables calculations matching Novastack benchmark:
    Total outstanding $94,000, Overdue $31,000.
    """
    anchor = date(2026, 10, 31)

    invoices = [
        # Overdue invoices:
        {"total_amount": Decimal("18000.00"), "paid_amount": Decimal("0.00"), "due_date": date(2026, 10, 12), "status": "overdue"},
        {"total_amount": Decimal("13000.00"), "paid_amount": Decimal("0.00"), "due_date": date(2026, 10, 20), "status": "overdue"},
        # Current invoices (due in Nov):
        {"total_amount": Decimal("24000.00"), "paid_amount": Decimal("0.00"), "due_date": date(2026, 11, 8), "status": "sent"},
        # Partially paid invoice:
        {"total_amount": Decimal("25000.00"), "paid_amount": Decimal("10000.00"), "due_date": date(2026, 11, 15), "status": "partially_paid"},
        {"total_amount": Decimal("14000.00"), "paid_amount": Decimal("0.00"), "due_date": date(2026, 11, 22), "status": "pending"},
        {"total_amount": Decimal("10000.00"), "paid_amount": Decimal("0.00"), "due_date": date(2026, 11, 28), "status": "sent"},
        # Paid invoice (balance = 0, should not count towards outstanding):
        {"total_amount": Decimal("21000.00"), "paid_amount": Decimal("21000.00"), "due_date": date(2026, 10, 14), "status": "paid"},
        # Draft invoice (should not count):
        {"total_amount": Decimal("5000.00"), "paid_amount": Decimal("0.00"), "due_date": date(2026, 11, 30), "status": "draft"},
    ]

    res = calculate_receivables(invoices, anchor)

    # 18k + 13k + 24k + (25k - 10k=15k) + 14k + 10k = 94,000.00
    assert res.total_outstanding == Decimal("94000.00")
    # Overdue: 18k + 13k = 31,000.00
    assert res.total_overdue == Decimal("31000.00")
    # Aging 0-30 days overdue (both 12 Oct and 20 Oct are within 30 days of 31 Oct):
    assert res.aging_0_30 == Decimal("31000.00")
    assert res.aging_31_60 == Decimal("0.00")

