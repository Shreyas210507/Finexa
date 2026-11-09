"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, AlertTriangle, ArrowRight, Clock, ShieldAlert } from "lucide-react";

interface RecentActivityFeedProps {
  transactions?: Array<{
    id: string;
    description: string;
    category: string;
    date: string;
    type: string;
    amount: string;
  }>;
}

export function RecentActivityFeed({ transactions }: RecentActivityFeedProps) {
  const [activeTab, setActiveTab] = useState<"transactions" | "alerts">("transactions");

  const sampleTxs = transactions && transactions.length > 0 ? transactions.slice(0, 5) : [
    { id: "1", description: "Apex Health Monthly Retainer", category: "Revenue", date: "Oct 28", type: "income", amount: "38000.00" },
    { id: "2", description: "AWS Cloud Infrastructure", category: "Infrastructure", date: "Oct 26", type: "expense", amount: "18500.00" },
    { id: "3", description: "Pacific Logistics Invoicing", category: "Revenue", date: "Oct 22", type: "income", amount: "42000.00" },
    { id: "4", description: "Engineering Payroll Oct 2026", category: "Payroll", date: "Oct 20", type: "expense", amount: "55000.00" },
    { id: "5", description: "JetBrains & OpenAI Licenses", category: "Software", date: "Oct 15", type: "expense", amount: "4200.00" },
  ];

  const alerts = [
    {
      id: "a1",
      title: "Invoice Overdue — Pacific Logistics",
      subtitle: "$18,000.00 overdue since Oct 12, 2026. Follow-up dispatched.",
      type: "overdue",
      href: "/invoices",
    },
    {
      id: "a2",
      title: "Runway Contraction Alert",
      subtitle: "Trailing 3M burn rate of $51,166.67/mo requires monitoring.",
      type: "runway",
      href: "/forecasts",
    },
    {
      id: "a3",
      title: "Unusual Vendor Expense Detected",
      subtitle: "Crestview Advisory $13,000.00 flagged by statistical sentinel.",
      type: "anomaly",
      href: "/ai-agents",
    },
  ];

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
      {/* Header Tabs */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-full border border-border">
          <button
            type="button"
            onClick={() => setActiveTab("transactions")}
            className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
              activeTab === "transactions"
                ? "bg-foreground text-background dark:bg-white dark:text-[#111019] shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Recent Ledger
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("alerts")}
            className={`text-xs font-bold px-3 py-1 rounded-full transition-all flex items-center gap-1.5 ${
              activeTab === "alerts"
                ? "bg-foreground text-background dark:bg-white dark:text-[#111019] shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Alerts</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#F07878]" />
          </button>
        </div>

        <Link
          href={activeTab === "transactions" ? "/transactions" : "/ai-agents"}
          className="text-xs font-bold text-[#8B7CFF] hover:underline flex items-center gap-1"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Content List */}
      <div className="divide-y divide-border/60 mt-2">
        {activeTab === "transactions" ? (
          sampleTxs.map((tx) => (
            <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                    tx.type === "income"
                      ? "bg-[#48D597]/15 text-[#48D597]"
                      : "bg-[#F07878]/15 text-[#F07878]"
                  }`}
                >
                  {tx.type === "income" ? (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-foreground truncate">{tx.description}</div>
                  <div className="text-[11px] text-muted-foreground">{tx.date} • {tx.category}</div>
                </div>
              </div>

              <div
                className={`font-bold tabular-nums shrink-0 ${
                  tx.type === "income" ? "text-[#48D597]" : "text-foreground"
                }`}
              >
                {tx.type === "income" ? `+$${parseFloat(tx.amount).toLocaleString()}` : `-$${parseFloat(tx.amount).toLocaleString()}`}
              </div>
            </div>
          ))
        ) : (
          alerts.map((al) => (
            <Link
              key={al.id}
              href={al.href}
              className="py-2.5 flex items-start gap-3 text-xs hover:bg-muted/30 p-2 rounded-xl transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-[#F07878]/15 text-[#F07878] flex items-center justify-center shrink-0 mt-0.5">
                {al.type === "anomaly" ? (
                  <ShieldAlert className="w-3.5 h-3.5" />
                ) : al.type === "runway" ? (
                  <Clock className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-foreground">{al.title}</div>
                <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  {al.subtitle}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

