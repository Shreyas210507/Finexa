"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  TrendingDown,
  Clock,
  ShieldAlert,
  DollarSign,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import type { DashboardSummaryResponse, NotificationItem } from "@/lib/api-types";

interface FinancialAlertsPanelProps {
  summary: DashboardSummaryResponse | null;
  notifications?: NotificationItem[];
}

interface InsightEntry {
  id: string;
  severity: "critical" | "warning" | "info" | "success";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  evidence: string;
  actionLabel?: string;
  actionHref?: string;
}

export function FinancialAlertsPanel({ summary, notifications = [] }: FinancialAlertsPanelProps) {
  const router = useRouter();
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

  // Generate data-grounded insights from the real dashboard summary
  const insights: InsightEntry[] = useMemo(() => {
    if (!summary) return [];
    const result: InsightEntry[] = [];
    const now = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // 1. Overdue receivables
    const overdue = parseFloat(summary.overdue_receivables || "0");
    if (overdue > 0) {
      result.push({
        id: "overdue-receivables",
        severity: "critical",
        icon: AlertTriangle,
        title: "Overdue Receivables Alert",
        description: `$${overdue.toLocaleString("en-US", { minimumFractionDigits: 2 })} in overdue invoices require immediate attention.`,
        evidence: `Source: Invoice ledger • Detected at ${now}`,
        actionLabel: "View Overdue",
        actionHref: "/invoices?status=overdue",
      });
    }

    // 2. Cash runway concern
    const runwayMonths = summary.runway_months ? parseFloat(summary.runway_months) : null;
    if (runwayMonths !== null && runwayMonths < 6) {
      result.push({
        id: "runway-warning",
        severity: runwayMonths < 3 ? "critical" : "warning",
        icon: Clock,
        title: "Runway Contraction Alert",
        description: `Cash runway is ${runwayMonths.toFixed(1)} months at current burn of $${parseFloat(summary.monthly_burn || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}/mo. ${runwayMonths < 3 ? "Immediate action recommended." : "Buffer review recommended."}`,
        evidence: `Source: Burn rate calculation • ${now}`,
        actionLabel: "View Forecast",
        actionHref: "/forecasts",
      });
    }

    // 3. Expense growth concern
    const expGrowth = summary.expense_growth_mom ? parseFloat(summary.expense_growth_mom) : 0;
    if (expGrowth > 15) {
      result.push({
        id: "expense-spike",
        severity: "warning",
        icon: TrendingDown,
        title: "Expense Growth Spike",
        description: `Monthly expenses grew ${expGrowth.toFixed(1)}% month-over-month. Review cost categories for unexpected increases.`,
        evidence: `Source: P&L comparison • ${now}`,
        actionLabel: "View Breakdown",
        actionHref: "/reports?report_type=pnl",
      });
    }

    // 4. Outstanding receivables
    const outstanding = parseFloat(summary.outstanding_receivables || "0");
    if (outstanding > 0 && overdue === 0) {
      result.push({
        id: "outstanding-receivables",
        severity: "info",
        icon: DollarSign,
        title: "Outstanding Receivables",
        description: `$${outstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })} in pending invoices. No items overdue yet.`,
        evidence: `Source: Accounts receivable • ${now}`,
        actionLabel: "View Invoices",
        actionHref: "/invoices",
      });
    }

    // 5. Net income negative
    const netIncome = parseFloat(summary.net_income || "0");
    if (netIncome < 0) {
      result.push({
        id: "net-loss",
        severity: "warning",
        icon: ShieldAlert,
        title: "Operating at Net Loss",
        description: `Current period shows a net loss of $${Math.abs(netIncome).toLocaleString("en-US", { minimumFractionDigits: 2 })}. Expenses exceed revenue.`,
        evidence: `Source: Income statement • ${now}`,
        actionLabel: "View P&L",
        actionHref: "/reports?report_type=pnl",
      });
    }

    // 6. Include real notifications as insights
    notifications.slice(0, 3).forEach((n) => {
      result.push({
        id: `notif-${n.id}`,
        severity: n.type === "invoice_overdue" ? "critical" : n.type === "runway_alert" ? "warning" : "info",
        icon: n.type === "invoice_overdue" ? AlertTriangle : n.type === "runway_alert" ? Clock : ShieldAlert,
        title: n.title,
        description: n.message,
        evidence: `${new Date(n.created_at).toLocaleString()}`,
      });
    });

    return result;
  }, [summary, notifications]);

  const severityStyles = {
    critical: {
      border: "border-[#F07878]/30",
      bg: "bg-[#F07878]/10",
      icon: "text-[#F07878]",
      badge: "bg-[#F07878]/20 text-[#F07878] border-[#F07878]/30",
    },
    warning: {
      border: "border-[#F59E0B]/30",
      bg: "bg-[#F59E0B]/10",
      icon: "text-[#F59E0B]",
      badge: "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30",
    },
    info: {
      border: "border-[#00F0FF]/30",
      bg: "bg-[#00F0FF]/10",
      icon: "text-[#00F0FF]",
      badge: "bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/30",
    },
    success: {
      border: "border-[#34D399]/30",
      bg: "bg-[#34D399]/10",
      icon: "text-[#34D399]",
      badge: "bg-[#34D399]/20 text-[#34D399] border-[#34D399]/30",
    },
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="rounded-3xl frosted-glass-card p-6 shadow-xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#4318FF] via-[#6366F1] to-[#00F0FF] text-white shadow-[0_0_12px_rgba(67,24,255,0.4)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Financial Intelligence</h3>
            <span className="text-[10px] text-muted-foreground">
              AI-powered alerts grounded in your data
            </span>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4318FF]/15 text-[#818CF8] border border-[#4318FF]/25 uppercase">
          {insights.length} Alert{insights.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Insights List */}
      <div className="mt-3 space-y-2.5 min-h-[200px]">
        {insights.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2.5 text-[#34D399]/70" />
            <p className="text-sm font-bold text-foreground">All Clear</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              No financial alerts or anomalies detected. Your finances look healthy.
            </p>
          </div>
        ) : (
          insights.slice(0, 5).map((insight) => {
            const style = severityStyles[insight.severity];
            const Icon = insight.icon;
            return (
              <div
                key={insight.id}
                className={`p-3.5 rounded-2xl border ${style.border} ${style.bg} transition-all hover:brightness-110`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${style.icon} bg-black/20 border border-white/5`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-foreground truncate">
                        {insight.title}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase shrink-0 ${style.badge}`}
                      >
                        {insight.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {insight.description}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground/60 italic">
                        {insight.evidence}
                      </span>
                      {insight.actionLabel && insight.actionHref && (
                        <button
                          type="button"
                          onClick={() => router.push(insight.actionHref!)}
                          className="text-[10px] font-bold text-[#818CF8] hover:text-white flex items-center gap-0.5 transition-colors"
                        >
                          {insight.actionLabel}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

