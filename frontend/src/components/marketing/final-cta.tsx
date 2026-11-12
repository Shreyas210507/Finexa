"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import Reveal from "@/components/motion/reveal";
import MagneticButton from "@/components/motion/magnetic-button";

export function FinalCTA() {
  return (
    <section className="py-28 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center">
        <div className="w-[800px] h-[500px] bg-gradient-to-r from-[#6335FF]/30 via-[#8B7CFF]/20 to-[#00F0FF]/30 rounded-full blur-[140px] opacity-70" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Reveal>
          <div className="rounded-3xl border border-white/20 dark:border-white/20 border-black/10 bg-gradient-to-b from-white/10 via-white/[0.04] to-transparent dark:from-white/10 dark:via-white/[0.04] backdrop-blur-3xl p-8 sm:p-16 shadow-2xl space-y-8 relative overflow-hidden">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#6335FF]/20 border border-[#8B7CFF]/40 text-xs font-bold text-[#8B7CFF]">
              <Sparkles className="w-4 h-4 text-[#00F0FF]" />
              THE FUTURE OF FINANCIAL OPERATIONS
            </div>

            {/* Headline */}
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-neutral-900 dark:text-white leading-[1.1]">
              Orchestrate Your Finances with{" "}
              <span className="bg-gradient-to-r from-[#6335FF] via-[#8B7CFF] to-[#00F0FF] bg-clip-text text-transparent">
                Absolute Certainty
              </span>
            </h2>

            {/* Subtitle */}
            <p className="max-w-2xl mx-auto text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Experience the power of double-entry ledger precision, five collaborative autonomous agents, and an AI CFO grounded in financial fact.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <MagneticButton strength={12}>
                <Link
                  href="/register"
                  className="group relative inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-sm font-bold text-white shadow-2xl shadow-[#6335FF]/40 hover:shadow-[#6335FF]/60 transition-all duration-300 overflow-hidden active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#6335FF] via-[#7B42FF] to-[#00F0FF] group-hover:scale-105 transition-transform duration-300" />
                  <span className="relative z-10 flex items-center gap-2">
                    Create Your Organization Free
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </MagneticButton>

              <MagneticButton strength={8}>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-7 py-4 rounded-xl text-sm font-semibold text-neutral-700 dark:text-neutral-200 bg-white/5 hover:bg-white/10 dark:bg-white/5 dark:hover:bg-white/10 border border-neutral-300 dark:border-white/15 backdrop-blur-md transition-all duration-300"
                >
                  Sign In to Existing Ledger
                </Link>
              </MagneticButton>
            </div>

            {/* Trust Points */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Free Sandbox Exploration
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 60-Second Organization Setup
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Instant PayPal Sandbox Linking
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default FinalCTA;

