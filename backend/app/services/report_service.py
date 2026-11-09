import csv
from datetime import date
from decimal import Decimal
import io
from typing import Any, Dict, List, Optional
import uuid
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.orm import Session

from backend.app.financial_engine import (
    calculate_net_income,
    calculate_receivables,
    calculate_tax_estimate,
    MonthlyFigure,
)
from backend.app.models.invoice import Invoice
from backend.app.models.organisation import Organisation
from backend.app.models.transaction import Transaction
from backend.app.services.dashboard_service import get_dashboard_summary

TWO_PLACES = Decimal("0.01")


def generate_report_data(
    db: Session,
    org_id: uuid.UUID,
    report_type: str = "pnl",
    period: str = "30d",
) -> Dict[str, Any]:
    """Compile structured data for financial reports reusing the Financial Engine."""
    org = db.query(Organisation).filter(Organisation.id == org_id).first()
    org_name = org.name if org else "Organisation"
    currency = org.currency if org else "USD"

    summary = get_dashboard_summary(db, org_id, period=period)

    if report_type == "cashflow":
        opening_bal = calculate_net_income(summary.closing_balance, summary.net_income)
        return {
            "title": "Cash Flow Statement",
            "report_type": "cashflow",
            "organisation": org_name,
            "period": period,
            "currency": currency,
            "opening_balance": str(opening_bal),
            "total_inflows": str(summary.revenue),
            "total_outflows": str(summary.expenses),
            "net_cash_flow": str(summary.net_income),
            "closing_balance": str(summary.closing_balance),
            "runway": summary.runway_display,
        }
    elif report_type == "receivables":
        invoices = (
            db.query(Invoice)
            .filter(
                Invoice.organisation_id == org_id,
                Invoice.status.notin_(["Paid", "Draft", "Cancelled"]),
            )
            .all()
        )
        inv_dicts = [
            {"total_amount": inv.total, "paid_amount": inv.amount_paid, "due_date": inv.due_date, "status": inv.status}
            for inv in invoices
        ]
        aging = calculate_receivables(inv_dicts, date(2026, 10, 31))
        return {
            "title": "Accounts Receivable Aging Report",
            "report_type": "receivables",
            "organisation": org_name,
            "period": period,
            "currency": currency,
            "total_outstanding": str(aging.total_outstanding),
            "total_overdue": str(aging.total_overdue),
            "aging_0_30": str(aging.aging_0_30),
            "aging_31_60": str(aging.aging_31_60),
            "aging_61_90": str(aging.aging_61_90),
            "aging_90_plus": str(aging.aging_90_plus),
            "invoice_count": len(invoices),
        }
    elif report_type == "tax":
        tax_res = calculate_tax_estimate(summary.net_income)
        return {
            "title": "Corporate Tax Estimate Statement",
            "report_type": "tax",
            "organisation": org_name,
            "period": period,
            "currency": currency,
            "operating_revenue": str(summary.revenue),
            "operating_expenses": str(summary.expenses),
            "taxable_net_income": str(tax_res.taxable_profit),
            "estimated_tax_rate": f"{tax_res.tax_rate * Decimal('100.0'):.2f}%",
            "estimated_tax_obligation": str(tax_res.estimated_tax),
            "notice": "For informational estimation purposes only; consult licensed CPA for statutory tax filings.",
        }
    else:  # default pnl
        return {
            "title": "Profit & Loss (Income Statement)",
            "report_type": "pnl",
            "organisation": org_name,
            "period": period,
            "currency": currency,
            "operating_revenue": str(summary.revenue),
            "operating_expenses": str(summary.expenses),
            "net_operating_income": str(summary.net_income),
            "expense_breakdown": {k: str(v) for k, v in summary.expense_breakdown.items()},
            "revenue_growth_mom": str(summary.revenue_growth_mom) if summary.revenue_growth_mom else None,
            "expense_growth_mom": str(summary.expense_growth_mom) if summary.expense_growth_mom else None,
        }


