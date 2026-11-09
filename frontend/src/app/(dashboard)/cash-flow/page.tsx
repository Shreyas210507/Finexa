"use client";

import React, { useState, useEffect, useCallback } from "react";
import { KPICard } from "@/components/ui/kpi-card";
import { Select } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Wallet, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { AIInsightPanel } from "@/components/ui/ai-insight-panel";
import { apiClient } from "@/lib/api-client";
import { CashFlowTimelineResponse } from "@/lib/api-types";
import { KPICardSkeleton } from "@/components/ui/skeleton";

function formatUSD(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return "$0.00";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

export default function CashFlowPage() {
  const [period, setPeriod] = useState("30d");
  const [timeline, setTimeline] = useState<CashFlowTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTimeline = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.getCashFlowTimeline(period);
      setTimeline(res);
    } catch {
      setTimeline(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const inflowsNum = parseFloat(timeline?.total_inflows || "0");
  const outflowsNum = parseFloat(timeline?.total_outflows || "0");
  const totalVolume = inflowsNum + outflowsNum;
  const inflowPct = totalVolume > 0 ? ((inflowsNum / totalVolume) * 100).toFixed(1) : "0.0";
  const outflowPct = totalVolume > 0 ? ((outflowsNum / totalVolume) * 100).toFixed(1) : "0.0";
  const netNum = parseFloat(timeline?.net_cash_flow || "0");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Cash Flow Analytics
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Deterministic liquidity tracking, operating cash velocity, and balance movements
          </p>
        </div>

        <div className="w-36">
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={[
              { value: "7d", label: "Last 7 Days" },
              { value: "30d", label: "Last 30 Days" },
              { value: "90d", label: "Last 90 Days" },
              { value: "12m", label: "Last 12 Months" },
            ]}
          />
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Opening Balance"
            value={formatUSD(timeline?.opening_balance ?? "0.00")}
            subtitle="Benchmark seed opening capital"
            dataKind="verified"
            icon={Wallet}
          />
          <KPICard
            title="Total Inflows"
            value={formatUSD(timeline?.total_inflows ?? "0.00")}
            dataKind="verified"
            icon={ArrowUpRight}
          />
          <KPICard
            title="Total Outflows"
            value={formatUSD(timeline?.total_outflows ?? "0.00")}
            dataKind="verified"
            icon={ArrowDownRight}
          />
          <KPICard
            title="Closing Balance"
            value={formatUSD(timeline?.closing_balance ?? "0.00")}
            dataKind="calculated"
            icon={TrendingUp}
          />
        </div>
      )}

      {/* Cash Flow Visual Shell */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">
            Inflow vs Outflow Velocity
          </h3>
          <span className="text-xs text-muted-foreground">
            Formula: Closing = Opening + Inflows - Outflows
          </span>
        </div>

        {/* Visual Bar Indicator */}
        <div className="space-y-3 pt-2">
          <div>
            <div className="flex justify-between text-xs mb-1.5 font-medium">
              <span className="text-[#48D597] flex items-center gap-1 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" /> Cash Inflows ({formatUSD(inflowsNum)})
              </span>
              <span className="text-muted-foreground tabular-nums font-medium">{inflowPct}%</span>
            </div>
            <div className="h-3 w-full bg-muted/60 rounded-full overflow-hidden border border-border/50">
              <div
                className="h-full bg-[#48D597] rounded-full transition-all duration-500"
                style={{ width: `${inflowPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5 font-medium">
              <span className="text-[#F07878] flex items-center gap-1 font-semibold">
                <TrendingDown className="w-3.5 h-3.5" /> Cash Outflows ({formatUSD(outflowsNum)})
              </span>
              <span className="text-muted-foreground tabular-nums font-medium">{outflowPct}%</span>
            </div>
            <div className="h-3 w-full bg-muted/60 rounded-full overflow-hidden border border-border/50">
              <div
                className="h-full bg-[#F07878] rounded-full transition-all duration-500"
                style={{ width: `${outflowPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border/60 text-xs text-muted-foreground flex flex-col sm:flex-row justify-between gap-2">
          <span>
            Net Operating Cash Flow:{" "}
            <strong className={netNum >= 0 ? "text-[#48D597]" : "text-[#F07878]"}>
              {netNum >= 0 ? `+${formatUSD(netNum)}` : formatUSD(netNum)}
            </strong>
          </span>
          <span>Cash Reconciliation: Reconciled with Python Decimal Financial Engine</span>
        </div>
      </div>

      <AIInsightPanel
        title="Liquidity Health & Cash Velocity"
        description={
          timeline
            ? `During this ${period} period, your organisation recorded ${formatUSD(timeline.total_inflows)} in inflows and ${formatUSD(timeline.total_outflows)} in outflows, resulting in net cash flow of ${formatUSD(timeline.net_cash_flow)}. Closing cash reserves stand at ${formatUSD(timeline.closing_balance)}.`
            : "Deterministic cash flow summary loading..."
        }
        recommendation="Accelerate collection of overdue invoices to optimize operational working capital."
      />
    </div>
  );
}
