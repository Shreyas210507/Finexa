from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy.orm import Session

from backend.app.ai.schemas import ToolResult
from backend.app.ai.tools.registry import execute_tool
from backend.app.models.ai import AgentExecution


class BaseAgent:
    name: str = "base_agent"
    description: str = "Base agent"
    allowlist_tools: List[str] = []

    def __init__(self, db: Session, org_id: uuid.UUID, user_id: uuid.UUID):
        self.db = db
        self.org_id = org_id
        self.user_id = user_id

    def create_execution_record(self, input_data: Dict[str, Any]) -> AgentExecution:
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
        record.status = status
        record.output_data = output_data
        record.tools_used = tools_used
        record.error = error
        record.completed_at = datetime.now(timezone.utc)
        self.db.commit()

    def run_tool(self, tool_name: str, kwargs: Dict[str, Any]) -> ToolResult:
        if tool_name not in self.allowlist_tools:
            raise PermissionError(f"Tool '{tool_name}' is not in the allowlist for {self.name}.")
        return execute_tool(tool_name, self.db, self.org_id, kwargs)

