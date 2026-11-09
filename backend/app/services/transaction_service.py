import csv
from datetime import date
from decimal import Decimal
import io
from typing import List, Optional, Tuple
import uuid
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.app.models.transaction import Transaction
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.transaction import TransactionCreate, TransactionUpdate


def list_transactions(
    db: Session,
    org_id: uuid.UUID,
    page: int = 1,
    size: int = 20,
    search: Optional[str] = None,
    category: Optional[str] = None,
    type_: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> Tuple[List[Transaction], int]:
    """List transactions with pagination, filtering, and org isolation."""
    query = db.query(Transaction).filter(
        Transaction.organisation_id == org_id,
        Transaction.is_deleted == False,
    )

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Transaction.description.ilike(search_term),
                Transaction.vendor_or_client.ilike(search_term),
                Transaction.reference.ilike(search_term),
                Transaction.category.ilike(search_term),
            )
        )

    if category:
        query = query.filter(Transaction.category == category)

    if type_:
        query = query.filter(Transaction.type == type_)

    if start_date:
        query = query.filter(Transaction.date >= start_date)

    if end_date:
        query = query.filter(Transaction.date <= end_date)

    total = query.count()
    items = (
        query.order_by(Transaction.date.desc(), Transaction.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return items, total


def create_transaction(
    db: Session,
    org_id: uuid.UUID,
    user_id: Optional[uuid.UUID],
    data: TransactionCreate,
) -> Transaction:
    """Create a new transaction and write an audit log entry."""
    tx = Transaction(
        organisation_id=org_id,
        type=data.type,
        category=data.category,
        description=data.description,
        amount=data.amount,
        date=data.date,
        vendor_or_client=data.vendor_or_client,
        reference=data.reference,
    )
    db.add(tx)
    db.flush()

    audit = AuditLog(
        organisation_id=org_id,
        user_id=user_id,
        entity_type="transaction",
        entity_id=tx.id,
        action="create",
        changes={
            "type": tx.type,
            "category": tx.category,
            "amount": str(tx.amount),
            "date": str(tx.date),
            "description": tx.description,
        },
    )
    db.add(audit)
    db.commit()
    db.refresh(tx)
    return tx


def get_transaction(
    db: Session,
    org_id: uuid.UUID,
    tx_id: uuid.UUID,
) -> Optional[Transaction]:
    """Retrieve single transaction with org isolation check."""
    return (
        db.query(Transaction)
        .filter(
            Transaction.id == tx_id,
            Transaction.organisation_id == org_id,
            Transaction.is_deleted == False,
        )
        .first()
    )


def update_transaction(
    db: Session,
    org_id: uuid.UUID,
    user_id: Optional[uuid.UUID],
    tx_id: uuid.UUID,
    data: TransactionUpdate,
) -> Optional[Transaction]:
    """Update transaction and write an audit log entry."""
    tx = get_transaction(db, org_id, tx_id)
    if not tx:
        return None

    changes = {}
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            old_val = getattr(tx, field)
            if old_val != value:
                changes[field] = {"old": str(old_val), "new": str(value)}
                setattr(tx, field, value)

    if changes:
        audit = AuditLog(
            organisation_id=org_id,
            user_id=user_id,
            entity_type="transaction",
            entity_id=tx.id,
            action="update",
            changes=changes,
        )
        db.add(audit)

    db.commit()
    db.refresh(tx)
    return tx


def delete_transaction(
    db: Session,
    org_id: uuid.UUID,
    user_id: Optional[uuid.UUID],
    tx_id: uuid.UUID,
) -> bool:
    """Soft delete transaction and write audit log."""
    tx = get_transaction(db, org_id, tx_id)
    if not tx:
        return False

    tx.is_deleted = True
    audit = AuditLog(
        organisation_id=org_id,
        user_id=user_id,
        entity_type="transaction",
        entity_id=tx.id,
        action="delete",
        changes={"amount": str(tx.amount), "description": tx.description},
    )
    db.add(audit)
    db.commit()
    return True


def export_transactions_csv(
    db: Session,
    org_id: uuid.UUID,
    search: Optional[str] = None,
    category: Optional[str] = None,
    type_: Optional[str] = None,
) -> io.StringIO:
    """Export transactions to CSV string buffer."""
    query = db.query(Transaction).filter(
        Transaction.organisation_id == org_id,
        Transaction.is_deleted == False,
    )
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Transaction.description.ilike(search_term),
                Transaction.vendor_or_client.ilike(search_term),
                Transaction.reference.ilike(search_term),
            )
        )
    if category:
        query = query.filter(Transaction.category == category)
    if type_:
        query = query.filter(Transaction.type == type_)

    transactions = query.order_by(Transaction.date.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Transaction ID",
        "Date",
        "Type",
        "Category",
        "Description",
        "Amount (USD)",
        "Vendor/Client",
        "Reference",
    ])

    for tx in transactions:
        writer.writerow([
            str(tx.id),
            str(tx.date),
            tx.type,
            tx.category,
            tx.description or "",
            f"{tx.amount:.2f}",
            tx.vendor_or_client or "",
            tx.reference or "",
        ])

    output.seek(0)
    return output

