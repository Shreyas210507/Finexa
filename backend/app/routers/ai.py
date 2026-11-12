import json
import time
import collections
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.agents.audit_agent import AuditAgent
from backend.app.agents.cashflow_agent import CashFlowAgent
from backend.app.agents.cfo_orchestrator import CFOOrchestratorAgent
from backend.app.agents.invoice_agent import InvoiceAgent
from backend.app.agents.strategy_agent import FinancialStrategyAgent
from backend.app.ai.schemas import (
    AgentExecutionResponse,
    ApprovalActionRequest,
    ChatMessageRequest,
    ChatMessageResponse,
    ConversationBrief,
)
from backend.app.database import get_db
from backend.app.dependencies import get_current_org, get_current_profile
from backend.app.models.ai import AIConversation, AIMessage, AgentExecution
from backend.app.models.invoice import Invoice
from backend.app.models.organisation import Organisation
from backend.app.models.profile import Profile

router = APIRouter(prefix="/ai", tags=["AI CFO & Agents"])

# In-memory sliding-window rate limiter: user_id -> deque of request timestamps
_rate_limit_history: Dict[uuid.UUID, collections.deque] = collections.defaultdict(collections.deque)


def check_ai_rate_limit(user_id: uuid.UUID) -> None:
    """Enforce AI rate limits based on sliding 60-second window."""
    now = time.time()
    q = _rate_limit_history[user_id]
    while q and q[0] <= now - 60.0:
        q.popleft()
    if len(q) >= settings.AI_RATE_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: maximum {settings.AI_RATE_LIMIT_PER_MINUTE} queries per minute. Please try again shortly.",
            headers={"Retry-After": "60"},
        )
    q.append(now)


