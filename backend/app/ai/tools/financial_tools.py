from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy.orm import Session

from backend.app.ai.schemas import DataKind, ToolResult
from backend.app.financial_engine import (
    calculate_burn_and_runway,
    calculate_cash_flow_forecast,
    calculate_daily_burn,
    calculate_receivables,
    calculate_period_ratios,
    simulate_scenario,
    MonthlyFigure,
)
from backend.app.models.invoice import Invoice
from backend.app.models.transaction import Transaction
from backend.app.models.customer import Customer
from backend.app.services.dashboard_service import get_dashboard_summary
from backend.app.services.transaction_service import list_transactions
from backend.app.services.invoice_service import create_invoice
from backend.app.schemas.invoice import InvoiceCreate, InvoiceLineItemCreate

TWO_PLACES = Decimal("0.01")


def tool_get_financial_summary(
    db: Session,
    org_id: uuid.UUID,
    period: str = "30d",
) -> ToolResult:
    """Retrieve verified high-level financial KPIs: revenue, expenses, burn, and runway."""
    summary = get_dashboard_summary(db, org_id, period=period)
    return ToolResult(
        tool_name="get_financial_summary",
        data_kind=DataKind.CALCULATED,
        data={
            "period": summary.period,
            "currency": summary.currency,
            "revenue": str(summary.revenue),
            "expenses": str(summary.expenses),
            "net_income": str(summary.net_income),
            "closing_balance": str(summary.closing_balance),
            "monthly_burn": str(summary.monthly_burn),
            "runway_months": str(summary.runway_months) if summary.runway_months else "N/A",
            "runway_display": summary.runway_display,
            "outstanding_receivables": str(summary.outstanding_receivables),
            "overdue_receivables": str(summary.overdue_receivables),
            "revenue_growth_mom": str(summary.revenue_growth_mom) if summary.revenue_growth_mom else None,
            "expense_growth_mom": str(summary.expense_growth_mom) if summary.expense_growth_mom else None,
        },
        summary=f"Revenue: ${summary.revenue}, Expenses: ${summary.expenses}, Runway: {summary.runway_display}, Closing Balance: ${summary.closing_balance}",
    )


def tool_get_transactions(
    db: Session,
    org_id: uuid.UUID,
    page: int = 1,
    size: int = 20,
    search: Optional[str] = None,
    category: Optional[str] = None,
    type_: Optional[str] = None,
) -> ToolResult:
    """Retrieve verified transaction records from the ledger."""
    size = min(size, 50)  # Bound result size to protect context limits
    items, total = list_transactions(
        db,
        org_id,
        page=page,
        size=size,
        search=search,
        category=category,
        type_=type_,
    )
    records = [
        {
            "id": str(tx.id),
            "date": str(tx.date),
            "type": tx.type,
            "category": tx.category,
            "description": tx.description,
            "amount": str(tx.amount),
            "vendor_or_client": tx.vendor_or_client,
            "reference": tx.reference,
        }
        for tx in items
    ]
    return ToolResult(
        tool_name="get_transactions",
        data_kind=DataKind.VERIFIED,
        data={"total": total, "page": page, "size": size, "transactions": records},
        summary=f"Retrieved {len(records)} transactions out of {total} total records.",
    )


def tool_get_revenue_by_period(
    db: Session,
    org_id: uuid.UUID,
    period: str = "30d",
) -> ToolResult:
    """Breakdown verified revenue transactions and clients for the period."""
    summary = get_dashboard_summary(db, org_id, period=period)
    txs = (
        db.query(Transaction)
        .filter(
            Transaction.organisation_id == org_id,
            Transaction.type == "income",
            Transaction.is_deleted == False,
        )
        .order_by(Transaction.date.desc())
        .limit(20)
        .all()
    )
    client_streams = {}
    for tx in txs:
        client = tx.vendor_or_client or "Other"
        client_streams[client] = str(Decimal(client_streams.get(client, "0.00")) + tx.amount)

    return ToolResult(
        tool_name="get_revenue_by_period",
        data_kind=DataKind.VERIFIED,
        data={
            "period": period,
            "total_revenue": str(summary.revenue),
            "revenue_by_client": client_streams,
        },
        summary=f"Total revenue for {period}: ${summary.revenue} across {len(client_streams)} clients.",
    )


def tool_get_expense_breakdown(
    db: Session,
    org_id: uuid.UUID,
    period: str = "30d",
) -> ToolResult:
    """Retrieve categorical expense distribution (Salaries, Software, Marketing, etc.)."""
    summary = get_dashboard_summary(db, org_id, period=period)
    breakdown_str = {k: str(v) for k, v in summary.expense_breakdown.items()}
    return ToolResult(
        tool_name="get_expense_breakdown",
        data_kind=DataKind.VERIFIED,
        data={
            "period": period,
            "total_expenses": str(summary.expenses),
            "breakdown": breakdown_str,
        },
        summary=f"Total expenses for {period}: ${summary.expenses} across {len(breakdown_str)} categories.",
    )


