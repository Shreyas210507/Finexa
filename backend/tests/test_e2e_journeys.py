"""
Phase 8 End-to-End User Journeys and Security Hardening Suite.
Tests the 5 core end-to-end business workflows, HTTP security headers, and AI rate limiting.
"""

from datetime import date
from decimal import Decimal
import uuid
import pytest
from fastapi.testclient import TestClient

from backend.app.agents.audit_agent import AuditAgent
from backend.app.agents.cfo_orchestrator import CFOOrchestratorAgent
from backend.app.config import settings
from backend.app.models.ai import AIConversation, AIMessage
from backend.app.models.customer import Customer
from backend.app.models.financial_scenario import FinancialScenario
from backend.app.models.invoice import Invoice, InvoiceLineItem
from backend.app.models.organisation import Organisation, OrganisationMember
from backend.app.models.payment import Payment
from backend.app.models.profile import Profile
from backend.app.models.transaction import Transaction
from backend.app.services.seed_service import seed_novastack_demo_data
from backend.tests.conftest import make_supabase_token


def setup_org_and_user(db_session, email="cfo@novastack.com", seed_demo=True, include_anomaly=False):
    """Helper to set up authenticated test organization and return auth headers."""
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()

    profile = Profile(id=user_id, name="Novastack Lead CFO")
    org = Organisation(id=org_id, name="Novastack Technologies", currency="USD", is_demo=True)
    member = OrganisationMember(id=uuid.uuid4(), organisation_id=org_id, user_id=user_id, role="owner")

    db_session.add_all([profile, org, member])
    db_session.commit()

    if seed_demo:
        seed_novastack_demo_data(db_session, org_id, include_anomaly=include_anomaly)

    token = make_supabase_token(user_id=user_id, email=email)
    headers = {"Authorization": f"Bearer {token}", "X-Organisation-ID": str(org_id)}
    return user_id, org_id, headers


# =========================================================================
# Security & Rate Limiting Tests
# =========================================================================

