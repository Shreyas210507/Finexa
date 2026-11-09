import re
from typing import Any, Dict, List, Optional, Tuple
import uuid
from sqlalchemy.orm import Session

from backend.app.agents.base import BaseAgent
from backend.app.agents.cashflow_agent import CashFlowAgent
from backend.app.agents.invoice_agent import InvoiceAgent
from backend.app.agents.audit_agent import AuditAgent
from backend.app.agents.strategy_agent import FinancialStrategyAgent
from backend.app.ai.gemini_client import gemini_service
from backend.app.ai.schemas import ToolResult
from backend.app.ai.tools.registry import GEMINI_TOOL_DECLARATIONS


class CFOOrchestratorAgent(BaseAgent):
    name = "cfo_orchestrator"
    description = "Primary AI CFO Orchestrator with deterministic intent routing and grounded function calling."
    allowlist_tools = [
        "get_financial_summary",
        "get_transactions",
        "get_revenue_by_period",
        "get_expense_breakdown",
        "get_outstanding_invoices",
        "calculate_cash_runway",
        "generate_cashflow_forecast",
        "simulate_financial_scenario",
        "identify_anomalies",
        "create_invoice_draft",
        "generate_financial_report",
    ]

    def verify_grounding(self, text: str, tool_results: List[ToolResult]) -> Tuple[bool, List[str]]:
        """Verify that any currency numbers mentioned in model output exist in tool data."""
        # Find monetary numbers in text (e.g. $51,166.67, 51166.67, $246,000)
        found_amounts = re.findall(r"\$?\b(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\b", text)
        tool_data_str = " ".join([str(tr.data) for tr in tool_results])

        unsupported = []
        for amt in found_amounts:
            clean_amt = amt.replace(",", "")
            # Skip small integers like 3 months, 2 engineers, 30 days
            if float(clean_amt) < 100:
                continue
            if clean_amt not in tool_data_str and amt not in tool_data_str:
                unsupported.append(amt)

        return (len(unsupported) == 0, unsupported)

    def execute(self, user_prompt: str) -> Dict[str, Any]:
        """Orchestrate query with deterministic fast-path and grounded Gemini fallback."""
        rec = self.create_execution_record({"prompt": user_prompt})
        tools_used: List[str] = []
        tool_results: List[ToolResult] = []
        lowered = user_prompt.lower()

        try:
            # 1. Deterministic Fast-Paths (Zero Hallucination, Instant Execution)

            # Route: Runway & Burn
            if any(k in lowered for k in ["runway", "burn rate", "how much runway", "when will we run out of cash"]):
                runway_res = self.run_tool("calculate_cash_runway", {"trailing_months": 3})
                tools_used.append("calculate_cash_runway")
                tool_results.append(runway_res)

                c_bal = runway_res.data["closing_balance"]
                m_burn = runway_res.data["monthly_burn"]
                r_disp = runway_res.data["runway_display"]

                reply_text = (
                    f"Based on your verified closing cash balance of ${c_bal} and a trailing 3-month net burn rate of "
                    f"${m_burn}/month, your current operational cash runway is {r_disp} Months."
                )
                output = {
                    "text": reply_text,
                    "tool_results": [r.model_dump() for r in tool_results],
                    "routing": "deterministic_fast_path",
                }
                self.complete_execution_record(rec, "completed", output, tools_used)
                return output

            # Route: Audit / Anomaly
            if any(k in lowered for k in ["unusual", "audit", "flag", "anomaly", "suspicious", "outlier"]):
                audit_agent = AuditAgent(self.db, self.org_id, self.user_id)
                res = audit_agent.execute({})
                tools_used.extend(["identify_anomalies", "get_expense_breakdown"])
                output = {
                    "text": res["summary"],
                    "tool_results": res["tool_results"],
                    "anomalies": res.get("anomalies", []),
                    "routing": "audit_agent",
                }
                self.complete_execution_record(rec, "completed", output, tools_used)
                return output

            # Route: Receivables & Overdue
            if any(k in lowered for k in ["overdue", "receivables", "unpaid", "pending invoices"]):
                inv_agent = InvoiceAgent(self.db, self.org_id, self.user_id)
                res = inv_agent.execute({"action": "check_receivables"})
                tools_used.append("get_outstanding_invoices")
                output = {
                    "text": res["summary"],
                    "tool_results": res["tool_results"],
                    "routing": "invoice_agent",
                }
                self.complete_execution_record(rec, "completed", output, tools_used)
                return output

            # Route: What-If Simulator / Hiring
            if any(k in lowered for k in ["simulate", "hire", "what if", "hiring"]):
                strat_agent = FinancialStrategyAgent(self.db, self.org_id, self.user_id)
                res = strat_agent.execute({
                    "hire_count": 2,
                    "salary_per_hire": 6000.0,
                    "expense_increase_pct": 0.0,
                })
                tools_used.append("simulate_financial_scenario")
                output = {
                    "text": res["summary"],
                    "tool_results": res["tool_results"],
                    "routing": "strategy_agent",
                }
                self.complete_execution_record(rec, "completed", output, tools_used)
                return output

            # 2. General Fallback: Fetch verified summary and execute with Gemini or template
            summary_res = self.run_tool("get_financial_summary", {"period": "30d"})
            tools_used.append("get_financial_summary")
            tool_results.append(summary_res)

            system_instruction = (
                "You are FINEXA, an intelligent AI CFO for Novastack Technologies. "
                "All monetary values MUST strictly match the provided tool results in USD ($). "
                "Never invent or hallucinate financial figures. If a number is requested that is not in the data, "
                "state that data is unavailable."
            )

            # If Gemini is configured, run model; else use deterministic template
            if gemini_service.is_configured():
                gen_res = gemini_service.generate_content(
                    prompt=f"User question: {user_prompt}\nVerified Financial Data: {summary_res.data}",
                    system_instruction=system_instruction,
                )
                reply_text = gen_res["text"]
            else:
                reply_text = (
                    f"Financial Overview for {summary_res.data.get('period', 'current cycle')}: "
                    f"Revenue is ${summary_res.data['revenue']}, Expenses are ${summary_res.data['expenses']}, "
                    f"Monthly burn is ${summary_res.data['monthly_burn']}, with {summary_res.data['runway_display']} of runway. "
                    f"(AI engine operating in deterministic mode)."
                )

            # Post-check grounding verification
            is_grounded, unsupported = self.verify_grounding(reply_text, tool_results)

            output = {
                "text": reply_text,
                "tool_results": [r.model_dump() for r in tool_results],
                "routing": "gemini_model" if gemini_service.is_configured() else "deterministic_fallback",
                "grounding_verified": is_grounded,
                "unsupported_figures": unsupported,
            }
            self.complete_execution_record(rec, "completed", output, tools_used)
            return output

        except Exception as e:
            self.complete_execution_record(rec, "failed", {}, tools_used, error=str(e))
            raise

