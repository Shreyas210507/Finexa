from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
import uuid
from sqlalchemy.orm import Session

from backend.app.models.invoice import Invoice
from backend.app.models.notification import Notification
from backend.app.services.dashboard_service import get_dashboard_summary


def create_notification(
    db: Session,
    org_id: uuid.UUID,
    type_: str,
    title: str,
    message: str,
    user_id: Optional[uuid.UUID] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[uuid.UUID] = None,
) -> Notification:
    """Create a verified event-driven notification in the database."""
    notif = Notification(
        organisation_id=org_id,
        user_id=user_id,
        type=type_,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
        is_read=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def list_notifications(
    db: Session,
    org_id: uuid.UUID,
    limit: int = 50,
) -> Tuple[List[Notification], int]:
    """Retrieve organisation notifications and unread counter."""
    notifs = (
        db.query(Notification)
        .filter(Notification.organisation_id == org_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    unread_count = (
        db.query(Notification)
        .filter(
            Notification.organisation_id == org_id,
            Notification.is_read == False,
        )
        .count()
    )
    return notifs, unread_count


def mark_notification_read(
    db: Session,
    org_id: uuid.UUID,
    notif_id: uuid.UUID,
) -> Optional[Notification]:
    """Mark a single notification as read."""
    notif = (
        db.query(Notification)
        .filter(
            Notification.id == notif_id,
            Notification.organisation_id == org_id,
        )
        .first()
    )
    if notif:
        notif.is_read = True
        db.commit()
        db.refresh(notif)
    return notif


def mark_all_notifications_read(
    db: Session,
    org_id: uuid.UUID,
) -> int:
    """Mark all unread notifications for organisation as read."""
    updated = (
        db.query(Notification)
        .filter(
            Notification.organisation_id == org_id,
            Notification.is_read == False,
        )
        .update({"is_read": True})
    )
    db.commit()
    return updated


def check_and_trigger_system_events(
    db: Session,
    org_id: uuid.UUID,
    anchor_date: date = date(2026, 10, 31),
) -> List[Notification]:
    """Check overdue invoices and runway status, generating notifications for verified events."""
    created = []

    # 1. Check for overdue invoices
    overdue_invoices = (
        db.query(Invoice)
        .filter(
            Invoice.organisation_id == org_id,
            Invoice.due_date < anchor_date,
            Invoice.status.notin_(["Paid", "Draft", "Cancelled"]),
        )
        .all()
    )

    for inv in overdue_invoices:
        inv.status = "Overdue"
        # Check if already notified
        exists = (
            db.query(Notification)
            .filter(
                Notification.organisation_id == org_id,
                Notification.entity_id == inv.id,
                Notification.type == "invoice_overdue",
            )
            .first()
        )
        if not exists:
            n = create_notification(
                db,
                org_id,
                type_="invoice_overdue",
                title=f"Invoice Overdue: {inv.invoice_number}",
                message=f"Invoice {inv.invoice_number} for ${inv.balance} was due on {inv.due_date}.",
                entity_type="invoice",
                entity_id=inv.id,
            )
            created.append(n)

    # 2. Check for forecast cash shortage
    summary = get_dashboard_summary(db, org_id, period="30d")
    if summary.runway_months and summary.runway_months < Decimal("6.0"):
        exists = (
            db.query(Notification)
            .filter(
                Notification.organisation_id == org_id,
                Notification.type == "forecast_shortage",
            )
            .first()
        )
        if not exists:
            n = create_notification(
                db,
                org_id,
                type_="forecast_shortage",
                title="Runway Contraction Alert",
                message=f"Cash runway is currently {summary.runway_display} at ${summary.monthly_burn}/mo burn rate. Buffer review recommended.",
                entity_type="dashboard",
            )
            created.append(n)

    db.commit()
    return created

