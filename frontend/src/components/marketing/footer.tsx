"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ShieldCheck, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/10 dark:border-white/10 border-black/5 bg-[#05060B] text-neutral-400 text-xs py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-white/10">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6335FF] to-[#00F0FF] flex items-center justify-center p-[1px]">
                <div className="w-full h-full bg-[#08080D] rounded-[11px] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#8B7CFF]" />
                </div>
              </div>
              <span className="font-extrabold text-lg tracking-wider text-white">
                FINEXA
              </span>
            </Link>
            <p className="text-neutral-400 text-xs leading-relaxed max-w-sm">
              The autonomous financial operating system combining deterministic double-entry ledger precision, five specialized AI agents, and verified PayPal payment rails.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Multi-Tenant Row-Level Security Enforced</span>
            </div>
          </div>

          {/* Col 1: Platform */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Platform
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/overview" className="hover:text-white transition-colors">
                  Command Center
                </Link>
              </li>
              <li>
                <Link href="/transactions" className="hover:text-white transition-colors">
                  Double-Entry Ledger
                </Link>
              </li>
              <li>
                <Link href="/invoices" className="hover:text-white transition-colors">
                  Smart Invoicing
                </Link>
              </li>
              <li>
                <Link href="/payments" className="hover:text-white transition-colors">
                  PayPal Reconciliation
                </Link>
              </li>
              <li>
                <Link href="/forecasts" className="hover:text-white transition-colors">
                  Cash Flow Forecasts
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: AI Intelligence */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              AI Intelligence
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/ai-cfo" className="hover:text-white transition-colors">
                  AI CFO Assistant
                </Link>
              </li>
              <li>
                <Link href="/ai-agents" className="hover:text-white transition-colors">
                  5 Autonomous Agents
                </Link>
              </li>
              <li>
                <a href="#ai-cfo" className="hover:text-white transition-colors">
                  Scenario Simulator
                </a>
              </li>
              <li>
                <a href="#ai-agents" className="hover:text-white transition-colors">
                  Human Approval Center
                </a>
              </li>
              <li>
                <Link href="/analytics" className="hover:text-white transition-colors">
                  Financial Analytics
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Access & Auth */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Account &amp; Security
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Create Organization
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-white transition-colors">
                  Tenant Settings
                </Link>
              </li>
              <li>
                <a href="#security" className="hover:text-white transition-colors">
                  Security Architecture
                </a>
              </li>
              <li>
                <Link href="/reports" className="hover:text-white transition-colors">
                  Audit Reports
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500">
          <div>
            &copy; {new Date().getFullYear()} FINEXA Technologies Inc. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span>Deterministic Python Decimal Engine</span>
            <span>PayPal Sandbox Verified</span>
            <span>PostgreSQL Row-Level Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