def test_security_headers_present_on_all_responses(client, db_session):
    """Verify HTTP security headers are attached to responses."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "DENY"
    assert resp.headers.get("X-XSS-Protection") == "1; mode=block"
    assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "X-Request-ID" in resp.headers


def test_ai_rate_limiter_enforcement(client, db_session):
    """Verify AI chat endpoint enforces rate limiting and returns 429 when quota is exceeded."""
    user_id, org_id, headers = setup_org_and_user(db_session, email="ratelimit@novastack.com", seed_demo=False)

    # Exhaust rate limit
    limit = settings.AI_RATE_LIMIT_PER_MINUTE
    got_429 = False

    for i in range(limit + 5):
        resp = client.post(
            "/api/ai/chat",
            json={"message": f"Ping query {i}"},
            headers=headers,
        )
        if resp.status_code == 429:
            got_429 = True
            assert "Rate limit exceeded" in resp.json()["detail"]
            assert resp.headers.get("Retry-After") == "60"
            break

    assert got_429 is True


# =========================================================================
# 5 Core End-to-End User Journeys
# =========================================================================

def test_journey_1_overview_and_period_reconciliation(client, db_session):
    """
    Journey 1: Overview & Period Reconciliation.
    User loads the dashboard summary, toggles accounting periods (30d, 90d, 12m),
    and validates liquid cash ($246,000), monthly burn ($51,166.67), and runway (4.8m).
    """
    user_id, org_id, headers = setup_org_and_user(db_session)

    # 1. 30d Dashboard Summary
    resp_30d = client.get("/api/dashboard/summary?period=30d", headers=headers)
    assert resp_30d.status_code == 200
    data_30d = resp_30d.json()
    assert data_30d["closing_balance"] == "246000.00"
    assert data_30d["monthly_burn"] == "51166.67"
    assert data_30d["runway_display"] == "4.8"
    assert data_30d["revenue"] == "142000.00"
    assert data_30d["expenses"] == "200500.00"
    assert data_30d["net_income"] == "-58500.00"

    # 2. 90d Dashboard Summary
    resp_90d = client.get("/api/dashboard/summary?period=90d", headers=headers)
    assert resp_90d.status_code == 200
    data_90d = resp_90d.json()
    assert data_90d["closing_balance"] == "246000.00"
    assert Decimal(data_90d["revenue"]) >= Decimal("142000.00")

    # 3. Cash flow timeline endpoint
    resp_cf = client.get("/api/dashboard/cashflow?period=30d", headers=headers)
    assert resp_cf.status_code == 200
    cf_data = resp_cf.json()
    assert len(cf_data["points"]) > 0


def test_journey_2_ai_runway_and_cfo_analysis(client, db_session):
    """
    Journey 2: AI Runway & CFO Analysis.
    User asks AI CFO: "What is my current runway and cash burn?".
    Orchestrator routes through tools and returns exact ground-truth figures.
    """
    user_id, org_id, headers = setup_org_and_user(db_session, email="ai_cfo_user@novastack.com")

    resp = client.post(
        "/api/ai/chat",
        json={"message": "What is our current runway and monthly burn rate?"},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "conversation_id" in data
    # Grounded response content check
    content = data["content"]
    assert "4.8 Months" in content or "4.8" in content
    assert "51,166.67" in content or "51166.67" in content
    assert "246,000.00" in content or "246000.00" in content

    # Verify tool results attached
    tool_results = data.get("tool_results", [])
    assert len(tool_results) >= 1
    tool_executed = next((t for t in tool_results if t["tool_name"] in ("calculate_cash_runway", "get_financial_summary")), None)
    assert tool_executed is not None
    assert tool_executed["data_kind"] == "calculated"


def test_journey_3_what_if_simulator_hiring_and_persistence(client, db_session):
    """
    Journey 3: What-If Simulator Hiring.
    User stress-tests hiring 2 software engineers @ $6,000/mo.
    Engine calculates simulated burn ($63,166.67) and runway contraction to 3.9 months.
    Scenario is saved and retrieved from persistence.
    """
    user_id, org_id, headers = setup_org_and_user(db_session, email="simulator_user@novastack.com")

    # 1. Run Simulation
    sim_resp = client.post(
        "/api/forecasts/simulate",
        json={
            "scenario_name": "Scale Core Engineering",
            "scenario_type": "hiring",
            "hire_count": 2,
            "salary_per_hire": 6000.0,
        },
        headers=headers,
    )
    assert sim_resp.status_code == 200
    sim = sim_resp.json()
    assert sim["baseline_burn"] == "51166.67"
    assert sim["simulated_burn"] == "63166.67"
    assert sim["delta_burn"] == "12000.00"
    assert sim["simulated_runway_months"] == "3.9"
    assert sim["risk_level"] in ("medium", "high")

    # 2. Save Scenario
    save_resp = client.post(
        "/api/forecasts/scenarios/save",
        json={
            "scenario_name": "Scale Core Engineering",
            "scenario_type": "hiring",
            "hire_count": 2,
            "salary_per_hire": 6000.0,
        },
        headers=headers,
    )
    assert save_resp.status_code == 201

    # 3. List Scenarios
    list_resp = client.get("/api/forecasts/scenarios", headers=headers)
    assert list_resp.status_code == 200
    saved = list_resp.json()
    assert any(s["name"] == "Scale Core Engineering" for s in saved)


def test_journey_4_invoice_paypal_capture_reconciliation(client, db_session):
    """
    Journey 4: Invoice -> PayPal Sandbox Capture -> Cash Reconciliation.
    User creates an invoice for $20,000 -> captures payment via PayPal ->
    Invoice status becomes 'Paid', balance becomes $0.00, matching income Transaction is created.
    """
    user_id, org_id, headers = setup_org_and_user(db_session, email="invoice_pay@novastack.com")

    # 1. Create Invoice
    inv_resp = client.post(
        "/api/invoices",
        json={
            "customer_name": "Pacific Logistics",
            "issue_date": "2026-10-15",
            "due_date": "2026-11-15",
            "line_items": [
                {
                    "description": "Logistics AI Routing Optimization",
                    "quantity": 1,
                    "unit_price": 20000.0,
                }
            ],
            "tax_rate": 0.0,
            "discount_amount": 0.0,
            "notes": "Net 30 payment terms",
        },
        headers=headers,
    )
    assert inv_resp.status_code == 201
    inv_data = inv_resp.json()
    invoice_id = inv_data["id"]
    assert inv_data["total"] == "20000.00"
    assert inv_data["balance"] == "20000.00"

    # 2. Create PayPal Order
    order_resp = client.post(
        "/api/payments/create-order",
        json={"invoice_id": invoice_id},
        headers=headers,
    )
    assert order_resp.status_code == 200
    order_id = order_resp.json()["order_id"]

    # 3. Capture Order
    cap_resp = client.post(
        "/api/payments/capture-order",
        json={"order_id": order_id, "invoice_id": invoice_id},
        headers=headers,
    )
    assert cap_resp.status_code == 200
    cap_data = cap_resp.json()
    assert cap_data["invoice_new_status"] == "Paid"
    assert cap_data["invoice_balance_remaining"] == "0.00"
    assert cap_data["amount_captured"] == "20000.00"
    assert cap_data["transaction_created"] is True

    # 4. Verify Invoice in Database
    inv_obj = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(invoice_id)).first()
    assert inv_obj.status == "Paid"
    assert inv_obj.balance == Decimal("0.00")
    assert inv_obj.amount_paid == Decimal("20000.00")

    # 5. Verify Transaction in Database
    tx_obj = (
        db_session.query(Transaction)
        .filter(
            Transaction.organisation_id == org_id,
            Transaction.type == "income",
            Transaction.amount == Decimal("20000.00"),
        )
        .first()
    )
    assert tx_obj is not None


def test_journey_5_audit_flag_anomaly_detection(client, db_session):
    """
    Journey 5: Audit Flagging & Anomaly Detection.
    Audit Agent scans transactions, identifies Crestview Advisory ($19,500 on Oct 18, 2026),
    flags the transaction with factual deviation notes, strictly zero fraud accusations.
    """
    user_id, org_id, headers = setup_org_and_user(db_session, email="audit_journey@novastack.com", include_anomaly=True)

    agent = AuditAgent(db_session, org_id, user_id)
    audit_res = agent.execute({})

    assert audit_res["anomalies_count"] >= 1
    anomalies = audit_res["anomalies"]
    assert len(anomalies) >= 1

    crestview = next((a for a in anomalies if a["vendor"] == "Crestview Advisory"), None)
    assert crestview is not None
    assert Decimal(str(crestview["amount"])) == Decimal("19500.00")
    assert crestview["category"] == "Other"

    # Strictly check that no fraud accusations exist
    assert "fraud" not in crestview["reason"].lower()
    assert "fraudulent" not in crestview["reason"].lower()
    assert "crime" not in crestview["reason"].lower()