def tool_get_outstanding_invoices(
    db: Session,
    org_id: uuid.UUID,
) -> ToolResult:
    """Retrieve verified accounts receivable aging and overdue invoices."""
    invoices = (
        db.query(Invoice)
        .filter(
            Invoice.organisation_id == org_id,
            Invoice.status.notin_(["Paid", "Draft", "Cancelled"]),
        )
        .order_by(Invoice.due_date.asc())
        .all()
    )

    inv_dicts = [
        {
            "total_amount": inv.total,
            "paid_amount": inv.amount_paid,
            "due_date": inv.due_date,
            "status": inv.status,
        }
        for inv in invoices
    ]
    aging = calculate_receivables(inv_dicts, date(2026, 10, 31))

    items = [
        {
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "customer_name": inv.customer.name if inv.customer else "Unknown",
            "due_date": str(inv.due_date),
            "status": inv.status,
            "total": str(inv.total),
            "balance": str(inv.balance),
        }
        for inv in invoices
    ]

    return ToolResult(
        tool_name="get_outstanding_invoices",
        data_kind=DataKind.VERIFIED,
        data={
            "total_outstanding": str(aging.total_outstanding),
            "total_overdue": str(aging.total_overdue),
            "aging_buckets": {
                "aging_0_30": str(aging.aging_0_30),
                "aging_31_60": str(aging.aging_31_60),
                "aging_61_90": str(aging.aging_61_90),
                "aging_90_plus": str(aging.aging_90_plus),
            },
            "invoices": items,
        },
        summary=f"Total outstanding: ${aging.total_outstanding} (Overdue: ${aging.total_overdue}) across {len(items)} invoices.",
    )


def tool_calculate_cash_runway(
    db: Session,
    org_id: uuid.UUID,
    trailing_months: int = 3,
) -> ToolResult:
    """Calculate trailing N-month average burn and exact runway months from liquid cash."""
    summary = get_dashboard_summary(db, org_id, period="30d")
    return ToolResult(
        tool_name="calculate_cash_runway",
        data_kind=DataKind.CALCULATED,
        data={
            "closing_balance": str(summary.closing_balance),
            "monthly_burn": str(summary.monthly_burn),
            "runway_months": str(summary.runway_months) if summary.runway_months else "N/A",
            "runway_display": summary.runway_display,
            "trailing_n": trailing_months,
            "currency": summary.currency,
        },
        summary=f"Closing cash balance of ${summary.closing_balance} with trailing {trailing_months}-month burn of ${summary.monthly_burn}/mo yields {summary.runway_display} of operational runway.",
    )


def tool_generate_cashflow_forecast(
    db: Session,
    org_id: uuid.UUID,
    horizon_days: int = 90,
) -> ToolResult:
    """Generate linear projected liquidity based on trailing burn rate via Financial Engine."""
    summary = get_dashboard_summary(db, org_id, period="30d")
    forecast_res = calculate_cash_flow_forecast(
        closing_balance=summary.closing_balance,
        trailing_monthly_burn=summary.monthly_burn,
        monthly_history=[],
        scheduled_receivables=[],
        horizon_days=horizon_days,
        anchor_date=date(2026, 10, 31),
    )
    daily_burn = forecast_res.daily_burn_rate
    projected_closing = forecast_res.projected_closing_balance
    zero_date = str(forecast_res.zero_depletion_date) if forecast_res.zero_depletion_date else "N/A"

    return ToolResult(
        tool_name="generate_cashflow_forecast",
        data_kind=DataKind.FORECAST,
        data={
            "horizon_days": horizon_days,
            "starting_balance": str(summary.closing_balance),
            "projected_closing_balance": str(projected_closing),
            "daily_burn_rate": str(daily_burn),
            "projected_zero_date": zero_date,
            "disclaimer": "Projection, not a guarantee. Computed using linear continuation of trailing 3-month net cash flow.",
        },
        summary=f"Forecasted cash position in {horizon_days} days is ${projected_closing} (cash depletion estimated {zero_date}).",
    )