def generate_report_csv(data: Dict[str, Any]) -> io.StringIO:
    """Generate structured RFC 4180 CSV export for report."""
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["FINEXA Financial Report", data.get("title", "Report")])
    writer.writerow(["Organisation", data.get("organisation", "")])
    writer.writerow(["Period", data.get("period", "")])
    writer.writerow(["Currency", data.get("currency", "USD")])
    writer.writerow([])  # empty line

    rtype = data.get("report_type")
    if rtype == "pnl":
        writer.writerow(["Metric", f"Amount ({data.get('currency', 'USD')})"])
        writer.writerow(["Operating Revenue", data["operating_revenue"]])
        writer.writerow(["Total Operating Expenses", data["operating_expenses"]])
        writer.writerow(["Net Operating Income / Loss", data["net_operating_income"]])
        writer.writerow([])
        writer.writerow(["Expense Category", "Amount"])
        for cat, amt in data.get("expense_breakdown", {}).items():
            writer.writerow([cat, amt])
    elif rtype == "cashflow":
        writer.writerow(["Metric", f"Amount ({data.get('currency', 'USD')})"])
        writer.writerow(["Opening Cash Balance", data["opening_balance"]])
        writer.writerow(["Total Operating Inflows", data["total_inflows"]])
        writer.writerow(["Total Operating Outflows", data["total_outflows"]])
        writer.writerow(["Net Cash Flow", data["net_cash_flow"]])
        writer.writerow(["Closing Cash Balance", data["closing_balance"]])
        writer.writerow(["Runway Estimate", data["runway"]])
    elif rtype == "receivables":
        writer.writerow(["Aging Bracket", f"Amount ({data.get('currency', 'USD')})"])
        writer.writerow(["0-30 Days", data["aging_0_30"]])
        writer.writerow(["31-60 Days", data["aging_31_60"]])
        writer.writerow(["61-90 Days", data["aging_61_90"]])
        writer.writerow(["90+ Days", data["aging_90_plus"]])
        writer.writerow(["Total Outstanding", data["total_outstanding"]])
        writer.writerow(["Total Overdue", data["total_overdue"]])
    elif rtype == "tax":
        writer.writerow(["Tax Metric", "Value"])
        writer.writerow(["Operating Revenue", data["operating_revenue"]])
        writer.writerow(["Operating Expenses", data["operating_expenses"]])
        writer.writerow(["Taxable Profit", data["taxable_net_income"]])
        writer.writerow(["Tax Rate", data["estimated_tax_rate"]])
        writer.writerow(["Estimated Tax Obligation", data["estimated_tax_obligation"]])

    output.seek(0)
    return output


def generate_report_pdf(data: Dict[str, Any]) -> io.BytesIO:
    """Generate professional branded PDF report using ReportLab."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#0D1428")
    accent_color = colors.HexColor("#20D9F2")
    muted_color = colors.HexColor("#64748B")

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        textColor=primary_color,
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        textColor=muted_color,
        spaceAfter=15,
    )

    elements = []

    # Header
    elements.append(Paragraph("FINEXA FINANCIAL INTELLIGENCE", ParagraphStyle("Brand", fontName="Helvetica-Bold", fontSize=9, textColor=accent_color)))
    elements.append(Paragraph(data.get("title", "Financial Statement"), title_style))
    elements.append(
        Paragraph(
            f"Organisation: <b>{data.get('organisation')}</b> &nbsp;|&nbsp; Period: <b>{data.get('period')}</b> &nbsp;|&nbsp; Currency: <b>{data.get('currency', 'USD')}</b>",
            subtitle_style,
        )
    )
    elements.append(Spacer(1, 10))

    # Build Table according to report type
    rtype = data.get("report_type")
    table_data = []

    if rtype == "pnl":
        table_data = [
            ["Financial Item", f"Amount ({data.get('currency', 'USD')})"],
            ["Operating Revenue", f"${data['operating_revenue']}"],
            ["Total Operating Expenses", f"${data['operating_expenses']}"],
            ["Net Operating Deficit / Surplus", f"${data['net_operating_income']}"],
        ]
        # Append categories
        table_data.append(["--- Categorical OpEx Breakdown ---", ""])
        for cat, amt in data.get("expense_breakdown", {}).items():
            table_data.append([f"  • {cat}", f"${amt}"])

    elif rtype == "cashflow":
        table_data = [
            ["Cash Flow Velocity Item", f"Amount ({data.get('currency', 'USD')})"],
            ["Opening Liquid Capital", f"${data['opening_balance']}"],
            ["Operating Inflows", f"+${data['total_inflows']}"],
            ["Operating Outflows", f"-${data['total_outflows']}"],
            ["Net Cash Flow Movement", f"${data['net_cash_flow']}"],
            ["Closing Liquid Reserves", f"${data['closing_balance']}"],
            ["Operational Cash Runway", f"{data['runway']}"],
        ]
    elif rtype == "receivables":
        table_data = [
            ["Aging Bracket", f"Amount ({data.get('currency', 'USD')})"],
            ["0 - 30 Days Overdue", f"${data['aging_0_30']}"],
            ["31 - 60 Days Overdue", f"${data['aging_31_60']}"],
            ["61 - 90 Days Overdue", f"${data['aging_61_90']}"],
            ["90+ Days Overdue", f"${data['aging_90_plus']}"],
            ["Total Accounts Receivable", f"${data['total_outstanding']}"],
            ["Total Overdue Receivables", f"${data['total_overdue']}"],
        ]
    else:  # tax
        table_data = [
            ["Tax Computation Parameter", "Value"],
            ["Gross Operating Revenue", f"${data['operating_revenue']}"],
            ["Deductible Expenses", f"${data['operating_expenses']}"],
            ["Net Taxable Income", f"${data['taxable_net_income']}"],
            ["Statutory Estimated Rate", data["estimated_tax_rate"]],
            ["Estimated Tax Liability", f"${data['estimated_tax_obligation']}"],
        ]

    table = Table(table_data, colWidths=[340, 200])
    table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0D1428")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ])
    )

    elements.append(table)
    elements.append(Spacer(1, 20))
    elements.append(
        Paragraph(
            "Certified FINEXA Financial Engine computation. Generated server-side with Python Decimal precision.",
            ParagraphStyle("Footer", fontName="Helvetica-Oblique", fontSize=8, textColor=muted_color),
        )
    )

    doc.build(elements)
    buffer.seek(0)
    return buffer

