import uuid
from datetime import date
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Date, Numeric, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, TimestampMixin


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"
    __table_args__ = (
        Index("ix_payments_org_date", "organisation_id", "payment_date"),
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
    invoice_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    method: Mapped[str] = mapped_column(
        String(50),
        default="manual",
        nullable=False,
        comment="manual, paypal, demo",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="successful",
        nullable=False,
        comment="pending, successful, failed",
    )
    paypal_order_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    paypal_capture_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    organisation = relationship("Organisation", back_populates="payments")
    invoice = relationship("Invoice", back_populates="payments")

