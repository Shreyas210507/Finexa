from datetime import date
from decimal import Decimal
import io
import uuid
import pytest
from fastapi.testclient import TestClient

from backend.app.financial_engine import (
    calculate_cash_flow_forecast,
    simulate_scenario,
    MonthlyFigure,
)
from backend.app.models.financial_scenario import FinancialScenario
from backend.app.models.invoice import Invoice
from backend.app.models.notification import Notification
from backend.app.models.organisation import Organisation, OrganisationMember
from backend.app.models.profile import Profile
from backend.app.models.transaction import Transaction
from backend.app.services.dashboard_service import get_dashboard_summary
from backend.app.services.notification_service import (
    create_notification,
    list_notifications,
    mark_notification_read,
    mark_all_notifications_read,
    check_and_trigger_system_events,
)
from backend.app.services.report_service import (
    generate_report_data,
    generate_report_pdf,
    generate_report_csv,
)
from backend.app.services.seed_service import seed_novastack_demo_data
from backend.tests.conftest import make_supabase_token


def test_financial_engine_forecasting():
    """Verify deterministic cash flow forecast engine with uncertainty cones and depletion detection."""
    # Historical 12 months with Novastack benchmark figures
    months = [
        ("2025-11", "95000.00", "120000.00"),
        ("2025-12", "102000.00", "128000.00"),
        ("2026-01", "108000.00", "135000.00"),
        ("2026-02", "112000.00", "140000.00"),
        ("2026-03", "115000.00", "148000.00"),
        ("2026-04", "120000.00", "152000.00"),
        ("2026-05", "124000.00", "158000.00"),
        ("2026-06", "128000.00", "165000.00"),
        ("2026-07", "130000.00", "170000.00"),
        ("2026-08", "128000.00", "175000.00"),
        ("2026-09", "131000.00", "179000.00"),
        ("2026-10", "142000.00", "200500.00"),
    ]
    history = [
        MonthlyFigure(
            month_key=k,
            revenue=Decimal(rev),
            expenses=Decimal(exp),
            net_income=Decimal(rev) - Decimal(exp),
        )
        for k, rev, exp in months
    ]

    current_cash = Decimal("246000.00")
    trailing_burn = Decimal("51166.67")
    scheduled_receivables = [
        {"due_date": date(2026, 11, 15), "balance": Decimal("25000.00"), "invoice_number": "INV-2026-004"},
        {"due_date": date(2026, 11, 30), "balance": Decimal("38000.00"), "invoice_number": "INV-2026-005"},
    ]

    # Test 30-day forecast
    res_30 = calculate_cash_flow_forecast(
        closing_balance=current_cash,
        trailing_monthly_burn=trailing_burn,
        monthly_history=history,
        scheduled_receivables=scheduled_receivables,
        anchor_date=date(2026, 10, 31),
        horizon_days=30,
    )
    assert len(res_30.points) == 31
    assert res_30.horizon_days == 30
    assert res_30.opening_balance == Decimal("246000.00")
    # Daily burn rate based on trailing 3M burn ($51,166.67 / 30 = ~$1,705.56)
    assert res_30.daily_burn_rate > Decimal("1700.00")
    # At day 30, uncertainty cone should be bounded by +/- 10%
    day30 = res_30.points[-1]
    assert day30.upper_bound >= day30.projected_balance
    assert day30.lower_bound <= day30.projected_balance

    # Test 180-day forecast with depletion check
    res_180 = calculate_cash_flow_forecast(
        closing_balance=current_cash,
        trailing_monthly_burn=trailing_burn,
        monthly_history=history,
        scheduled_receivables=[],
        anchor_date=date(2026, 10, 31),
        horizon_days=180,
    )
    # Without receivables, Novastack drops below $150,000 threshold and eventually to zero
    assert res_180.warning_shortage_date is not None
    assert res_180.zero_depletion_date is not None
    assert res_180.warning_shortage_date < res_180.zero_depletion_date


