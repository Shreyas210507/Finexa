from typing import Any, Dict, List
import uuid
from sqlalchemy.orm import Session

from backend.app.agents.base import BaseAgent
from backend.app.ai.schemas import ToolResult


class CashFlowAgent(BaseAgent):
    name = "cashflow_agent"
    description = "Specialized agent for monitoring liquidity velocity, cash inflows/outflows, and runway buffers."
    allowlist_tools = [
        "calculate_cash_runway",
        "get_financial_summary",
        "generate_cashflow_forecast",
    ]

    def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        rec = self.create_execution_record(params)
        tools_used: List[str] = []
        try:
            # 1. Calculate runway
            runway_res = self.run_tool("calculate_cash_runway", {"trailing_months": 3})
            tools_used.append("calculate_cash_runway")

            # 2. Get 30d summary
            summary_res = self.run_tool("get_financial_summary", {"period": "30d"})
            tools_used.append("get_financial_summary")

            # 3. Forecast
            forecast_res = self.run_tool("generate_cashflow_forecast", {"horizon_days": 90})
            tools_used.append("generate_cashflow_forecast")

            closing = runway_res.data["closing_balance"]
            burn = runway_res.data["monthly_burn"]
            runway = runway_res.data["runway_display"]

            output = {
                "summary": f"Your operational cash runway is {runway} based on a closing balance of ${closing} and trailing 3-month average burn of ${burn}/month.",
                "closing_balance": closing,
                "monthly_burn": burn,
                "runway_display": runway,
                "projected_closing_90d": forecast_res.data["projected_closing_balance"],
                "tool_results": [runway_res.model_dump(), summary_res.model_dump(), forecast_res.model_dump()],
            }

            self.complete_execution_record(rec, "completed", output, tools_used)
            return output
        except Exception as e:
            self.complete_execution_record(rec, "failed", {}, tools_used, error=str(e))
            raise

