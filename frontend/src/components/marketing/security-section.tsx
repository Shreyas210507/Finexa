"use client";

import React from "react";
import { 
  ShieldCheck, 
  Lock, 
  Key, 
  FileCheck, 
  UserCheck, 
  Database,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Reveal from "@/components/motion/reveal";

export function SecuritySection() {
  const pillars = [
    {
      icon: Database,
      title: "Multi-Tenant Row Level Isolation",
      desc: "Strict organization-scoped tenant boundaries enforced at the PostgreSQL database level. Your financial records are never co-mingled or visible to other tenants.",
      tag: "PostgreSQL RLS",
    },
    {
      icon: FileCheck,
      title: "Immutable Double-Entry Ledger",
      desc: "Every debit and credit is recorded as an immutable journal entry. Financial history cannot be overwritten or deleted, providing complete forensic auditability.",
      tag: "Append-Only Ledger",
    },
    {
      icon: ShieldCheck,
      title: "Grounded AI Zero-Fabrication",
      desc: "The AI CFO executes verifiable backend tools using Python Decimal precision. Calculations are verified before any text is generated, eliminating math hallucinations.",
      tag: "Deterministic Math",
    },
    {
      icon: UserCheck,
      title: "Human Approval Enforcement",
      desc: "Autonomous agents have strict read-only tool limits for analysis. Consequential actions such as sending debt collection reminders require human confirmation.",
      tag: "Human-in-the-Loop",
    },
    {
      icon: Key,
      title: "Idempotency & Replay Protection",
      desc: "Cryptographic idempotency keys prevent duplicate payments, duplicate invoices, and accidental multiple submissions under network retries.",
      tag: "Idempotent Orders",
    },
    {
      icon: Lock,
      title: "Enterprise Encryption Standards",
      desc: "All client-server traffic is encrypted via TLS 1.3. API credentials and database connection secrets are encrypted at rest with zero plaintext exposure.",
      tag: "AES-256 & TLS 1.3",
    },
  ];

  return (
    <section id="security" className="py-24 relative overflow-hidden bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              INTEGRITY &amp; TRUST ARCHITECTURE
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Enterprise Security{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-[#00F0FF] bg-clip-text text-transparent">
                Without Compromise
              </span>
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300">
              Financial software demands uncompromising rigor. We treat your ledger as mission-critical infrastructure with mathematical verification and multi-tenant isolation.
            </p>
          </div>
        </Reveal>

        {/* 6 Security Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <Reveal key={pillar.title} delay={0.08 * (idx + 1)}>
                <div className="p-6 rounded-2xl border border-white/10 dark:border-white/10 border-black/5 bg-white/5 dark:bg-white/5 hover:border-emerald-500/40 transition-all duration-300 h-full flex flex-col justify-between group">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/10">
                        {pillar.tag}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-neutral-900 dark:text-white group-hover:text-emerald-400 transition-colors">
                      {pillar.title}
                    </h4>

                    <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Enforced by Architecture
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default SecuritySection;

