from datetime import date
from decimal import Decimal, ROUND_HALF_UP
import io
from typing import List, Optional, Tuple
import uuid
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from backend.app.financial_engine import (
    calculate_invoice_totals,
    calculate_receivables,
)
from backend.app.models.invoice import Invoice, InvoiceLineItem
from backend.app.models.customer import Customer
from backend.app.models.audit_log import AuditLog
from backend.app.models.organisation import Organisation
from backend.app.schemas.invoice import InvoiceCreate

TWO_PLACES = Decimal("0.01")


def get_next_invoice_number(db: Session, org_id: uuid.UUID, year: int) -> str:
    """Generate sequential invoice number: INV-YYYY-NNNN."""
    prefix = f"INV-{year}-"
    last_invoice = (
        db.query(Invoice)
        .filter(
            Invoice.organisation_id == org_id,
            Invoice.invoice_number.like(f"{prefix}%"),
        )
        .order_by(Invoice.invoice_number.desc())
        .first()
    )

    if last_invoice:
        try:
            last_seq = int(last_invoice.invoice_number.replace(prefix, ""))
            next_seq = last_seq + 1
        except ValueError:
            next_seq = 1
    else:
        next_seq = 1

    return f"{prefix}{next_seq:04d}"


def create_invoice(
    db: Session,
    org_id: uuid.UUID,
    user_id: Optional[uuid.UUID],
    data: InvoiceCreate,
) -> Invoice:
    """Create invoice with server-calculated totals using Decimal."""
    # Find or create customer
    customer_id = data.customer_id
    if not customer_id:
        cust_name = data.customer_name or "Standard Client"
        customer = (
            db.query(Customer)
            .filter(
                Customer.organisation_id == org_id,
                Customer.name == cust_name,
            )
            .first()
        )
        if not customer:
            customer = Customer(
                organisation_id=org_id,
                name=cust_name,
                email=data.customer_email,
            )
            db.add(customer)
            db.flush()
        customer_id = customer.id

    invoice_number = get_next_invoice_number(db, org_id, data.issue_date.year)

    # Calculate totals strictly using Financial Engine
    raw_items = [
        {"quantity": item.quantity, "unit_price": item.unit_price}
        for item in data.line_items
    ]
    totals = calculate_invoice_totals(
        line_items=raw_items,
        tax_rate=data.tax_rate,
        discount_amount=data.discount_amount,
        amount_paid=Decimal("0.00"),
    )

    line_item_models = []
    for item in data.line_items:
        qty = item.quantity.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        unit_p = item.unit_price.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        item_amount = (qty * unit_p).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        line_item_models.append(
            InvoiceLineItem(
                description=item.description,
                quantity=qty,
                unit_price=unit_p,
                amount=item_amount,
            )
        )

    invoice = Invoice(
        organisation_id=org_id,
        invoice_number=invoice_number,
        customer_id=customer_id,
        status="Draft",
        issue_date=data.issue_date,
        due_date=data.due_date,
        subtotal=totals.subtotal,
        tax_rate=data.tax_rate,
        tax_amount=totals.tax_amount,
        discount_amount=totals.discount_amount,
        total=totals.total,
        amount_paid=Decimal("0.00"),
        balance=totals.balance,
        notes=data.notes,
        line_items=line_item_models,
    )
    db.add(invoice)
    db.flush()

    audit = AuditLog(
        organisation_id=org_id,
        user_id=user_id,
        entity_type="invoice",
        entity_id=invoice.id,
        action="create",
        changes={
            "invoice_number": invoice.invoice_number,
            "total": str(invoice.total),
            "status": invoice.status,
        },
    )
    db.add(audit)
    db.commit()
    db.refresh(invoice)
    return invoice


def list_invoices(
    db: Session,
    org_id: uuid.UUID,
    status: Optional[str] = None,
) -> Tuple[List[Invoice], Decimal, Decimal]:
    """List invoices for org and return total outstanding and overdue balances."""
    query = (
        db.query(Invoice)
        .options(joinedload(Invoice.customer), joinedload(Invoice.line_items))
        .filter(Invoice.organisation_id == org_id)
    )

    if status:
        query = query.filter(Invoice.status.ilike(status))

    invoices = query.order_by(Invoice.issue_date.desc()).all()

    # Calculate outstanding and overdue balances using Financial Engine
    inv_dicts = [
        {
            "total_amount": inv.total,
            "paid_amount": inv.amount_paid,
            "due_date": inv.due_date,
            "status": inv.status,
        }
        for inv in invoices
    ]
    rec_summary = calculate_receivables(inv_dicts, anchor_date=date.today())

    return invoices, rec_summary.total_outstanding, rec_summary.total_overdue


