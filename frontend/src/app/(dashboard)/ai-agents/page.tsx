"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bot, ShieldCheck, Play, ArrowRight, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/chips";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api-client";
import { AIAgentExecution } from "@/lib/api-types";

interface AgentDef {
  key: string;
  name: string;
  role: string;
  description: string;
  status: "idle" | "running" | "completed" | "needs_approval";
  lastRun: string;
  toolList: string[];
}

export default function AiAgentsPage() {
  const { addToast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<AgentDef | null>(null);
  const [executions, setExecutions] = useState<AIAgentExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);

  const fetchExecutions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.getAIAgentExecutions();
      setExecutions(res);
    } catch {
      setExecutions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  const pendingApprovals = executions.filter((e) => e.status === "needs_approval");

  const handleApproval = async (execId: string, action: "approve" | "reject") => {
    try {
      await apiClient.handleApprovalAction(execId, action);
      addToast({
        type: action === "approve" ? "success" : "info",
        title: action === "approve" ? "Action Approved" : "Action Rejected",
        message: `Agent execution ${action}d successfully.`,
      });
      fetchExecutions();
    } catch (e: unknown) {
      const err = e as Error;
      addToast({ type: "error", title: "Failed", message: err.message || "Failed to update approval." });
    }
  };

  const handleRunAgent = async (agentKey: string) => {
    try {
      setRunningAgent(agentKey);
      await apiClient.runAgentManually(agentKey);
      addToast({
        type: "success",
        title: "Agent Dispatched",
        message: `${agentKey} executed and recorded in ledger.`,
      });
      fetchExecutions();
    } catch (e: unknown) {
      const err = e as Error;
      addToast({ type: "error", title: "Execution Failed", message: err.message });
    } finally {
      setRunningAgent(null);
    }
  };

  const agents: AgentDef[] = [
    {
      key: "cfo_orchestrator",
      name: "CFO Orchestrator Agent",
      role: "Strategic Routing & Context Management",
      description: "Coordinates specialized subagents, bounds conversation context, and invokes deterministic financial tools.",
      status: "completed",
      lastRun: "Active",
      toolList: ["calculate_cash_runway", "get_financial_summary", "identify_anomalies"],
    },
    {
      key: "cashflow_agent",
      name: "Cash Flow Agent",
      role: "Liquidity & Runway Monitor",
      description: "Monitors daily opening and closing cash, computes burn velocity, and signals runway shortfalls.",
      status: "idle",
      lastRun: "On demand",
      toolList: ["calculate_cash_runway", "get_financial_summary", "generate_cashflow_forecast"],
    },
    {
      key: "invoice_agent",
      name: "Invoice Agent",
      role: "Billing & Collections Automation",
      description: "Drafts client invoices with server-verified totals and prepares overdue payment reminders in the approval queue.",
      status: pendingApprovals.length > 0 ? "needs_approval" : "idle",
      lastRun: "On demand",
      toolList: ["create_invoice_draft", "get_outstanding_invoices"],
    },
    {
      key: "audit_agent",
      name: "Audit Agent",
      role: "Anomaly & Variance Detection",
      description: "Scans organisation ledger for unusual amount deviations or unexpected vendor spikes without labelling fraud.",
      status: "idle",
      lastRun: "On demand",
      toolList: ["identify_anomalies", "get_transactions", "get_expense_breakdown"],
    },
    {
      key: "strategy_agent",
      name: "Financial Strategy Agent",
      role: "What-If Simulator & Growth Advisory",
      description: "Evaluates hiring impacts, expense surges, and capital planning scenarios using deterministic models.",
      status: "idle",
      lastRun: "On demand",
      toolList: ["simulate_financial_scenario", "calculate_cash_runway"],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Autonomous AI Agents
            </h1>
            <span className="text-xs uppercase font-bold px-2.5 py-0.5 rounded-full bg-[#8B7CFF]/15 text-[#8B7CFF] border border-[#8B7CFF]/30">
              5 Agents Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Role-bounded agents with explicit tool allow-lists and human-in-the-loop approval queues
          </p>
        </div>

        <Button
          variant="outline"
          size="md"
          onClick={fetchExecutions}
          disabled={loading}
          className="flex items-center gap-2 rounded-full"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </Button>
      </div>

      {/* Approval Queue Section */}
      {pendingApprovals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#8B7CFF] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Pending Human Approvals ({pendingApprovals.length})
          </h3>
          {pendingApprovals.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[#8B7CFF]/40 bg-gradient-to-r from-[#8B7CFF]/10 via-card to-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
            >
              <div>
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                  {item.agent_type.replace("_", " ")}
                </span>
                <h4 className="text-sm font-semibold text-foreground mt-0.5">
                  {(item.output_data?.summary as string) || "Action awaiting authorization"}
                </h4>
                <span className="text-xs text-muted-foreground mt-1 block">
                  Initiated: {new Date(item.started_at).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleApproval(item.id, "reject")}
                  className="text-[#F07878] border-[#F07878]/30 hover:bg-[#F07878]/10 rounded-full"
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Reject
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleApproval(item.id, "approve")}
                  className="rounded-full"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Authorize & Send
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agents Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between space-y-4 hover:border-border/80 transition-all shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="p-2.5 rounded-full bg-muted/60 text-[#8B7CFF]">
                  <Bot className="w-5 h-5" />
                </div>
                <StatusChip status={agent.status} />
              </div>

              <h3 className="text-base font-semibold text-foreground mt-3">{agent.name}</h3>
              <span className="text-xs font-semibold text-[#8B7CFF] block mt-0.5">
                {agent.role}
              </span>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {agent.description}
              </p>
            </div>

            <div className="pt-3 border-t border-border/60">
              <span className="text-[11px] text-muted-foreground block mb-2 font-medium">
                Tool Allow-List:
              </span>
              <div className="flex flex-wrap gap-1 mb-3">
                {agent.toolList.map((tool, idx) => (
                  <code
                    key={idx}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-panel border border-border text-foreground"
                  >
                    {tool}
                  </code>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                {agent.key !== "cfo_orchestrator" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={runningAgent === agent.key}
                    onClick={() => handleRunAgent(agent.key)}
                    className="text-xs h-7 px-2"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    {runningAgent === agent.key ? "Running..." : "Run Agent"}
                  </Button>
                ) : (
                  <span className="text-xs text-[#22C55E] font-medium">Orchestrating</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedAgent(agent)}
                  className="p-1 h-auto text-xs text-[#20D9F2] hover:text-[#20D9F2]"
                >
                  Details <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Agent Details Modal */}
      {selectedAgent && (
        <Modal
          isOpen={!!selectedAgent}
          onClose={() => setSelectedAgent(null)}
          title={selectedAgent.name}
          description={selectedAgent.role}
        >
          <div className="space-y-4 text-xs">
            <p className="text-sm text-foreground">{selectedAgent.description}</p>
            <div>
              <span className="font-semibold text-muted-foreground block mb-1">
                Security Sandbox & Tools:
              </span>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                {selectedAgent.toolList.map((t, idx) => (
                  <li key={idx}><code className="text-foreground">{t}</code></li>
                ))}
              </ul>
            </div>
            <div className="pt-2 border-t flex justify-end">
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
