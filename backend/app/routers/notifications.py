import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.dependencies import get_current_org
from backend.app.models.organisation import Organisation
from backend.app.services.notification_service import (
    list_notifications,
    mark_notification_read,
    mark_all_notifications_read,
    check_and_trigger_system_events,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", status_code=status.HTTP_200_OK)
def get_notifications(
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """List recent notifications and current unread counter."""
    # Run event trigger checks
    check_and_trigger_system_events(db, current_org.id)
    items, unread_count = list_notifications(db, current_org.id, limit=limit)
    return {
        "items": [
            {
                "id": str(n.id),
                "type": n.type,
                "title": n.title,
                "message": n.message,
                "entity_type": n.entity_type,
                "entity_id": str(n.entity_id) if n.entity_id else None,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in items
        ],
        "unread_count": unread_count,
    }


@router.post("/{notification_id}/read", status_code=status.HTTP_200_OK)
def mark_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Mark a specific notification as read."""
    notif = mark_notification_read(db, current_org.id, notification_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "success", "id": str(notif.id), "is_read": notif.is_read}


@router.post("/read-all", status_code=status.HTTP_200_OK)
def mark_all_read(
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Mark all unread notifications for the organisation as read."""
    count = mark_all_notifications_read(db, current_org.id)
    return {"status": "success", "marked_read_count": count}


@router.post("/check-triggers", status_code=status.HTTP_200_OK)
def trigger_system_checks(
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Explicitly run system event verification checks (overdue invoices, runway contraction)."""
    created = check_and_trigger_system_events(db, current_org.id)
    return {
        "status": "success",
        "created_count": len(created),
        "created_ids": [str(n.id) for n in created],
    }

