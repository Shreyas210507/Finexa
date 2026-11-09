from datetime import date
from decimal import Decimal
import uuid
import pytest
from fastapi.testclient import TestClient

from backend.app.models.organisation import Organisation, OrganisationMember
from backend.app.models.profile import Profile
from backend.app.models.audit_log import AuditLog
from backend.app.models.transaction import Transaction


def test_transactions_crud_and_audit(client: TestClient, db_session, make_supabase_token):
    """Verify transactions CRUD, org scoping, and audit log generation."""
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()

    profile = Profile(id=user_id, name="Nova Admin")
    org = Organisation(id=org_id, name="Novastack Technologies", currency="USD")
    member = OrganisationMember(user_id=user_id, organisation_id=org_id, role="owner")
    db_session.add_all([profile, org, member])
    db_session.commit()

    token = make_supabase_token(user_id=user_id, email="admin@novastack.io")
    headers = {"Authorization": f"Bearer {token}", "X-Organisation-ID": str(org_id)}

    # 1. Create Transaction
    payload = {
        "type": "expense",
        "category": "Software",
        "description": "JetBrains AI subscription",
        "amount": "120.00",
        "date": "2026-10-15",
        "vendor_or_client": "JetBrains",
        "reference": "JB-9921",
    }
    create_resp = client.post("/api/transactions", json=payload, headers=headers)
    assert create_resp.status_code == 201
    tx_data = create_resp.json()
    assert tx_data["category"] == "Software"
    assert tx_data["amount"] == "120.00"
    tx_id = tx_data["id"]

    # Verify audit log created
    audit = db_session.query(AuditLog).filter(
        AuditLog.organisation_id == org_id,
        AuditLog.entity_id == uuid.UUID(tx_id),
        AuditLog.action == "create",
    ).first()
    assert audit is not None
    assert audit.changes["category"] == "Software"

    # 2. List Transactions
    list_resp = client.get("/api/transactions", headers=headers)
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] == 1

    # 3. Export CSV
    csv_resp = client.get("/api/transactions/export/csv", headers=headers)
    assert csv_resp.status_code == 200
    assert "JetBrains AI subscription" in csv_resp.text
    assert "120.00" in csv_resp.text

    # 4. Update Transaction
    update_resp = client.patch(f"/api/transactions/{tx_id}", json={"amount": "150.00"}, headers=headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["amount"] == "150.00"

    # 5. Delete Transaction (soft delete)
    del_resp = client.delete(f"/api/transactions/{tx_id}", headers=headers)
    assert del_resp.status_code == 204

    # Verify no longer returned in list
    list_after = client.get("/api/transactions", headers=headers)
    assert list_after.json()["total"] == 0


def test_cross_org_transaction_isolation(client: TestClient, db_session, make_supabase_token):
    """Prove that Org B cannot read or delete Org A's transaction."""
    user_a = uuid.uuid4()
    org_a = uuid.uuid4()
    user_b = uuid.uuid4()
    org_b = uuid.uuid4()

    prof_a = Profile(id=user_a, name="User A")
    o_a = Organisation(id=org_a, name="Org A", currency="USD")
    mem_a = OrganisationMember(user_id=user_a, organisation_id=org_a, role="owner")

    prof_b = Profile(id=user_b, name="User B")
    o_b = Organisation(id=org_b, name="Org B", currency="USD")
    mem_b = OrganisationMember(user_id=user_b, organisation_id=org_b, role="owner")

    db_session.add_all([prof_a, o_a, mem_a, prof_b, o_b, mem_b])
    db_session.commit()

    # Create transaction in Org A
    tx_a = Transaction(
        organisation_id=org_a,
        type="expense",
        category="Salaries",
        amount=Decimal("5000.00"),
        date=date(2026, 10, 1),
    )
    db_session.add(tx_a)
    db_session.commit()

    token_b = make_supabase_token(user_id=user_b, email="b@competitor.io")
    headers_b = {"Authorization": f"Bearer {token_b}", "X-Organisation-ID": str(org_b)}

    # User B tries to get Org A's transaction
    get_resp = client.get(f"/api/transactions/{tx_a.id}", headers=headers_b)
    assert get_resp.status_code == 404

    # User B tries to delete Org A's transaction
    del_resp = client.delete(f"/api/transactions/{tx_a.id}", headers=headers_b)
    assert del_resp.status_code == 404


def test_invoices_and_pdf_generation(client: TestClient, db_session, make_supabase_token):
    """Verify invoice creation with server math and PDF generation."""
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()

    profile = Profile(id=user_id, name="Owner")
    org = Organisation(id=org_id, name="Novastack Technologies", currency="USD")
    member = OrganisationMember(user_id=user_id, organisation_id=org_id, role="owner")
    db_session.add_all([profile, org, member])
    db_session.commit()

    token = make_supabase_token(user_id=user_id, email="owner@novastack.io")
    headers = {"Authorization": f"Bearer {token}", "X-Organisation-ID": str(org_id)}

    # Create invoice with 2 line items, 10% tax, $50 discount
    payload = {
        "customer_name": "Meridian Systems",
        "customer_email": "billing@meridiansys.com",
        "issue_date": "2026-10-01",
        "due_date": "2026-10-31",
        "tax_rate": "0.10",
        "discount_amount": "50.00",
        "notes": "Thank you for partnering with Novastack.",
        "line_items": [
            {"description": "AI Platform Architecture", "quantity": "2.00", "unit_price": "500.00"},
            {"description": "Production Deployment Support", "quantity": "1.00", "unit_price": "200.00"},
        ],
    }

    resp = client.post("/api/invoices", json=payload, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["invoice_number"] == "INV-2026-0001"
    # Subtotal: 2*500 + 1*200 = 1200.00
    assert data["subtotal"] == "1200.00"
    # Tax: 10% of 1200 = 120.00
    assert data["tax_amount"] == "120.00"
    # Discount: 50.00
    assert data["discount_amount"] == "50.00"
    # Total: 1200 + 120 - 50 = 1270.00
    assert data["total"] == "1270.00"
    assert data["balance"] == "1270.00"

    inv_id = data["id"]

    # Test PDF download
    pdf_resp = client.get(f"/api/invoices/{inv_id}/pdf", headers=headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    # PDF files start with %PDF-
    assert pdf_resp.content.startswith(b"%PDF-")


def test_novastack_seed_and_dashboard_reconcile(client: TestClient, db_session, make_supabase_token):
    """Seed Novastack demo organisation and verify dashboard totals reconcile with benchmark."""
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()

    profile = Profile(id=user_id, name="Demo User")
    org = Organisation(id=org_id, name="Novastack Demo", currency="USD", is_demo=True)
    member = OrganisationMember(user_id=user_id, organisation_id=org_id, role="owner")
    db_session.add_all([profile, org, member])
    db_session.commit()

    token = make_supabase_token(user_id=user_id, email="demo@novastack.io")
    headers = {"Authorization": f"Bearer {token}", "X-Organisation-ID": str(org_id)}

    # Reset / seed demo data
    seed_resp = client.post("/api/demo/reset", headers=headers)
    assert seed_resp.status_code == 200
    seed_result = seed_resp.json()
    assert seed_result["status"] == "ok"
    assert seed_result["organisation"] == "Novastack Technologies"

    # Query Dashboard Summary
    dash_resp = client.get("/api/dashboard/summary?period=30d", headers=headers)
    assert dash_resp.status_code == 200
    dash = dash_resp.json()

    # Reconcile exact benchmark numbers:
    # Oct 2026 Rev: $142,000.00
    assert dash["revenue"] == "142000.00"
    # Oct 2026 Exp: $200,500.00
    assert dash["expenses"] == "200500.00"
    # Oct Net Loss: -$58,500.00
    assert dash["net_income"] == "-58500.00"
    # Trailing 3-month burn: $51,166.67
    assert dash["monthly_burn"] == "51166.67"
    # Runway: 4.8 months
    assert dash["runway_months"] == "4.8"
    # Closing liquid cash balance: $246,000.00
    assert dash["closing_balance"] == "246000.00"
    # Total outstanding receivables: $94,000.00
    assert dash["outstanding_receivables"] == "94000.00"
    # Overdue receivables: $31,000.00
    assert dash["overdue_receivables"] == "31000.00"
    # MoM Revenue growth: +8.4%
    assert dash["revenue_growth_mom"] == "8.4"
    # MoM Expense growth: +12.0%
    assert dash["expense_growth_mom"] == "12.0"
