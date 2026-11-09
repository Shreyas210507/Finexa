from typing import Any, Dict, List
import uuid
from sqlalchemy.orm import Session

from backend.app.agents.base import BaseAgent


class AuditAgent(BaseAgent):
    name = "audit_agent"
    description = "Specialized agent for auditing transaction disbursements, spotting statistical outliers, and flagging unlinked vendor spending without accusing fraud."
    allowlist_tools = [
        "get_transactions",
        "get_expense_breakdown",
        "identify_anomalies",
    ]

    def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        rec = self.create_execution_record(params)
        tools_used: List[str] = []
        try:
            # 1. Identify anomalies
            anomalies_res = self.run_tool("identify_anomalies", {"period": "30d"})
            tools_used.append("identify_anomalies")

            # 2. Get categorical expense breakdown for context
            breakdown_res = self.run_tool("get_expense_breakdown", {"period": "30d"})
            tools_used.append("get_expense_breakdown")

            anomalies = anomalies_res.data.get("anomalies_detected", [])
            count = len(anomalies)

            if count > 0:
                flagged_names = ", ".join([a.get("vendor", "Unknown") for a in anomalies])
                summary = (
                    f"Audit scan flagged {count} unusual transaction(s) for review: {flagged_names}. "
                    f"Notice: These represent statistical variance outliers requiring review; no irregular misconduct is alleged."
                )
            else:
                summary = "Audit scan complete: all disbursements fall within expected standard deviations for known vendors and categories."

            output = {
                "summary": summary,
                "anomalies_count": count,
                "anomalies": anomalies,
                "tool_results": [anomalies_res.model_dump(), breakdown_res.model_dump()],
            }
            self.complete_execution_record(rec, "completed", output, tools_used)
            return output
        except Exception as e:
            self.complete_execution_record(rec, "failed", {}, tools_used, error=str(e))
            raise
