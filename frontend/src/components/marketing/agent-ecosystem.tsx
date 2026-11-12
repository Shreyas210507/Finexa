"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Cpu, 
  Sparkles, 
  TrendingUp, 
  FileText, 
  Receipt, 
  Calculator, 
  ShieldCheck, 
  UserCheck, 
  ArrowRight,
  Activity,
  CheckCircle2,
  Clock
} from "lucide-react";
import Reveal from "@/components/motion/reveal";

export function AgentEcosystem() {
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);

  const agents = [
    {
      id: "cash-flow",
      name: "Cash Flow Agent",
      role: "Liquidity & Runway Sentinel",
      icon: TrendingUp,
      color: "#00F0FF",
      glowClass: "from-[#00F0FF]/20",
      description: "Constantly models cash runway, projects 30/60/90-day balances, and alerts the CFO before deficits occur.",
      tools: ["calculate_cash_runway", "forecast_cash_flow", "alert_burn_spike"],
      recentAction: "Projected 9.4-month runway; verified +$14.2K net positive balance change.",
    },
    {
      id: "invoice",
      name: "Invoice & Billing Agent",
      role: "Receivables Acceleration",
      icon: FileText,
      color: "#32D6A0",
      glowClass: "from-[#32D6A0]/20",
      description: "Generates smart invoices with embedded PayPal payment links, tracks aging buckets, and queues payment reminders.",
      tools: ["get_outstanding_invoices", "send_reminder", "reconcile_receipt"],
      recentAction: "Identified $4,500 overdue invoice; drafted reminder for human approval.",
    },
    {
      id: "expense",
      name: "Expense & Anomaly Agent",
      role: "Continuous Ledger Audit",
      icon: Receipt,
      color: "#FF9F43",
      glowClass: "from-[#FF9F43]/20",
      description: "Audits every debit entry, categorizes vendor expenses, and detects unexpected transaction anomalies instantly.",
      tools: ["identify_anomalies", "categorize_vendor", "flag_duplicate_spend"],
      recentAction: "Flagged recurring SaaS charge increase (+$120/mo) for review.",
    },
    {
      id: "tax",
      name: "Tax & Reserve Agent",
      role: "Provisioning & Compliance",
      icon: Calculator,
      color: "#A99AFF",
      glowClass: "from-[#A99AFF]/20",
      description: "Calculates real-time tax obligations, sets aside automated reserve recommendations, and tracks filing schedules.",
      tools: ["estimate_quarterly_tax", "calculate_vat_gst", "recommend_reserve"],
      recentAction: "Calculated Q4 estimated tax reserve of $6,840.00.",
    },
    {
      id: "compliance",
      name: "Compliance & Safety Agent",
      role: "Ledger Integrity Gatekeeper",
      icon: ShieldCheck,
      color: "#54A0FF",
      glowClass: "from-[#54A0FF]/20",
      description: "Ensures all ledger entries balance perfectly, prevents double-spending, and enforces multi-tenant audit logs.",
      tools: ["verify_double_entry", "audit_idempotency", "export_audit_trail"],
      recentAction: "Verified 1,420 journal entries; 100% debit-credit equilibrium.",
    },
  ];

  return (
    <section id="ai-agents" className="py-24 relative overflow-hidden bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-xs font-semibold text-[#00F0FF]">
              <Cpu className="w-3.5 h-3.5" />
              COOPERATIVE MULTI-AGENT SWARM
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Five Autonomous Agents.{" "}
              <span className="bg-gradient-to-r from-[#6335FF] via-[#8B7CFF] to-[#00F0FF] bg-clip-text text-transparent">
                One Cohesive System.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300">
              Unlike isolated bots, FINEXA&apos;s financial agents operate within a synchronized multi-agent mesh coordinated by the central AI CFO. Every action is strictly permissioned and audit-logged.
            </p>
          </div>
        </Reveal>

        {/* Central CFO Orchestrator Visual Banner */}
        <Reveal delay={0.1}>
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#6335FF]/15 via-[#8B7CFF]/10 to-[#00F0FF]/15 border border-white/15 dark:border-white/15 border-black/10 backdrop-blur-2xl mb-12 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#6335FF] to-[#00F0FF] flex items-center justify-center shadow-lg shadow-[#6335FF]/30 shrink-0">
                  <Sparkles className="w-8 h-8 text-white animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                      AI CFO Orchestrator
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      COORDINATING SWARM
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 mt-1 max-w-xl">
                    Assigns tasks, aggregates financial telemetry, computes Python Decimal projections, and enforces human sign-off for critical cash actions.
                  </p>
                </div>
              </div>

              {/* Human-in-the-Loop badge */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 dark:bg-white/10 border border-white/15 shrink-0">
                <UserCheck className="w-4 h-4 text-[#00F0FF]" />
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Human Approval Center Enforced
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* 5 Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent, idx) => {
            const Icon = agent.icon;
            const isSelected = selectedAgent === idx;
            return (
              <Reveal key={agent.id} delay={0.08 * (idx + 1)}>
                <div
                  onMouseEnter={() => setSelectedAgent(idx)}
                  onMouseLeave={() => setSelectedAgent(null)}
                  className={`p-6 rounded-2xl border transition-all duration-300 h-full flex flex-col justify-between group ${
                    isSelected
                      ? "border-[#8B7CFF]/50 bg-white/10 dark:bg-white/10 shadow-2xl scale-[1.02]"
                      : "border-white/10 dark:border-white/10 border-black/5 bg-white/5 dark:bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${agent.color}20`, color: agent.color }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/10">
                        {agent.role}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-bold text-neutral-900 dark:text-white group-hover:text-[#00F0FF] transition-colors">
                        {agent.name}
                      </h4>
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1.5 leading-relaxed">
                        {agent.description}
                      </p>
                    </div>

                    {/* Permitted Tools */}
                    <div className="pt-2 space-y-1.5">
                      <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">
                        Permitted Tools:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.tools.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 dark:bg-black/30 bg-neutral-100 text-neutral-700 dark:text-neutral-300 border border-white/5"
                          >
                            {t}()
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recent Action */}
                  <div className="mt-6 pt-4 border-t border-white/10 dark:border-white/10 flex items-start gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                    <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{agent.recentAction}</span>
                  </div>
                </div>
              </Reveal>
            );
          })}

          {/* 6th Card: Human Approval Callout */}
          <Reveal delay={0.48}>
            <div className="p-6 rounded-2xl border border-dashed border-[#8B7CFF]/40 bg-gradient-to-br from-[#6335FF]/10 via-transparent to-transparent flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-[#6335FF]/20 text-[#8B7CFF] flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Human Approval Guardrail
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  Autonomous agents never send unapproved payment demands, modify bank reconciliations, or adjust tax reserves unilaterally. Consequential actions await your explicit 1-click confirmation.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10">
                <a
                  href="/register"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00F0FF] hover:underline"
                >
                  Configure agent thresholds <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default AgentEcosystem;

