"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Send, 
  Cpu, 
  CheckCircle2, 
  TrendingUp, 
  AlertTriangle, 
  FileText, 
  ArrowRight,
  ShieldCheck,
  Terminal
} from "lucide-react";
import Reveal from "@/components/motion/reveal";

export function AICfoDemo() {
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);

  const prompts = [
    {
      title: "Calculate Cash Runway",
      query: "Calculate our current cash runway based on the last 90 days of ledger activity.",
      tool: "calculate_cash_runway(window_days=90)",
      response: {
        headline: "9.4 Months Remaining Runway",
        metrics: [
          { label: "Cash Balance", value: "$142,850.00" },
          { label: "Monthly Burn", value: "$15,200.00" },
          { label: "Zero-Cash Date", value: "Aug 24, 2027" },
        ],
        analysis: "Your net burn rate improved by 14.2% over the trailing 30 days due to stronger enterprise SaaS collections. Assuming zero revenue growth, you have safe runway through late August 2027.",
        recommendation: "Maintain current capital allocation. No immediate equity financing or debt draw required.",
      },
    },
    {
      title: "Hiring Scenario Simulation",
      query: "What happens if we hire 2 senior engineers at $6,000 per month starting next month?",
      tool: "simulate_financial_scenario(type='headcount', cost=12000, start_date='2026-12-01')",
      response: {
        headline: "Runway Shortens by 3.2 Months (9.4 → 6.2 mo)",
        metrics: [
          { label: "New Monthly Burn", value: "$27,200.00 (+$12K)" },
          { label: "Revised Runway", value: "6.2 Months" },
          { label: "Revised Zero-Cash", value: "May 18, 2027" },
        ],
        analysis: "Adding $12,000 in monthly salary increases your burn by 78.9%. While the balance covers this for 6 months, it breaches your 6-month safety covenant by late spring.",
        recommendation: "Stagger the hires: onboard 1 engineer now, and the second once $18K in pending receivables clears.",
      },
    },
    {
      title: "Expense Anomaly Audit",
      query: "Audit our ledger and identify any unusual spending spikes or expense anomalies this month.",
      tool: "identify_anomalies(threshold=2.5_std_dev, period='current_month')",
      response: {
        headline: "1 Anomaly Detected in Software Subscriptions",
        metrics: [
          { label: "Flagged Vendor", value: "Datadog Cloud" },
          { label: "Amount Charged", value: "$1,840.00" },
          { label: "Historical Baseline", value: "$620.00 / mo" },
        ],
        analysis: "Datadog billing increased by 196.7% over the 3-month baseline, triggered by unindexed log ingestion spikes from the staging cluster.",
        recommendation: "The Expense Agent has drafted an alert to engineering to truncate staging logs and request a vendor billing credit.",
      },
    },
    {
      title: "Overdue Receivables Summary",
      query: "What is the status of our outstanding receivables and aging invoices?",
      tool: "get_outstanding_invoices(status='unpaid')",
      response: {
        headline: "$12,700.00 in Total Outstanding Receivables",
        metrics: [
          { label: "Current (0-30d)", value: "$8,200.00" },
          { label: "Overdue (31-60d)", value: "$4,500.00" },
          { label: "Oldest Invoice", value: "INV-2026-084" },
        ],
        analysis: "Nexus Media Lab is currently 14 days past due on Invoice #84 ($4,500.00). All other invoices are within standard Net-30 payment terms.",
        recommendation: "Trigger Invoice Agent reminder with 1-click PayPal payment link and optional 3% prompt settlement discount.",
      },
    },
  ];

  const current = prompts[selectedPromptIndex];

  return (
    <section id="ai-cfo" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#6335FF]/10 border border-[#8B7CFF]/30 text-xs font-semibold text-[#8B7CFF]">
              <Sparkles className="w-3.5 h-3.5" />
              GROUNDED AI CFO INTELLIGENCE
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              An AI CFO That Understands{" "}
              <span className="bg-gradient-to-r from-[#6335FF] via-[#8B7CFF] to-[#00F0FF] bg-clip-text text-transparent">
                Every Dollar
              </span>
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300">
              No generalist chatbots guessing math. FINEXA AI CFO executes deterministic backend tools with Python Decimal accuracy, explaining every figure with verifiable ledger sources.
            </p>
          </div>
        </Reveal>

        {/* Interactive Prompt Selector Pills */}
        <Reveal delay={0.1}>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {prompts.map((p, idx) => (
              <button
                key={p.title}
                onClick={() => setSelectedPromptIndex(idx)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
                  selectedPromptIndex === idx
                    ? "bg-[#6335FF] text-white shadow-lg shadow-[#6335FF]/30 scale-105"
                    : "bg-white/5 dark:bg-white/5 bg-black/[0.03] text-neutral-600 dark:text-neutral-400 hover:text-white hover:bg-white/10 border border-white/10 dark:border-white/10 border-black/5"
                }`}
              >
                <span>{p.title}</span>
              </button>
            ))}
          </div>
        </Reveal>

        {/* Live Interactive Chat Preview */}
        <Reveal delay={0.2}>
          <div className="max-w-4xl mx-auto rounded-3xl border border-white/15 dark:border-white/15 border-black/10 bg-[#090C19]/95 dark:bg-[#090C19]/95 bg-white/95 backdrop-blur-2xl shadow-2xl overflow-hidden">
            {/* Chat Header */}
            <div className="px-6 py-4 bg-white/5 dark:bg-white/5 bg-black/[0.02] border-b border-white/10 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6335FF] to-[#00F0FF] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                    FINEXA AI CFO Intelligence
                  </h4>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Ledger Tools Connected • Python Decimal Active
                  </span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-neutral-400">
                <ShieldCheck className="w-4 h-4 text-[#8B7CFF]" />
                Zero Hallucination Mode
              </div>
            </div>

            {/* Chat Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* User Query Bubble */}
              <div className="flex justify-end">
                <div className="max-w-xl p-4 rounded-2xl rounded-tr-sm bg-gradient-to-r from-[#6335FF] to-[#7B42FF] text-white text-xs sm:text-sm font-medium shadow-lg">
                  {current.query}
                </div>
              </div>

              {/* Tool Execution Pill */}
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 dark:text-neutral-400 pl-2">
                <Terminal className="w-3.5 h-3.5 text-[#00F0FF]" />
                <span>Executed backend tool:</span>
                <span className="px-2 py-0.5 rounded bg-black/40 text-[#00F0FF] border border-white/10">
                  {current.tool}
                </span>
                <span className="text-emerald-400 text-[10px] font-bold">200 OK (0.42s)</span>
              </div>

              {/* AI CFO Structured Response Bubble */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedPromptIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="p-5 sm:p-6 rounded-2xl rounded-tl-sm bg-white/5 dark:bg-white/5 bg-black/[0.03] border border-white/10 dark:border-white/10 space-y-5"
                >
                  {/* Headline */}
                  <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{current.response.headline}</span>
                  </div>

                  {/* Key Metrics Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {current.response.metrics.map((m) => (
                      <div
                        key={m.label}
                        className="p-3 rounded-xl bg-black/40 dark:bg-black/40 bg-white border border-white/10 dark:border-white/10"
                      >
                        <span className="text-[10px] text-neutral-400 block">{m.label}</span>
                        <span className="text-sm sm:text-base font-bold text-white block mt-0.5">
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Analysis */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                      Financial Analysis
                    </span>
                    <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      {current.response.analysis}
                    </p>
                  </div>

                  {/* Strategic Recommendation */}
                  <div className="p-3.5 rounded-xl bg-[#6335FF]/15 border border-[#8B7CFF]/30 space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#00F0FF] flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Recommended CFO Action
                    </span>
                    <p className="text-xs text-neutral-700 dark:text-neutral-200 font-medium">
                      {current.response.recommendation}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Chat Input Bar (Interactive preview) */}
            <div className="px-6 py-4 bg-white/5 dark:bg-white/5 bg-black/[0.02] border-t border-white/10 dark:border-white/10 flex items-center gap-3">
              <input
                type="text"
                readOnly
                value="Ask any question about your cash, runway, or what-if scenario..."
                className="flex-1 bg-transparent text-xs text-neutral-400 outline-none cursor-pointer"
                onClick={() => setSelectedPromptIndex((selectedPromptIndex + 1) % prompts.length)}
              />
              <button
                onClick={() => setSelectedPromptIndex((selectedPromptIndex + 1) % prompts.length)}
                className="p-2 rounded-xl bg-[#6335FF] text-white hover:bg-[#7B42FF] transition-colors"
                title="Next prompt demo"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default AICfoDemo;

