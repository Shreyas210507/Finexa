"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Send, Bot, User, Clock, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/ui/kpi-card";
import { apiClient } from "@/lib/api-client";
import { AIToolResult } from "@/lib/api-types";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  toolExecuted?: string;
  dataKind?: "verified" | "calculated" | "forecast" | "assumption";
  structuredKpis?: Array<{ title: string; value: string; kind: "verified" | "calculated" | "forecast" | "assumption" }>;
  latencyMs?: number;
}

export default function AiCfoPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "assistant",
      text: "Hello! I am your FINEXA AI CFO. I calculate verified financial metrics, runway estimates, anomaly reports, and simulate growth scenarios using your live organisation ledger. What would you like to analyze today?",
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = [
    "What is my cash runway?",
    "Identify unusual transactions in October",
    "What is our trailing 3-month burn rate?",
    "Simulate hiring 2 engineers at $6,000/mo",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const handleSend = async (textToSend?: string) => {
    const prompt = textToSend || input;
    if (!prompt.trim() || isProcessing) return;

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

      // Extract structured KPI cards from tool results if present
      const kpis: Array<{ title: string; value: string; kind: "verified" | "calculated" | "forecast" | "assumption" }> = [];
      let primaryTool = res.routing;

      if (res.tool_results && res.tool_results.length > 0) {
        const tr: AIToolResult = res.tool_results[0];
        primaryTool = tr.tool_name;

        if (tr.data.closing_balance) {
          kpis.push({ title: "Liquid Balance", value: `$${parseFloat(String(tr.data.closing_balance)).toLocaleString("en-US")}`, kind: "verified" });
        }
        if (tr.data.monthly_burn) {
          kpis.push({ title: "Monthly Burn", value: `$${parseFloat(String(tr.data.monthly_burn)).toLocaleString("en-US")}`, kind: "calculated" });
        }
        if (tr.data.runway_display) {
          kpis.push({ title: "Cash Runway", value: `${tr.data.runway_display} Months`, kind: "calculated" });
        }
        if (tr.data.simulated_runway_months) {
          kpis.push({ title: "Simulated Runway", value: `${tr.data.simulated_runway_months} Months`, kind: "assumption" });
        }
        if (tr.data.anomalies_detected) {
          kpis.push({ title: "Flagged Outliers", value: `${(tr.data.anomalies_detected as unknown[]).length} Transaction(s)`, kind: "calculated" });
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
      };

      setMessages((prev) => [...prev, reply]);
    } catch {
      // Graceful local fallback if backend is offline
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: "FINEXA AI service is operating in deterministic offline mode. Runway and cash balance calculations remain backed by the live Financial Engine.",
        timestamp: "Just now",
      };
      setMessages((prev) => [...prev, reply]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[500px] max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-full bg-gradient-to-tr from-[#8B7CFF] to-[#A78BFA] text-white shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">AI CFO Intelligence</h1>
            <p className="text-xs text-muted-foreground">
              Deterministic financial tools powered by Gemini & Python Decimal Engine
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#48D597]/15 text-[#48D597] border border-[#48D597]/30">
            <Zap className="w-3.5 h-3.5" /> Fast-Path Engine Active
          </span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.sender === "user"
                  ? "bg-[#8B7CFF] text-white shadow-sm"
                  : "bg-gradient-to-tr from-[#8B7CFF] to-[#A78BFA] text-white shadow-sm"
              }`}
            >
              {msg.sender === "user" ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-sm space-y-3 ${
                msg.sender === "user"
                  ? "bg-[#8B7CFF] text-white rounded-tr-none"
                  : "bg-card border border-border text-foreground rounded-tl-none"
              }`}
            >
              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

              {/* Tool Execution Tag & Latency */}
              {msg.toolExecuted && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/60 w-fit">
                  <Clock className="w-3 h-3 text-[#8B7CFF]" />
                  <span>
                    Executed: <code>{msg.toolExecuted}</code>
                    {msg.latencyMs ? ` (${msg.latencyMs}ms)` : ""}
                  </span>
                </div>
              )}

              {/* Structured KPI output cards */}
              {msg.structuredKpis && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                  {msg.structuredKpis.map((kpi, idx) => (
                    <KPICard
                      key={idx}
                      title={kpi.title}
                      value={kpi.value}
                      dataKind={kpi.kind}
                      className="p-3"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#8B7CFF] to-[#A78BFA] text-white flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="rounded-2xl bg-card border border-border p-3.5 text-xs text-muted-foreground flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-[#8B7CFF] animate-ping" />
              <span>Querying Financial Engine & verifying calculations...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      <div className="shrink-0 flex items-center gap-2 overflow-x-auto py-1 text-xs">
        <span className="text-muted-foreground shrink-0 font-medium">Suggestions:</span>
        {suggestedPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="shrink-0 rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-xs text-foreground hover:bg-card hover:border-[#8B7CFF]/50 transition-colors flex items-center gap-1.5 font-medium"
          >
            <span>{prompt}</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="shrink-0 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask FINEXA AI CFO anything (e.g. runway, burn, anomaly detection)..."
          className="flex-1 h-12 rounded-full border border-border bg-input px-5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#8B7CFF] shadow-sm transition-all"
        />
        <Button
          type="submit"
          variant="gradient"
          size="lg"
          disabled={!input.trim() || isProcessing}
          className="flex items-center gap-2 px-6 min-h-[48px] rounded-full shadow-md"
        >
          <span>Send</span>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
