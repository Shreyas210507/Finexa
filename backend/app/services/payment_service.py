"""
Payment & Ledger Reconciliation Service for FINEXA.
Handles invoice balance settlement, cash flow reconciliation via Transaction creation,
audit logging, and notification generation on payment capture.
"""

from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional, Tuple
import uuid
import logging

from sqlalchemy.orm import Session

from backend.app.financial_engine import calculate_payment_settlement
from backend.app.models.invoice import Invoice
from backend.app.models.payment import Payment
from backend.app.models.transaction import Transaction
from backend.app.models.audit_log import AuditLog
from backend.app.models.customer import Customer
from backend.app.services.notification_service import create_notification

logger = logging.getLogger("finexa-payments")
TWO_PLACES = Decimal("0.01")


def list_payments(
    db: Session,
    org_id: uuid.UUID,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[Payment], int]:
    """List payments for an organisation with total count."""
    total = (
        db.query(Payment)
        .filter(Payment.organisation_id == org_id)
        .count()
    )
    payments = (
        db.query(Payment)
        .filter(Payment.organisation_id == org_id)
        .order_by(Payment.payment_date.desc(), Payment.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return payments, total


def record_payment_and_reconcile(
    db: Session,
    org_id: uuid.UUID,
    invoice_id: uuid.UUID,
    amount: Decimal,
    method: str = "paypal",
    paypal_order_id: Optional[str] = None,
    paypal_capture_id: Optional[str] = None,
    reference: Optional[str] = None,
    payment_date: Optional[date] = None,
) -> Dict[str, Any]:
    """
    Record a payment, settle invoice balance, create matching Transaction for
    ledger reconciliation, write audit log entry, and generate notification.

    Returns dict with payment details and reconciliation status.
    """
    pay_date = payment_date or date.today()

    # Idempotency check: if PayPal capture ID was already reconciled, return idempotently
    if paypal_capture_id:
        existing_pay = (
            db.query(Payment)
            .filter(
                Payment.organisation_id == org_id,
                Payment.paypal_capture_id == paypal_capture_id,
            )
            .first()
        )
        if existing_pay:
            inv = db.query(Invoice).filter(Invoice.id == existing_pay.invoice_id).first()
            return {
                "payment_id": str(existing_pay.id),
                "invoice_number": inv.invoice_number if inv else "",
                "amount_captured": str(existing_pay.amount),
                "invoice_new_status": inv.status if inv else "Paid",
                "invoice_balance_remaining": str(inv.balance) if inv else "0.00",
                "method": existing_pay.method,
                "paypal_order_id": existing_pay.paypal_order_id,
                "paypal_capture_id": existing_pay.paypal_capture_id,
                "transaction_created": True,
                "idempotent": True,
            }

    # Idempotency check: if PayPal order ID was already reconciled, return idempotently
    if paypal_order_id:
        existing_by_order = (
            db.query(Payment)
            .filter(
                Payment.organisation_id == org_id,
                Payment.paypal_order_id == paypal_order_id,
                Payment.status == "successful",
            )
            .first()
        )
        if existing_by_order:
            inv = db.query(Invoice).filter(Invoice.id == existing_by_order.invoice_id).first()
            return {
                "payment_id": str(existing_by_order.id),
                "invoice_number": inv.invoice_number if inv else "",
                "amount_captured": str(existing_by_order.amount),
                "invoice_new_status": inv.status if inv else "Paid",
                "invoice_balance_remaining": str(inv.balance) if inv else "0.00",
                "method": existing_by_order.method,
                "paypal_order_id": existing_by_order.paypal_order_id,
                "paypal_capture_id": existing_by_order.paypal_capture_id,
                "transaction_created": True,
                "idempotent": True,
            }

    # 1. Load invoice with org isolation
    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.id == invoice_id,
            Invoice.organisation_id == org_id,
        )
        .first()
    )
    if not invoice:
        raise ValueError(f"Invoice {invoice_id} not found for organisation.")

    if invoice.status in ("Paid", "Cancelled"):
        raise ValueError(f"Invoice {invoice.invoice_number} is already {invoice.status}.")

    amount = amount.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    if amount <= Decimal("0.00"):
        raise ValueError("Payment amount must be positive.")

    if amount > invoice.balance:
        raise ValueError(
            f"Payment amount ${amount} exceeds invoice balance of ${invoice.balance}."
        )

    # 2. Create Payment record
    payment_id = uuid.uuid4()
    payment = Payment(
        id=payment_id,
        organisation_id=org_id,
        invoice_id=invoice_id,
        amount=amount,
        payment_date=pay_date,
        method=method,
        status="successful",
        paypal_order_id=paypal_order_id,
        paypal_capture_id=paypal_capture_id,
        reference=reference or f"PAY-{invoice.invoice_number}",
    )
    db.add(payment)
    db.flush()

    # 3. Update invoice balance and status using Financial Engine
    settlement = calculate_payment_settlement(
        total=invoice.total,
        current_amount_paid=invoice.amount_paid,
        payment_amount=amount,
    )
    invoice.amount_paid = settlement.new_amount_paid
    invoice.balance = settlement.new_balance
    invoice.status = "Paid" if settlement.is_fully_paid else "Partially Paid"

    # 4. Create matching Transaction for cash flow reconciliation
    # Look up client name from customer
    client_name = "Client Payment"
    if invoice.customer_id:
        customer = db.query(Customer).filter(Customer.id == invoice.customer_id).first()
        if customer:
            client_name = customer.name

    tx = Transaction(
        organisation_id=org_id,
        type="income",
        category=client_name,
        description=f"Payment received for {invoice.invoice_number} via {method}",
        amount=amount,
        date=pay_date,
        vendor_or_client=client_name,
        reference=f"PAY-{invoice.invoice_number}",
        invoice_id=invoice.id,
        source="paypal",
        source_reference=invoice.invoice_number,
        external_transaction_id=paypal_capture_id,
        idempotency_key=paypal_capture_id or paypal_order_id,
        is_deleted=False,
    )
    db.add(tx)

    # 5. Audit log entry
    audit = AuditLog(
        organisation_id=org_id,
        entity_type="payment",
        entity_id=payment.id,
        action="payment_captured",
        changes={
            "invoice_number": invoice.invoice_number,
            "amount": str(amount),
            "method": method,
            "paypal_order_id": paypal_order_id,
            "paypal_capture_id": paypal_capture_id,
            "new_invoice_status": invoice.status,
            "remaining_balance": str(invoice.balance),
        },
    )
    db.add(audit)

    # 6. Notification
    create_notification(
        db,
        org_id,
        type_="payment_received",
        title=f"Payment Received: {invoice.invoice_number}",
        message=f"${amount} captured via {method} for invoice {invoice.invoice_number}. "
                f"New balance: ${invoice.balance}. Status: {invoice.status}.",
        entity_type="payment",
        entity_id=payment.id,
    )

    db.commit()
    db.refresh(payment)
    db.refresh(invoice)

    return {
        "payment_id": str(payment.id),
        "invoice_number": invoice.invoice_number,
        "amount_captured": str(amount),
        "invoice_new_status": invoice.status,
        "invoice_balance_remaining": str(invoice.balance),
        "method": method,
        "paypal_order_id": paypal_order_id,
        "paypal_capture_id": paypal_capture_id,
        "transaction_created": True,
    }

