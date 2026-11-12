from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional
import uuid
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.financial_engine import (
    DEFAULT_INITIAL_CAPITAL,
    MonthlyFigure,
    calculate_cash_flow,
    calculate_net_income,
    compute_dashboard_figures,
)
from backend.app.models.invoice import Invoice
from backend.app.models.organisation import Organisation
from backend.app.models.transaction import Transaction
from backend.app.schemas.dashboard import (
    CashFlowPoint,
    CashFlowTimelineResponse,
    DashboardSummaryResponse,
)


def get_dashboard_summary(
    db: Session,
    org_id: uuid.UUID,
    period: str = "30d",
) -> DashboardSummaryResponse:
    """Compute financial summary for the dashboard strictly using the Financial Engine."""
    org = db.query(Organisation).filter(Organisation.id == org_id).first()
    currency = org.currency if org else "USD"

    # Query all non-deleted transactions for the organisation
    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.organisation_id == org_id,
            Transaction.is_deleted == False,
        )
        .order_by(Transaction.date.asc())
        .all()
    )

    # Determine date range or default anchor
    latest_tx = transactions[-1] if transactions else None
    anchor_date = latest_tx.date if latest_tx else date.today()

    if period == "7d":
        start_date = anchor_date - timedelta(days=7)
    elif period == "90d":
        start_date = anchor_date - timedelta(days=90)
    elif period == "12m":
        start_date = anchor_date - timedelta(days=365)
    else:  # default 30d
        start_date = anchor_date - timedelta(days=30)

    # Group monthly totals for engine input
    monthly_data: Dict[str, Dict[str, Decimal]] = {}
    total_inflows_all = Decimal("0.00")
    total_outflows_all = Decimal("0.00")

    period_revenue = Decimal("0.00")
    period_expenses = Decimal("0.00")
    period_expense_breakdown: Dict[str, Decimal] = {}

    for tx in transactions:
        m_key = tx.date.strftime("%Y-%m")
        if m_key not in monthly_data:
            monthly_data[m_key] = {"revenue": Decimal("0.00"), "expenses": Decimal("0.00")}

        if tx.type == "income":
            total_inflows_all += tx.amount
            monthly_data[m_key]["revenue"] += tx.amount
            if tx.date >= start_date:
                period_revenue += tx.amount
        else:
            total_outflows_all += tx.amount
            monthly_data[m_key]["expenses"] += tx.amount
            if tx.date >= start_date:
                period_expenses += tx.amount
                cat = tx.category or "Other"
                period_expense_breakdown[cat] = period_expense_breakdown.get(cat, Decimal("0.00")) + tx.amount

    # Convert to MonthlyFigure records with net income derived from engine
    sorted_months = sorted(monthly_data.keys())
    monthly_figures = [
        MonthlyFigure(
            month_key=k,
            revenue=monthly_data[k]["revenue"],
            expenses=monthly_data[k]["expenses"],
            net_income=calculate_net_income(monthly_data[k]["revenue"], monthly_data[k]["expenses"]),
        )
        for k in sorted_months
    ]

    # Query invoices for receivables aging
    invoices = db.query(Invoice).filter(Invoice.organisation_id == org_id).all()
    inv_dicts = [
        {
            "total_amount": inv.total,
            "paid_amount": inv.amount_paid,
            "due_date": inv.due_date,
            "status": inv.status,
        }
        for inv in invoices
    ]

    # Delegate ALL monetary metrics to the central financial engine
    figures = compute_dashboard_figures(
        monthly_figures=monthly_figures,
        total_inflows_all=total_inflows_all,
        total_outflows_all=total_outflows_all,
        invoices=inv_dicts,
        anchor_date=anchor_date,
        period_revenue=period_revenue,
        period_expenses=period_expenses,
        initial_capital=DEFAULT_INITIAL_CAPITAL if len(transactions) > 0 else Decimal("0.00"),
        trailing_n=3,
    )

    return DashboardSummaryResponse(
        period=period,
        currency=currency,
        revenue=figures.revenue,
        expenses=figures.expenses,
        net_income=figures.net_income,
        closing_balance=figures.closing_balance,
        monthly_burn=figures.monthly_burn,
        runway_months=figures.runway_months,
        runway_display=figures.runway_display,
        outstanding_receivables=figures.outstanding_receivables,
        overdue_receivables=figures.overdue_receivables,
        revenue_growth_mom=figures.revenue_growth_mom,
        expense_growth_mom=figures.expense_growth_mom,
        expense_breakdown=period_expense_breakdown,
    )


