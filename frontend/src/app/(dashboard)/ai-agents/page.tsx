"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bot,
  ShieldCheck,
  Play,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Layers,
  GitBranch,
  ShieldAlert,
  Cpu,
  Eye,
  FileText,
  Activity,
  Zap,
  Check,
  AlertCircle,
  X,
  TrendingUp,
  AlertTriangle,
  Send,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusChip, LabelChip } from "@/components/ui/chips";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api-client";
import { AIAgentExecution, AgentStatusItem, TimelineEvent, AgentHandoff } from "@/lib/api-types";

type ViewTab = "agents" | "approvals" | "orchestration" | "timeline";

export default function AiAgentsPage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<ViewTab>("agents");
  const [agentStatuses, setAgentStatuses] = useState<AgentStatusItem[]>([]);
  const [executions, setExecutions] = useState<AIAgentExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentStatusItem | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<AIAgentExecution | null>(null);

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingExecId, setRejectingExecId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Invoice draft modal state
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftCustomer, setDraftCustomer] = useState("Acme Corporation");
  const [draftAmount, setDraftAmount] = useState("8500");
  const [draftDesc, setDraftDesc] = useState("Enterprise Cloud Infrastructure & Integration Q4");

  // Timeline filters
  const [timelineAgentFilter, setTimelineAgentFilter] = useState<string>("all");
  const [timelineStatusFilter, setTimelineStatusFilter] = useState<string>("all");

  // Multi-agent orchestration result
  const [orchestrationResult, setOrchestrationResult] = useState<{
    summary: string;
    handoffs: AgentHandoff[];
    pipeline: string[];
    results: Record<string, unknown>;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statusesRes, execsRes] = await Promise.all([
        apiClient.getAIAgentsStatus().catch(() => []),
        apiClient.getAIAgentExecutions().catch(() => []),
      ]);
      setAgentStatuses(statusesRes);
      setExecutions(execsRes);
    } catch {
      // Keep existing data on transient fetch error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pendingApprovals = useMemo(
    () => executions.filter((e) => e.status === "needs_approval"),
    [executions]
  );

  const handleApproval = async (execId: string, action: "approve" | "reject", reason?: string) => {
    try {
      await apiClient.handleApprovalAction(execId, action, reason);
      addToast({
        type: action === "approve" ? "success" : "info",
        title: action === "approve" ? "Action Authorized" : "Action Rejected",
        message:
          action === "approve"
            ? "Consequential action approved and committed to ledger."
            : `Proposed action rejected${reason ? `: "${reason}"` : "."}`,
      });
      setRejectModalOpen(false);
      setRejectReason("");
      setRejectingExecId(null);
      fetchData();
    } catch (e: unknown) {
      const err = e as Error;
      addToast({
        type: "error",
        title: "Authorization Failed",
        message: err.message || "Failed to process approval action.",
      });
    }
  };

  const handleRunAgent = async (agentKey: string, params?: Record<string, unknown>) => {
    try {
      setRunningAgent(agentKey);
      const res = await apiClient.runAgentManually(agentKey, params);
      addToast({
        type: "success",
        title: "Agent Dispatched",
        message: `${agentKey.replace("_", " ")} completed verified run.`,
      });
      fetchData();
      return res;
    } catch (e: unknown) {
      const err = e as Error;
      addToast({
        type: "error",
        title: "Execution Error",
        message: err.message || `Failed to execute agent ${agentKey}`,
      });
    } finally {
      setRunningAgent(null);
    }
  };

  const handleTriggerOrchestration = async () => {
    try {
      setIsOrchestrating(true);
      const res = await apiClient.triggerAgentOrchestration();
      setOrchestrationResult(res as unknown as {
        summary: string;
        handoffs: AgentHandoff[];
        pipeline: string[];
        results: Record<string, unknown>;
      });
      setActiveTab("orchestration");
      addToast({
        type: "success",
        title: "Orchestration Completed",
        message: "Multi-agent sweep synthesized cross-agent findings.",
      });
      fetchData();
    } catch (e: unknown) {
      const err = e as Error;
      addToast({
        type: "error",
        title: "Orchestration Failed",
        message: err.message || "Failed to run multi-agent orchestration pipeline.",
      });
    } finally {
      setIsOrchestrating(false);
    }
  };

  const filteredExecutions = useMemo(() => {
    return executions.filter((item) => {
      if (timelineAgentFilter !== "all" && item.agent_type !== timelineAgentFilter) {
        return false;
      }
      if (timelineStatusFilter !== "all" && item.status !== timelineStatusFilter) {
        return false;
      }
      return true;
    });
  }, [executions, timelineAgentFilter, timelineStatusFilter]);

  const defaultAgents: AgentStatusItem[] = [
    {
      key: "cfo_orchestrator",
      name: "CFO Orchestrator Agent",
      role: "Strategic Routing & Context Management",
      description: "Coordinates specialized subagents, bounds conversation context, and invokes deterministic financial tools.",
      status: "idle",
      last_execution: null,
      tasks_completed: 0,
      tasks_awaiting_approval: 0,
      error_count: 0,
      tool_list: ["calculate_cash_runway", "get_financial_summary", "identify_anomalies", "simulate_financial_scenario"],
    },
    {
      key: "cashflow_agent",
      name: "Cash Flow Agent",
      role: "Liquidity & Runway Monitor",
      description: "Monitors daily opening and closing cash, computes burn velocity, and signals runway shortfalls.",
      status: "idle",
      last_execution: null,
      tasks_completed: 0,
      tasks_awaiting_approval: 0,
      error_count: 0,
      tool_list: ["calculate_cash_runway", "get_financial_summary", "generate_cashflow_forecast"],
    },
    {
      key: "invoice_agent",
      name: "Invoice Agent",
      role: "Billing & Collections Automation",
      description: "Drafts client invoices with server-verified totals and prepares overdue payment reminders in the approval queue.",
      status: pendingApprovals.length > 0 ? "needs_approval" : "idle",
      last_execution: null,
      tasks_completed: 0,
      tasks_awaiting_approval: pendingApprovals.length,
      error_count: 0,
      tool_list: ["create_invoice_draft", "get_outstanding_invoices"],
    },
    {
      key: "audit_agent",
      name: "Audit Agent",
      role: "Anomaly & Variance Detection",
      description: "Scans organisation ledger for unusual amount deviations or unexpected vendor spikes without labelling fraud.",
      status: "idle",
      last_execution: null,
      tasks_completed: 0,
      tasks_awaiting_approval: 0,
      error_count: 0,
      tool_list: ["identify_anomalies", "get_transactions", "get_expense_breakdown"],
    },
    {
      key: "strategy_agent",
      name: "Financial Strategy Agent",
      role: "What-If Simulator & Growth Advisory",
      description: "Evaluates hiring impacts, expense surges, and capital planning scenarios using deterministic models.",
      status: "idle",
      last_execution: null,
      tasks_completed: 0,
      tasks_awaiting_approval: 0,
      error_count: 0,
      tool_list: ["simulate_financial_scenario", "calculate_cash_runway", "get_financial_summary"],
    },
  ];

  const displayAgents = agentStatuses.length > 0 ? agentStatuses : defaultAgents;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-gradient-to-tr from-[#4318FF] to-[#00F0FF] text-white shadow-[0_0_15px_rgba(67,24,255,0.4)]">
                <Cpu className="w-5 h-5 sm:w-6 sm:h-6" />
              </span>
              Autonomous Financial Agents
            </h1>
            <span className="text-xs uppercase font-extrabold px-3 py-1 rounded-full bg-[#4318FF]/15 text-[#4318FF] dark:text-[#818CF8] border border-[#4318FF]/30 tracking-wider shadow-sm">
              5 Agents Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
            Role-bounded multi-agent system with deterministic financial grounding, real-time activity timelines, and human-in-the-loop authorization gates.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="md"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 rounded-full border-white/10 frosted-glass-card hover:border-[#4318FF]/40 text-xs sm:text-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#4318FF]" : ""}`} />
            <span>Refresh State</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            disabled={isOrchestrating}
            onClick={handleTriggerOrchestration}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#4318FF] via-[#5B36FF] to-[#00F0FF] text-white font-semibold text-xs sm:text-sm shadow-[0_4px_20px_rgba(67,24,255,0.35)] hover:shadow-[0_4px_25px_rgba(0,240,255,0.4)] transition-all"
          >
            <Sparkles className={`w-4 h-4 ${isOrchestrating ? "animate-spin" : ""}`} />
            <span>{isOrchestrating ? "Orchestrating..." : "Run Multi-Agent Sweep"}</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border gap-2 sm:gap-4 overflow-x-auto pb-1 text-sm">
        <button
          onClick={() => setActiveTab("agents")}
          className={`flex items-center gap-2 pb-3 px-3 font-semibold border-b-2 transition-all shrink-0 ${
            activeTab === "agents"
              ? "border-[#4318FF] text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Agent Roster & Control</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 font-mono">
            {displayAgents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("approvals")}
          className={`flex items-center gap-2 pb-3 px-3 font-semibold border-b-2 transition-all shrink-0 ${
            activeTab === "approvals"
              ? "border-[#4318FF] text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-500" />
          <span>Human Approval Centre</span>
          {pendingApprovals.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 dark:text-amber-400 font-bold border border-amber-500/30 animate-pulse">
              {pendingApprovals.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("orchestration")}
          className={`flex items-center gap-2 pb-3 px-3 font-semibold border-b-2 transition-all shrink-0 ${
            activeTab === "orchestration"
              ? "border-[#4318FF] text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <GitBranch className="w-4 h-4 text-[#00F0FF]" />
          <span>Multi-Agent Orchestration</span>
          {orchestrationResult && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30">
              Live
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex items-center gap-2 pb-3 px-3 font-semibold border-b-2 transition-all shrink-0 ${
            activeTab === "timeline"
              ? "border-[#4318FF] text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="w-4 h-4 text-[#34D399]" />
          <span>Execution & Audit Timeline</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 font-mono">
            {executions.length}
          </span>
        </button>
      </div>

      {/* TAB 1: AGENTS ROSTER & CONTROLS */}
      {activeTab === "agents" && (
        <div className="space-y-6">
          {/* Pending Approval Alert Banner (if any) */}
          {pendingApprovals.length > 0 && (
            <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-white/5 to-transparent p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 frosted-glass-card shadow-lg">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    Action Requiring Human Sign-Off
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      {pendingApprovals.length} Pending
                    </span>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Consequential action prepared by Invoice Agent awaits explicit authorization before issuing.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("approvals")}
                className="rounded-full border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs shrink-0 self-start sm:self-auto"
              >
                Review Approval Queue <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          )}

          {/* 5 Agents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayAgents.map((agent) => {
              const isBusy = runningAgent === agent.key;
              return (
                <div
                  key={agent.key}
                  className="rounded-2xl border border-white/10 frosted-glass-card p-5 sm:p-6 flex flex-col justify-between space-y-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_25px_rgba(67,24,255,0.15)] group relative overflow-hidden"
                >
                  <div className="space-y-3">
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2.5 rounded-xl bg-[#4318FF]/15 border border-[#4318FF]/25 text-[#4318FF] dark:text-[#818CF8] group-hover:scale-105 transition-transform">
                        <Bot className="w-5 h-5" />
                      </div>
                      <StatusChip status={agent.status} />
                    </div>

                    {/* Agent Name & Role */}
                    <div>
                      <h3 className="text-base font-bold text-foreground group-hover:text-white transition-colors">
                        {agent.name}
                      </h3>
                      <span className="text-xs font-semibold text-[#4318FF] dark:text-[#818CF8] block mt-0.5">
                        {agent.role}
                      </span>
                    </div>

                    {/* Purpose Description */}
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {agent.description}
                    </p>

                    {/* Statistics Strip */}
                    <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-medium">
                          Completed
                        </span>
                        <span className="text-sm font-bold text-foreground font-mono">
                          {agent.tasks_completed}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-medium">
                          Pending
                        </span>
                        <span className={`text-sm font-bold font-mono ${agent.tasks_awaiting_approval > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
                          {agent.tasks_awaiting_approval}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-medium">
                          Errors
                        </span>
                        <span className={`text-sm font-bold font-mono ${agent.error_count > 0 ? "text-[#F07878]" : "text-muted-foreground"}`}>
                          {agent.error_count}
                        </span>
                      </div>
                    </div>

                    {/* Tool Allow-List */}
                    <div>
                      <span className="text-[11px] text-muted-foreground font-semibold block mb-1.5 flex items-center justify-between">
                        <span>Authorized Tools:</span>
                        <span className="text-[10px] font-mono text-[#00F0FF]">{agent.tool_list.length} permitted</span>
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {agent.tool_list.map((tool, idx) => (
                          <code
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-foreground/90 font-mono"
                          >
                            {tool}
                          </code>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions Strip */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {agent.key === "invoice_agent" ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => handleRunAgent(agent.key, { action: "check_receivables" })}
                            className="text-xs h-8 px-2.5 rounded-lg border-white/10"
                          >
                            <Play className={`w-3 h-3 mr-1 ${isBusy ? "animate-spin" : ""}`} />
                            {isBusy ? "Auditing..." : "Audit AR"}
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => setDraftModalOpen(true)}
                            className="text-xs h-8 px-2.5 rounded-lg bg-[#4318FF]/20 text-[#4318FF] dark:text-[#818CF8] border border-[#4318FF]/40 hover:bg-[#4318FF]/30"
                          >
                            <PlusCircle className="w-3 h-3 mr-1" />
                            Draft Invoice
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleRunAgent(agent.key)}
                          className="text-xs h-8 px-3 rounded-lg border-white/10 hover:border-[#4318FF]/40 hover:text-white"
                        >
                          <Play className={`w-3 h-3 mr-1.5 ${isBusy ? "animate-spin text-[#4318FF]" : ""}`} />
                          {isBusy ? "Running..." : "Run Agent"}
                        </Button>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedAgent(agent)}
                      className="p-1 h-auto text-xs text-[#00F0FF] hover:text-[#00F0FF] hover:bg-transparent"
                    >
                      Inspect <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: HUMAN APPROVAL CENTRE */}
      {activeTab === "approvals" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                Human-in-the-Loop Approval Queue
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Consequential external operations (e.g. invoice transmission, payment requests) require explicit controller authorization.
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/5 border border-white/10">
              {pendingApprovals.length} pending authorization
            </span>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="rounded-2xl border border-white/10 frosted-glass-card p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#34D399]/15 text-[#34D399] flex items-center justify-center mx-auto border border-[#34D399]/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">All Clear: Zero Actions Awaiting Approval</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                No autonomous financial agent has pending actions in the approval queue. Use the Invoice Agent to draft an invoice to test the authorization gate.
              </p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDraftModalOpen(true)}
                  className="rounded-full border-white/15 text-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                  Create Draft Invoice Requiring Approval
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((item) => {
                const output = item.output_data || {};
                const records = (output.relevant_records as Record<string, unknown>) || {};
                const actionTitle = output.proposed_action || output.summary || "Pending Agent Action";
                const impact = output.financial_impact || "Accounts Receivable modification";
                const reason = output.reason || "Autonomous billing generation requiring dual-approval";

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-white/5 to-transparent p-6 frosted-glass-card space-y-4 shadow-xl"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                            {item.agent_type.replace("_", " ")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Initiated {new Date(item.started_at).toLocaleString()}
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-foreground mt-1.5">
                          {actionTitle}
                        </h3>
                      </div>

                      <div className="px-3.5 py-1.5 rounded-xl bg-[#34D399]/15 border border-[#34D399]/30 text-[#34D399] font-mono font-bold text-sm shrink-0 self-start">
                        {impact}
                      </div>
                    </div>

                    {/* Relevant Records Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 px-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-sans font-semibold block">
                          Invoice ID
                        </span>
                        <span className="text-foreground font-bold">{records.invoice_number ? String(records.invoice_number) : "Draft ID"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-sans font-semibold block">
                          Client
                        </span>
                        <span className="text-foreground font-bold">{records.customer ? String(records.customer) : "Acme Corp"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-sans font-semibold block">
                          Terms / Due
                        </span>
                        <span className="text-foreground font-bold">{records.due_date ? String(records.due_date) : "Net 30"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-sans font-semibold block">
                          Total Amount
                        </span>
                        <span className="text-[#34D399] font-bold">${records.amount ? String(records.amount) : "0.00"}</span>
                      </div>
                    </div>

                    {/* Rationale & Safety Justification */}
                    <div className="text-xs text-muted-foreground bg-white/[0.02] p-3 rounded-lg border border-white/5 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#4318FF] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-foreground">Policy Justification: </strong>
                        {reason}
                      </div>
                    </div>

                    {/* Approval & Rejection Controls */}
                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRejectingExecId(item.id);
                          setRejectModalOpen(true);
                        }}
                        className="rounded-full border-[#F07878]/40 text-[#F07878] hover:bg-[#F07878]/10 text-xs px-4"
                      >
                        <XCircle className="w-4 h-4 mr-1.5" />
                        Reject Proposed Action
                      </Button>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApproval(item.id, "approve")}
                        className="rounded-full bg-gradient-to-r from-[#4318FF] to-[#34D399] text-white font-semibold text-xs px-5 shadow-[0_2px_15px_rgba(67,24,255,0.4)] hover:shadow-[0_2px_20px_rgba(52,211,153,0.4)]"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        Authorize & Issue
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MULTI-AGENT ORCHESTRATION */}
      {activeTab === "orchestration" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 frosted-glass-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-[#00F0FF]" />
                  Orchestrated Multi-Agent Pipeline
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Demonstrates verified handoffs between CFO Orchestrator, Cash Flow Agent, Invoice Agent, and Audit Sentinel.
                </p>
              </div>

              <Button
                variant="primary"
                size="md"
                disabled={isOrchestrating}
                onClick={handleTriggerOrchestration}
                className="rounded-full bg-gradient-to-r from-[#4318FF] to-[#00F0FF] text-white font-bold text-xs sm:text-sm px-5"
              >
                <Sparkles className={`w-4 h-4 mr-1.5 ${isOrchestrating ? "animate-spin" : ""}`} />
                {isOrchestrating ? "Running Multi-Agent Pipeline..." : "Execute Pipeline Sweep"}
              </Button>
            </div>

            {/* Visual Handoff Chain */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 py-4">
              <div className="p-4 rounded-xl bg-white/[0.04] border border-[#4318FF]/30 relative space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#4318FF] dark:text-[#818CF8] uppercase tracking-wider">
                    Stage 1
                  </span>
                  <Bot className="w-4 h-4 text-[#4318FF]" />
                </div>
                <h4 className="text-sm font-bold text-foreground">CFO Orchestrator</h4>
                <p className="text-[11px] text-muted-foreground">
                  Triages organizational context and triggers specialized financial delegators.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.04] border border-[#34D399]/30 relative space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#34D399] uppercase tracking-wider">
                    Stage 2: Handoff
                  </span>
                  <TrendingUp className="w-4 h-4 text-[#34D399]" />
                </div>
                <h4 className="text-sm font-bold text-foreground">Cash Flow Agent</h4>
                <p className="text-[11px] text-muted-foreground">
                  Computes verified liquid reserves, monthly burn rate, and runway months.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.04] border border-amber-500/30 relative space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    Stage 3: Handoff
                  </span>
                  <FileText className="w-4 h-4 text-amber-400" />
                </div>
                <h4 className="text-sm font-bold text-foreground">Invoice Agent</h4>
                <p className="text-[11px] text-muted-foreground">
                  Scans accounts receivable and prepares collections reminders and draft schedules.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.04] border border-[#00F0FF]/30 relative space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#00F0FF] uppercase tracking-wider">
                    Stage 4: Handoff
                  </span>
                  <ShieldCheck className="w-4 h-4 text-[#00F0FF]" />
                </div>
                <h4 className="text-sm font-bold text-foreground">Audit Sentinel</h4>
                <p className="text-[11px] text-muted-foreground">
                  Scans transaction disbursements for statistical variance outliers.
                </p>
              </div>
            </div>

            {/* Orchestration Findings (if available) */}
            {orchestrationResult ? (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00F0FF]" /> Live Orchestrated Briefing
                </h3>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs sm:text-sm text-foreground whitespace-pre-line leading-relaxed font-sans">
                  {orchestrationResult.summary}
                </div>

                {/* Handoff Details Table */}
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Verified Agent Handoffs
                  </h4>
                  <div className="space-y-2">
                    {orchestrationResult.handoffs?.map((h, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#4318FF] dark:text-[#818CF8]">{h.from}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-bold text-[#00F0FF]">{h.to}</span>
                          <span className="text-muted-foreground">({h.purpose})</span>
                        </div>
                        <span className="font-mono text-xs text-foreground/90 font-semibold">{h.result}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-muted-foreground">
                Click &quot;Execute Pipeline Sweep&quot; to run the multi-agent pipeline and observe live inter-agent coordination.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ACTIVITY & AUDIT TIMELINE */}
      {activeTab === "timeline" && (
        <div className="space-y-5">
          {/* Timeline Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl frosted-glass-card border border-white/10">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-muted-foreground font-semibold">Filter Agent:</span>
              {["all", "cfo_orchestrator", "cashflow_agent", "invoice_agent", "audit_agent", "strategy_agent"].map(
                (k) => (
                  <button
                    key={k}
                    onClick={() => setTimelineAgentFilter(k)}
                    className={`px-2.5 py-1 rounded-md font-mono transition-colors ${
                      timelineAgentFilter === k
                        ? "bg-[#4318FF] text-white font-bold"
                        : "bg-white/5 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {k === "all" ? "All Agents" : k.replace("_", " ")}
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground font-semibold">Status:</span>
              {["all", "completed", "needs_approval", "failed"].map((st) => (
                <button
                  key={st}
                  onClick={() => setTimelineStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md font-mono transition-colors ${
                    timelineStatusFilter === st
                      ? "bg-white/20 text-white font-bold"
                      : "bg-white/5 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Feed */}
          {filteredExecutions.length === 0 ? (
            <div className="rounded-2xl border border-white/10 frosted-glass-card p-12 text-center text-xs text-muted-foreground">
              No execution records match the selected filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExecutions.map((item) => {
                const output = item.output_data || {};
                const events = (output.timeline_events as TimelineEvent[]) || [];
                const summary = output.summary || "Agent execution task finished.";
                const isSelected = selectedExecution?.id === item.id;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 frosted-glass-card p-5 space-y-3 transition-colors hover:border-white/20"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <StatusChip status={item.status} />
                        <span className="text-sm font-bold text-foreground">
                          {item.agent_type.replace("_", " ")}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          ID: {item.id.slice(0, 8)}...
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          {new Date(item.started_at).toLocaleTimeString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedExecution(isSelected ? null : item)}
                          className="h-7 text-xs text-[#00F0FF] hover:text-[#00F0FF] p-1"
                        >
                          {isSelected ? "Hide Events" : "View Events"}
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {summary}
                    </p>

                    {/* Tools used badge strip */}
                    {item.tools_used && item.tools_used.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] text-muted-foreground font-semibold">Tools called:</span>
                        {item.tools_used.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Structured Timeline Events (when expanded) */}
                    {isSelected && (
                      <div className="pt-3 border-t border-white/10 space-y-2 bg-white/[0.01] p-3 rounded-xl mt-2">
                        <span className="text-xs font-bold text-foreground block mb-2">
                          Lifecycle Audit Trail:
                        </span>
                        {events.length > 0 ? (
                          <div className="space-y-2">
                            {events.map((ev, i) => (
                              <div key={i} className="flex items-start gap-2.5 text-xs">
                                <span className="w-2 h-2 rounded-full bg-[#4318FF] shrink-0 mt-1.5" />
                                <div className="space-y-0.5 flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-foreground">{ev.label}</span>
                                    <span className="text-[10px] font-mono text-muted-foreground">
                                      {new Date(ev.timestamp).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">{ev.detail}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground italic">
                            No granular timeline events recorded for this task.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: REJECTION REASON MODAL */}
      {rejectModalOpen && (
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title="Reject Proposed Agent Action"
          description="Provide a justification for the audit trail before cancelling this draft action."
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">
                Rejection Reason / Controller Notes:
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Rate terms require contract amendment; client requested delay until Q1."
                className="w-full p-2.5 rounded-xl frosted-glass-input text-foreground text-xs h-24 resize-none border border-white/15 focus:outline-none focus:border-[#4318FF]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (rejectingExecId) {
                    handleApproval(rejectingExecId, "reject", rejectReason || "Rejected by controller");
                  }
                }}
                className="bg-[#F07878] hover:bg-[#F07878]/80 text-white font-bold"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: DRAFT INVOICE CREATION */}
      {draftModalOpen && (
        <Modal
          isOpen={draftModalOpen}
          onClose={() => setDraftModalOpen(false)}
          title="Invoice Agent: Draft New Invoice"
          description="Prepare an accounts receivable draft. Requires controller authorization before issuing."
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Customer / Client Name:</label>
              <input
                type="text"
                value={draftCustomer}
                onChange={(e) => setDraftCustomer(e.target.value)}
                className="w-full p-2.5 rounded-xl frosted-glass-input text-foreground text-xs border border-white/15"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Amount ($ USD):</label>
              <input
                type="number"
                value={draftAmount}
                onChange={(e) => setDraftAmount(e.target.value)}
                className="w-full p-2.5 rounded-xl frosted-glass-input text-foreground text-xs border border-white/15"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Scope Description:</label>
              <input
                type="text"
                value={draftDesc}
                onChange={(e) => setDraftDesc(e.target.value)}
                className="w-full p-2.5 rounded-xl frosted-glass-input text-foreground text-xs border border-white/15"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Safety Assurance: This will create a Draft in the Human Approval Queue. No client transmission or external ledger modification will occur without explicit authorization.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button variant="outline" size="sm" onClick={() => setDraftModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  setDraftModalOpen(false);
                  await handleRunAgent("invoice_agent", {
                    action: "create_draft",
                    customer_name: draftCustomer,
                    amount: parseFloat(draftAmount) || 8500.0,
                    description: draftDesc,
                  });
                  setActiveTab("approvals");
                }}
                className="bg-[#4318FF] text-white font-bold"
              >
                Draft & Queue for Approval
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: AGENT INSPECTION MODAL */}
      {selectedAgent && (
        <Modal
          isOpen={!!selectedAgent}
          onClose={() => setSelectedAgent(null)}
          title={selectedAgent.name}
          description={selectedAgent.role}
        >
          <div className="space-y-4 text-xs">
            <p className="text-sm text-foreground leading-relaxed">{selectedAgent.description}</p>

            <div className="grid grid-cols-2 gap-3 py-2 px-3 rounded-xl bg-white/[0.03] border border-white/10 font-mono">
              <div>
                <span className="text-[10px] text-muted-foreground block font-sans">Current Status</span>
                <span className="text-foreground font-bold uppercase">{selectedAgent.status}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-sans">Last Executed</span>
                <span className="text-foreground font-bold">
                  {selectedAgent.last_execution
                    ? new Date(selectedAgent.last_execution).toLocaleDateString()
                    : "On Demand"}
                </span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-muted-foreground block mb-1.5">
                Authorized Security Boundary & Tools:
              </span>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                {selectedAgent.tool_list.map((t, idx) => (
                  <li key={idx}>
                    <code className="text-foreground font-mono bg-white/5 px-1.5 py-0.5 rounded">{t}</code>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedAgent(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
