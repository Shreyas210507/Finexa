"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  FileText, 
  Sparkles, 
  Users, 
  TrendingUp, 
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Zap,
  BarChart3,
  Calendar,
  Lock
} from "lucide-react";
import Reveal from "@/components/motion/reveal";

export function ProductExplorer() {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      id: "command-center",
      title: "Command Center",
      label: "Financial Overview",
      icon: LayoutDashboard,
      badge: "Real-time",
      description: "Unified double-entry financial ledger displaying cash runway, monthly burn, receivables, and operational margins in real time.",
      highlights: [
        "6 core executive financial KPIs with automated health grading",
        "Deterministic double-entry general ledger",
        "Interactive 12-month revenue & expense analytics",
        "Instant drilldown into any ledger journal entry",
      ],
      previewContent: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] text-neutral-400">Total Available Cash</span>
              <div className="text-xl font-bold text-white mt-1">$142,850.00</div>
              <span className="text-[10px] text-emerald-400 font-semibold">+8.4% this month</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] text-neutral-400">Runway Forecast</span>
              <div className="text-xl font-bold text-[#8B7CFF] mt-1">9.4 Mo</div>
              <span className="text-[10px] text-neutral-400 font-semibold">Net burn $15.2K</span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Recent Ledger Transactions</span>
              <span className="text-[10px] text-[#00F0FF]">All verified</span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-neutral-300">Stripe Inflow (SaaS Subscriptions)</span>
                <span className="font-bold text-emerald-400">+$12,400.00</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-neutral-300">AWS Cloud Infrastructure</span>
                <span className="font-bold text-rose-400">-$2,180.00</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-300">PayPal Client Settlement #982</span>
                <span className="font-bold text-emerald-400">+$4,250.00</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "smart-invoices",
      title: "Smart Invoices",
      label: "Receivables & Billing",
      icon: FileText,
      badge: "Automated",
      description: "Automated invoice creation with integrated PayPal payment links, aging bucket tracking, and autonomous reconciliation.",
      highlights: [
        "1-click PayPal checkout links embedded on invoices",
        "Aging analytics (Current, 1-30, 31-60, 90+ days)",
        "Autonomous payment status updates on webhook receipt",
        "Direct export to branded PDF & CSV tables",
      ],
      previewContent: (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-neutral-400">Invoice INV-2026-084</span>
              <div className="text-lg font-bold text-white">Nexus Media Lab</div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Pending ($4,500.00)
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 text-xs space-y-1">
            <div className="flex justify-between text-neutral-400">
              <span>Issue Date:</span> <span className="text-white">Nov 02, 2026</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Payment Link:</span> <span className="text-[#00F0FF] underline">finexa.io/pay/inv_84</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 py-1.5 text-xs font-semibold rounded bg-[#6335FF] text-white">
              Send Reminder via Agent
            </button>
            <button className="px-3 py-1.5 text-xs font-semibold rounded bg-white/10 text-white">
              View PDF
            </button>
          </div>
        </div>
      ),
    },
    {
      id: "ai-cfo",
      title: "AI CFO Brain",
      label: "Conversational Copilot",
      icon: Sparkles,
      badge: "Python Decimal",
      description: "An AI CFO backed by deterministic financial tools. Ask about runway, simulate hiring scenarios, and evaluate profitability without hallucinations.",
      highlights: [
        "Python Decimal precision — zero LLM math errors",
        "What-if scenario simulator (e.g. 'What if we hire 2 engineers at $6K/mo?')",
        "Tool execution transparency: inspect code & assumptions",
        "Actionable strategic guidance based on your actual burn",
      ],
      previewContent: (
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Sparkles className="w-4 h-4 text-[#8B7CFF]" />
            What-If Scenario Simulation
          </div>
          <div className="p-2 rounded bg-black/30 text-xs text-neutral-300">
            &quot;What happens to our runway if we hire 2 engineers at $6,000/mo?&quot;
          </div>
          <div className="p-2.5 rounded bg-[#6335FF]/10 border border-[#8B7CFF]/30 text-xs space-y-1.5">
            <div className="flex justify-between font-bold text-white">
              <span>Runway Impact:</span>
              <span className="text-amber-400">9.4 mo → 6.2 mo (-3.2 mo)</span>
            </div>
            <p className="text-[11px] text-neutral-300">
              Monthly burn increases from $15.2K to $27.2K (+78.9%). Recommend waiting until Q1 enterprise contracts close.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "autonomous-agents",
      title: "Autonomous Agents",
      label: "5 Specialized Bots",
      icon: Users,
      badge: "Human-in-the-Loop",
      description: "Five autonomous financial agents collaborate to audit cash flow, chase overdue receivables, categorize expenses, and flag compliance anomalies.",
      highlights: [
        "Human Approval Center for high-value actions",
        "Detailed audit timeline of every action taken",
        "Strict tool permissions per agent to prevent errors",
        "Cross-agent coordination (e.g. CFO → Cash Flow → Invoice)",
      ],
      previewContent: (
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-white flex items-center justify-between">
            <span>Pending Agent Approvals</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">1 Requires Action</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Invoice Collection Agent</span>
              <span className="text-[10px] text-neutral-400">10m ago</span>
            </div>
            <p className="text-[11px] text-neutral-300">
              Proposed: Send 2nd payment reminder with 3% prompt-pay discount to Acquired Corp ($8,200 overdue).
            </p>
            <div className="flex gap-2 pt-1">
              <button className="flex-1 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded">
                Approve Action
              </button>
              <button className="px-3 py-1 text-[11px] font-semibold bg-white/10 text-white rounded">
                Reject
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "cash-flow-forecast",
      title: "Forecast Engine",
      label: "Predictive Analytics",
      icon: TrendingUp,
      badge: "Predictive",
      description: "Dynamic 30/60/90-day cash flow projections utilizing historical trend velocity, recurring contract schedules, and probabilistic forecasting.",
      highlights: [
        "Base, optimistic, and conservative forecast curves",
        "Cash deficit warning alerts 45 days in advance",
        "Working capital and cash velocity indicators",
        "Scenario comparison overlays",
      ],
      previewContent: (
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">90-Day Liquidity Forecast</span>
            <span className="text-[10px] text-emerald-400 font-bold">Healthy (+22%)</span>
          </div>
          <div className="h-20 flex items-center justify-center">
            {/* SVG Visual line representation */}
            <svg className="w-full h-full" viewBox="0 0 300 80">
              <path
                d="M 10 60 Q 70 50, 140 35 T 290 15"
                fill="none"
                stroke="#00F0FF"
                strokeWidth="3"
              />
              <path
                d="M 10 60 Q 70 65, 140 55 T 290 45"
                fill="none"
                stroke="#8B7CFF"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            </svg>
          </div>
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span>Current: $142.8K</span>
            <span className="text-white font-bold">Day 90 Projected: $184.2K</span>
          </div>
        </div>
      ),
    },
    {
      id: "paypal-checkout",
      title: "PayPal Engine",
      label: "Payment Rails",
      icon: CreditCard,
      badge: "Orders v2",
      description: "Full production-grade PayPal Sandbox integration: dynamic order creation, client-side approval, secure server-side capture, and instant ledger reconciliation.",
      highlights: [
        "Official PayPal JavaScript SDK & Orders v2 lifecycle",
        "Two-phase verification: approve & server-side capture",
        "Automatic double-entry ledger settlement recording",
        "Webhook signature verification & duplicate-event protection",
      ],
      previewContent: (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">PayPal Sandbox Order</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">
              COMPLETED
            </span>
          </div>
          <div className="p-2.5 rounded bg-black/40 text-[11px] font-mono space-y-1">
            <div className="text-neutral-400">Order ID: 8XJ927402A81</div>
            <div className="text-neutral-400">Capture ID: 5TY19284901B</div>
            <div className="text-emerald-400 font-bold">Settled: $3,200.00 USD</div>
          </div>
          <div className="text-[11px] text-neutral-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Ledger Journal Entry #1042 posted automatically.
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="product-demo" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6335FF]/10 border border-[#8B7CFF]/20 text-xs font-semibold text-[#8B7CFF]">
              <Sparkles className="w-3.5 h-3.5" />
              INTEGRATED FINANCIAL ARCHITECTURE
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Everything You Need to Run Your Finances
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300">
              Not disconnected point solutions. FINEXA connects double-entry accounting, conversational intelligence, autonomous agents, and payment rails into one cohesive engine.
            </p>
          </div>
        </Reveal>

        {/* Tab Controls */}
        <Reveal delay={0.1}>
          <div className="flex items-center justify-start lg:justify-center overflow-x-auto pb-4 gap-2 scrollbar-none">
            {tabs.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === idx;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(idx)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "bg-[#6335FF] text-white shadow-lg shadow-[#6335FF]/30 scale-105"
                      : "bg-white/5 dark:bg-white/5 bg-black/[0.03] text-neutral-600 dark:text-neutral-400 hover:text-white hover:bg-white/10 border border-white/10 dark:border-white/10 border-black/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.title}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                      isActive ? "bg-white/20 text-white" : "bg-white/10 text-neutral-400"
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* Active Tab Detailed View */}
        <Reveal delay={0.2}>
          <div className="mt-8 rounded-2xl border border-white/15 dark:border-white/15 border-black/10 bg-[#090C19]/90 dark:bg-[#090C19]/90 bg-white/95 backdrop-blur-2xl shadow-2xl p-6 sm:p-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                {/* Left: Explanatory Content */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#00F0FF]">
                      {tabs[activeTab].label}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
                      {tabs[activeTab].title}
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      {tabs[activeTab].description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {tabs[activeTab].highlights.map((highlight, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-xs text-neutral-700 dark:text-neutral-200">
                          {highlight}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4">
                    <a
                      href="/register"
                      className="inline-flex items-center gap-2 text-xs font-bold text-[#8B7CFF] hover:text-[#00F0FF] transition-colors group"
                    >
                      Experience {tabs[activeTab].title} in live app
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </a>
                  </div>
                </div>

                {/* Right: Live Interactive Card Preview */}
                <div className="lg:col-span-5">
                  <div className="rounded-2xl p-5 bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/15 dark:border-white/15 border-black/10 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                      {React.createElement(tabs[activeTab].icon, { className: "w-32 h-32" })}
                    </div>
                    <div className="relative z-10">
                      {tabs[activeTab].previewContent}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default ProductExplorer;

