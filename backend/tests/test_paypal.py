"""
Phase 7 Pytest Suite: PayPal Sandbox Integration.
Tests PayPal client helpers, payment reconciliation, webhook deduplication,
invoice balance settlement, and live API endpoints.
"""

import json
from datetime import date
from decimal import Decimal
import uuid
import pytest
from fastapi.testclient import TestClient

from backend.app.models.integration import PayPalWebhookEvent
from backend.app.models.invoice import Invoice, InvoiceLineItem
from backend.app.models.notification import Notification
from backend.app.models.organisation import Organisation, OrganisationMember
from backend.app.models.payment import Payment
from backend.app.models.profile import Profile
from backend.app.models.transaction import Transaction
from backend.app.models.customer import Customer
from backend.app.services.paypal_client import (
    create_demo_order,
    capture_demo_order,
    get_connection_status,
    PayPalTokenCache,
)
from backend.app.services.payment_service import (
    list_payments,
    record_payment_and_reconcile,
)
from backend.app.services.seed_service import seed_novastack_demo_data
from backend.tests.conftest import make_supabase_token


def _create_test_invoice(db_session, org_id, customer_id, number="INV-TEST-0001", total="10000.00"):
    """Helper to create a test invoice with a line item."""
    inv = Invoice(
        organisation_id=org_id,
        invoice_number=number,
        customer_id=customer_id,
        status="Sent",
        issue_date=date(2026, 10, 1),
        due_date=date(2026, 11, 15),
        subtotal=Decimal(total),
        tax_rate=Decimal("0.0000"),
        tax_amount=Decimal("0.00"),
        discount_amount=Decimal("0.00"),
        total=Decimal(total),
        amount_paid=Decimal("0.00"),
        balance=Decimal(total),
    )
    db_session.add(inv)
    db_session.flush()

    line = InvoiceLineItem(
        invoice_id=inv.id,
        description="Test Service",
        quantity=Decimal("1.00"),
        unit_price=Decimal(total),
        amount=Decimal(total),
    )
    db_session.add(line)
    db_session.commit()
    db_session.refresh(inv)
    return inv


def test_paypal_token_cache():
    """Verify in-memory token cache behaviour: store, valid check, invalidation."""
    cache = PayPalTokenCache()
    assert cache.token is None
    assert not cache.is_valid

    cache.store("test-access-token-abc123", expires_in=3600)
    assert cache.is_valid
    assert cache.token == "test-access-token-abc123"

    cache.invalidate()
    assert cache.token is None
    assert not cache.is_valid


def test_demo_order_lifecycle():
    """Verify demo order creation and capture produce valid structures."""
    order = create_demo_order("INV-2026-0050", Decimal("15000.00"))
    assert order["order_id"].startswith("DEMO-")
    assert order["status"] == "APPROVED"
    assert order["demo"] is True

    capture = capture_demo_order(order["order_id"], Decimal("15000.00"))
    assert capture["order_status"] == "COMPLETED"
    assert capture["capture"]["capture_id"].startswith("DEMO-CAP-")
    assert capture["capture"]["amount"] == "15000.00"
    assert capture["capture"]["status"] == "COMPLETED"


def test_connection_status():
    """Verify gateway status returns structured configuration info."""
    status = get_connection_status()
    assert "configured" in status
    assert "mode" in status
    assert status["mode"] in ("sandbox", "live")
    assert "status" in status


def test_payment_reconciliation_full_settlement(db_session):
    """Test full payment settles invoice to Paid, creates Transaction, and generates notification."""
    org_id = uuid.uuid4()
    org = Organisation(id=org_id, name="PayPal Test Org", currency="USD", is_demo=True)
    db_session.add(org)

    cust = Customer(organisation_id=org_id, name="Test Client")
    db_session.add(cust)
    db_session.commit()

    inv = _create_test_invoice(db_session, org_id, cust.id, "INV-PAY-001", "25000.00")
    assert inv.balance == Decimal("25000.00")
    assert inv.status == "Sent"

    result = record_payment_and_reconcile(
        db=db_session,
        org_id=org_id,
        invoice_id=inv.id,
        amount=Decimal("25000.00"),
        method="paypal",
        paypal_order_id="DEMO-ORDER-001",
        paypal_capture_id="DEMO-CAP-001",
    )

    assert result["invoice_new_status"] == "Paid"
    assert result["invoice_balance_remaining"] == "0.00"
    assert result["amount_captured"] == "25000.00"
    assert result["transaction_created"] is True

    # Verify Transaction created for cash flow reconciliation
    tx = (
        db_session.query(Transaction)
        .filter(
            Transaction.organisation_id == org_id,
            Transaction.type == "income",
            Transaction.description.like("%INV-PAY-001%"),
        )
        .first()
    )
    assert tx is not None
    assert tx.amount == Decimal("25000.00")

    # Verify notification created
    notif = (
        db_session.query(Notification)
        .filter(
            Notification.organisation_id == org_id,
            Notification.type == "payment_received",
        )
        .first()
    )
    assert notif is not None
    assert "25000.00" in notif.message


