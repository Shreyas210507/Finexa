"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  BarChart3, 
  ShieldCheck, 
  Sparkles, 
  Calendar, 
  ArrowUpRight, 
  Layers,
  CheckCircle2,
  PieChart
} from "lucide-react";
import Reveal from "@/components/motion/reveal";

export function FinancialIntelligence() {
  const [selectedHorizon, setSelectedHorizon] = useState<"30D" | "60D" | "90D" | "1Y">("90D");

  const horizonData = {
    "30D": {
      startingCash: "$142,850.00",
      projectedInflow: "+$42,100.00",
      projectedOutflow: "-$16,800.00",
      netEnding: "$168,150.00",
      confidence: "99.8%",
      runway: "10.2 mo",
      bars: [42, 48, 55, 62],
    },
    "60D": {
      startingCash: "$142,850.00",
      projectedInflow: "+$84,500.00",
      projectedOutflow: "-$34,200.00",
      netEnding: "$193,150.00",
      confidence: "98.4%",
      runway: "11.1 mo",
      bars: [42, 48, 55, 62, 70, 78],
    },
    "90D": {
      startingCash: "$142,850.00",
      projectedInflow: "+$126,800.00",
      projectedOutflow: "-$51,600.00",
      netEnding: "$218,050.00",
      confidence: "96.5%",
      runway: "12.4 mo",
      bars: [42, 48, 55, 62, 70, 78, 85, 94, 102],
    },
    "1Y": {
      startingCash: "$142,850.00",
      projectedInflow: "+$520,000.00",
      projectedOutflow: "-$210,000.00",
      netEnding: "$452,850.00",
      confidence: "91.2%",
      runway: "18.6 mo",
      bars: [42, 48, 55, 62, 70, 78, 85, 94, 102, 115, 128, 140],
    },
  };

  const active = horizonData[selectedHorizon];

  return (
    <section className="py-24 relative overflow-hidden bg-gradient-to-b from-white/[0.02] via-transparent to-white/[0.02]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-xs font-semibold text-[#00F0FF]">
              <TrendingUp className="w-3.5 h-3.5" />
              FINANCIAL VELOCITY &amp; PREDICTION
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Deterministic Intelligence.{" "}
              <span className="bg-gradient-to-r from-[#6335FF] via-[#8B7CFF] to-[#00F0FF] bg-clip-text text-transparent">
                Zero Guesswork.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300">
              Traditional spreadsheets look backwards. FINEXA projects your cash velocity forward with statistical rigor, highlighting liquidity crunches weeks before they manifest.
            </p>
          </div>
        </Reveal>

        {/* Time Horizon Selector */}
        <Reveal delay={0.1}>
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1 rounded-xl bg-white/5 dark:bg-white/5 bg-black/[0.03] border border-white/10 dark:border-white/10">
              {(["30D", "60D", "90D", "1Y"] as const).map((h) => (
                <button
                  key={h}
                  onClick={() => setSelectedHorizon(h)}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                    selectedHorizon === h
                      ? "bg-[#6335FF] text-white shadow-md shadow-[#6335FF]/30"
                      : "text-neutral-500 hover:text-white"
                  }`}
                >
                  {h} Horizon
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Forecast Visual Card */}
        <Reveal delay={0.2}>
          <div className="rounded-3xl border border-white/15 dark:border-white/15 border-black/10 bg-[#090C19]/90 dark:bg-[#090C19]/90 bg-white/95 backdrop-blur-2xl shadow-2xl p-6 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Telemetry Stats */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-xs text-neutral-400">Projected Ending Cash</span>
                  <div className="text-3xl font-extrabold text-neutral-900 dark:text-white mt-1">
                    {active.netEnding}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="text-emerald-400 font-semibold">{active.projectedInflow} In</span>
                    <span className="text-rose-400 font-semibold">{active.projectedOutflow} Out</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[11px] text-neutral-400">Statistical Confidence</span>
                    <div className="text-lg font-bold text-[#00F0FF] mt-1">{active.confidence}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[11px] text-neutral-400">Projected Runway</span>
                    <div className="text-lg font-bold text-[#8B7CFF] mt-1">{active.runway}</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#6335FF]/10 border border-[#8B7CFF]/20 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Double-Entry Integrity Verified
                  </div>
                  <p className="text-xs text-neutral-300">
                    Every projected transaction balances against real historical revenue velocity and fixed operational liabilities.
                  </p>
                </div>
              </div>

              {/* Dynamic Chart Visual */}
              <div className="lg:col-span-7 p-6 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between h-72">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span className="font-semibold text-white">Projected Cash Balance Velocity</span>
                  <span className="text-emerald-400 font-mono">Horizon: {selectedHorizon}</span>
                </div>

                {/* Animated Bars */}
                <div className="h-44 flex items-end justify-between gap-2 pt-4">
                  {active.bars.map((height, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.5, delay: i * 0.04 }}
                      className="flex-1 bg-gradient-to-t from-[#6335FF] via-[#8B7CFF] to-[#00F0FF] rounded-t-md opacity-85 hover:opacity-100 transition-opacity"
                    />
                  ))}
                </div>

                <div className="flex justify-between text-[10px] text-neutral-500 font-mono pt-2 border-t border-white/5">
                  <span>Day 1: $142.8K</span>
                  <span>Mid-Horizon</span>
                  <span>Target: {active.netEnding}</span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default FinancialIntelligence;

