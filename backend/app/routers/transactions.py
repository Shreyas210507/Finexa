from datetime import date
from typing import Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.dependencies import get_current_org, get_current_profile, require_role
from backend.app.models.organisation import Organisation
from backend.app.models.profile import Profile
from backend.app.schemas.transaction import (
    TransactionCreate,
    TransactionListResponse,
    TransactionResponse,
    TransactionUpdate,
)
from backend.app.services import transaction_service

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("", response_model=TransactionListResponse)
def list_transactions(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    type: Optional[str] = Query(None, alias="type"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """List transactions with server-driven pagination, search, and category filtering."""
    items, total = transaction_service.list_transactions(
        db=db,
        org_id=current_org.id,
        page=page,
        size=size,
        search=search,
        category=category,
        type_=type,
        start_date=start_date,
        end_date=end_date,
    )
    total_pages = (total + size - 1) // size if total > 0 else 1

    return TransactionListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        total_pages=total_pages,
    )


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
    current_profile: Profile = Depends(get_current_profile),
    _: None = Depends(require_role(["owner", "admin"])),
):
    """Create a new transaction in the double-entry financial ledger."""
    return transaction_service.create_transaction(
        db=db,
        org_id=current_org.id,
        user_id=current_profile.id,
        data=data,
    )


@router.get("/export/csv")
def export_transactions_csv(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    type: Optional[str] = Query(None, alias="type"),
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Export transactions to CSV with immutable formatting."""
    csv_buffer = transaction_service.export_transactions_csv(
        db=db,
        org_id=current_org.id,
        search=search,
        category=category,
        type_=type,
    )
    return Response(
        content=csv_buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=transactions-{current_org.id}.csv"},
    )


@router.get("/{tx_id}", response_model=TransactionResponse)
def get_transaction(
    tx_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Get single transaction by ID."""
    tx = transaction_service.get_transaction(db, current_org.id, tx_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


@router.patch("/{tx_id}", response_model=TransactionResponse)
def update_transaction(
    tx_id: uuid.UUID,
    data: TransactionUpdate,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
    current_profile: Profile = Depends(get_current_profile),
    _: None = Depends(require_role(["owner", "admin"])),
):
    """Update transaction fields with audit logging."""
    tx = transaction_service.update_transaction(
        db=db,
        org_id=current_org.id,
        user_id=current_profile.id,
        tx_id=tx_id,
        data=data,
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    tx_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
    current_profile: Profile = Depends(get_current_profile),
    _: None = Depends(require_role(["owner", "admin"])),
):
    """Soft delete transaction with audit logging."""
    success = transaction_service.delete_transaction(
        db=db,
        org_id=current_org.id,
        user_id=current_profile.id,
        tx_id=tx_id,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return None

