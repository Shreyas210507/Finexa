from pydantic import BaseModel, Field
from typing import Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.dependencies import get_current_org, get_current_profile, require_role
from backend.app.models.organisation import Organisation
from backend.app.models.profile import Profile
from backend.app.schemas.invoice import (
    InvoiceCreate,
    InvoiceListResponse,
    InvoiceResponse,
)
from backend.app.services import invoice_service

router = APIRouter(prefix="/invoices", tags=["Invoices"])


@router.get("", response_model=InvoiceListResponse)
def list_invoices(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """List invoices with outstanding and overdue summary totals."""
    invoices, total_outstanding, total_overdue = invoice_service.list_invoices(
        db=db,
        org_id=current_org.id,
        status=status,
    )

    items = []
    for inv in invoices:
        items.append(
            InvoiceResponse(
                id=inv.id,
                organisation_id=inv.organisation_id,
                invoice_number=inv.invoice_number,
                customer_id=inv.customer_id,
                customer_name=inv.customer.name if inv.customer else None,
                status=inv.status,
                issue_date=inv.issue_date,
                due_date=inv.due_date,
                subtotal=inv.subtotal,
                tax_rate=inv.tax_rate,
                tax_amount=inv.tax_amount,
                discount_amount=inv.discount_amount,
                total=inv.total,
                amount_paid=inv.amount_paid,
                balance=inv.balance,
                notes=inv.notes,
                paypal_invoice_id=inv.paypal_invoice_id,
                line_items=inv.line_items,
                created_at=inv.created_at,
                updated_at=inv.updated_at,
            )
        )

    return InvoiceListResponse(
        items=items,
        total=len(items),
        total_outstanding=total_outstanding,
        total_overdue=total_overdue,
    )


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
    current_profile: Profile = Depends(get_current_profile),
    _: None = Depends(require_role(["owner", "admin"])),
):
    """Draft new client invoice with server-side calculated totals."""
    inv = invoice_service.create_invoice(
        db=db,
        org_id=current_org.id,
        user_id=current_profile.id,
        data=data,
    )
    return InvoiceResponse(
        id=inv.id,
        organisation_id=inv.organisation_id,
        invoice_number=inv.invoice_number,
        customer_id=inv.customer_id,
        customer_name=inv.customer.name if inv.customer else None,
        status=inv.status,
        issue_date=inv.issue_date,
        due_date=inv.due_date,
        subtotal=inv.subtotal,
        tax_rate=inv.tax_rate,
        tax_amount=inv.tax_amount,
        discount_amount=inv.discount_amount,
        total=inv.total,
        amount_paid=inv.amount_paid,
        balance=inv.balance,
        notes=inv.notes,
        paypal_invoice_id=inv.paypal_invoice_id,
        line_items=inv.line_items,
        created_at=inv.created_at,
        updated_at=inv.updated_at,
    )


@router.get("/{inv_id}", response_model=InvoiceResponse)
def get_invoice(
    inv_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Get single invoice details with line items."""
    inv = invoice_service.get_invoice(db, current_org.id, inv_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return InvoiceResponse(
        id=inv.id,
        organisation_id=inv.organisation_id,
        invoice_number=inv.invoice_number,
        customer_id=inv.customer_id,
        customer_name=inv.customer.name if inv.customer else None,
        status=inv.status,
        issue_date=inv.issue_date,
        due_date=inv.due_date,
        subtotal=inv.subtotal,
        tax_rate=inv.tax_rate,
        tax_amount=inv.tax_amount,
        discount_amount=inv.discount_amount,
        total=inv.total,
        amount_paid=inv.amount_paid,
        balance=inv.balance,
        notes=inv.notes,
        paypal_invoice_id=inv.paypal_invoice_id,
        line_items=inv.line_items,
        created_at=inv.created_at,
        updated_at=inv.updated_at,
    )


@router.get("/{inv_id}/pdf")
def download_invoice_pdf(
    inv_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Download branded PDF invoice."""
    pdf_bytes = invoice_service.generate_invoice_pdf(db, current_org.id, inv_id)
    if not pdf_bytes:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=invoice-{inv_id}.pdf"},
    )


class UpdateInvoiceStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(Draft|Sent|Paid|Overdue|Cancelled)$")


@router.patch("/{inv_id}/status", response_model=InvoiceResponse)
def update_invoice_status(
    inv_id: uuid.UUID,
    payload: UpdateInvoiceStatusRequest,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
    current_profile: Profile = Depends(get_current_profile),
    _: None = Depends(require_role(["owner", "admin"])),
):
    """Update invoice workflow status with audit tracking."""
    inv = invoice_service.update_invoice_status(
        db=db,
        org_id=current_org.id,
        user_id=current_profile.id,
        invoice_id=inv_id,
        new_status=payload.status,
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return InvoiceResponse(
        id=inv.id,
        organisation_id=inv.organisation_id,
        invoice_number=inv.invoice_number,
        customer_id=inv.customer_id,
        customer_name=inv.customer.name if inv.customer else None,
        status=inv.status,
        issue_date=inv.issue_date,
        due_date=inv.due_date,
        subtotal=inv.subtotal,
        tax_rate=inv.tax_rate,
        tax_amount=inv.tax_amount,
        discount_amount=inv.discount_amount,
        total=inv.total,
        amount_paid=inv.amount_paid,
        balance=inv.balance,
        notes=inv.notes,
        paypal_invoice_id=inv.paypal_invoice_id,
        line_items=inv.line_items,
        created_at=inv.created_at,
        updated_at=inv.updated_at,
    )

