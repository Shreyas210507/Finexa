from datetime import date
from decimal import Decimal
import uuid
import pytest
from fastapi.testclient import TestClient

from backend.app.agents.audit_agent import AuditAgent
from backend.app.agents.cfo_orchestrator import CFOOrchestratorAgent
from backend.app.agents.invoice_agent import InvoiceAgent
from backend.app.ai.schemas import DataKind
from backend.app.ai.tools.registry import TOOL_REGISTRY, execute_tool
from backend.app.models.ai import AIConversation, AIMessage, AgentExecution
from backend.app.models.invoice import Invoice
from backend.app.models.organisation import Organisation, OrganisationMember
from backend.app.models.profile import Profile
from backend.app.models.transaction import Transaction
from backend.app.services.seed_service import seed_novastack_demo_data


def test_ai_tools_direct(db_session):
    """Directly execute and verify each of the 11 tools with correct data_kind."""
    org_id = uuid.uuid4()
    org = Organisation(id=org_id, name="Novastack Tech", currency="USD", is_demo=True)
    db_session.add(org)
    db_session.commit()
    seed_novastack_demo_data(db_session, org_id, include_anomaly=True)

    # 1. get_financial_summary
    res = execute_tool("get_financial_summary", db_session, org_id, {"period": "30d"})
    assert res.data_kind == DataKind.CALCULATED
    assert "revenue" in res.data
    assert "monthly_burn" in res.data

    # 2. get_transactions
    res = execute_tool("get_transactions", db_session, org_id, {"page": 1, "size": 10})
    assert res.data_kind == DataKind.VERIFIED
    assert len(res.data["transactions"]) > 0

    # 3. get_revenue_by_period
    res = execute_tool("get_revenue_by_period", db_session, org_id, {"period": "30d"})
    assert res.data_kind == DataKind.VERIFIED
    assert "revenue_by_client" in res.data

    # 4. get_expense_breakdown
    res = execute_tool("get_expense_breakdown", db_session, org_id, {"period": "30d"})
    assert res.data_kind == DataKind.VERIFIED
    assert "Salaries" in res.data["breakdown"]

    # 5. get_outstanding_invoices
    res = execute_tool("get_outstanding_invoices", db_session, org_id, {})
    assert res.data_kind == DataKind.VERIFIED
    assert res.data["total_outstanding"] == "94000.00"
    assert res.data["total_overdue"] == "31000.00"

    # 6. calculate_cash_runway
    res = execute_tool("calculate_cash_runway", db_session, org_id, {"trailing_months": 3})
    assert res.data_kind == DataKind.CALCULATED
    assert "runway_display" in res.data

    # 7. generate_cashflow_forecast
    res = execute_tool("generate_cashflow_forecast", db_session, org_id, {"horizon_days": 90})
    assert res.data_kind == DataKind.FORECAST
    assert "disclaimer" in res.data

    # 8. simulate_financial_scenario
    res = execute_tool("simulate_financial_scenario", db_session, org_id, {"hire_count": 2, "salary_per_hire": 6000.0})
    assert res.data_kind == DataKind.ASSUMPTION
    assert "simulated_burn" in res.data

    # 9. identify_anomalies (should detect Crestview Advisory)
    res = execute_tool("identify_anomalies", db_session, org_id, {"period": "30d"})
    assert res.data_kind == DataKind.CALCULATED
    assert res.data["count"] >= 1
    flagged = res.data["anomalies_detected"][0]
    assert flagged["vendor"] == "Crestview Advisory"

    # 10. create_invoice_draft
    res = execute_tool("create_invoice_draft", db_session, org_id, {
        "customer_name": "Test Client",
        "amount": 5000.0,
        "description": "Consulting Support",
    })
    assert res.data_kind == DataKind.ASSUMPTION
    assert res.data["status"] == "Draft"

    # 11. generate_financial_report
    res = execute_tool("generate_financial_report", db_session, org_id, {"report_type": "pnl", "period": "30d"})
    assert res.data_kind == DataKind.VERIFIED
    assert res.data["report_type"] == "PNL"


def test_orchestrator_deterministic_runway(db_session):
    """Assert asking 'What is my cash runway?' triggers calculate_cash_runway and returns exact benchmark."""
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()

    prof = Profile(id=user_id, name="Admin")
    org = Organisation(id=org_id, name="Novastack Technologies", currency="USD", is_demo=True)
    mem = OrganisationMember(user_id=user_id, organisation_id=org_id, role="owner")
    db_session.add_all([prof, org, mem])
    db_session.commit()

    # Seed benchmark data
    seed_novastack_demo_data(db_session, org_id, include_anomaly=False)

    orchestrator = CFOOrchestratorAgent(db_session, org_id, user_id)
    result = orchestrator.execute("What is my cash runway?")

    # Assert exact numbers from the engine
    assert result["routing"] == "deterministic_fast_path"
    assert "4.8 Months" in result["text"]
    assert "51166.67" in result["text"]
    assert "246000.00" in result["text"]


