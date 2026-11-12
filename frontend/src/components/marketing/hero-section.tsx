"use client";

import React from "react";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  Layers, 
  Cpu, 
  Play, 
  CheckCircle2, 
  DollarSign, 
  CreditCard,
  Zap
} from "lucide-react";
import MagneticButton from "@/components/motion/magnetic-button";

export function HeroSection() {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  return (
    <section className="relative min-h-[92vh] pt-32 pb-20 overflow-hidden flex items-center justify-center">
      {/* Background Ambient Glows & Grid */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-[#6335FF]/20 via-[#8B7CFF]/15 to-[#00F0FF]/10 rounded-full blur-[120px] dark:opacity-70 opacity-30 animate-pulse duration-1000" />
        <div className="absolute top-2/3 right-10 w-[450px] h-[350px] bg-[#00F0FF]/10 rounded-full blur-[100px] dark:opacity-60 opacity-20" />
        <div 
          className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]" 
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center text-center space-y-8"
        >
          {/* Badge */}
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#6335FF]/10 via-[#8B7CFF]/15 to-[#00F0FF]/10 border border-[#8B7CFF]/30 backdrop-blur-md shadow-sm">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F0FF] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00F0FF]"></span>
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                FINEXA 2.0 • Autonomous Financial Operating System
              </span>
              <Sparkles className="w-3.5 h-3.5 text-[#8B7CFF]" />
            </div>
          </motion.div>

          {/* Cinematic Headline */}
          <motion.div variants={itemVariants} className="max-w-4xl">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] text-neutral-900 dark:text-white">
              The Financial Operating System{" "}
              <span className="bg-gradient-to-r from-[#6335FF] via-[#8B7CFF] to-[#00F0FF] bg-clip-text text-transparent">
                Your Business Deserves
              </span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.div variants={itemVariants} className="max-w-2xl">
            <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal">
              Double-entry precision meets autonomous intelligence. Orchestrate cash flow, execute reconciled PayPal settlements, and consult an AI CFO grounded in verifiable ledger facts.
            </p>
          </motion.div>

          {/* CTAs */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <MagneticButton strength={10}>
              <Link
                href="/register"
                className="group relative inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-white shadow-xl shadow-[#6335FF]/25 hover:shadow-[#6335FF]/40 transition-all duration-300 overflow-hidden active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#6335FF] via-[#7B42FF] to-[#00F0FF] transition-transform duration-300 group-hover:scale-105" />
                <span className="relative z-10 flex items-center gap-2">
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            </MagneticButton>

            <MagneticButton strength={8}>
              <a
                href="#product-demo"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-neutral-700 dark:text-neutral-200 bg-white/5 hover:bg-white/10 dark:bg-white/5 dark:hover:bg-white/10 border border-neutral-300 dark:border-white/15 backdrop-blur-md transition-all duration-300 shadow-sm"
              >
                <Play className="w-3.5 h-3.5 text-[#8B7CFF] fill-[#8B7CFF]" />
                Explore Platform
              </a>
            </MagneticButton>
          </motion.div>

          {/* Key Value Proof Badges */}
          <motion.div variants={itemVariants} className="pt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-600 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Zero-Fabrication Guarantee
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Verified PayPal Sandbox
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Full Multi-Tenant Isolation
            </span>
          </motion.div>

          {/* Interactive Floating Product Preview Mockup */}
          <motion.div
            variants={itemVariants}
            className="w-full max-w-5xl mt-10 relative group"
          >
            {/* Ambient Backlight behind preview */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[#6335FF]/30 via-[#8B7CFF]/20 to-[#00F0FF]/30 rounded-3xl blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

            <div className="rounded-2xl border border-white/15 dark:border-white/15 border-black/10 bg-[#090C19]/90 dark:bg-[#090C19]/90 bg-white/95 backdrop-blur-2xl shadow-2xl overflow-hidden text-left">
              {/* Window Header */}
              <div className="px-4 py-3 bg-white/5 dark:bg-white/5 bg-black/[0.02] border-b border-white/10 dark:border-white/10 border-black/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-3 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    FINEXA Command Center • Live Ledger
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Ledger Reconciled
                  </span>
                  <span className="text-[10px] text-neutral-400 hidden sm:inline">v2.4.0</span>
                </div>
              </div>

              {/* Mockup Dashboard Content */}
              <div className="p-5 sm:p-6 space-y-6">
                {/* Metric Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.03] dark:bg-white/[0.03] bg-neutral-50 border border-white/10 dark:border-white/10 border-black/5">
                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                      Cash in Bank
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white block">
                      $142,850.00
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500 mt-1">
                      <TrendingUp className="w-3 h-3" /> +12.4% vs last month
                    </span>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.03] dark:bg-white/[0.03] bg-neutral-50 border border-white/10 dark:border-white/10 border-black/5">
                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                      Runway Forecast
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-[#8B7CFF] block">
                      9.4 Months
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mt-1">
                      Net Burn $15.2K/mo
                    </span>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.03] dark:bg-white/[0.03] bg-neutral-50 border border-white/10 dark:border-white/10 border-black/5">
                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                      Active AI Agents
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-[#00F0FF] block">
                      5 / 5 Running
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 mt-1">
                      <Zap className="w-3 h-3" /> 18 actions reconciled
                    </span>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.03] dark:bg-white/[0.03] bg-neutral-50 border border-white/10 dark:border-white/10 border-black/5">
                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                      PayPal Inflow
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white block">
                      $38,420.00
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8B7CFF] mt-1">
                      <CreditCard className="w-3 h-3" /> 100% captured
                    </span>
                  </div>
                </div>

                {/* Simulated Chart & AI Insight Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Mini Cash Flow Trend visual */}
                  <div className="lg:col-span-2 p-4 rounded-xl bg-white/[0.02] dark:bg-white/[0.02] border border-white/10 dark:border-white/10 border-black/5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                          Cash Flow Trajectory (30-Day Velocity)
                        </h4>
                        <p className="text-[10px] text-neutral-500">Real ledger debits vs credits</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Revenue</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400">Burn</span>
                      </div>
                    </div>
                    {/* Visual Bars Mock */}
                    <div className="h-28 flex items-end justify-between gap-1 sm:gap-2 pt-2">
                      {[
                        { rev: 40, exp: 25 },
                        { rev: 55, exp: 30 },
                        { rev: 45, exp: 35 },
                        { rev: 70, exp: 28 },
                        { rev: 65, exp: 32 },
                        { rev: 80, exp: 38 },
                        { rev: 75, exp: 30 },
                        { rev: 90, exp: 42 },
                        { rev: 85, exp: 35 },
                        { rev: 95, exp: 40 },
                        { rev: 110, exp: 45 },
                        { rev: 105, exp: 42 },
                      ].map((bar, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group/bar">
                          <div
                            style={{ height: `${bar.rev}%` }}
                            className="w-full bg-gradient-to-t from-[#6335FF] to-[#00F0FF] rounded-t-sm opacity-80 group-hover/bar:opacity-100 transition-opacity"
                          />
                          <div
                            style={{ height: `${bar.exp}%` }}
                            className="w-full bg-rose-500/60 rounded-t-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live AI CFO Recommendation Preview */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-[#6335FF]/10 via-transparent to-[#00F0FF]/10 border border-[#8B7CFF]/25 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-[#6335FF]/20 text-[#8B7CFF]">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-neutral-900 dark:text-white">
                          AI CFO Dispatch
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        &quot;Runway expanded to 9.4 mo following $14.2K receivables collected via PayPal. Recommend allocating $4,500 into R&amp;D reserve.&quot;
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[10px] text-neutral-400">Confidence: 99.4%</span>
                      <Link
                        href="/ai-cfo"
                        className="text-[11px] font-semibold text-[#00F0FF] hover:underline flex items-center gap-1"
                      >
                        Ask CFO <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Platform Performance Metrics Footer */}
          <motion.div
            variants={itemVariants}
            className="w-full max-w-4xl pt-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center border-t border-white/10 dark:border-white/10 border-black/5"
          >
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
                100%
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Double-Entry Ledger
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#8B7CFF]">
                5 Agents
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Autonomous Financial Team
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#00F0FF]">
                &lt; 1.2s
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                AI Tool Execution
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-500">
                100%
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                PayPal Reconciled
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default HeroSection;
