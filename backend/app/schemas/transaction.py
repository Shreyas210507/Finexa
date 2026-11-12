from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class TransactionBase(BaseModel):
    type: str = Field(..., description="income or expense")
    category: str
    description: Optional[str] = None
    amount: Decimal = Field(..., gt=0, description="Positive decimal value")
    date: date
    vendor_or_client: Optional[str] = None
    reference: Optional[str] = None
    source: Optional[str] = Field(default="manual", description="paypal | manual | csv_import | bank_feed")
    source_reference: Optional[str] = None
    external_transaction_id: Optional[str] = None
    idempotency_key: Optional[str] = None


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    type: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    date: Optional[date] = None
    vendor_or_client: Optional[str] = None
    reference: Optional[str] = None
    source: Optional[str] = None
    source_reference: Optional[str] = None
    external_transaction_id: Optional[str] = None


class TransactionResponse(TransactionBase):
    id: uuid.UUID
    organisation_id: uuid.UUID
    invoice_id: Optional[uuid.UUID] = None
    source: str = "manual"
    source_reference: Optional[str] = None
    external_transaction_id: Optional[str] = None
    imported_at: Optional[datetime] = None
    idempotency_key: Optional[str] = None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TransactionListResponse(BaseModel):
    items: List[TransactionResponse]
    total: int
    page: int
    size: int
    total_pages: int
