"""
Phase 8 Benchmark Reconciliation Suite.
Asserts that every benchmark metric for Novastack Technologies (as of 31 Oct 2026)
reconciles to the exact cent across the Database, Seed Service, Financial Engine,
Dashboard Service, Reports Service, Forecast Engine, and AI Tools.
"""

from datetime import date
from decimal import Decimal
import uuid
import pytest

from backend.app.ai.tools.registry import execute_tool
from backend.app.financial_engine import (
    calculate_cash_flow,
    calculate_burn_and_runway,
    calculate_receivables,
    calculate_growth_rate,
    MonthlyFigure,
)
from backend.app.models.customer import Customer
from backend.app.models.invoice import Invoice
from backend.app.models.organisation import Organisation
from backend.app.models.transaction import Transaction
from backend.app.services.dashboard_service import get_dashboard_summary
from backend.app.services.report_service import generate_report_data
from backend.app.services.seed_service import seed_novastack_demo_data


def test_novastack_full_stack_benchmark_reconciliation(db_session):
    """Verify that all Novastack benchmark figures reconcile to the exact cent across all layers."""
    org_id = uuid.uuid4()
    org = Organisation(id=org_id, name="Novastack Technologies", currency="USD", is_demo=True)
    db_session.add(org)
    db_session.commit()

    # Seed the complete 12 months (standard benchmark without anomaly)
    seed_novastack_demo_data(db_session, org_id, include_anomaly=False)

    # 1. Database Layer Reconciliation
    # Customers (6 seeded B2B clients)
    cust_count = db_session.query(Customer).filter(Customer.organisation_id == org_id).count()
    assert cust_count == 6

    # Invoices total outstanding and overdue
    invoices = db_session.query(Invoice).filter(Invoice.organisation_id == org_id).all()
    inv_dicts = [
        {"total_amount": inv.total, "paid_amount": inv.amount_paid, "due_date": inv.due_date, "status": inv.status}
        for inv in invoices
    ]
    rec_summary = calculate_receivables(inv_dicts, anchor_date=date(2026, 10, 31))
    assert rec_summary.total_outstanding == Decimal("94000.00")
    assert rec_summary.total_overdue == Decimal("31000.00")

    # 2. Dashboard Service Reconciliation (Trailing 30d)
    summary_30d = get_dashboard_summary(db_session, org_id, period="30d")
    assert summary_30d.closing_balance == Decimal("246000.00")
    assert summary_30d.revenue == Decimal("142000.00")
    assert summary_30d.expenses == Decimal("200500.00")
    assert summary_30d.net_income == Decimal("-58500.00")
    assert summary_30d.monthly_burn == Decimal("51166.67")
    assert summary_30d.runway_display == "4.8"
    assert summary_30d.revenue_growth_mom == Decimal("8.4")
    assert summary_30d.expense_growth_mom == Decimal("12.0")

    # 3. Report Service Reconciliation
    pnl = generate_report_data(db_session, org_id, report_type="pnl", period="30d")
    assert pnl["operating_revenue"] == "142000.00"
    assert pnl["operating_expenses"] == "200500.00"
    assert pnl["net_operating_income"] == "-58500.00"

    cf = generate_report_data(db_session, org_id, report_type="cashflow", period="30d")
    assert cf["closing_balance"] == "246000.00"
    assert cf["runway"] == "4.8"

    aging = generate_report_data(db_session, org_id, report_type="receivables", period="30d")
    assert aging["total_outstanding"] == "94000.00"
    assert aging["total_overdue"] == "31000.00"

    # 4. AI Tool Registry Layer Reconciliation
    tool_summary = execute_tool("get_financial_summary", db_session, org_id, {"period": "30d"})
    assert tool_summary.data["closing_balance"] == "246000.00"
    assert tool_summary.data["monthly_burn"] == "51166.67"
    assert tool_summary.data["runway_display"] == "4.8"

    tool_invoices = execute_tool("get_outstanding_invoices", db_session, org_id, {})
    assert tool_invoices.data["total_outstanding"] == "94000.00"
    assert tool_invoices.data["total_overdue"] == "31000.00"


def test_crestview_advisory_anomaly_reconciliation(db_session):
    """Verify Crestview Advisory anomaly transaction is accurately seeded when requested."""
    org_id = uuid.uuid4()
    org = Organisation(id=org_id, name="Anomaly Org", currency="USD", is_demo=True)
    db_session.add(org)
    db_session.commit()

    seed_novastack_demo_data(db_session, org_id, include_anomaly=True)

    anomaly_tx = (
        db_session.query(Transaction)
        .filter(
            Transaction.organisation_id == org_id,
            Transaction.vendor_or_client == "Crestview Advisory",
        )
        .first()
    )
    assert anomaly_tx is not None
    assert anomaly_tx.amount == Decimal("19500.00")
    assert anomaly_tx.date == date(2026, 10, 18)
    assert anomaly_tx.category == "Other"
