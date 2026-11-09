from typing import Any, Dict, List
import uuid
from sqlalchemy.orm import Session

from backend.app.agents.base import BaseAgent


class FinancialStrategyAgent(BaseAgent):
    name = "strategy_agent"
    description = "Specialized agent for financial scenario simulations, hiring impact, and long-term runway optimization."
    allowlist_tools = [
        "get_financial_summary",
        "calculate_cash_runway",
        "simulate_financial_scenario",
    ]

    def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        rec = self.create_execution_record(params)
        tools_used: List[str] = []
        try:
            hire_count = int(params.get("hire_count", 2))
            salary_per_hire = float(params.get("salary_per_hire", 6000.0))
            expense_increase_pct = float(params.get("expense_increase_pct", 0.0))

            sim_res = self.run_tool("simulate_financial_scenario", {
                "hire_count": hire_count,
                "salary_per_hire": salary_per_hire,
                "expense_increase_pct": expense_increase_pct,
            })
            tools_used.append("simulate_financial_scenario")

            b_burn = sim_res.data["baseline_burn"]
            b_runway = sim_res.data["baseline_runway_months"]
            s_burn = sim_res.data["simulated_burn"]
            s_runway = sim_res.data["simulated_runway_months"]

            summary = (
                f"Simulating onboarding {hire_count} new team members at ${salary_per_hire:.2f}/month "
                f"increases monthly net burn from ${b_burn} to ${s_burn}, contracting operational runway "
                f"from {b_runway} to {s_runway} months."
            )

            output = {
                "summary": summary,
                "baseline_burn": b_burn,
                "baseline_runway": b_runway,
                "simulated_burn": s_burn,
                "simulated_runway": s_runway,
                "tool_results": [sim_res.model_dump()],
            }
            self.complete_execution_record(rec, "completed", output, tools_used)
            return output
        except Exception as e:
            self.complete_execution_record(rec, "failed", {}, tools_used, error=str(e))
            raise

