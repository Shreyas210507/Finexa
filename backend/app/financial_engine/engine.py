"""Pure Python Decimal Financial Engine for FINEXA.
ZERO floats allowed. All money precision is guaranteed with Python Decimal.
"""

from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple

from backend.app.financial_engine.models import (
    BurnRunwayResult,
    CashFlowSummary,
    DashboardEngineFigures,
    FinancialRatios,
    InvoiceTotalsResult,
    MonthlyFigure,
    PaymentSettlementResult,
    ReceivablesSummary,
    TaxEstimateResult,
)
from backend.app.financial_engine.ratios import (
    calculate_expense_ratio,
    calculate_growth_rate,
    calculate_profit_margin,
)

# Standard Financial Precision and Benchmark Constants
TWO_PLACES = Decimal("0.01")
ONE_PLACE = Decimal("0.1")
FOUR_PLACES = Decimal("0.0001")
DAYS_PER_MONTH = Decimal("30.0")

# Benchmark Initial Capital Anchor (Novastack Technologies)
DEFAULT_INITIAL_CAPITAL = Decimal("834500.00")

# Standard US Corporate Income Tax Rate
DEFAULT_CORPORATE_TAX_RATE = Decimal("0.21")


def calculate_net_income(revenue: Decimal, expenses: Decimal) -> Decimal:
    """Calculate Net Income (Revenue - Expenses) using pure Decimal with standard rounding."""
    return (Decimal(str(revenue)) - Decimal(str(expenses))).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def calculate_daily_burn(monthly_burn: Decimal, days_in_month: Decimal = DAYS_PER_MONTH) -> Decimal:
    """Calculate daily burn rate from monthly burn rate using pure Decimal."""
    m_burn = Decimal(str(monthly_burn))
    if m_burn <= Decimal("0.00"):
        return Decimal("0.00")
    return (m_burn / days_in_month).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def calculate_average_expenses(
    monthly_records: List[MonthlyFigure],
    trailing_n: int = 3,
) -> Decimal:
    """Calculate trailing N-month average expenses using pure Decimal."""
    if not monthly_records or trailing_n <= 0:
        return Decimal("0.00")
    window = monthly_records[-trailing_n:]
    total_exp = sum(r.expenses for r in window)
    return (total_exp / Decimal(str(len(window)))).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def calculate_cash_flow(
    opening_balance: Decimal,
    inflows: Decimal,
    outflows: Decimal,
) -> CashFlowSummary:
    """Calculate Cash Flow summary:
    net_cash_flow = inflows - outflows
    closing_balance = opening_balance + inflows - outflows
    """
    op = Decimal(str(opening_balance))
    inf = Decimal(str(inflows))
    outf = Decimal(str(outflows))

    net_cash_flow = (inf - outf).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    closing_balance = (op + net_cash_flow).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

    return CashFlowSummary(
        opening_balance=op.quantize(TWO_PLACES, rounding=ROUND_HALF_UP),
        total_inflows=inf.quantize(TWO_PLACES, rounding=ROUND_HALF_UP),
        total_outflows=outf.quantize(TWO_PLACES, rounding=ROUND_HALF_UP),
        net_cash_flow=net_cash_flow,
        closing_balance=closing_balance,
    )


def calculate_burn_and_runway(
    monthly_records: List[MonthlyFigure],
    closing_balance: Decimal,
    trailing_n: int = 3,
) -> BurnRunwayResult:
    """Calculate trailing N-month average burn and runway in months.
    Burn is defined as net cash drain: expenses - revenue (or -net_income).
    If trailing average burn is zero or negative (i.e. profitable), runway is
    set to None with display 'Not applicable'.
    """
    c_bal = Decimal(str(closing_balance))
    if not monthly_records or trailing_n <= 0:
        return BurnRunwayResult(
            trailing_months=trailing_n,
            average_monthly_burn=Decimal("0.00"),
            closing_balance=c_bal.quantize(TWO_PLACES, rounding=ROUND_HALF_UP),
            runway_months=None,
            runway_display="Not applicable",
        )

    # Take the latest trailing_n records
    records_window = monthly_records[-trailing_n:]
    window_count = Decimal(str(len(records_window)))

    total_net_burn = Decimal("0")
    for r in records_window:
        # Net burn is expenses - revenue
        monthly_burn = r.expenses - r.revenue
        total_net_burn += monthly_burn

    avg_monthly_burn = (total_net_burn / window_count).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

    if avg_monthly_burn <= Decimal("0"):
        return BurnRunwayResult(
            trailing_months=len(records_window),
            average_monthly_burn=avg_monthly_burn,
            closing_balance=c_bal.quantize(TWO_PLACES, rounding=ROUND_HALF_UP),
            runway_months=None,
            runway_display="Not applicable",
        )

    runway_months = (c_bal / avg_monthly_burn).quantize(ONE_PLACE, rounding=ROUND_HALF_UP)

    return BurnRunwayResult(
        trailing_months=len(records_window),
        average_monthly_burn=avg_monthly_burn,
        closing_balance=c_bal.quantize(TWO_PLACES, rounding=ROUND_HALF_UP),
        runway_months=runway_months,
        runway_display=str(runway_months),
    )