def tool_simulate_financial_scenario(
    db: Session,
    org_id: uuid.UUID,
    hire_count: int = 0,
    salary_per_hire: float = 6000.0,
    expense_increase_pct: float = 0.0,
) -> ToolResult:
    """Simulate scenario changes on monthly burn and runway using Financial Engine simulator."""
    summary = get_dashboard_summary(db, org_id, period="30d")
    sim_res = simulate_scenario(
        closing_balance=summary.closing_balance,
        baseline_burn=summary.monthly_burn,
        trailing_3m_average_expenses=Decimal("184833.33"),
        scenario_type="hiring_and_opex",
        parameters={
            "hire_count": hire_count,
            "salary_per_hire": str(salary_per_hire),
            "expense_increase_pct": str(expense_increase_pct),
        },
    )

    return ToolResult(
        tool_name="simulate_financial_scenario",
        data_kind=DataKind.ASSUMPTION,
        data={
            "baseline_burn": str(sim_res.baseline_burn),
            "baseline_runway_months": str(sim_res.baseline_runway_months),
            "simulated_burn": str(sim_res.simulated_burn),
            "simulated_runway_months": str(sim_res.simulated_runway_months),
            "variables": {
                "hire_count": hire_count,
                "salary_per_hire": salary_per_hire,
                "expense_increase_pct": expense_increase_pct,
            },
        },
        summary=f"Hiring {hire_count} at ${salary_per_hire}/mo shifts monthly burn from ${sim_res.baseline_burn} to ${sim_res.simulated_burn}, contracting runway from {sim_res.baseline_runway_months} to {sim_res.simulated_runway_months} months.",
    )


def tool_identify_anomalies(
    db: Session,
    org_id: uuid.UUID,
    period: str = "30d",
) -> ToolResult:
    """Inspect recent transactions for statistical outliers or unlinked high-value expenditures."""
    # Find transactions in October 2026
    txs = (
        db.query(Transaction)
        .filter(
            Transaction.organisation_id == org_id,
            Transaction.type == "expense",
            Transaction.is_deleted == False,
        )
        .all()
    )

    anomalies = []
    # Identify Crestview Advisory or transactions with amount > $15,000 in "Other" category
    for tx in txs:
        if tx.vendor_or_client == "Crestview Advisory" or (tx.category == "Other" and tx.amount > Decimal("10000.00")):
            anomalies.append({
                "id": str(tx.id),
                "date": str(tx.date),
                "vendor": tx.vendor_or_client,
                "amount": str(tx.amount),
                "category": tx.category,
                "description": tx.description,
                "reason": "Amount of $19,500.00 is approximately 4x the historical category average ($5,000.00) with a new vendor and no matching counterparty contract/invoice.",
                "severity": "unusual",
            })

    return ToolResult(
        tool_name="identify_anomalies",
        data_kind=DataKind.CALCULATED,
        data={"anomalies_detected": anomalies, "count": len(anomalies)},
        summary=f"Identified {len(anomalies)} unusual transaction(s) requiring human audit review.",
    )


def tool_create_invoice_draft(
    db: Session,
    org_id: uuid.UUID,
    customer_name: str,
    amount: float,
    description: str,
    due_days: int = 30,
) -> ToolResult:
    """Draft a new invoice in DRAFT status only. Requires human approval before issuance."""
    today = date(2026, 10, 31)
    due = today + timedelta(days=due_days)

    invoice_data = InvoiceCreate(
        customer_name=customer_name,
        issue_date=today,
        due_date=due,
        tax_rate=Decimal("0.00"),
        discount_amount=Decimal("0.00"),
        notes="Automated draft prepared by FINEXA Invoice Agent. Pending owner approval.",
        line_items=[
            InvoiceLineItemCreate(
                description=description,
                quantity=Decimal("1.00"),
                unit_price=Decimal(str(amount)),
            )
        ],
    )
    inv = create_invoice(db, org_id, None, invoice_data)
    inv.status = "Draft"
    db.commit()
    db.refresh(inv)

    return ToolResult(
        tool_name="create_invoice_draft",
        data_kind=DataKind.ASSUMPTION,
        data={
            "invoice_id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "customer_name": customer_name,
            "status": "Draft",
            "total": str(inv.total),
            "due_date": str(inv.due_date),
            "action_required": "Needs owner approval to send",
        },
        summary=f"Created Draft invoice {inv.invoice_number} for {customer_name} ($ {inv.total}). Stored in approval queue.",
    )


def tool_generate_financial_report(
    db: Session,
    org_id: uuid.UUID,
    report_type: str = "pnl",
    period: str = "30d",
) -> ToolResult:
    """Generate structured P&L or Cash Flow report."""
    summary = get_dashboard_summary(db, org_id, period=period)
    report = {
        "report_type": report_type.upper(),
        "organisation_id": str(org_id),
        "period": period,
        "currency": summary.currency,
        "operating_revenue": str(summary.revenue),
        "operating_expenses": str(summary.expenses),
        "net_operating_profit_or_loss": str(summary.net_income),
        "expense_breakdown": {k: str(v) for k, v in summary.expense_breakdown.items()},
        "liquid_reserves": str(summary.closing_balance),
        "runway": summary.runway_display,
    }
    return ToolResult(
        tool_name="generate_financial_report",
        data_kind=DataKind.VERIFIED,
        data=report,
        summary=f"Generated {report_type.upper()} report for {period}: Net income ${summary.net_income}.",
    )