def test_financial_engine_simulator_benchmarks():
    """Verify what-if simulation benchmarks for hiring and expense surge scenarios."""
    baseline_cash = Decimal("246000.00")
    baseline_burn = Decimal("51166.67")
    baseline_expenses = Decimal("184833.33")

    # Benchmark 1: Hire 2 software engineers at $6,000/mo each
    res_hire = simulate_scenario(
        closing_balance=baseline_cash,
        baseline_burn=baseline_burn,
        trailing_3m_average_expenses=baseline_expenses,
        scenario_type="hiring",
        parameters={"hire_count": 2, "salary_per_hire": 6000.0},
        scenario_name="Engineering Expansion",
    )
    # Incremental cost: 2 * 6000 = $12,000.00
    # Simulated burn: 51,166.67 + 12,000.00 = $63,166.67
    assert res_hire.simulated_burn == Decimal("63166.67")
    # Runway: 246000.00 / 63166.67 = 3.9 months
    assert res_hire.simulated_runway_months == Decimal("3.9")
    assert res_hire.risk_level in ["medium", "high"]
    assert "hiring 2 team members" in res_hire.explanation

    # Benchmark 2: 15% OpEx surge
    res_surge = simulate_scenario(
        closing_balance=baseline_cash,
        baseline_burn=baseline_burn,
        trailing_3m_average_expenses=baseline_expenses,
        scenario_type="expense_surge",
        parameters={"expense_increase_pct": 15.0},
        scenario_name="OpEx Surge Stress Test",
    )
    # 15% of 184,833.33 = +27,725.00 => Simulated burn = 78,891.67 => Runway = 246000 / 78891.67 = 3.1 months
    assert res_surge.simulated_runway_months == Decimal("3.1")
    assert res_surge.risk_level in ["high", "critical"]


def test_reports_service_and_generators(db_session):
    """Test report compilation, PDF generation, and CSV export."""
    org_id = uuid.uuid4()
    org = Organisation(id=org_id, name="Novastack Tech", currency="USD", is_demo=True)
    db_session.add(org)
    db_session.commit()
    seed_novastack_demo_data(db_session, org_id)

    # 1. P&L Report
    pnl = generate_report_data(db_session, org_id, report_type="pnl", period="30d")
    assert pnl["report_type"] == "pnl"
    assert pnl["operating_revenue"] == "142000.00"
    assert pnl["operating_expenses"] == "200500.00"
    assert pnl["net_operating_income"] == "-58500.00"

    # CSV P&L
    csv_pnl = generate_report_csv(pnl)
    csv_text = csv_pnl.getvalue()
    assert "Operating Revenue" in csv_text
    assert "142000.00" in csv_text

    # PDF P&L
    pdf_pnl = generate_report_pdf(pnl)
    pdf_bytes = pdf_pnl.getvalue()
    assert pdf_bytes.startswith(b"%PDF-")
    assert len(pdf_bytes) > 1000

    # 2. Cash Flow Report
    cf = generate_report_data(db_session, org_id, report_type="cashflow", period="30d")
    assert cf["report_type"] == "cashflow"
    assert cf["closing_balance"] == "246000.00"
    assert cf["runway"] == "4.8"

    # 3. Receivables Report
    rec = generate_report_data(db_session, org_id, report_type="receivables", period="30d")
    assert rec["report_type"] == "receivables"
    assert rec["total_outstanding"] == "94000.00"
    assert rec["total_overdue"] == "31000.00"

    # 4. Tax Report
    tax = generate_report_data(db_session, org_id, report_type="tax", period="30d")
    assert tax["report_type"] == "tax"
    assert "estimated_tax_rate" in tax