def calculate_receivables(
    invoices: List[dict],
    anchor_date: date,
) -> ReceivablesSummary:
    """Calculate outstanding and overdue aging buckets from active invoice records.
    Invoices dictionary expected keys:
      total_amount (Decimal), paid_amount (Decimal), due_date (date), status (str)
    """
    total_outstanding = Decimal("0")
    total_overdue = Decimal("0")
    aging_0_30 = Decimal("0")
    aging_31_60 = Decimal("0")
    aging_61_90 = Decimal("0")
    aging_90_plus = Decimal("0")

    for inv in invoices:
        status = str(inv.get("status", "")).lower()
        if status in ("draft", "cancelled"):
            continue

        total = Decimal(str(inv.get("total_amount", 0)))
        paid = Decimal(str(inv.get("paid_amount", 0)))
        balance = total - paid

        if balance <= Decimal("0"):
            continue

        total_outstanding += balance
        due_date = inv.get("due_date")

        if due_date and due_date < anchor_date:
            days_overdue = (anchor_date - due_date).days
            total_overdue += balance

            if days_overdue <= 30:
                aging_0_30 += balance
            elif days_overdue <= 60:
                aging_31_60 += balance
            elif days_overdue <= 90:
                aging_61_90 += balance
            else:
                aging_90_plus += balance

    return ReceivablesSummary(
        total_outstanding=total_outstanding.quantize(TWO_PLACES, rounding=ROUND_HALF_UP),
        total_overdue=total_overdue.quantize(TWO_PLACES, rounding=ROUND_HALF_UP),
        aging_0_30=aging_0_30.quantize(TWO_PLACES, rounding=ROUND_HALF_UP),
        aging_31_60=aging_31_60.quantize(TWO_PLACES, rounding=ROUND_HALF_UP),
        aging_61_90=aging_61_90.quantize(TWO_PLACES, rounding=ROUND_HALF_UP),
        aging_90_plus=aging_90_plus.quantize(TWO_PLACES, rounding=ROUND_HALF_UP),
    )


def calculate_period_ratios(
    revenue: Decimal,
    expenses: Decimal,
    prior_revenue: Optional[Decimal] = None,
    prior_expenses: Optional[Decimal] = None,
) -> Tuple[Decimal, FinancialRatios]:
    """Calculate Net Income and Financial Ratios for a period."""
    net_income = calculate_net_income(revenue, expenses)
    profit_margin = calculate_profit_margin(net_income, revenue)
    expense_ratio = calculate_expense_ratio(expenses, revenue)
    rev_growth = calculate_growth_rate(revenue, prior_revenue)
    exp_growth = calculate_growth_rate(expenses, prior_expenses)

    ratios = FinancialRatios(
        profit_margin=profit_margin,
        expense_ratio=expense_ratio,
        revenue_growth_mom=rev_growth,
        expense_growth_mom=exp_growth,
    )

    return net_income, ratios


