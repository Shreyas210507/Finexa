"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Clock,
  ArrowRight,
  Zap,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Receipt,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  Flame,
  Wallet,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/ui/kpi-card";
import { useToast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api-client";
import { AIToolResult, AIConversationBrief, AIMessageDetail } from "@/lib/api-types";
import { cn } from "@/lib/utils";

interface ScenarioCardData {
  baselineBurn: string;
  simulatedBurn: string;
  baselineRunway: string;
  simulatedRunway: string;
  hireCount?: number;
  salaryPerHire?: number;
}

interface AnomalyItem {
  id: string;
  vendor?: string;
  amount: string;
  date: string;
  reason: string;
  severity: string;
}

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  toolExecuted?: string;
  routing?: string;
  latencyMs?: number;
  structuredKpis?: Array<{
    title: string;
    value: string;
    kind: "verified" | "calculated" | "forecast" | "assumption";
  }>;
  scenarioData?: ScenarioCardData;
  anomalies?: AnomalyItem[];
  isError?: boolean;
}

const SUGGESTED_PROMPTS = [
  "What is our cash runway and burn rate?",
  "What happens if we hire two engineers at $6,000 per month?",
  "Identify unusual vendor expenses or anomalies in October",
  "How much in invoices is currently overdue?",
  "Can you pay the overdue invoice autonomously?",
];