@router.post("/chat", status_code=status.HTTP_200_OK)
def chat_with_cfo(
    req: ChatMessageRequest,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
    current_user: Profile = Depends(get_current_profile),
):
    """Interact with the AI CFO Orchestrator with guaranteed Financial Engine grounding."""
    # Enforce rate limit
    check_ai_rate_limit(current_user.id)

    # 1. Get or create conversation
    conv = None
    if req.conversation_id:
        conv = (
            db.query(AIConversation)
            .filter(
                AIConversation.id == req.conversation_id,
                AIConversation.organisation_id == current_org.id,
            )
            .first()
        )
    if not conv:
        title = req.message[:40] + ("..." if len(req.message) > 40 else "")
        conv = AIConversation(
            organisation_id=current_org.id,
            user_id=current_user.id,
            title=title,
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # 2. Record user message
    user_msg = AIMessage(
        conversation_id=conv.id,
        role="user",
        content=req.message,
    )
    db.add(user_msg)
    db.commit()

    # 3. Execute Orchestrator
    start_time = time.time()
    orchestrator = CFOOrchestratorAgent(db, current_org.id, current_user.id)
    result = orchestrator.execute(req.message)
    latency_ms = int((time.time() - start_time) * 1000)

    # 4. Record assistant message
    asst_msg = AIMessage(
        conversation_id=conv.id,
        role="assistant",
        content=result["text"],
        tool_results=result.get("tool_results"),
        latency_ms=latency_ms,
    )
    db.add(asst_msg)
    db.commit()
    db.refresh(asst_msg)

    return {
        "conversation_id": conv.id,
        "message_id": asst_msg.id,
        "content": result["text"],
        "tool_results": result.get("tool_results", []),
        "routing": result.get("routing"),
        "latency_ms": latency_ms,
        "created_at": asst_msg.created_at,
    }


@router.get("/conversations", response_model=List[ConversationBrief])
def list_conversations(
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
    current_user: Profile = Depends(get_current_profile),
):
    """List recent AI CFO conversations for the active organisation."""
    convs = (
        db.query(AIConversation)
        .filter(
            AIConversation.organisation_id == current_org.id,
            AIConversation.user_id == current_user.id,
        )
        .order_by(AIConversation.updated_at.desc())
        .limit(20)
        .all()
    )
    return [
        ConversationBrief(
            id=c.id,
            title=c.title,
            created_at=c.created_at,
            updated_at=c.updated_at,
            message_count=len(c.messages),
        )
        for c in convs
    ]


@router.get("/conversations/{conversation_id}/messages")
def get_conversation_messages(
    conversation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Retrieve message history for a conversation."""
    conv = (
        db.query(AIConversation)
        .filter(
            AIConversation.id == conversation_id,
            AIConversation.organisation_id == current_org.id,
        )
        .first()
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    msgs = (
        db.query(AIMessage)
        .filter(AIMessage.conversation_id == conv.id)
        .order_by(AIMessage.created_at.asc())
        .all()
    )
    return [
        {
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "tool_results": m.tool_results,
            "latency_ms": m.latency_ms,
            "created_at": m.created_at,
        }
        for m in msgs
    ]


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_200_OK)
def delete_conversation(
    conversation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Delete conversation and its message history."""
    conv = (
        db.query(AIConversation)
        .filter(
            AIConversation.id == conversation_id,
            AIConversation.organisation_id == current_org.id,
        )
        .first()
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    db.query(AIMessage).filter(AIMessage.conversation_id == conv.id).delete()
    db.delete(conv)
    db.commit()
    return {"status": "ok", "deleted_conversation_id": str(conversation_id)}


@router.get("/agents/status")
def get_agents_status(
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Retrieve real-time operational status, statistics, and tool capabilities for all 5 agents."""
    agent_configs = [
        {
            "key": "cfo_orchestrator",
            "name": "CFO Orchestrator Agent",
            "role": "Strategic Routing & Context Management",
            "description": "Coordinates specialized subagents, bounds conversation context, and invokes deterministic financial tools.",
            "tool_list": ["calculate_cash_runway", "get_financial_summary", "identify_anomalies", "simulate_financial_scenario"],
        },
        {
            "key": "cashflow_agent",
            "name": "Cash Flow Agent",
            "role": "Liquidity & Runway Monitor",
            "description": "Monitors daily opening and closing cash, computes burn velocity, and signals runway shortfalls.",
            "tool_list": ["calculate_cash_runway", "get_financial_summary", "generate_cashflow_forecast"],
        },
        {
            "key": "invoice_agent",
            "name": "Invoice Agent",
            "role": "Billing & Collections Automation",
            "description": "Drafts client invoices with server-verified totals and prepares overdue payment reminders in the approval queue.",
            "tool_list": ["create_invoice_draft", "get_outstanding_invoices"],
        },
        {
            "key": "audit_agent",
            "name": "Audit Agent",
            "role": "Anomaly & Variance Detection",
            "description": "Scans organisation ledger for unusual amount deviations or unexpected vendor spikes without labelling fraud.",
            "tool_list": ["identify_anomalies", "get_transactions", "get_expense_breakdown"],
        },
        {
            "key": "strategy_agent",
            "name": "Financial Strategy Agent",
            "role": "What-If Simulator & Growth Advisory",
            "description": "Evaluates hiring impacts, expense surges, and capital planning scenarios using deterministic models.",
            "tool_list": ["simulate_financial_scenario", "calculate_cash_runway", "get_financial_summary"],
        },
    ]

    result = []
    for cfg in agent_configs:
        key = cfg["key"]
        last_exec = (
            db.query(AgentExecution)
            .filter(
                AgentExecution.organisation_id == current_org.id,
                AgentExecution.agent_type == key,
            )
            .order_by(AgentExecution.started_at.desc())
            .first()
        )

        completed_count = (
            db.query(AgentExecution)
            .filter(
                AgentExecution.organisation_id == current_org.id,
                AgentExecution.agent_type == key,
                AgentExecution.status == "completed",
            )
            .count()
        )

        pending_count = (
            db.query(AgentExecution)
            .filter(
                AgentExecution.organisation_id == current_org.id,
                AgentExecution.agent_type == key,
                AgentExecution.status == "needs_approval",
            )
            .count()
        )

        error_count = (
            db.query(AgentExecution)
            .filter(
                AgentExecution.organisation_id == current_org.id,
                AgentExecution.agent_type == key,
                AgentExecution.status == "failed",
            )
            .count()
        )

        status_val = "idle"
        if pending_count > 0:
            status_val = "needs_approval"
        elif last_exec and last_exec.status == "running":
            status_val = "running"
        elif last_exec and last_exec.status == "failed":
            status_val = "failed"
        elif last_exec:
            status_val = "completed"

        result.append({
            "key": key,
            "name": cfg["name"],
            "role": cfg["role"],
            "description": cfg["description"],
            "status": status_val,
            "last_execution": last_exec.started_at.isoformat() if last_exec else None,
            "tasks_completed": completed_count,
            "tasks_awaiting_approval": pending_count,
            "error_count": error_count,
            "tool_list": cfg["tool_list"],
        })

    return result


@router.get("/agents/executions", response_model=List[AgentExecutionResponse])
def list_agent_executions(
    agent_name: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """List agent execution runs and approval queue items with optional filters."""
    q = db.query(AgentExecution).filter(AgentExecution.organisation_id == current_org.id)
    if agent_name:
        q = q.filter(AgentExecution.agent_type == agent_name)
    if status:
        q = q.filter(AgentExecution.status == status)

    executions = q.order_by(AgentExecution.started_at.desc()).limit(50).all()
    return executions


@router.post("/approvals/{execution_id}/action", status_code=status.HTTP_200_OK)
def handle_approval_action(
    execution_id: uuid.UUID,
    req: ApprovalActionRequest,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """Approve or reject a pending agent action (e.g. invoice draft)."""
    rec = (
        db.query(AgentExecution)
        .filter(
            AgentExecution.id == execution_id,
            AgentExecution.organisation_id == current_org.id,
        )
        .first()
    )
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution record not found")

    if rec.status != "needs_approval":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Record is not awaiting approval (current status: {rec.status})",
        )

    output_data = dict(rec.output_data or {})
    events = list(output_data.get("timeline_events", []))

    if req.action == "approve":
        rec.status = "completed"
        draft_data = output_data.get("draft")
        inv_number = draft_data.get("invoice_number", "Draft") if draft_data else "Draft"
        if draft_data and "invoice_id" in draft_data:
            inv = db.query(Invoice).filter(Invoice.id == uuid.UUID(draft_data["invoice_id"])).first()
            if inv:
                inv.status = "Sent"

        events.append({
            "step": "action_executed",
            "label": "Action Executed",
            "detail": f"Controller approved {inv_number}. Status updated to Sent.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        events.append({
            "step": "result_confirmed",
            "label": "Result Confirmed",
            "detail": f"Invoice {inv_number} issued and recorded in receivables ledger.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    else:
        rec.status = "failed"
        reason_txt = req.reason or "Rejected by organisation owner"
        rec.error = reason_txt
        events.append({
            "step": "action_executed",
            "label": "Action Rejected",
            "detail": f"Controller rejected proposed action: {reason_txt}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        events.append({
            "step": "result_confirmed",
            "label": "Result Confirmed",
            "detail": "Action rejected and draft cancelled without ledger impact.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    output_data["timeline_events"] = events
    rec.output_data = output_data
    rec.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(rec)
    return {"status": "ok", "action": req.action, "execution_status": rec.status}


@router.post("/agents/run/{agent_name}", status_code=status.HTTP_200_OK)
def run_agent_manually(
    agent_name: str,
    params: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
    current_user: Profile = Depends(get_current_profile),
):
    """Trigger an on-demand run of a specialized financial agent with input validation."""
    p = params or {}
    if agent_name == "cfo_orchestrator":
        agent = CFOOrchestratorAgent(db, current_org.id, current_user.id)
        if p.get("mode") == "orchestration":
            return agent.orchestrate_cross_agent_review()
        prompt = p.get("prompt") or "Provide comprehensive financial health overview, burn rate, and runway."
        return agent.execute(prompt)
    elif agent_name == "audit_agent":
        agent = AuditAgent(db, current_org.id, current_user.id)
        return agent.execute(p)
    elif agent_name == "cashflow_agent":
        agent = CashFlowAgent(db, current_org.id, current_user.id)
        return agent.execute(p)
    elif agent_name == "strategy_agent":
        agent = FinancialStrategyAgent(db, current_org.id, current_user.id)
        hire_count = int(p.get("hire_count", 2))
        salary_per_hire = float(p.get("salary_per_hire", 6000.0))
        return agent.execute({"hire_count": hire_count, "salary_per_hire": salary_per_hire})
    elif agent_name == "invoice_agent":
        agent = InvoiceAgent(db, current_org.id, current_user.id)
        action = p.get("action", "check_receivables")
        if action == "create_draft":
            customer = p.get("customer_name", "Acme Corporation")
            amount = float(p.get("amount", 8500.0))
            desc = p.get("description", "Enterprise Cloud Infrastructure & Integration Q4")
            return agent.execute({
                "action": "create_draft",
                "customer_name": customer,
                "amount": amount,
                "description": desc,
            })
        return agent.execute({"action": "check_receivables"})
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown agent: {agent_name}")


@router.post("/agents/orchestrate", status_code=status.HTTP_200_OK)
def trigger_agent_orchestration(
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
    current_user: Profile = Depends(get_current_profile),
):
    """Trigger coordinated multi-agent orchestration pipeline: CFO -> Cash Flow -> Invoice -> Audit."""
    orchestrator = CFOOrchestratorAgent(db, current_org.id, current_user.id)
    return orchestrator.orchestrate_cross_agent_review()
