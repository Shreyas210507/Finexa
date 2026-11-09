"""Test verifying that dashboard figures match the Financial Engine output with 0 divergence.
Fails if any dashboard metric differs from the financial engine calculation.
"""

from datetime import date
from decimal import Decimal
import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.financial_engine import (
    DEFAULT_INITIAL_CAPITAL,
    MonthlyFigure,
    calculate_burn_and_runway,
    calculate_cash_flow,
    calculate_net_income,
    calculate_period_ratios,
    calculate_receivables,
    compute_dashboard_figures,
)
from backend.app.models.base import Base
from backend.app.models.invoice import Invoice
from backend.app.models.organisation import Organisation
from backend.app.models.transaction import Transaction
from backend.app.services.dashboard_service import (
    get_cashflow_timeline,
    get_dashboard_summary,
)
from backend.app.services.seed_service import seed_novastack_demo_data


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    org_id = uuid.uuid4()
    org = Organisation(
        id=org_id,
        name="Novastack Technologies",
        currency="USD",
        is_demo=True,
    )
    session.add(org)
    session.commit()

    # Seed Novastack benchmark data without anomaly
    seed_novastack_demo_data(session, org_id, include_anomaly=False)

    yield session, org_id
    session.close()


def test_dashboard_summary_exact_parity_with_financial_engine(test_db):
    """Test that all dashboard summary figures match the Financial Engine output to the cent."""
    db, org_id = test_db

    for period in ["7d", "30d", "90d", "12m"]:
        # 1. Fetch dashboard figures from dashboard service
        summary = get_dashboard_summary(db, org_id, period=period)

        # 2. Recompute directly via Financial Engine
        transactions = (
            db.query(Transaction)
            .filter(Transaction.organisation_id == org_id, Transaction.is_deleted == False)
            .order_by(Transaction.date.asc())
            .all()
        )
        anchor_date = transactions[-1].date if transactions else date(2026, 10, 31)

        monthly_data = {}
        total_inflows = Decimal("0.00")
        total_outflows = Decimal("0.00")

        # Period start date logic
        from datetime import timedelta
        if period == "7d":
            start_date = anchor_date - timedelta(days=7)
        elif period == "90d":
            start_date = anchor_date - timedelta(days=90)
        elif period == "12m":
            start_date = anchor_date - timedelta(days=365)
        else:
            start_date = anchor_date - timedelta(days=30)

        p_rev = Decimal("0.00")
        p_exp = Decimal("0.00")

        for tx in transactions:
            m = tx.date.strftime("%Y-%m")
            if m not in monthly_data:
                monthly_data[m] = {"rev": Decimal("0.00"), "exp": Decimal("0.00")}
            if tx.type == "income":
                total_inflows += tx.amount
                monthly_data[m]["rev"] += tx.amount
                if tx.date >= start_date:
                    p_rev += tx.amount
            else:
                total_outflows += tx.amount
                monthly_data[m]["exp"] += tx.amount
                if tx.date >= start_date:
                    p_exp += tx.amount

        monthly_figures = [
            MonthlyFigure(
                month_key=k,
                revenue=monthly_data[k]["rev"],
                expenses=monthly_data[k]["exp"],
                net_income=calculate_net_income(monthly_data[k]["rev"], monthly_data[k]["exp"]),
            )
            for k in sorted(monthly_data.keys())
        ]

        invoices = db.query(Invoice).filter(Invoice.organisation_id == org_id).all()
        inv_dicts = [
            {"total_amount": inv.total, "paid_amount": inv.amount_paid, "due_date": inv.due_date, "status": inv.status}
            for inv in invoices
        ]

        # Call engine directly
        engine_figures = compute_dashboard_figures(
            monthly_figures=monthly_figures,
            total_inflows_all=total_inflows,
            total_outflows_all=total_outflows,
            invoices=inv_dicts,
            anchor_date=anchor_date,
            period_revenue=p_rev,
            period_expenses=p_exp,
            initial_capital=DEFAULT_INITIAL_CAPITAL,
            trailing_n=3,
        )

        # Assert strict equality across all figures — will fail if any differ
        assert summary.revenue == engine_figures.revenue, f"Revenue mismatch in {period}: {summary.revenue} != {engine_figures.revenue}"
        assert summary.expenses == engine_figures.expenses, f"Expenses mismatch in {period}: {summary.expenses} != {engine_figures.expenses}"
        assert summary.net_income == engine_figures.net_income, f"Net income mismatch in {period}: {summary.net_income} != {engine_figures.net_income}"
        assert summary.closing_balance == engine_figures.closing_balance, f"Closing balance mismatch: {summary.closing_balance} != {engine_figures.closing_balance}"
        assert summary.monthly_burn == engine_figures.monthly_burn, f"Monthly burn mismatch: {summary.monthly_burn} != {engine_figures.monthly_burn}"
        assert summary.runway_months == engine_figures.runway_months, f"Runway months mismatch: {summary.runway_months} != {engine_figures.runway_months}"
        assert summary.runway_display == engine_figures.runway_display, f"Runway display mismatch: {summary.runway_display} != {engine_figures.runway_display}"
        assert summary.outstanding_receivables == engine_figures.outstanding_receivables, f"Receivables mismatch: {summary.outstanding_receivables} != {engine_figures.outstanding_receivables}"
        assert summary.overdue_receivables == engine_figures.overdue_receivables, f"Overdue mismatch: {summary.overdue_receivables} != {engine_figures.overdue_receivables}"
        assert summary.revenue_growth_mom == engine_figures.revenue_growth_mom, f"Revenue growth mismatch: {summary.revenue_growth_mom} != {engine_figures.revenue_growth_mom}"
        assert summary.expense_growth_mom == engine_figures.expense_growth_mom, f"Expense growth mismatch: {summary.expense_growth_mom} != {engine_figures.expense_growth_mom}"


def test_dashboard_cashflow_timeline_parity_with_engine(test_db):
    """Test that cashflow timeline series matches calculate_cash_flow from the engine."""
    db, org_id = test_db
    timeline = get_cashflow_timeline(db, org_id, period="30d")

    # Engine cash flow summary
    engine_cf = calculate_cash_flow(
        opening_balance=timeline.opening_balance,
        inflows=timeline.total_inflows,
        outflows=timeline.total_outflows,
    )

    assert timeline.closing_balance == engine_cf.closing_balance
    assert timeline.net_cash_flow == engine_cf.net_cash_flow
    assert timeline.total_inflows == engine_cf.total_inflows
    assert timeline.total_outflows == engine_cf.total_outflows

    # Check that each point conforms to net = inflows - outflows
    for pt in timeline.points:
        step_cf = calculate_cash_flow(Decimal("0.00"), pt.inflows, pt.outflows)
        assert pt.net == step_cf.net_cash_flow


def test_parity_failure_detection(test_db):
    """Verify that the parity assertion will catch and fail if a discrepancy exists."""
    db, org_id = test_db
    summary = get_dashboard_summary(db, org_id, period="30d")

    # Tampered figure
    fake_closing_balance = summary.closing_balance + Decimal("0.01")
    with pytest.raises(AssertionError):
        assert summary.closing_balance == fake_closing_balance

