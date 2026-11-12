"use client";

import React from "react";
import { Check, X, Sparkles, Layers, ShieldCheck, ArrowRight } from "lucide-react";
import Reveal from "@/components/motion/reveal";

export function ComparisonSection() {
  const comparisons = [
    {
      feature: "Ledger Foundation",
      traditional: "Error-prone manual spreadsheets or opaque legacy tools",
      finexa: "Deterministic double-entry ledger with Python Decimal precision",
    },
    {
      feature: "AI Intelligence",
      traditional: "Generic chatbots hallucinating financial estimates",
      finexa: "Grounded AI CFO querying real backend financial calculation tools",
    },
    {
      feature: "Autonomous Agents",
      traditional: "Manual bookkeeping, chasing late invoices by hand",
      finexa: "5 specialized agents working collaboratively in a monitored swarm",
    },
    {
      feature: "Payment Integration",
      traditional: "Disconnected merchant portals requiring manual CSV exports",
      finexa: "Native PayPal Orders v2 integration with instant ledger journal sync",
    },
    {
      feature: "Scenario Planning",
      traditional: "Fragile Excel formulas broken by simple cell modifications",
      finexa: "Natural language what-if simulations with instant runway delta",
    },
    {
      feature: "Safety & Governance",
      traditional: "No guardrails or unchecked automated external emails",
      finexa: "Dedicated Human Approval Center for all external actions",
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#6335FF]/10 border border-[#8B7CFF]/30 text-xs font-semibold text-[#8B7CFF]">
              <Layers className="w-3.5 h-3.5" />
              THE FINEXA ADVANTAGE
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Why Traditional Tools{" "}
              <span className="bg-gradient-to-r from-rose-400 via-amber-300 to-[#8B7CFF] bg-clip-text text-transparent">
                Hold You Back
              </span>
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300">
              Stop stitching together disconnected SaaS point products, brittle spreadsheets, and hallucinating chatbots. FINEXA provides unified financial clarity.
            </p>
          </div>
        </Reveal>

        {/* Comparison Table Card */}
        <Reveal delay={0.15}>
          <div className="rounded-3xl border border-white/15 dark:border-white/15 border-black/10 bg-[#090C19]/95 dark:bg-[#090C19]/95 bg-white/95 backdrop-blur-2xl shadow-2xl overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-12 border-b border-white/10 text-xs font-bold uppercase tracking-wider">
              <div className="p-4 sm:p-5 md:col-span-4 text-neutral-400">Capability</div>
              <div className="p-4 sm:p-5 md:col-span-4 text-rose-400 bg-rose-500/5 flex items-center gap-1.5">
                <X className="w-4 h-4" /> Traditional &amp; Legacy Software
              </div>
              <div className="p-4 sm:p-5 md:col-span-4 text-[#00F0FF] bg-[#6335FF]/10 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#8B7CFF]" /> FINEXA Autonomous OS
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {comparisons.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 text-xs sm:text-sm items-center hover:bg-white/[0.02] transition-colors">
                  <div className="p-4 sm:p-5 md:col-span-4 font-bold text-neutral-900 dark:text-white">
                    {item.feature}
                  </div>
                  <div className="p-4 sm:p-5 md:col-span-4 text-neutral-500 bg-rose-500/[0.02] flex items-start gap-2">
                    <X className="w-4 h-4 text-rose-500/70 shrink-0 mt-0.5" />
                    <span>{item.traditional}</span>
                  </div>
                  <div className="p-4 sm:p-5 md:col-span-4 text-neutral-800 dark:text-neutral-200 bg-[#6335FF]/[0.04] font-medium flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item.finexa}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default ComparisonSection;

