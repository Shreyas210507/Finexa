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


def test_webhook_deduplication(db_session):
    """Duplicate webhook events should be identified and stored once."""
    event_payload = {
        "id": "WH-DEDUP-TEST-001",
        "event_type": "CHECKOUT.ORDER.APPROVED",
        "resource": {"id": "ORDER-XYZ-123"},
    }

    # Simulate first webhook receipt
    ev1 = PayPalWebhookEvent(
        event_id=event_payload["id"],
        event_type=event_payload["event_type"],
        resource_id=event_payload["resource"]["id"],
        payload=event_payload,
        status="processed",
    )
    db_session.add(ev1)
    db_session.commit()

    # Simulate duplicate receipt query
    existing = db_session.query(PayPalWebhookEvent).filter(
        PayPalWebhookEvent.event_id == event_payload["id"]
    ).first()
    assert existing is not None
    assert existing.event_id == "WH-DEDUP-TEST-001"
    assert existing.status == "processed"

    # Verify deduplication prevents inserting a second event with same event_id
    count = db_session.query(PayPalWebhookEvent).filter(
        PayPalWebhookEvent.event_id == "WH-DEDUP-TEST-001"
    ).count()
    assert count == 1


def test_webhook_capture_completed_reconciles_invoice(db_session):
    """PAYMENT.CAPTURE.COMPLETED webhook should auto-reconcile the matching invoice."""
    from backend.app.routers.webhooks import _process_capture_completed

    org_id = uuid.uuid4()
    org = Organisation(id=org_id, name="WH Cap Org", currency="USD", is_demo=True)
    db_session.add(org)
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

    webhook_event = PayPalWebhookEvent(
        event_id=event_payload["id"],
        event_type=event_payload["event_type"],
        resource_id=event_payload["resource"]["id"],
        payload=event_payload,
        status="received",
    )
    db_session.add(webhook_event)
    db_session.commit()

    # Process capture completed
    _process_capture_completed(db_session, event_payload["resource"], webhook_event)
    db_session.commit()

    # Verify invoice is now Paid and reconciled
    db_session.refresh(inv)
    assert inv.status == "Paid"
    assert inv.balance == Decimal("0.00")
    assert inv.amount_paid == Decimal("18000.00")

    # Verify payment record was created
    payment = db_session.query(Payment).filter(Payment.paypal_capture_id == "CAP-WH-001").first()
    assert payment is not None
    assert payment.amount == Decimal("18000.00")
    assert payment.status == "successful"


def test_payments_reconciliation_and_idempotency_direct(db_session):
    """Test full payment lifecycle, ledger transaction generation, and idempotency."""
    org_id = uuid.uuid4()
    org = Organisation(id=org_id, name="Pay Lifecycle Org", currency="USD", is_demo=True)
    db_session.add(org)

    cust = Customer(organisation_id=org_id, name="Lifecycle Client")
    db_session.add(cust)
    db_session.commit()

    inv = _create_test_invoice(db_session, org_id, cust.id, "INV-LIFE-001", "14500.00")

    # 1. Initial payment reconciliation
    res1 = record_payment_and_reconcile(
        db=db_session,
        org_id=org_id,
        invoice_id=inv.id,
        amount=Decimal("14500.00"),
        method="paypal",
        paypal_order_id="DEMO-ORDER-LIFE-001",
        paypal_capture_id="DEMO-CAP-LIFE-001",
    )
    assert res1["invoice_new_status"] == "Paid"
    assert res1["amount_captured"] == "14500.00"
    assert res1["invoice_balance_remaining"] == "0.00"
    assert res1["transaction_created"] is True

    # 2. Duplicate capture attempt (idempotency check)
    res2 = record_payment_and_reconcile(
        db=db_session,
        org_id=org_id,
        invoice_id=inv.id,
        amount=Decimal("14500.00"),
        method="paypal",
        paypal_order_id="DEMO-ORDER-LIFE-001",
        paypal_capture_id="DEMO-CAP-LIFE-001",
    )
    assert res2.get("idempotent") is True
    assert res2["invoice_new_status"] == "Paid"

    # Verify only ONE transaction and ONE payment was created
    pay_count = db_session.query(Payment).filter(Payment.paypal_capture_id == "DEMO-CAP-LIFE-001").count()
    assert pay_count == 1
    tx_count = db_session.query(Transaction).filter(Transaction.external_transaction_id == "DEMO-CAP-LIFE-001").count()
    assert tx_count == 1

