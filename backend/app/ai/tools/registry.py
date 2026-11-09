from typing import Any, Callable, Dict, List
import uuid
from sqlalchemy.orm import Session

from backend.app.ai.schemas import ToolResult
from backend.app.ai.tools.financial_tools import (
    tool_get_financial_summary,
    tool_get_transactions,
    tool_get_revenue_by_period,
    tool_get_expense_breakdown,
    tool_get_outstanding_invoices,
    tool_calculate_cash_runway,
    tool_generate_cashflow_forecast,
    tool_simulate_financial_scenario,
    tool_identify_anomalies,
    tool_create_invoice_draft,
    tool_generate_financial_report,
)

TOOL_REGISTRY: Dict[str, Callable[..., ToolResult]] = {
    "get_financial_summary": tool_get_financial_summary,
    "get_transactions": tool_get_transactions,
    "get_revenue_by_period": tool_get_revenue_by_period,
    "get_expense_breakdown": tool_get_expense_breakdown,
    "get_outstanding_invoices": tool_get_outstanding_invoices,
    "calculate_cash_runway": tool_calculate_cash_runway,
    "generate_cashflow_forecast": tool_generate_cashflow_forecast,
    "simulate_financial_scenario": tool_simulate_financial_scenario,
    "identify_anomalies": tool_identify_anomalies,
    "create_invoice_draft": tool_create_invoice_draft,
    "generate_financial_report": tool_generate_financial_report,
}

GEMINI_TOOL_DECLARATIONS = [
    {
        "name": "get_financial_summary",
        "description": "Retrieve high-level financial summary including revenue, expenses, net income, burn, and runway.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "period": {"type": "STRING", "description": "Period to evaluate, e.g. '7d', '30d', '90d', '12m'"}
            },
        },
    },
    {
        "name": "get_transactions",
        "description": "Search and list verified financial transactions from the ledger.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "page": {"type": "INTEGER", "description": "Page number"},
                "size": {"type": "INTEGER", "description": "Number of records to return (max 50)"},
                "search": {"type": "STRING", "description": "Search query for description or counterparty"},
                "category": {"type": "STRING", "description": "Category filter"},
                "type_": {"type": "STRING", "description": "income or expense"},
            },
        },
    },
    {
        "name": "get_revenue_by_period",
        "description": "Breakdown verified revenue by client/counterparty for a given period.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "period": {"type": "STRING", "description": "e.g. '30d', '90d'"}
            },
        },
    },
    {
        "name": "get_expense_breakdown",
        "description": "Retrieve categorical breakdown of operating expenses (Salaries, Software, Marketing, etc.).",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "period": {"type": "STRING", "description": "e.g. '30d', '90d'"}
            },
        },
    },
    {
        "name": "get_outstanding_invoices",
        "description": "List outstanding and overdue invoices with accounts receivable aging buckets.",
        "parameters": {"type": "OBJECT", "properties": {}},
    },
    {
        "name": "calculate_cash_runway",
        "description": "Calculate trailing N-month burn rate and exact runway in months from verified liquid cash reserves.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "trailing_months": {"type": "INTEGER", "description": "Number of trailing months (default 3)"}
            },
        },
    },
    {
        "name": "generate_cashflow_forecast",
        "description": "Generate linear projection of cash position over 30/90 days.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "horizon_days": {"type": "INTEGER", "description": "Number of days ahead to project (default 90)"}
            },
        },
    },
    {
        "name": "simulate_financial_scenario",
        "description": "Simulate what-if changes (e.g. hiring new staff or OpEx changes) on monthly burn and cash runway.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "hire_count": {"type": "INTEGER", "description": "Number of new hires"},
                "salary_per_hire": {"type": "NUMBER", "description": "Monthly salary per hire in USD"},
                "expense_increase_pct": {"type": "NUMBER", "description": "Percentage increase in general expenses"},
            },
        },
    },
    {
        "name": "identify_anomalies",
        "description": "Audit transactions for statistical deviations, high-value outliers, and unlinked vendor spending.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "period": {"type": "STRING", "description": "Period to audit"}
            },
        },
    },
    {
        "name": "create_invoice_draft",
        "description": "Draft a customer invoice in DRAFT status. Requires human approval before issuance.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "customer_name": {"type": "STRING", "description": "Client company name"},
                "amount": {"type": "NUMBER", "description": "Invoice total amount in USD"},
                "description": {"type": "STRING", "description": "Description of services rendered"},
                "due_days": {"type": "INTEGER", "description": "Net payment terms in days (e.g. 30)"},
            },
            "required": ["customer_name", "amount", "description"],
        },
    },
    {
        "name": "generate_financial_report",
        "description": "Generate structured P&L or Cash Flow report for review.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "report_type": {"type": "STRING", "description": "pnl or cashflow"},
                "period": {"type": "STRING", "description": "e.g. '30d', 'oct2026'"},
            },
        },
    },
]


def execute_tool(
    name: str,
    db: Session,
    org_id: uuid.UUID,
    kwargs: Dict[str, Any],
) -> ToolResult:
    """Execute a tool safely by name with organisation isolation."""
    if name not in TOOL_REGISTRY:
        raise ValueError(f"Tool '{name}' is not registered.")
    fn = TOOL_REGISTRY[name]
    return fn(db, org_id, **kwargs)