def test_payment_reconciliation_partial_settlement(db_session):
    """Test partial payment sets invoice to Partially Paid with correct remaining balance."""
    org_id = uuid.uuid4()
    org = Organisation(id=org_id, name="Partial Pay Org", currency="USD", is_demo=True)
    db_session.add(org)

    cust = Customer(organisation_id=org_id, name="Partial Client")
    db_session.add(cust)
    db_session.commit()

    inv = _create_test_invoice(db_session, org_id, cust.id, "INV-PAY-002", "20000.00")

    result = record_payment_and_reconcile(
        db=db_session,
        org_id=org_id,
        invoice_id=inv.id,
        amount=Decimal("8000.00"),
        method="paypal",
        paypal_order_id="DEMO-PART-001",
        paypal_capture_id="DEMO-CAP-PART-001",
    )

    assert result["invoice_new_status"] == "Partially Paid"
    assert result["invoice_balance_remaining"] == "12000.00"
    assert result["amount_captured"] == "8000.00"


def test_payment_rejects_overpayment(db_session):
    """Payment exceeding invoice balance should be rejected."""
    org_id = uuid.uuid4()
    org = Organisation(id=org_id, name="Overpay Org", currency="USD", is_demo=True)
    db_session.add(org)

    cust = Customer(organisation_id=org_id, name="Overpay Client")
    db_session.add(cust)
    db_session.commit()

    inv = _create_test_invoice(db_session, org_id, cust.id, "INV-PAY-003", "5000.00")

    with pytest.raises(ValueError, match="exceeds invoice balance"):
        record_payment_and_reconcile(
            db=db_session,
            org_id=org_id,
            invoice_id=inv.id,
            amount=Decimal("5000.01"),
            method="paypal",
        )


def test_payment_rejects_already_paid(db_session):
    """Payment on already-paid invoice should be rejected."""
    org_id = uuid.uuid4()
    org = Organisation(id=org_id, name="AlreadyPaid Org", currency="USD", is_demo=True)
    db_session.add(org)

    cust = Customer(organisation_id=org_id, name="Paid Client")
    db_session.add(cust)
    db_session.commit()

    inv = _create_test_invoice(db_session, org_id, cust.id, "INV-PAY-004", "3000.00")

    # Pay in full
    record_payment_and_reconcile(
        db=db_session, org_id=org_id, invoice_id=inv.id,
        amount=Decimal("3000.00"), method="paypal",
    )

    # Try to pay again
    with pytest.raises(ValueError, match="already Paid"):
        record_payment_and_reconcile(
            db=db_session, org_id=org_id, invoice_id=inv.id,
            amount=Decimal("100.00"), method="paypal",
        )


def test_webhook_deduplication(client, db_session):
    """Duplicate webhook events should return 200 with status 'duplicate' and no double-processing."""
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()

    profile = Profile(id=user_id, name="Webhook Tester")
    org = Organisation(id=org_id, name="Webhook Org", currency="USD", is_demo=True)
    member = OrganisationMember(id=uuid.uuid4(), organisation_id=org_id, user_id=user_id, role="owner")
    db_session.add_all([profile, org, member])
    db_session.commit()

    event_payload = {
        "id": "WH-DEDUP-TEST-001",
        "event_type": "CHECKOUT.ORDER.APPROVED",
        "resource": {"id": "ORDER-XYZ-123"},
    }

    # First delivery
    resp1 = client.post("/api/webhooks/paypal", json=event_payload)
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "processed"

    # Duplicate delivery
    resp2 = client.post("/api/webhooks/paypal", json=event_payload)
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "duplicate"

    # Verify only one record in DB
    count = db_session.query(PayPalWebhookEvent).filter(
        PayPalWebhookEvent.event_id == "WH-DEDUP-TEST-001"
    ).count()
    assert count == 1


