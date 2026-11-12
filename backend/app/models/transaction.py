import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Text, Date, DateTime, Boolean, ForeignKey, Index, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, TimestampMixin


class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transactions_org_date", "organisation_id", "date"),
        Index("ix_transactions_org_type_cat", "organisation_id", "type", "category"),
        Index("ix_transactions_org_external_id", "organisation_id", "external_transaction_id"),
        Index("ix_transactions_org_idempotency", "organisation_id", "idempotency_key"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organisation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="income or expense",
    )
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    vendor_or_client: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    invoice_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Source provenance metadata
    source: Mapped[str] = mapped_column(
        String(50),
        default="manual",
        nullable=False,
        comment="paypal | manual | csv_import | bank_feed",
    )
    source_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    external_transaction_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    imported_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    organisation = relationship("Organisation", back_populates="transactions")
    invoice = relationship("Invoice", back_populates="transactions")
