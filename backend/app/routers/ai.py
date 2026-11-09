import json
import time
import collections
from typing import Dict, List, Optional
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


@router.get("/agents/executions", response_model=List[AgentExecutionResponse])
def list_agent_executions(
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
):
    """List agent execution runs and approval queue items."""
    executions = (
        db.query(AgentExecution)
        .filter(AgentExecution.organisation_id == current_org.id)
        .order_by(AgentExecution.started_at.desc())
        .limit(30)
        .all()
    )
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

    if req.action == "approve":
        rec.status = "completed"
        # If invoice draft was waiting for approval, promote from Draft to Sent
        draft_data = rec.output_data.get("draft") if rec.output_data else None
        if draft_data and "invoice_id" in draft_data:
            inv = db.query(Invoice).filter(Invoice.id == uuid.UUID(draft_data["invoice_id"])).first()
            if inv:
                inv.status = "Sent"
    else:
        rec.status = "failed"
        rec.error = req.reason or "Rejected by organisation owner"

    db.commit()
    db.refresh(rec)
    return {"status": "ok", "action": req.action, "execution_status": rec.status}


@router.post("/agents/run/{agent_name}", status_code=status.HTTP_200_OK)
def run_agent_manually(
    agent_name: str,
    db: Session = Depends(get_db),
    current_org: Organisation = Depends(get_current_org),
    current_user: Profile = Depends(get_current_profile),
):
    """Trigger an on-demand run of a specialized financial agent."""
    if agent_name == "audit_agent":
        agent = AuditAgent(db, current_org.id, current_user.id)
        return agent.execute({})
    elif agent_name == "cashflow_agent":
        agent = CashFlowAgent(db, current_org.id, current_user.id)
        return agent.execute({})
    elif agent_name == "strategy_agent":
        agent = FinancialStrategyAgent(db, current_org.id, current_user.id)
        return agent.execute({"hire_count": 2, "salary_per_hire": 6000.0})
    elif agent_name == "invoice_agent":
        agent = InvoiceAgent(db, current_org.id, current_user.id)
        return agent.execute({"action": "check_receivables"})
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown agent: {agent_name}")
