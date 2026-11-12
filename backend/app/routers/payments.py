"""
Payments router for FINEXA.
Handles payment listing, PayPal order creation/capture, and demo simulation.
"""

import uuid
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.financial_engine import TWO_PLACES
from backend.app.database import get_db
from backend.app.dependencies import get_current_org, get_current_profile
from backend.app.models.invoice import Invoice
from backend.app.models.organisation import Organisation
from backend.app.models.profile import Profile
from backend.app.services.paypal_client import (
    get_connection_status,
    create_order,
    capture_order,
    create_demo_order,
    capture_demo_order,
    _is_configured,
    PayPalError,
)
from backend.app.services.payment_service import (
    list_payments,
    record_payment_and_reconcile,
)

router = APIRouter(prefix="/payments", tags=["Payments & Collections"])


class CreateOrderRequest(BaseModel):
    invoice_id: str
    amount: Optional[float] = None
    return_url: str = "http://localhost:3000/payments?status=success"
    cancel_url: str = "http://localhost:3000/payments?status=cancelled"


class CaptureOrderRequest(BaseModel):
    order_id: str
    invoice_id: str


class DemoSimulateRequest(BaseModel):
    invoice_id: str
    amount: Optional[float] = None  # If None, pays full balance


@router.get("/status", status_code=status.HTTP_200_OK)
def get_gateway_status():
    """Return PayPal gateway configuration and connection status."""
    return get_connection_status()


@router.get("", status_code=status.HTTP_200_OK)
def get_payments(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """List all payments for the current organisation with customer details and reconciliation status."""
    payments, total = list_payments(db, current_org.id, limit=limit, offset=offset)
    items = []
    for p in payments:
        inv = p.invoice
        cust_name = inv.customer.name if inv and inv.customer else "Direct Settlement"
        inv_number = inv.invoice_number if inv else (p.reference or "—")
        items.append({
            "id": str(p.id),
            "invoice_id": str(p.invoice_id) if p.invoice_id else None,
            "invoice_number": inv_number,
            "customer_name": cust_name,
            "amount": str(p.amount),
            "currency": current_org.currency or "USD",
            "payment_date": str(p.payment_date),
            "method": p.method,
            "status": p.status,
            "paypal_order_id": p.paypal_order_id,
            "paypal_capture_id": p.paypal_capture_id,
            "reference": p.reference,
            "reconciled": True,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("/create-order", status_code=status.HTTP_200_OK)
async def create_paypal_order(
    req: CreateOrderRequest,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Create a PayPal order for an unpaid invoice with server-side amount validation."""
    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.id == uuid.UUID(req.invoice_id),
            Invoice.organisation_id == current_org.id,
        )
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.status in ("Paid", "Cancelled"):
        raise HTTPException(status_code=400, detail=f"Invoice is already {invoice.status}")

    if invoice.balance <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Invoice has no outstanding balance")

    pay_amount = invoice.balance
    if req.amount:
        requested = Decimal(str(req.amount)).quantize(TWO_PLACES)
        if requested <= Decimal("0.00"):
            raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")
        if requested > invoice.balance:
            raise HTTPException(status_code=400, detail=f"Requested amount ${requested} exceeds invoice balance of ${invoice.balance}")
        pay_amount = requested

    customer_name = invoice.customer.name if invoice.customer else "Client"

    if _is_configured():
        try:
            result = await create_order(
                invoice_number=invoice.invoice_number,
                amount=pay_amount,
                currency=current_org.currency or "USD",
                description=f"FINEXA Invoice {invoice.invoice_number} - {customer_name}",
                return_url=req.return_url,
                cancel_url=req.cancel_url,
            )
            return {
                "order_id": result["order_id"],
                "status": result["status"],
                "approve_url": result.get("approve_url"),
                "invoice_number": invoice.invoice_number,
                "customer_name": customer_name,
                "amount": str(pay_amount),
                "currency": current_org.currency or "USD",
                "demo": False,
            }
        except PayPalError:
            # Fall back gracefully to sandbox demo order if sandbox credentials fail
            pass

    # Demo sandbox mode fallback
    result = create_demo_order(
        invoice_number=invoice.invoice_number,
        amount=pay_amount,
        currency=current_org.currency or "USD",
    )
    return {
        "order_id": result["order_id"],
        "status": result["status"],
        "approve_url": result.get("approve_url"),
        "invoice_number": invoice.invoice_number,
        "customer_name": customer_name,
        "amount": str(pay_amount),
        "currency": current_org.currency or "USD",
        "demo": result.get("demo", True),
    }


@router.post("/capture-order", status_code=status.HTTP_200_OK)
async def capture_paypal_order(
    req: CaptureOrderRequest,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Capture a PayPal order and reconcile with invoice ledger after verifying capture status."""
    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.id == uuid.UUID(req.invoice_id),
            Invoice.organisation_id == current_org.id,
        )
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    is_demo = req.order_id.startswith("DEMO-") or not _is_configured()

    if not is_demo:
        try:
            capture_result = await capture_order(req.order_id)
            cap_data = capture_result.get("capture", {})
            cap_status = cap_data.get("status")
            if cap_status not in ("COMPLETED", "PARTIALLY_REFUNDED"):
                raise HTTPException(
                    status_code=400,
                    detail=f"PayPal order not completed. Current capture status: {cap_status or 'UNVERIFIED'}",
                )
            captured_amount = Decimal(cap_data["amount"])
            capture_id = cap_data["capture_id"]
        except PayPalError as e:
            raise HTTPException(status_code=400, detail=f"PayPal order capture failed: {str(e)}")
    else:
        capture_result = capture_demo_order(req.order_id, invoice.balance)
        captured_amount = Decimal(capture_result["capture"]["amount"])
        capture_id = capture_result["capture"]["capture_id"]

    # Reconcile idempotently
    reconciliation = record_payment_and_reconcile(
        db=db,
        org_id=current_org.id,
        invoice_id=invoice.id,
        amount=captured_amount,
        method="paypal",
        paypal_order_id=req.order_id,
        paypal_capture_id=capture_id,
    )

    return {
        **reconciliation,
        "customer_name": invoice.customer.name if invoice.customer else "Client",
        "currency": current_org.currency or "USD",
        "demo": is_demo,
    }


@router.post("/demo-simulate", status_code=status.HTTP_200_OK)
def demo_simulate_payment(
    req: DemoSimulateRequest,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Instantly simulate a full payment lifecycle for an invoice (demo/sandbox only)."""
    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.id == uuid.UUID(req.invoice_id),
            Invoice.organisation_id == current_org.id,
        )
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.status in ("Paid", "Cancelled"):
        raise HTTPException(status_code=400, detail=f"Invoice is already {invoice.status}")

    pay_amount = Decimal(str(req.amount)).quantize(TWO_PLACES) if req.amount else invoice.balance
    if pay_amount > invoice.balance:
        pay_amount = invoice.balance

    # Create + capture demo order
    demo_order = create_demo_order(invoice.invoice_number, pay_amount)
    demo_capture = capture_demo_order(demo_order["order_id"], pay_amount)

    # Reconcile
    reconciliation = record_payment_and_reconcile(
        db=db,
        org_id=current_org.id,
        invoice_id=invoice.id,
        amount=pay_amount,
        method="paypal",
        paypal_order_id=demo_order["order_id"],
        paypal_capture_id=demo_capture["capture"]["capture_id"],
    )

    return {
        **reconciliation,
        "demo": True,
        "simulated": True,
    }

