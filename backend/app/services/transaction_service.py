import csv
from datetime import date
from decimal import Decimal
import io
from typing import Any, Dict, List, Optional, Tuple
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
    # Idempotency check
    if data.idempotency_key:
        existing = (
            db.query(Transaction)
            .filter(
                Transaction.organisation_id == org_id,
                Transaction.idempotency_key == data.idempotency_key,
                Transaction.is_deleted == False,
            )
            .first()
        )
        if existing:
            return existing

    tx = Transaction(
        organisation_id=org_id,
        type=data.type,
        category=data.category,
        description=data.description,
        amount=data.amount,
        date=data.date,
        vendor_or_client=data.vendor_or_client,
        reference=data.reference,
        source=data.source or "manual",
        source_reference=data.source_reference,
        external_transaction_id=data.external_transaction_id,
        idempotency_key=data.idempotency_key,
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


def parse_flexible_date(date_str: str) -> Optional[date]:
    """Parse date across common formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, etc."""
    date_str = date_str.strip()
    formats = [
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%d/%m/%Y",
        "%Y/%m/%d",
        "%d-%m-%Y",
        "%m-%d-%Y",
        "%b %d, %Y",
        "%B %d, %Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None


def parse_flexible_amount(amt_str: str) -> Tuple[Decimal, Optional[str]]:
    """
    Parse monetary amount string.
    Returns (abs_amount, inferred_type).
    Negative amounts or parentheses denote 'expense'.
    """
    cleaned = amt_str.strip().replace("$", "").replace(",", "")
    inferred_type = None

    if cleaned.startswith("(") and cleaned.endswith(")"):
        cleaned = "-" + cleaned[1:-1]
        inferred_type = "expense"

    val = Decimal(cleaned)
    if val < 0:
        inferred_type = "expense"
        val = abs(val)
    elif val > 0 and inferred_type is None:
        inferred_type = "income"

    return val.quantize(Decimal("0.01")), inferred_type


def import_transactions_csv(
    db: Session,
    org_id: uuid.UUID,
    user_id: Optional[uuid.UUID],
    csv_content: str,
    filename: str = "import.csv",
) -> Dict[str, Any]:
    """
    Import transactions from CSV with automated schema normalization,
    flexible date/amount parsing, idempotent deduplication, and full audit logging.
    """
    import hashlib
    from datetime import timezone

    reader = csv.DictReader(io.StringIO(csv_content))
    if not reader.fieldnames:
        return {"total_rows": 0, "imported": 0, "skipped_duplicates": 0, "errors": ["Empty or invalid CSV file."]}

    # Map headers to canonical names
    header_map = {}
    for h in reader.fieldnames:
        low = h.strip().lower().replace("_", " ").replace("-", " ")
        if "date" in low:
            header_map["date"] = h
        elif "amount" in low or "value" in low or "price" in low:
            header_map["amount"] = h
        elif "cat" in low:
            header_map["category"] = h
        elif "type" in low:
            header_map["type"] = h
        elif "desc" in low or "detail" in low or "memo" in low or "note" in low:
            header_map["description"] = h
        elif "vendor" in low or "client" in low or "payee" in low or "payer" in low or "customer" in low:
            header_map["vendor"] = h
        elif "ref" in low or "id" in low or "num" in low:
            header_map["reference"] = h

    if "date" not in header_map or "amount" not in header_map:
        return {
            "total_rows": 0,
            "imported": 0,
            "skipped_duplicates": 0,
            "errors": [f"Missing required columns. Found headers: {list(reader.fieldnames)}. Required: Date and Amount."],
        }

    imported_count = 0
    skipped_count = 0
    errors: List[str] = []
    now = datetime.now(timezone.utc)

    for row_idx, row in enumerate(reader, start=2):
        try:
            raw_date = row.get(header_map["date"], "")
            if not raw_date or not raw_date.strip():
                continue  # skip blank lines

            parsed_date = parse_flexible_date(raw_date)
            if not parsed_date:
                errors.append(f"Row {row_idx}: Invalid date '{raw_date}'")
                continue

            raw_amt = row.get(header_map["amount"], "")
            if not raw_amt or not raw_amt.strip():
                continue

            amt, inferred_type = parse_flexible_amount(raw_amt)
            if amt == Decimal("0.00"):
                continue

            # Resolve type
            raw_type = row.get(header_map.get("type", ""), "").strip().lower()
            if raw_type in ["income", "revenue", "credit", "inflow"]:
                tx_type = "income"
            elif raw_type in ["expense", "debit", "outflow", "cost"]:
                tx_type = "expense"
            else:
                tx_type = inferred_type or "expense"

            # Resolve category
            category = row.get(header_map.get("category", ""), "").strip()
            if not category:
                category = "General Revenue" if tx_type == "income" else "General Expense"

            desc = row.get(header_map.get("description", ""), "").strip() or None
            vendor = row.get(header_map.get("vendor", ""), "").strip() or None
            ref = row.get(header_map.get("reference", ""), "").strip() or None

            # Generate idempotency key
            key_basis = f"{org_id}:{parsed_date}:{amt}:{tx_type}:{desc or ''}:{vendor or ''}"
            idempotency_key = hashlib.sha256(key_basis.encode()).hexdigest()

            # Check duplicate
            existing = (
                db.query(Transaction)
                .filter(
                    Transaction.organisation_id == org_id,
                    Transaction.idempotency_key == idempotency_key,
                    Transaction.is_deleted == False,
                )
                .first()
            )
            if existing:
                skipped_count += 1
                continue

            # Create transaction
            tx = Transaction(
                organisation_id=org_id,
                type=tx_type,
                category=category,
                description=desc,
                amount=amt,
                date=parsed_date,
                vendor_or_client=vendor,
                reference=ref,
                source="csv_import",
                source_reference=filename,
                imported_at=now,
                idempotency_key=idempotency_key,
            )
            db.add(tx)
            db.flush()

            audit = AuditLog(
                organisation_id=org_id,
                user_id=user_id,
                entity_type="transaction",
                entity_id=tx.id,
                action="import_csv",
                changes={
                    "type": tx.type,
                    "category": tx.category,
                    "amount": str(tx.amount),
                    "date": str(tx.date),
                    "source": "csv_import",
                    "filename": filename,
                },
            )
            db.add(audit)
            imported_count += 1

        except Exception as e:
            errors.append(f"Row {row_idx}: {str(e)}")

    db.commit()

    return {
        "total_rows": imported_count + skipped_count + len(errors),
        "imported": imported_count,
        "skipped_duplicates": skipped_count,
        "errors": errors[:10],
    }