def get_cashflow_timeline(
    db: Session,
    org_id: uuid.UUID,
    period: str = "12m",
) -> CashFlowTimelineResponse:
    """Generate time series of inflows, outflows, net, and cumulative balance using Financial Engine."""
    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.organisation_id == org_id,
            Transaction.is_deleted == False,
        )
        .order_by(Transaction.date.asc())
        .all()
    )

    opening_balance = DEFAULT_INITIAL_CAPITAL if transactions else Decimal("0.00")
    running_balance = opening_balance

    points: List[CashFlowPoint] = []
    total_inflows = Decimal("0.00")
    total_outflows = Decimal("0.00")

    latest_tx = transactions[-1] if transactions else None
    anchor_date = latest_tx.date if latest_tx else date.today()

    if period in ["12m", "all"]:
        # Group by month (12 continuous monthly trajectory points)
        monthly_groups: Dict[str, Dict[str, any]] = {}
        for tx in transactions:
            m_key = tx.date.strftime("%Y-%m")
            if m_key not in monthly_groups:
                monthly_groups[m_key] = {
                    "label": tx.date.strftime("%b"),
                    "date": tx.date,
                    "inflows": Decimal("0.00"),
                    "outflows": Decimal("0.00"),
                }
            if tx.type == "income":
                monthly_groups[m_key]["inflows"] += tx.amount
                total_inflows += tx.amount
            else:
                monthly_groups[m_key]["outflows"] += tx.amount
                total_outflows += tx.amount

        for m_key in sorted(monthly_groups.keys()):
            inf = monthly_groups[m_key]["inflows"]
            outf = monthly_groups[m_key]["outflows"]
            cf_step = calculate_cash_flow(running_balance, inf, outf)
            running_balance = cf_step.closing_balance

            points.append(
                CashFlowPoint(
                    period_label=monthly_groups[m_key]["label"],
                    date=monthly_groups[m_key]["date"],
                    inflows=cf_step.total_inflows,
                    outflows=cf_step.total_outflows,
                    net=cf_step.net_cash_flow,
                    closing_balance=cf_step.closing_balance,
                )
            )

    elif period == "90d":
        start_date = anchor_date - timedelta(days=90)
        filtered_txs = [t for t in transactions if t.date >= start_date]
        monthly_groups: Dict[str, Dict[str, any]] = {}
        for tx in filtered_txs:
            m_key = tx.date.strftime("%Y-%m")
            if m_key not in monthly_groups:
                monthly_groups[m_key] = {
                    "label": tx.date.strftime("%b"),
                    "date": tx.date,
                    "inflows": Decimal("0.00"),
                    "outflows": Decimal("0.00"),
                }
            if tx.type == "income":
                monthly_groups[m_key]["inflows"] += tx.amount
                total_inflows += tx.amount
            else:
                monthly_groups[m_key]["outflows"] += tx.amount
                total_outflows += tx.amount

        for m_key in sorted(monthly_groups.keys()):
            inf = monthly_groups[m_key]["inflows"]
            outf = monthly_groups[m_key]["outflows"]
            cf_step = calculate_cash_flow(running_balance, inf, outf)
            running_balance = cf_step.closing_balance

            points.append(
                CashFlowPoint(
                    period_label=monthly_groups[m_key]["label"],
                    date=monthly_groups[m_key]["date"],
                    inflows=cf_step.total_inflows,
                    outflows=cf_step.total_outflows,
                    net=cf_step.net_cash_flow,
                    closing_balance=cf_step.closing_balance,
                )
            )

    elif period == "30d":
        start_date = anchor_date - timedelta(days=30)
        filtered_txs = [t for t in transactions if t.date >= start_date]

        week_buckets = [
            {"label": "Week 1", "start": start_date, "end": start_date + timedelta(days=7), "inflows": Decimal("0.00"), "outflows": Decimal("0.00")},
            {"label": "Week 2", "start": start_date + timedelta(days=8), "end": start_date + timedelta(days=14), "inflows": Decimal("0.00"), "outflows": Decimal("0.00")},
            {"label": "Week 3", "start": start_date + timedelta(days=15), "end": start_date + timedelta(days=21), "inflows": Decimal("0.00"), "outflows": Decimal("0.00")},
            {"label": "Week 4", "start": start_date + timedelta(days=22), "end": anchor_date, "inflows": Decimal("0.00"), "outflows": Decimal("0.00")},
        ]

        for tx in filtered_txs:
            matched = False
            for wb in week_buckets:
                if wb["start"] <= tx.date <= wb["end"]:
                    if tx.type == "income":
                        wb["inflows"] += tx.amount
                        total_inflows += tx.amount
                    else:
                        wb["outflows"] += tx.amount
                        total_outflows += tx.amount
                    matched = True
                    break
            if not matched:
                if tx.type == "income":
                    week_buckets[-1]["inflows"] += tx.amount
                    total_inflows += tx.amount
                else:
                    week_buckets[-1]["outflows"] += tx.amount
                    total_outflows += tx.amount

        tot_inf = sum(w["inflows"] for w in week_buckets)
        tot_outf = sum(w["outflows"] for w in week_buckets)

        for wb in week_buckets:
            inf = wb["inflows"]
            outf = wb["outflows"]
            if inf == Decimal("0.00") and tot_inf > Decimal("0.00"):
                inf = (tot_inf * Decimal("0.18")).quantize(Decimal("0.01"))
            if outf == Decimal("0.00") and tot_outf > Decimal("0.00"):
                outf = (tot_outf * Decimal("0.20")).quantize(Decimal("0.01"))

            cf_step = calculate_cash_flow(running_balance, inf, outf)
            running_balance = cf_step.closing_balance

            points.append(
                CashFlowPoint(
                    period_label=wb["label"],
                    date=wb["end"],
                    inflows=cf_step.total_inflows,
                    outflows=cf_step.total_outflows,
                    net=cf_step.net_cash_flow,
                    closing_balance=cf_step.closing_balance,
                )
            )

    else:  # "7d"
        start_date = anchor_date - timedelta(days=7)
        filtered_txs = [t for t in transactions if t.date >= start_date]
        tot_inf = sum((t.amount for t in filtered_txs if t.type == "income"), Decimal("0.00"))
        tot_outf = sum((t.amount for t in filtered_txs if t.type != "income"), Decimal("0.00"))

        for day_offset in range(7):
            curr_d = start_date + timedelta(days=day_offset)
            inf = sum((t.amount for t in filtered_txs if t.date == curr_d and t.type == "income"), Decimal("0.00"))
            outf = sum((t.amount for t in filtered_txs if t.date == curr_d and t.type != "income"), Decimal("0.00"))
            if inf == Decimal("0.00") and tot_inf > Decimal("0.00"):
                inf = (tot_inf / Decimal("7")).quantize(Decimal("0.01"))
            if outf == Decimal("0.00") and tot_outf > Decimal("0.00"):
                outf = (tot_outf / Decimal("7")).quantize(Decimal("0.01"))

            cf_step = calculate_cash_flow(running_balance, inf, outf)
            running_balance = cf_step.closing_balance
            total_inflows += inf
            total_outflows += outf

            points.append(
                CashFlowPoint(
                    period_label=curr_d.strftime("%a %d"),
                    date=curr_d,
                    inflows=cf_step.total_inflows,
                    outflows=cf_step.total_outflows,
                    net=cf_step.net_cash_flow,
                    closing_balance=cf_step.closing_balance,
                )
            )

    overall_cf = calculate_cash_flow(opening_balance, total_inflows, total_outflows)

    return CashFlowTimelineResponse(
        opening_balance=overall_cf.opening_balance,
        closing_balance=overall_cf.closing_balance,
        total_inflows=overall_cf.total_inflows,
        total_outflows=overall_cf.total_outflows,
        net_cash_flow=overall_cf.net_cash_flow,
        points=points,
    )
