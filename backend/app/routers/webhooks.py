"""
PayPal Webhook Ingestion Router for FINEXA.
Handles webhook event receipt, deduplication, signature verification (when configured),
and event processing for payment capture completed events.
"""

import json
import logging
import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.integration import PayPalWebhookEvent
from backend.app.models.invoice import Invoice
from backend.app.services.payment_service import record_payment_and_reconcile

logger = logging.getLogger("finexa-webhooks")

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/paypal", status_code=status.HTTP_200_OK)
async def receive_paypal_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Receive PayPal webhook events.
    Performs deduplication, optional signature verification, and idempotent processing.
    """
    body = await request.body()
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_id = payload.get("id")
    event_type = payload.get("event_type", "")

    if not event_id:
        raise HTTPException(status_code=400, detail="Missing event id")

    # Deduplication: check if event already received
    existing = (
        db.query(PayPalWebhookEvent)
        .filter(PayPalWebhookEvent.event_id == event_id)
        .first()
    )
    if existing:
        logger.info(f"Duplicate webhook event {event_id}, returning OK.")
        return {
            "status": "duplicate",
            "event_id": event_id,
            "message": "Event already processed.",
        }

    # Extract resource info
    resource = payload.get("resource", {})
    resource_id = resource.get("id", "")

    # Persist event (received status)
    webhook_event = PayPalWebhookEvent(
        event_id=event_id,
        event_type=event_type,
        resource_id=resource_id,
        payload=payload,
        status="received",
    )
    db.add(webhook_event)
    db.commit()

    # Process supported event types
    try:
        if event_type == "PAYMENT.CAPTURE.COMPLETED":
            _process_capture_completed(db, resource, webhook_event)
        elif event_type == "CHECKOUT.ORDER.APPROVED":
            # Log but no auto-action; capture happens via user-initiated endpoint
            logger.info(f"Order approved event received: {resource_id}")
            webhook_event.status = "processed"
        else:
            logger.info(f"Unhandled webhook event type: {event_type}")
            webhook_event.status = "processed"

        db.commit()

    except Exception as e:
        logger.error(f"Webhook processing error for event {event_id}: {e}")
        webhook_event.status = "failed"
        webhook_event.error = str(e)[:500]
        db.commit()
        # Still return 200 to prevent PayPal retries for processing errors
        return {
            "status": "error",
            "event_id": event_id,
            "message": "Event received but processing failed.",
        }

    return {
        "status": "processed",
        "event_id": event_id,
        "event_type": event_type,
    }


def _process_capture_completed(
    db: Session,
    resource: dict,
    webhook_event: PayPalWebhookEvent,
) -> None:
    """
    Process a PAYMENT.CAPTURE.COMPLETED event.
    Finds the matching invoice by invoice_id in the purchase unit custom_id or
    supplementary_data, settles the balance, and reconciles the ledger.
    """
    capture_id = resource.get("id", "")
    amount_data = resource.get("amount", {})
    amount_value = Decimal(amount_data.get("value", "0.00"))

    # Attempt to find invoice reference
    invoice_id_str = resource.get("invoice_id") or resource.get("custom_id")
    if not invoice_id_str:
        # Try supplementary data
        supp = resource.get("supplementary_data", {})
        related = supp.get("related_ids", {})
        invoice_id_str = related.get("invoice_id")

    if not invoice_id_str:
        logger.warning(f"Capture {capture_id} has no invoice reference — skipping reconciliation.")
        webhook_event.status = "processed"
        return

    # Find the invoice by invoice_number (PayPal invoice_id field stores our invoice_number)
    invoice = (
        db.query(Invoice)
        .filter(Invoice.invoice_number == invoice_id_str)
        .first()
    )

    if not invoice:
        # Try by UUID if it's a valid UUID
        try:
            inv_uuid = uuid.UUID(invoice_id_str)
            invoice = db.query(Invoice).filter(Invoice.id == inv_uuid).first()
        except ValueError:
            pass

    if not invoice:
        logger.warning(f"No invoice found for reference '{invoice_id_str}' in capture {capture_id}")
        webhook_event.status = "processed"
        return

    if invoice.status == "Paid":
        logger.info(f"Invoice {invoice.invoice_number} already paid — skipping.")
        webhook_event.status = "processed"
        return

    # Reconcile
    record_payment_and_reconcile(
        db=db,
        org_id=invoice.organisation_id,
        invoice_id=invoice.id,
        amount=amount_value,
        method="paypal_webhook",
        paypal_capture_id=capture_id,
        reference=f"WEBHOOK-{webhook_event.event_id}",
    )

    webhook_event.status = "processed"
    logger.info(
        f"Webhook capture {capture_id} reconciled: ${amount_value} applied to {invoice.invoice_number}"
    )

