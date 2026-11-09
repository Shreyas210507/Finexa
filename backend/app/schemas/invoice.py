from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class InvoiceLineItemBase(BaseModel):
    description: str
    quantity: Decimal = Field(default=Decimal("1.00"), gt=0)
    unit_price: Decimal = Field(..., ge=0)


class InvoiceLineItemCreate(InvoiceLineItemBase):
    pass


class InvoiceLineItemResponse(InvoiceLineItemBase):
    id: uuid.UUID
    amount: Decimal

    model_config = ConfigDict(from_attributes=True)


class InvoiceCreate(BaseModel):
    customer_id: Optional[uuid.UUID] = None
    customer_name: Optional[str] = None  # Auto-creates customer if id not provided
    customer_email: Optional[str] = None
    issue_date: date
    due_date: date
    tax_rate: Decimal = Field(default=Decimal("0.00"), ge=0, le=1)  # e.g. 0.08 for 8%
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    notes: Optional[str] = None
    line_items: List[InvoiceLineItemCreate]


class InvoiceResponse(BaseModel):
    id: uuid.UUID
    organisation_id: uuid.UUID
    invoice_number: str
    customer_id: uuid.UUID
    customer_name: Optional[str] = None
    status: str
    issue_date: date
    due_date: date
    subtotal: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total: Decimal
    amount_paid: Decimal
    balance: Decimal
    notes: Optional[str] = None
    paypal_invoice_id: Optional[str] = None
    line_items: List[InvoiceLineItemResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InvoiceListResponse(BaseModel):
    items: List[InvoiceResponse]
    total: int
    total_outstanding: Decimal
    total_overdue: Decimal