def test_audit_agent_flags_crestview_anomaly(db_session):
    """Audit Agent flags Crestview Advisory ($19,500) with reasons and never labels fraud."""
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()

    prof = Profile(id=user_id, name="Auditor")
    org = Organisation(id=org_id, name="Novastack Technologies", currency="USD", is_demo=True)
    mem = OrganisationMember(user_id=user_id, organisation_id=org_id, role="owner")
    db_session.add_all([prof, org, mem])
    db_session.commit()

    # Seed with Crestview Advisory anomaly included
    seed_novastack_demo_data(db_session, org_id, include_anomaly=True)

    audit_agent = AuditAgent(db_session, org_id, user_id)
    res = audit_agent.execute({})

    assert res["anomalies_count"] == 1
    anom = res["anomalies"][0]
    assert anom["vendor"] == "Crestview Advisory"
    assert anom["amount"] == "19500.00"
    assert "4x" in anom["reason"]
    # Verify the agent NEVER labels anything as fraud
    assert "fraud" not in res["summary"].lower()


def test_invoice_agent_draft_and_approval_workflow(client: TestClient, db_session, make_supabase_token):
    """Invoice Agent creates Draft in needs_approval; approving transitions status."""
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()

    prof = Profile(id=user_id, name="Owner")
    org = Organisation(id=org_id, name="Novastack Technologies", currency="USD")
    mem = OrganisationMember(user_id=user_id, organisation_id=org_id, role="owner")
    db_session.add_all([prof, org, mem])
    db_session.commit()

    token = make_supabase_token(user_id=user_id, email="owner@novastack.io")
    headers = {"Authorization": f"Bearer {token}", "X-Organisation-ID": str(org_id)}

    inv_agent = InvoiceAgent(db_session, org_id, user_id)
    res = inv_agent.execute({
        "action": "create_draft",
        "customer_name": "Pacific Logistics",
        "amount": 7500.00,
        "description": "Logistics Route Optimization API Q4",
    })

    assert "draft" in res
    draft_inv_id = res["draft"]["invoice_id"]
    assert res["draft"]["status"] == "Draft"

    # Query executions via API
    exec_resp = client.get("/api/ai/agents/executions", headers=headers)
    assert exec_resp.status_code == 200
    executions = exec_resp.json()
    assert len(executions) >= 1
    assert executions[0]["status"] == "needs_approval"
    exec_id = executions[0]["id"]

    # Approve the action
    appr_resp = client.post(f"/api/ai/approvals/{exec_id}/action", json={"action": "approve"}, headers=headers)
    assert appr_resp.status_code == 200
    assert appr_resp.json()["execution_status"] == "completed"

    # Verify invoice status in DB changed to Sent
    inv = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(draft_inv_id)).first()
    assert inv.status == "Sent"


def test_chat_persistence_and_graceful_degradation(client: TestClient, db_session, make_supabase_token):
    """Test POST /api/ai/chat persists to DB and works cleanly even when GEMINI_API_KEY is not set."""
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()

    prof = Profile(id=user_id, name="Alex")
    org = Organisation(id=org_id, name="Novastack Technologies", currency="USD", is_demo=True)
    mem = OrganisationMember(user_id=user_id, organisation_id=org_id, role="owner")
    db_session.add_all([prof, org, mem])
    db_session.commit()

    seed_novastack_demo_data(db_session, org_id)

    token = make_supabase_token(user_id=user_id, email="alex@novastack.io")
    headers = {"Authorization": f"Bearer {token}", "X-Organisation-ID": str(org_id)}

    # Send chat message
    chat_resp = client.post("/api/ai/chat", json={"message": "What is our current monthly burn rate?"}, headers=headers)
    assert chat_resp.status_code == 200
    data = chat_resp.json()
    assert "conversation_id" in data
    assert "51166.67" in data["content"]

    conv_id = data["conversation_id"]

    # Verify message persisted
    msgs_resp = client.get(f"/api/ai/conversations/{conv_id}/messages", headers=headers)
    assert msgs_resp.status_code == 200
    msgs = msgs_resp.json()
    assert len(msgs) == 2  # user + assistant
    assert msgs[0]["role"] == "user"
    assert msgs[1]["role"] == "assistant"