def test_notifications_service_and_triggers(db_session):
    """Test notification generation, overdue invoice scanning, and read management."""
    org_id = uuid.uuid4()
    org = Organisation(id=org_id, name="Novastack Tech", currency="USD", is_demo=True)
    db_session.add(org)
    db_session.commit()
    seed_novastack_demo_data(db_session, org_id)

    # Trigger system events (overdue invoices + runway warning)
    created = check_and_trigger_system_events(db_session, org_id, anchor_date=date(2026, 10, 31))
    assert len(created) >= 1

    # List notifications
    notifs, unread_count = list_notifications(db_session, org_id)
    assert len(notifs) >= 1
    assert unread_count == len(notifs)

    # Mark single notification as read
    first_id = notifs[0].id
    updated = mark_notification_read(db_session, org_id, first_id)
    assert updated is not None
    assert updated.is_read is True

    # Mark all read
    mark_all_notifications_read(db_session, org_id)
    _, remaining_unread = list_notifications(db_session, org_id)
    assert remaining_unread == 0


def test_forecasts_and_reports_api_endpoints(client, db_session):
    """Test live API routes for forecasts, simulation, scenario persistence, and reports."""
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()

    profile = Profile(id=user_id, name="Novastack CFO")
    org = Organisation(id=org_id, name="Novastack Technologies", currency="USD", is_demo=True)
    member = OrganisationMember(id=uuid.uuid4(), organisation_id=org_id, user_id=user_id, role="owner")

    db_session.add_all([profile, org, member])
    db_session.commit()
    seed_novastack_demo_data(db_session, org_id)

    token = make_supabase_token(user_id=user_id, email="cfo@novastack.com")
    headers = {"Authorization": f"Bearer {token}", "X-Organisation-ID": str(org_id)}

    # 1. GET /api/forecasts
    resp = client.get("/api/forecasts?horizon=90", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["horizon_days"] == 90
    assert len(data["points"]) == 91
    assert data["opening_balance"] == "246000.00"

    # 2. POST /api/forecasts/simulate
    sim_resp = client.post(
        "/api/forecasts/simulate",
        json={
            "scenario_name": "Engineering Expansion",
            "scenario_type": "hiring",
            "hire_count": 2,
            "salary_per_hire": 6000.0,
        },
        headers=headers,
    )
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    assert sim_data["simulated_burn"] == "63166.67"
    assert sim_data["simulated_runway_months"] == "3.9"

    # 3. POST /api/forecasts/scenarios/save
    save_resp = client.post(
        "/api/forecasts/scenarios/save",
        json={
            "scenario_name": "Saved OpEx Stress Test",
            "scenario_type": "expense_surge",
            "expense_increase_pct": 15.0,
        },
        headers=headers,
    )
    assert save_resp.status_code == 201
    save_data = save_resp.json()
    assert save_data["name"] == "Saved OpEx Stress Test"

    # 4. GET /api/forecasts/scenarios
    list_resp = client.get("/api/forecasts/scenarios", headers=headers)
    assert list_resp.status_code == 200
    scenarios = list_resp.json()
    assert len(scenarios) >= 1
    assert scenarios[0]["name"] == "Saved OpEx Stress Test"

    # 5. GET /api/reports (JSON)
    rep_resp = client.get("/api/reports?report_type=pnl&period=30d", headers=headers)
    assert rep_resp.status_code == 200
    rep_data = rep_resp.json()
    assert rep_data["report_type"] == "pnl"
    assert rep_data["operating_revenue"] == "142000.00"

    # 6. GET /api/reports/pdf
    pdf_resp = client.get("/api/reports/pdf?report_type=cashflow&period=30d", headers=headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert pdf_resp.content.startswith(b"%PDF-")

    # 7. GET /api/reports/csv
    csv_resp = client.get("/api/reports/csv?report_type=receivables&period=30d", headers=headers)
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]
    assert b"Total Outstanding" in csv_resp.content

    # 8. Notifications API
    notif_resp = client.get("/api/notifications", headers=headers)
    assert notif_resp.status_code == 200
    notif_data = notif_resp.json()
    assert "items" in notif_data
    assert "unread_count" in notif_data

    # Read-all
    read_all_resp = client.post("/api/notifications/read-all", headers=headers)
    assert read_all_resp.status_code == 200
    assert read_all_resp.json()["status"] == "success"
