import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy.orm import Session

from backend.app.ai.schemas import ToolResult
from backend.app.ai.tools.registry import execute_tool
from backend.app.models.ai import AgentExecution

logger = logging.getLogger("finexa.agents")


class BaseAgent:
    name: str = "base_agent"
    description: str = "Base agent"
    allowlist_tools: List[str] = []

    def __init__(self, db: Session, org_id: uuid.UUID, user_id: uuid.UUID):
        self.db = db
        self.org_id = org_id
        self.user_id = user_id
        self.timeline_events: List[Dict[str, Any]] = []

    def record_event(self, step: str, label: str, detail: str) -> None:
        """Record a structured lifecycle event for the activity timeline."""
        event = {
            "step": step,
            "label": label,
            "detail": detail,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self.timeline_events.append(event)
        logger.info(f"[{self.name}] Event {step}: {label} - {detail}")

    def check_idempotency(self, input_data: Dict[str, Any], window_seconds: int = 30) -> Optional[AgentExecution]:
        """Check for active or duplicate execution with matching parameters within time window."""
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=window_seconds)
        existing = (
            self.db.query(AgentExecution)
            .filter(
                AgentExecution.organisation_id == self.org_id,
                AgentExecution.agent_type == self.name,
                AgentExecution.started_at >= cutoff,
                AgentExecution.status.in_(["running", "needs_approval"]),
            )
            .order_by(AgentExecution.started_at.desc())
            .first()
        )
        if existing and existing.input_data == input_data:
            return existing
        return None

    def create_execution_record(self, input_data: Dict[str, Any]) -> AgentExecution:
        # Prevent duplicate tasks via idempotency check
        existing = self.check_idempotency(input_data)
        if existing and existing.status == "needs_approval":
            logger.warning(f"[{self.name}] Idempotency guard: Returning existing awaiting approval execution {existing.id}")
            self.timeline_events = (existing.output_data or {}).get("timeline_events", [])
            return existing

        self.timeline_events = []
        self.record_event(
            step="task_received",
            label="Task Received",
            detail=f"Parameters received for {self.name}: {list(input_data.keys()) or 'default params'}",
        )
        self.record_event(
            step="agent_activated",
            label="Agent Activated",
            detail=f"Agent '{self.name}' initialized in security context with {len(self.allowlist_tools)} authorized tools.",
        )

        record = AgentExecution(
            organisation_id=self.org_id,
            user_id=self.user_id,
            agent_type=self.name,
            status="running",
            input_data=input_data,
            started_at=datetime.now(timezone.utc),
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def complete_execution_record(
        self,
        record: AgentExecution,
        status: str,
        output_data: Dict[str, Any],
        tools_used: List[str],
        error: Optional[str] = None,
    ) -> None:
        if error:
            self.record_event(
                step="execution_failed",
                label="Execution Failed",
                detail=f"Agent execution encountered error: {error}",
            )
        else:
            self.record_event(
                step="analysis_completed",
                label="Analysis Completed",
                detail=f"Completed deterministic verification with {len(tools_used)} tool call(s).",
            )
            if status == "needs_approval":
                self.record_event(
                    step="approval_requested",
                    label="Approval Requested",
                    detail="Consequential action drafted. Awaiting explicit human authorization.",
                )
            else:
                self.record_event(
                    step="result_confirmed",
                    label="Result Confirmed",
                    detail="Final output calculated and verified against ledger data.",
                )

        output_copy = dict(output_data) if output_data else {}
        output_copy["timeline_events"] = self.timeline_events

        record.status = status
        record.output_data = output_copy
        record.tools_used = tools_used
        record.error = error
        record.completed_at = datetime.now(timezone.utc)
        self.db.commit()

    def run_tool(self, tool_name: str, kwargs: Dict[str, Any]) -> ToolResult:
        if tool_name not in self.allowlist_tools:
            logger.error(f"[{self.name}] Unauthorized tool attempt: {tool_name}")
            raise PermissionError(f"Tool '{tool_name}' is not in the allowlist for {self.name}.")

        result = execute_tool(tool_name, self.db, self.org_id, kwargs)
        self.record_event(
            step="data_retrieved",
            label="Data Retrieved",
            detail=f"Tool '{tool_name}' returned records [kind: {result.data_kind.value}].",
        )
        return result

