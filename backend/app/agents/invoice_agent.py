from typing import Any, Dict, List
import uuid
from sqlalchemy.orm import Session

from backend.app.agents.base import BaseAgent


class InvoiceAgent(BaseAgent):
    name = "invoice_agent"
    description = "Specialized agent for receivables aging analysis and drafting invoices (requires approval)."
    allowlist_tools = [
        "get_outstanding_invoices",
        "create_invoice_draft",
    ]

    def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        rec = self.create_execution_record(params)
        tools_used: List[str] = []
        try:
            action = params.get("action", "check_receivables")
            if action == "create_draft":
                # Create draft invoice
                draft_res = self.run_tool("create_invoice_draft", {
                    "customer_name": params["customer_name"],
                    "amount": float(params["amount"]),
                    "description": params.get("description", "Consulting & Engineering Retainer"),
                    "due_days": int(params.get("due_days", 30)),
                })
                tools_used.append("create_invoice_draft")

                output = {
                    "summary": f"Prepared Draft invoice {draft_res.data['invoice_number']} for {params['customer_name']} (${draft_res.data['total']}). Approval required before delivery.",
                    "draft": draft_res.data,
                    "tool_results": [draft_res.model_dump()],
                }
                # Transition status to needs_approval
                self.complete_execution_record(rec, "needs_approval", output, tools_used)
                return output
            else:
                # Default: analyze receivables
                rec_res = self.run_tool("get_outstanding_invoices", {})
                tools_used.append("get_outstanding_invoices")

                tot_out = rec_res.data["total_outstanding"]
                tot_over = rec_res.data["total_overdue"]

                output = {
                    "summary": f"Total outstanding receivables: ${tot_out} (${tot_over} overdue across {len(rec_res.data['invoices'])} invoices).",
                    "total_outstanding": tot_out,
                    "total_overdue": tot_over,
                    "tool_results": [rec_res.model_dump()],
                }
                self.complete_execution_record(rec, "completed", output, tools_used)
                return output
        except Exception as e:
            self.complete_execution_record(rec, "failed", {}, tools_used, error=str(e))
            raise