def test_webhook_capture_completed_reconciles_invoice(client, db_session):
    """PAYMENT.CAPTURE.COMPLETED webhook should auto-reconcile the matching invoice."""
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()

    profile = Profile(id=user_id, name="WH Cap Tester")
    org = Organisation(id=org_id, name="WH Cap Org", currency="USD", is_demo=True)
    member = OrganisationMember(id=uuid.uuid4(), organisation_id=org_id, user_id=user_id, role="owner")
    db_session.add_all([profile, org, member])

    cust = Customer(organisation_id=org_id, name="WH Client")
    db_session.add(cust)
    db_session.commit()

    inv = _create_test_invoice(db_session, org_id, cust.id, "INV-WH-001", "18000.00")

    event_payload = {
        "id": "WH-CAPTURE-TEST-001",
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {
            "id": "CAP-WH-001",
            "amount": {"value": "18000.00", "currency_code": "USD"},
            "invoice_id": "INV-WH-001",
        },
    }

    resp = client.post("/api/webhooks/paypal", json=event_payload)
    assert resp.status_code == 200
    assert resp.json()["status"] == "processed"

    # Verify invoice is now Paid
    db_session.refresh(inv)
    assert inv.status == "Paid"
    assert inv.balance == Decimal("0.00")
    assert inv.amount_paid == Decimal("18000.00")


def test_payments_api_endpoints(client, db_session):
    """Test live /api/payments endpoints: status, list, create-order, capture, demo-simulate."""
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()

    profile = Profile(id=user_id, name="Pay API Tester")
    org = Organisation(id=org_id, name="Pay API Org", currency="USD", is_demo=True)
    member = OrganisationMember(id=uuid.uuid4(), organisation_id=org_id, user_id=user_id, role="owner")
    db_session.add_all([profile, org, member])

    cust = Customer(organisation_id=org_id, name="API Client")
    db_session.add(cust)
    db_session.commit()

    inv = _create_test_invoice(db_session, org_id, cust.id, "INV-API-001", "12000.00")

    token = make_supabase_token(user_id=user_id, email="pay@novastack.com")
    headers = {"Authorization": f"Bearer {token}", "X-Organisation-ID": str(org_id)}

    # 1. GET /api/payments/status
    status_resp = client.get("/api/payments/status")
    assert status_resp.status_code == 200
    assert "mode" in status_resp.json()

    # 2. GET /api/payments (initially empty)
    list_resp = client.get("/api/payments", headers=headers)
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] == 0

    # 3. POST /api/payments/create-order
    order_resp = client.post(
        "/api/payments/create-order",
        json={"invoice_id": str(inv.id)},
        headers=headers,
    )
    assert order_resp.status_code == 200
    order_data = order_resp.json()
    assert order_data["order_id"].startswith("DEMO-")
    assert order_data["demo"] is True
    assert order_data["amount"] == "12000.00"

    # 4. POST /api/payments/capture-order
    cap_resp = client.post(
        "/api/payments/capture-order",
        json={"order_id": order_data["order_id"], "invoice_id": str(inv.id)},
        headers=headers,
    )
    assert cap_resp.status_code == 200
    cap_data = cap_resp.json()
    assert cap_data["invoice_new_status"] == "Paid"
    assert cap_data["invoice_balance_remaining"] == "0.00"
    assert cap_data["amount_captured"] == "12000.00"
    assert cap_data["demo"] is True

    # 5. GET /api/payments (should now have 1 payment)
    list_resp2 = client.get("/api/payments", headers=headers)
    assert list_resp2.status_code == 200
    assert list_resp2.json()["total"] == 1
    assert list_resp2.json()["items"][0]["method"] == "paypal"

    # 6. POST /api/payments/demo-simulate on a fresh invoice
    inv2 = _create_test_invoice(db_session, org_id, cust.id, "INV-API-002", "8500.00")
    sim_resp = client.post(
        "/api/payments/demo-simulate",
        json={"invoice_id": str(inv2.id)},
        headers=headers,
    )
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    assert sim_data["invoice_new_status"] == "Paid"
    assert sim_data["simulated"] is True
    assert sim_data["amount_captured"] == "8500.00"