def get_invoice(db: Session, org_id: uuid.UUID, invoice_id: uuid.UUID) -> Optional[Invoice]:
    """Retrieve full invoice details with line items."""
    return (
        db.query(Invoice)
        .options(joinedload(Invoice.customer), joinedload(Invoice.line_items))
        .filter(Invoice.id == invoice_id, Invoice.organisation_id == org_id)
        .first()
    )


def update_invoice_status(
    db: Session,
    org_id: uuid.UUID,
    user_id: Optional[uuid.UUID],
    invoice_id: uuid.UUID,
    new_status: str,
) -> Optional[Invoice]:
    """Update invoice status with audit logging."""
    invoice = get_invoice(db, org_id, invoice_id)
    if not invoice:
        return None

    old_status = invoice.status
    invoice.status = new_status
    if new_status == "Paid":
        invoice.amount_paid = invoice.total
        invoice.balance = Decimal("0.00")

    audit = AuditLog(
        organisation_id=org_id,
        user_id=user_id,
        entity_type="invoice",
        entity_id=invoice.id,
        action="update_status",
        changes={
            "old_status": old_status,
            "new_status": new_status,
            "balance": str(invoice.balance),
        },
    )
    db.add(audit)
    db.commit()
    db.refresh(invoice)
    return invoice


def generate_invoice_pdf(db: Session, org_id: uuid.UUID, invoice_id: uuid.UUID) -> Optional[bytes]:
    """Generate branded PDF invoice document using ReportLab."""
    invoice = get_invoice(db, org_id, invoice_id)
    if not invoice:
        return None

    org = db.query(Organisation).filter(Organisation.id == org_id).first()
    org_name = org.name if org else "Novastack Technologies"
    currency = org.currency if org else "USD"
    curr_symbol = "$" if currency == "USD" else "₹"

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Heading1"],
        fontSize=22,
        textColor=colors.HexColor("#070B1A"),
    )
    meta_style = ParagraphStyle(
        "InvoiceMeta",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#4B5563"),
        leading=14,
    )

    story = []

    # Header section
    header_data = [
        [
            Paragraph(f"<b>{org_name}</b><br/>Financial Intelligence Platform", meta_style),
            Paragraph(f"<b>INVOICE</b><br/><b>{invoice.invoice_number}</b>", title_style),
        ]
    ]
    header_table = Table(header_data, colWidths=[300, 240])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 20))

    # Bill to & Dates
    cust_name = invoice.customer.name if invoice.customer else "Valued Client"
    cust_email = invoice.customer.email if invoice.customer else ""
    client_info = f"<b>Bill To:</b><br/>{cust_name}<br/>{cust_email}"
    dates_info = (
        f"<b>Issue Date:</b> {invoice.issue_date}<br/>"
        f"<b>Due Date:</b> {invoice.due_date}<br/>"
        f"<b>Status:</b> {invoice.status}"
    )

    info_table = Table(
        [[Paragraph(client_info, meta_style), Paragraph(dates_info, meta_style)]],
        colWidths=[300, 240],
    )
    story.append(info_table)
    story.append(Spacer(1, 20))

    # Line items table
    table_data = [["Description", "Qty", f"Unit Price ({currency})", f"Amount ({currency})"]]
    for item in invoice.line_items:
        table_data.append([
            item.description,
            f"{item.quantity:.2f}",
            f"{curr_symbol}{item.unit_price:,.2f}",
            f"{curr_symbol}{item.amount:,.2f}",
        ])

    items_table = Table(table_data, colWidths=[270, 60, 105, 105])
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0D1428")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#F5F7FF")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 15))

    # Summary Totals table
    totals_data = [
        ["Subtotal:", f"{curr_symbol}{invoice.subtotal:,.2f}"],
        ["Tax Amount:", f"{curr_symbol}{invoice.tax_amount:,.2f}"],
        ["Discount:", f"-{curr_symbol}{invoice.discount_amount:,.2f}"],
        ["Total Amount:", f"{curr_symbol}{invoice.total:,.2f}"],
        ["Amount Paid:", f"{curr_symbol}{invoice.amount_paid:,.2f}"],
        ["Balance Due:", f"{curr_symbol}{invoice.balance:,.2f}"],
    ]
    totals_table = Table(totals_data, colWidths=[435, 105])
    totals_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("FONTNAME", (0, 3), (-1, 3), "Helvetica-Bold"),
        ("FONTNAME", (0, 5), (-1, 5), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 5), (-1, 5), colors.HexColor("#315BFF")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(totals_table)

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

