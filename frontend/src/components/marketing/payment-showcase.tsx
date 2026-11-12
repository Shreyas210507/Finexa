"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  CreditCard, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Lock, 
  Layers, 
  RefreshCw,
  Sparkles,
  ExternalLink
} from "lucide-react";
import Reveal from "@/components/motion/reveal";

export function PaymentShowcase() {
  const [activeStep, setActiveStep] = useState(2); // default to captured state

  const steps = [
    {
      num: "01",
      title: "Invoice & Order Creation",
      desc: "Server creates authenticated PayPal v2 Order with line items, currency, and cryptographic idempotency key.",
      badge: "Orders v2 API",
    },
    {
      num: "02",
      title: "Customer Approval",
      desc: "Customer reviews and authorizes settlement via official PayPal SDK popup with buyer protections.",
      badge: "Client SDK",
    },
    {
      num: "03",
      title: "Server-Side Capture",
      desc: "Backend securely captures authorized payment. Verified capture ID returned directly from PayPal.",
      badge: "Server Verified",
    },
    {
      num: "04",
      title: "Ledger Reconciliation",
      desc: "Double-entry journal automatically posted: Debit Cash (Asset) +$3,200, Credit Accounts Receivable -$3,200.",
      badge: "Zero-Latency Reconciliation",
    },
  ];

  return (
    <section id="payments" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-xs font-semibold text-[#00F0FF]">
              <CreditCard className="w-3.5 h-3.5" />
              PRODUCTION-GRADE PAYMENT RAILS
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              PayPal Integration Built for{" "}
              <span className="bg-gradient-to-r from-[#6335FF] via-[#8B7CFF] to-[#00F0FF] bg-clip-text text-transparent">
                CFOs &amp; Developers
              </span>
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300">
              Payments shouldn&apos;t live in an isolated gateway. FINEXA connects the entire PayPal Orders v2 lifecycle directly to your general ledger for real-time reconciliation.
            </p>
          </div>
        </Reveal>

        {/* 4-Step Interactive Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          {steps.map((s, idx) => (
            <Reveal key={s.num} delay={0.1 * (idx + 1)}>
              <div
                onClick={() => setActiveStep(idx)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 h-full flex flex-col justify-between ${
                  activeStep === idx
                    ? "bg-[#6335FF]/15 border-[#8B7CFF] shadow-lg shadow-[#6335FF]/20 scale-[1.02]"
                    : "bg-white/5 dark:bg-white/5 border-white/10 dark:border-white/10 hover:border-white/20"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-[#00F0FF] font-mono">
                      {s.num}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-neutral-300">
                      {s.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                    {s.title}
                  </h4>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-1.5 text-[11px] font-semibold text-[#8B7CFF]">
                  {activeStep === idx ? (
                    <span className="flex items-center gap-1 text-[#00F0FF]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Inspected Step
                    </span>
                  ) : (
                    <span>Click to inspect →</span>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Live Reconciled Order Mockup */}
        <Reveal delay={0.25}>
          <div className="rounded-3xl border border-white/15 dark:border-white/15 border-black/10 bg-[#090C19]/95 dark:bg-[#090C19]/95 bg-white/95 backdrop-blur-2xl shadow-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-black">
                  P
                </div>
                <div>
                  <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                    Verified PayPal Sandbox Order Lifecycle
                  </h4>
                  <span className="text-xs text-neutral-400">
                    Order ID: <code className="text-[#00F0FF]">7GH91204892A</code> • Capture ID: <code className="text-emerald-400">9TX48192048B</code>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  RECONCILED IN LEDGER
                </span>
                <span className="text-lg font-black text-white">$3,200.00 USD</span>
              </div>
            </div>

            {/* Verification Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 text-xs">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-neutral-400 block font-semibold">Idempotency Guarantee</span>
                <p className="text-neutral-300">
                  Cryptographic key prevents duplicate payments on accidental multi-clicks or retries.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-neutral-400 block font-semibold">Webhook Signature Auth</span>
                <p className="text-neutral-300">
                  Every inbound webhook validated against PayPal transmission signatures before processing.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-neutral-400 block font-semibold">Double-Entry Balance</span>
                <p className="text-neutral-300">
                  Instantly debit Cash in Bank ($3,200) and credit Accounts Receivable ($3,200). 0 disparity.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default PaymentShowcase;