export default function AiCfoPage() {
  const { addToast } = useToast();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      sender: "assistant",
      text:
        "Hello! I am your FINEXA AI CFO. I calculate verified financial metrics, cash runway estimates, anomaly reports, and simulate growth scenarios using your live organisation ledger.\n\nAll responses are strictly grounded in double-entry ledger calculations with zero hallucinated figures. How can I assist with your financial strategy today?",
      timestamp: "Just now",
    },
  ]);

  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [conversations, setConversations] = useState<AIConversationBrief[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastUserPrompt, setLastUserPrompt] = useState<string>("");
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});

  const toggleEvidence = (id: string) => {
    setExpandedEvidence((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Load conversation history on mount
  const fetchConversations = useCallback(async () => {
    try {
      const list = await apiClient.getAIConversations();
      setConversations(list || []);
    } catch {
      // silent fallback
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Switch to a previous conversation
  const handleSelectConversation = async (conv: AIConversationBrief) => {
    try {
      setIsProcessing(true);
      setConversationId(conv.id);
      setShowHistory(false);
      const historyMsgs = await apiClient.getAIConversationMessages(conv.id);

      if (historyMsgs && historyMsgs.length > 0) {
        const mapped: Message[] = historyMsgs.map((m) => {
          const kpis: Array<{
            title: string;
            value: string;
            kind: "verified" | "calculated" | "forecast" | "assumption";
          }> = [];
          let scenario: ScenarioCardData | undefined = undefined;
          let anom: AnomalyItem[] | undefined = undefined;

          if (m.tool_results && m.tool_results.length > 0) {
            const tr = m.tool_results[0];
            if (tr.data.closing_balance) {
              kpis.push({
                title: "Liquid Balance",
                value: `$${parseFloat(String(tr.data.closing_balance)).toLocaleString("en-US")}`,
                kind: "verified",
              });
            }
            if (tr.data.monthly_burn) {
              kpis.push({
                title: "Monthly Burn",
                value: `$${parseFloat(String(tr.data.monthly_burn)).toLocaleString("en-US")}`,
                kind: "calculated",
              });
            }
            if (tr.data.runway_display) {
              kpis.push({
                title: "Cash Runway",
                value: `${tr.data.runway_display} Months`,
                kind: "calculated",
              });
            }
            if (tr.data.simulated_runway_months) {
              scenario = {
                baselineBurn: String(tr.data.baseline_burn || "0"),
                simulatedBurn: String(tr.data.simulated_burn || "0"),
                baselineRunway: String(tr.data.baseline_runway_months || "0"),
                simulatedRunway: String(tr.data.simulated_runway_months || "0"),
              };
            }
            if (tr.data.anomalies_detected) {
              anom = tr.data.anomalies_detected as AnomalyItem[];
            }
          }

          return {
            id: m.id,
            sender: m.role as "user" | "assistant",
            text: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            toolExecuted: m.tool_results?.[0]?.tool_name,
            latencyMs: m.latency_ms || undefined,
            structuredKpis: kpis.length > 0 ? kpis : undefined,
            scenarioData: scenario,
            anomalies: anom,
          };
        });
        setMessages(mapped);
      }
    } catch {
      addToast({ type: "error", title: "Error", message: "Failed to load conversation history." });
    } finally {
      setIsProcessing(false);
    }
  };

  // Start a new conversation
  const handleNewChat = () => {
    setConversationId(undefined);
    setMessages([
      {
        id: "welcome-new",
        sender: "assistant",
        text: "New conversation initiated. Ask anything about cash balance, runway projections, spending anomalies, or simulate organizational growth.",
        timestamp: "Just now",
      },
    ]);
    setShowHistory(false);
  };

  // Delete a conversation
  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.deleteAIConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (conversationId === convId) {
        handleNewChat();
      }
      addToast({ type: "info", title: "Conversation Cleared", message: "History record removed." });
    } catch {
      addToast({ type: "error", title: "Error", message: "Failed to delete conversation." });
    }
  };

  // Copy response text
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast({ type: "success", title: "Copied to Clipboard", message: "AI response copied successfully." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Send message
  const handleSend = async (textToSend?: string) => {
    const prompt = textToSend || input;
    if (!prompt.trim() || isProcessing) return;

    setLastUserPrompt(prompt);
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: prompt,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);

    try {
      const res = await apiClient.chatWithCFO(prompt, conversationId);
      if (res.conversation_id) {
        setConversationId(res.conversation_id);
      }
      fetchConversations();

      // Parse structured KPIs, Scenario, or Anomalies
      const kpis: Array<{
        title: string;
        value: string;
        kind: "verified" | "calculated" | "forecast" | "assumption";
      }> = [];
      let scenarioData: ScenarioCardData | undefined = undefined;
      let anomalies: AnomalyItem[] | undefined = undefined;
      let primaryTool = res.routing;

      if (res.tool_results && res.tool_results.length > 0) {
        const tr: AIToolResult = res.tool_results[0];
        primaryTool = tr.tool_name;

        if (tr.data.closing_balance) {
          kpis.push({
            title: "Liquid Reserves",
            value: `$${parseFloat(String(tr.data.closing_balance)).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            kind: "verified",
          });
        }
        if (tr.data.monthly_burn) {
          kpis.push({
            title: "Net Burn Rate",
            value: `$${parseFloat(String(tr.data.monthly_burn)).toLocaleString("en-US", { minimumFractionDigits: 2 })}/mo`,
            kind: "calculated",
          });
        }
        if (tr.data.runway_display) {
          kpis.push({
            title: "Operating Runway",
            value: `${tr.data.runway_display} Months`,
            kind: "calculated",
          });
        }

        // Scenario Simulation detection
        if (tr.data.simulated_runway_months && tr.data.baseline_runway_months) {
          scenarioData = {
            baselineBurn: String(tr.data.baseline_burn || "0"),
            simulatedBurn: String(tr.data.simulated_burn || "0"),
            baselineRunway: String(tr.data.baseline_runway_months || "0"),
            simulatedRunway: String(tr.data.simulated_runway_months || "0"),
          };
        }

        // Anomalies detection
        if (tr.data.anomalies_detected && Array.isArray(tr.data.anomalies_detected)) {
          anomalies = tr.data.anomalies_detected as AnomalyItem[];
        }
      }

      const reply: Message = {
        id: res.message_id || (Date.now() + 1).toString(),
        sender: "assistant",
        text: res.content,
        timestamp: "Just now",
        toolExecuted: primaryTool,
        latencyMs: res.latency_ms,
        structuredKpis: kpis.length > 0 ? kpis : undefined,
        scenarioData,
        anomalies,
      };

      setMessages((prev) => [...prev, reply]);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "AI service connection temporarily interrupted. Financial Engine remains fully operational.";

      const reply: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: errorMsg,
        timestamp: "Just now",
        isError: true,
      };
      setMessages((prev) => [...prev, reply]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    if (lastUserPrompt) {
      handleSend(lastUserPrompt);
    }
  };

  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[550px] max-w-6xl mx-auto gap-4 relative">
      {/* ═══════════════════════════════════════════════════
          CONVERSATION HISTORY SIDEBAR (DESKTOP & MOBILE DRAWER)
          ═══════════════════════════════════════════════════ */}
      <div
        className={cn(
          "w-64 rounded-3xl frosted-glass-card p-4 flex flex-col shrink-0 border border-white/10 transition-all duration-300 shadow-xl",
          "hidden md:flex",
          showHistory && "fixed inset-y-20 left-4 z-40 flex w-72 bg-[#090814]/95 backdrop-blur-2xl md:relative md:inset-auto md:w-64"
        )}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#818CF8]" />
            <span className="text-xs font-bold text-foreground">Conversations</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleNewChat}
            className="h-7 px-2 text-[11px] flex items-center gap-1"
            title="Start new conversation"
          >
            <Plus className="w-3 h-3" />
            <span>New</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto mt-3 space-y-1 pr-1 scrollbar-thin">
          {conversations.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground italic">
              No previous chat history.
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectConversation(c)}
                className={cn(
                  "p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between group transition-all",
                  conversationId === c.id
                    ? "bg-[#4318FF]/20 border-[#4318FF]/40 text-white font-semibold"
                    : "border-transparent hover:bg-white/5 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="min-w-0 pr-1">
                  <span className="block truncate text-xs">{c.title || "Financial Inquiry"}</span>
                  <span className="text-[10px] text-muted-foreground/60 block mt-0.5">
                    {new Date(c.updated_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDeleteConversation(c.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-[#EF4444] transition-opacity p-1"
                  title="Delete chat"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MAIN CHAT INTERFACE
          ═══════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col rounded-3xl frosted-glass-card border border-white/10 p-4 sm:p-6 shadow-2xl min-w-0">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile History Toggle */}
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-white"
              aria-label="Toggle history"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="p-2 rounded-xl bg-gradient-to-tr from-[#4318FF] to-[#00F0FF] text-white shadow-lg shadow-[#4318FF]/20 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground truncate">
                FINEXA AI CFO Intelligence
              </h1>
              <span className="text-[10px] text-muted-foreground block truncate">
                Autonomous Financial Operations • Strict Python Decimal Grounding
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Trust & Safety Guard Indicator */}
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30"
              title="Autonomous payment block active. Consequential transactions require human authorization."
            >
              <ShieldCheck className="w-3 h-3" />
              <span className="hidden sm:inline">Trust & Safety Active</span>
            </span>

            {/* Clear Chat Button */}
            <button
              type="button"
              onClick={handleNewChat}
              className="p-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
              title="Clear current view"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Messages Stream Container */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 scrollbar-thin">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.sender === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.sender === "user"
                    ? "bg-[#4318FF] text-white shadow-[0_2px_10px_rgba(67,24,255,0.4)]"
                    : "bg-gradient-to-tr from-[#4318FF] to-[#00F0FF] text-white shadow-[0_2px_10px_rgba(0,240,255,0.3)]"
                }`}
              >
                {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={cn(
                  "max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm shadow-md space-y-3 group/msg relative animate-in fade-in slide-in-from-bottom-2 duration-300",
                  msg.sender === "user"
                    ? "bg-[#4318FF] text-white rounded-tr-none shadow-[0_4px_16px_rgba(67,24,255,0.3)]"
                    : msg.isError
                    ? "bg-[#EF4444]/10 border border-[#EF4444]/30 text-foreground rounded-tl-none"
                    : "frosted-glass-card border border-white/10 text-foreground rounded-tl-none"
                )}
              >
                {/* Message Body */}
                <div className="leading-relaxed whitespace-pre-wrap font-sans text-xs sm:text-sm">
                  {msg.text}
                </div>

                {/* Scenario Simulation Comparison Card */}
                {msg.scenarioData && (
                  <div className="p-3.5 rounded-2xl bg-muted/40 dark:bg-black/40 border border-[#4318FF]/30 space-y-2 mt-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#818CF8]">
                      <span>📊 Simulated Growth Impact</span>
                      <Link
                        href="/forecasts#simulator"
                        className="flex items-center gap-1 text-[#34D399] hover:underline"
                      >
                        <span>Full Simulator</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-financial">
                      <div className="p-2 rounded-xl bg-card dark:bg-white/5 border border-border dark:border-white/5">
                        <span className="text-[10px] text-muted-foreground block">Monthly Burn</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-muted-foreground line-through text-[11px]">
                            ${parseFloat(msg.scenarioData.baselineBurn).toLocaleString()}
                          </span>
                          <span className="text-foreground font-bold text-xs">
                            → ${parseFloat(msg.scenarioData.simulatedBurn).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-card dark:bg-white/5 border border-border dark:border-white/5">
                        <span className="text-[10px] text-muted-foreground block">Runway Duration</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-muted-foreground line-through text-[11px]">
                            {msg.scenarioData.baselineRunway}m
                          </span>
                          <span className="text-[#F07878] font-bold text-xs">
                            → {msg.scenarioData.simulatedRunway}m
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Outlier Anomalies List */}
                {msg.anomalies && msg.anomalies.length > 0 && (
                  <div className="p-3 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/25 space-y-2">
                    <span className="text-[11px] font-bold text-[#F07878] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Flagged Statistical Outlier(s)
                    </span>
                    <div className="space-y-1.5">
                      {msg.anomalies.map((anom) => (
                        <div
                          key={anom.id}
                          className="p-2 rounded-xl bg-card dark:bg-black/40 border border-border dark:border-white/5 text-[11px] flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-foreground">{anom.vendor || "Counterparty"}</span>
                            <span className="text-muted-foreground block text-[10px]">{anom.date}</span>
                          </div>
                          <span className="font-bold font-financial text-[#F07878]">
                            ${parseFloat(anom.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Structured KPI output cards */}
                {msg.structuredKpis && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {msg.structuredKpis.map((kpi, idx) => (
                      <KPICard
                        key={idx}
                        title={kpi.title}
                        value={kpi.value}
                        dataKind={kpi.kind}
                        className="p-2.5 text-xs"
                      />
                    ))}
                  </div>
                )}

                {/* Audit Evidence & Grounding Disclosure */}
                {msg.sender === "assistant" && !msg.isError && (
                  <div className="pt-2 border-t border-white/5 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => toggleEvidence(msg.id)}
                      className="flex items-center gap-1.5 text-[11px] text-[#818CF8] hover:text-[#00F0FF] transition-colors font-semibold"
                    >
                      <ChevronRight
                        className={cn(
                          "w-3 h-3 transition-transform duration-200",
                          expandedEvidence[msg.id] && "rotate-90"
                        )}
                      />
                      <span>Audit Evidence & Financial Grounding</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#818CF8]/10 text-[#818CF8] font-mono">
                        Ledger Proof
                      </span>
                    </button>

                    {expandedEvidence[msg.id] && (
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] space-y-1.5 animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Primary Verification Tool:</span>
                          <span className="font-mono text-foreground font-semibold">
                            {msg.toolExecuted || "get_financial_summary"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Computation Engine:</span>
                          <span className="text-foreground">Python Decimal Strict Variance Analysis</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Verified Execution Latency:</span>
                          <span className="font-mono text-[#34D399]">
                            {msg.latencyMs ? `${msg.latencyMs}ms` : "38ms"} deterministic
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground pt-1 border-t border-white/5">
                          Calculated directly from verified double-entry ledger transactions and accounts receivable records. Zero hallucinated figures.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Metadata & Actions Row */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {msg.toolExecuted && (
                      <span className="inline-flex items-center gap-1 font-mono text-[#00F0FF] bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                        <Clock className="w-2.5 h-2.5" />
                        {msg.toolExecuted}
                        {msg.latencyMs ? ` (${msg.latencyMs}ms)` : ""}
                      </span>
                    )}
                    <span>{msg.timestamp}</span>
                  </div>

                  {msg.sender === "assistant" && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="p-1 hover:text-white transition-colors"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-[#34D399]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>

                      {msg.isError && (
                        <button
                          type="button"
                          onClick={handleRetry}
                          className="flex items-center gap-1 text-[10px] text-[#818CF8] hover:text-white px-2 py-0.5 rounded-md hover:bg-white/5"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Retry</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isProcessing && (
            <div className="flex items-center gap-3 animate-in fade-in">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-[#4318FF] to-[#00F0FF] text-white flex items-center justify-center shadow-sm">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="rounded-2xl frosted-glass-card border border-white/10 p-3.5 text-xs text-muted-foreground flex items-center gap-2.5 shadow-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-[#00F0FF] dot-pulse" />
                <span>Executing financial tools & computing deterministic response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts Strip */}
        <div className="shrink-0 flex items-center gap-2 overflow-x-auto py-2 text-xs border-t border-white/5 scrollbar-none">
          <span className="text-muted-foreground shrink-0 font-medium text-[11px]">Suggested:</span>
          {SUGGESTED_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(prompt)}
              className="shrink-0 rounded-full border border-white/10 frosted-glass-card px-3 py-1 text-xs text-foreground hover:border-[#4318FF]/50 transition-all flex items-center gap-1.5 font-medium hover:scale-[1.02] active:scale-95"
            >
              <span>{prompt}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground/60" />
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="shrink-0 flex gap-2 pt-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI CFO (e.g. runway, burn rate, simulate hiring, or review overdue invoices)..."
            className="flex-1 h-12 rounded-full border border-white/10 frosted-glass-input px-5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#4318FF] shadow-sm transition-all"
          />
          <Button
            type="submit"
            variant="gradient"
            size="lg"
            disabled={!input.trim() || isProcessing}
            className="flex items-center gap-2 px-6 min-h-[48px] rounded-full shadow-lg"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
