import uuid
from typing import Optional, List
from sqlalchemy import String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, TimestampMixin


class Organisation(Base, TimestampMixin):
    __tablename__ = "organisations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    settings: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    # Relationships
    members = relationship("OrganisationMember", back_populates="organisation", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="organisation", cascade="all, delete-orphan")
    customers = relationship("Customer", back_populates="organisation", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="organisation", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="organisation", cascade="all, delete-orphan")


class OrganisationMember(Base, TimestampMixin):
    __tablename__ = "organisation_members"
    __table_args__ = (
        UniqueConstraint("user_id", "organisation_id", name="uq_member_user_org"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organisation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(
        String(20),
        default="member",
        nullable=False,
        comment="owner, admin, member",
    )

    # Relationships
    profile = relationship("Profile", back_populates="memberships")
    organisation = relationship("Organisation", back_populates="members")

