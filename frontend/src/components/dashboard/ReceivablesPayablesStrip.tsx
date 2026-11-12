"use client";

import React from "react";
import Link from "next/link";
import { Receipt, AlertCircle, Clock, ArrowUpRight, CheckCircle } from "lucide-react";
import type { DashboardSummaryResponse } from "@/lib/api-types";

interface ReceivablesPayablesStripProps {
  summary: DashboardSummaryResponse | null;
}

function formatUSD(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return "$0.00";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

export function ReceivablesPayablesStrip({ summary }: ReceivablesPayablesStripProps) {
  const cardRef = React.useRef<HTMLDivElement | null>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cardRef.current.style.setProperty("--mouse-x", `${x}px`);
      cardRef.current.style.setProperty("--mouse-y", `${y}px`);
    }
  };

  const handlePointerLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.setProperty("--mouse-x", "-999px");
      cardRef.current.style.setProperty("--mouse-y", "-999px");
    }
  };

  const outstanding = parseFloat(summary?.outstanding_receivables || "0");
  const overdue = parseFloat(summary?.overdue_receivables || "0");
  const currentReceivables = Math.max(0, outstanding - overdue);

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="rounded-2xl frosted-glass-card p-4 sm:p-5 shadow-lg border border-white/10"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title & Context */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#4318FF]/15 text-[#818CF8] border border-[#4318FF]/30 flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Receivables & Cash Flow Health</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20">
                Verified Ledger
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live tracking of incoming receivables, overdue customer balances, and collection status
            </p>
          </div>
        </div>

        {/* Metrics Blocks */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 shrink-0">
          {/* Outstanding */}
          <div className="p-2 sm:p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3 text-[#818CF8]" />
              <span>Outstanding</span>
            </div>
            <div className="text-base sm:text-lg font-extrabold text-foreground font-financial mt-1">
              {formatUSD(outstanding)}
            </div>
          </div>

          {/* Current / On-Time */}
          <div className="p-2 sm:p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle className="w-3 h-3 text-[#34D399]" />
              <span>On-Time</span>
            </div>
            <div className="text-base sm:text-lg font-extrabold text-[#34D399] font-financial mt-1">
              {formatUSD(currentReceivables)}
            </div>
          </div>

          {/* Overdue */}
          <div className="p-2 sm:p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="w-3 h-3 text-[#F07878]" />
              <span>Overdue</span>
            </div>
            <div className={`text-base sm:text-lg font-extrabold font-financial mt-1 ${overdue > 0 ? "text-[#F07878]" : "text-foreground"}`}>
              {formatUSD(overdue)}
            </div>
          </div>
        </div>

        {/* Quick Link to Invoices */}
        <Link
          href="/invoices"
          className="self-end sm:self-center flex items-center gap-1 text-xs font-bold text-[#818CF8] hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/5 transition-all group shrink-0"
        >
          <span>Manage Invoices</span>
          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

