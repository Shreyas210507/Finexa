"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, AlertTriangle, ArrowRight, Clock, ShieldAlert, CheckCircle2, Inbox } from "lucide-react";

export interface ActivityAlertItem {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  href: string;
}

interface RecentActivityFeedProps {
  transactions?: Array<{
    id: string;
    description: string;
    category: string;
    date: string;
    type: string;
    amount: string;
  }>;
  alerts?: ActivityAlertItem[];
}

export function RecentActivityFeed({ transactions, alerts = [] }: RecentActivityFeedProps) {
  const [activeTab, setActiveTab] = useState<"transactions" | "alerts">("transactions");
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

  const displayTxs = transactions && transactions.length > 0 ? transactions.slice(0, 5) : [];

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="rounded-3xl frosted-glass-card p-6 shadow-xl flex flex-col justify-between"
    >
      {/* Header Tabs */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-full border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("transactions")}
            className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
              activeTab === "transactions"
                ? "bg-[#4318FF] text-white shadow-sm"
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
                ? "bg-[#4318FF] text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Alerts</span>
            {alerts.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-[#F07878] dot-pulse" />}
          </button>
        </div>

        <Link
          href={activeTab === "transactions" ? "/transactions" : "/ai-agents"}
          className="text-xs font-bold text-[#4318FF] dark:text-[#818CF8] hover:underline flex items-center gap-1"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Content List */}
      <div className="divide-y divide-white/5 mt-2 min-h-[220px]">
        {activeTab === "transactions" ? (
          displayTxs.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <Inbox className="w-7 h-7 mx-auto mb-2 text-muted-foreground/60" />
              <p className="font-semibold text-foreground">No recent transactions recorded</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Ingest transactions via CSV or record manually in the ledger.
              </p>
            </div>
          ) : (
            displayTxs.map((tx) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3 text-xs group hover:bg-white/5 px-2 rounded-xl transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 border ${
                      tx.type === "income"
                        ? "bg-[#34D399]/15 border-[#34D399]/30 text-[#34D399]"
                        : "bg-[#F07878]/15 border-[#F07878]/30 text-[#F07878]"
                    }`}
                  >
                    {tx.type === "income" ? (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate group-hover:text-white transition-colors">{tx.description}</div>
                    <div className="text-[11px] text-muted-foreground font-financial">{tx.date} • {tx.category}</div>
                  </div>
                </div>

                <div
                  className={`font-financial font-extrabold shrink-0 ${
                    tx.type === "income" ? "text-[#34D399]" : "text-[#F5F4FA]"
                  }`}
                >
                  {tx.type === "income"
                    ? `+$${parseFloat(tx.amount || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                    : `-$${parseFloat(tx.amount || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                </div>
              </div>
            ))
          )
        ) : alerts.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            <CheckCircle2 className="w-7 h-7 mx-auto mb-2 text-[#34D399]/70" />
            <p className="font-semibold text-foreground">All systems nominal</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              No financial alerts or overdue anomalies currently flagged.
            </p>
          </div>
        ) : (
          alerts.map((al) => (
            <Link
              key={al.id}
              href={al.href}
              className="py-2.5 flex items-start gap-3 text-xs hover:bg-white/5 p-2 rounded-xl transition-colors"
            >
              <div className="h-7 w-7 rounded-xl bg-[#F07878]/15 border border-[#F07878]/30 text-[#F07878] flex items-center justify-center shrink-0 mt-0.5">
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