def calculate_invoice_totals(
    line_items: List[dict],
    tax_rate: Decimal,
    discount_amount: Decimal,
    amount_paid: Decimal = Decimal("0.00"),
) -> InvoiceTotalsResult:
    """Calculate invoice subtotal, tax amount, total, and remaining balance using pure Decimal."""
    subtotal = Decimal("0.00")
    for item in line_items:
        qty = Decimal(str(item.get("quantity", 0))).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        unit_p = Decimal(str(item.get("unit_price", 0))).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        subtotal += (qty * unit_p).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

    rate = Decimal(str(tax_rate))
    tax_amount = (subtotal * rate).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    discount = Decimal(str(discount_amount)).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    total = (subtotal + tax_amount - discount).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    paid = Decimal(str(amount_paid)).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    balance = max(Decimal("0.00"), total - paid).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

    return InvoiceTotalsResult(
        subtotal=subtotal,
        tax_amount=tax_amount,
        discount_amount=discount,
        total=total,
        balance=balance,
    )


def calculate_payment_settlement(
    total: Decimal,
    current_amount_paid: Decimal,
    payment_amount: Decimal,
) -> PaymentSettlementResult:
    """Calculate updated amount paid and balance following a payment settlement."""
    tot = Decimal(str(total)).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    c_paid = Decimal(str(current_amount_paid)).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    p_amount = Decimal(str(payment_amount)).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

    new_amount_paid = (c_paid + p_amount).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    new_balance = max(Decimal("0.00"), tot - new_amount_paid).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    is_fully_paid = (new_balance <= Decimal("0.00"))

    return PaymentSettlementResult(
        new_amount_paid=new_amount_paid,
        new_balance=new_balance,
        is_fully_paid=is_fully_paid,
    )


def calculate_tax_estimate(
    net_income: Decimal,
    tax_rate: Decimal = DEFAULT_CORPORATE_TAX_RATE,
) -> TaxEstimateResult:
    """Calculate corporate income tax estimate on positive net income."""
    income = Decimal(str(net_income))
    rate = Decimal(str(tax_rate))
    taxable_profit = max(Decimal("0.00"), income).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    estimated_tax = (taxable_profit * rate).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    return TaxEstimateResult(
        taxable_profit=taxable_profit,
        tax_rate=rate,
        estimated_tax=estimated_tax,
    )


def compute_dashboard_figures(
    monthly_figures: List[MonthlyFigure],
    total_inflows_all: Decimal,
    total_outflows_all: Decimal,
    invoices: List[dict],
    anchor_date: date,
    period_revenue: Decimal,
    period_expenses: Decimal,
    initial_capital: Decimal = DEFAULT_INITIAL_CAPITAL,
    trailing_n: int = 3,
) -> DashboardEngineFigures:
    """Centralized financial engine function producing all dashboard financial figures."""
    # 1. Closing liquid balance via cash flow calculation
    opening_balance = initial_capital if len(monthly_figures) > 0 else Decimal("0.00")
    cf_res = calculate_cash_flow(opening_balance, total_inflows_all, total_outflows_all)
    closing_balance = cf_res.closing_balance

    # 2. Burn and runway
    burn_res = calculate_burn_and_runway(monthly_figures, closing_balance, trailing_n=trailing_n)

    # 3. Trailing average expenses
    avg_expenses = calculate_average_expenses(monthly_figures, trailing_n=trailing_n)

    # 4. Receivables aging
    rec_res = calculate_receivables(invoices, anchor_date)

    # 5. Period revenue, expenses, net income and growth ratios
    prior_rev = monthly_figures[-2].revenue if len(monthly_figures) >= 2 else None
    prior_exp = monthly_figures[-2].expenses if len(monthly_figures) >= 2 else None
    curr_rev = monthly_figures[-1].revenue if len(monthly_figures) >= 1 else period_revenue
    curr_exp = monthly_figures[-1].expenses if len(monthly_figures) >= 1 else period_expenses

    net_income, ratios = calculate_period_ratios(curr_rev, curr_exp, prior_rev, prior_exp)

    return DashboardEngineFigures(
        revenue=curr_rev,
        expenses=curr_exp,
        net_income=net_income,
        closing_balance=closing_balance,
        monthly_burn=burn_res.average_monthly_burn,
        runway_months=burn_res.runway_months,
        runway_display=burn_res.runway_display,
        outstanding_receivables=rec_res.total_outstanding,
        overdue_receivables=rec_res.total_overdue,
        revenue_growth_mom=ratios.revenue_growth_mom,
        expense_growth_mom=ratios.expense_growth_mom,
        trailing_average_expenses=avg_expenses,
    )
