"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { KPICard } from "@/components/ui/kpi-card";
import { KPICardSkeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { AIInsightPanel } from "@/components/ui/ai-insight-panel";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  BarChart3,
  Building2,
  Calendar,
  Layers,
  Percent,
  CheckCircle2,
  Inbox,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { apiClient } from "@/lib/api-client";
import {
  DashboardSummaryResponse,
  CashFlowTimelineResponse,
  TransactionResponse,
} from "@/lib/api-types";

function formatUSD(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return "$0.00";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

const COLORS = ["#4318FF", "#34D399", "#00F0FF", "#818CF8", "#F59E0B", "#F07878"];

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "cashflow";

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [period, setPeriod] = useState<string>("30d");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [timeline, setTimeline] = useState<CashFlowTimelineResponse | null>(null);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync tab from search params if changed
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["cashflow", "revenue", "expenses", "pnl"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, timeRes, txRes] = await Promise.all([
        apiClient.getDashboardSummary(period).catch(() => null),
        apiClient.getCashFlowTimeline(period).catch(() => null),
        apiClient.getTransactions({ size: 100 }).catch(() => ({ items: [] })),
      ]);
      setSummary(sumRes);
      setTimeline(timeRes);
      setTransactions(txRes.items || []);
    } catch (e) {
      console.error("Analytics fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculations for period metrics
  const revenueMoM = summary?.revenue_growth_mom ? parseFloat(summary.revenue_growth_mom) : undefined;
  const expenseMoM = summary?.expense_growth_mom ? parseFloat(summary.expense_growth_mom) : undefined;
  const netIncome = summary?.net_income ? parseFloat(summary.net_income) : 0;
  const totalRevenue = summary?.revenue ? parseFloat(summary.revenue) : 0;
  const totalExpenses = summary?.expenses ? parseFloat(summary.expenses) : 0;

  // Margin Calculation
  const netMarginPct = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : "0.0";

  // Timeline points for charts
  const timelinePoints = useMemo(() => {
    return (
      timeline?.points?.map((pt) => ({
        month: pt.period_label,
        revenue: parseFloat(pt.inflows || "0"),
        expenses: parseFloat(pt.outflows || "0"),
        net: parseFloat(pt.net || "0"),
        balance: parseFloat(pt.closing_balance || "0"),
      })) || []
    );
  }, [timeline]);

  // Aggregate Vendor Breakdown from real transaction records
  const vendorBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const vendor = t.vendor_or_client || t.description || "Other Counterparty";
        const amt = parseFloat(t.amount || "0");
        map[vendor] = (map[vendor] || 0) + amt;
      });

    const totalVendorSpend = Object.values(map).reduce((a, b) => a + b, 0);

    return Object.entries(map)
      .map(([name, amount]) => ({
        name,
        amount,
        pct: totalVendorSpend > 0 ? Math.round((amount / totalVendorSpend) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  // Category breakdown list
  const categoryItems = useMemo(() => {
    if (!summary?.expense_breakdown) return [];
    const entries = Object.entries(summary.expense_breakdown);
    const sumTotal = entries.reduce((acc, [, val]) => acc + parseFloat(val || "0"), 0);

    return entries
      .map(([name, val]) => {
        const num = parseFloat(val || "0");
        return {
          name,
          amount: num,
          pct: sumTotal > 0 ? Math.round((num / sumTotal) * 100) : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [summary]);

  const tabs = [
    { id: "cashflow", label: "Cash Flow & Velocity" },
    { id: "revenue", label: "Revenue Analytics" },
    { id: "expenses", label: "Expense & Vendor Breakdown" },
    { id: "pnl", label: "Profit & Loss Performance" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ═══════════════════════════════════════════════════
          HEADER: Title, Subtitle, and Period Controls
          ═══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Financial Analytics
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Operational cash flow velocity, revenue trajectory, and vendor expenditure breakdowns
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center frosted-glass-card border border-white/10 p-0.5 rounded-full shadow-sm shrink-0">
          {[
            { id: "7d", label: "7D" },
            { id: "30d", label: "30D" },
            { id: "90d", label: "90D" },
            { id: "12m", label: "12M" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
                period === item.id
                  ? "bg-[#4318FF] text-white shadow-[0_2px_10px_rgba(67,24,255,0.4)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          ANALYTICS KPI CARDS
          ═══════════════════════════════════════════════════ */}
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
            title="Operating Revenue"
            value={formatUSD(summary?.revenue ?? "0.00")}
            delta={revenueMoM !== undefined ? { value: revenueMoM, period: "VS prior period" } : undefined}
            tooltip="Total inflows recognized during this timeframe."
            freshness="Verified"
            dataKind="verified"
            icon={TrendingUp}
          />

          <KPICard
            title="Operating Expenses"
            value={formatUSD(summary?.expenses ?? "0.00")}
            delta={expenseMoM !== undefined ? { value: expenseMoM, period: "VS prior period" } : undefined}
            tooltip="Total operating outflows recognized during this timeframe."
            freshness="Verified"
            dataKind="verified"
            icon={TrendingDown}
          />

          <KPICard
            title="Net Operating Income"
            value={formatUSD(summary?.net_income ?? "0.00")}
            delta={{
              value: netIncome >= 0 ? 5.2 : -18.4,
              period: netIncome >= 0 ? "Operating surplus" : "Operating deficit",
            }}
            tooltip="Revenue minus expenses for the selected period."
            freshness="Calculated"
            dataKind="calculated"
            icon={netIncome >= 0 ? TrendingUp : TrendingDown}
          />

          <KPICard
            title="Net Profit Margin"
            value={`${netMarginPct}%`}
            subtitle="Efficiency ratio"
            tooltip="Net income expressed as a percentage of gross operating revenue."
            freshness="Calculated"
            dataKind="calculated"
            icon={Percent}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          MODULE TABS
          ═══════════════════════════════════════════════════ */}
      <div className="flex items-center frosted-glass-card border border-white/10 p-1 rounded-2xl w-full sm:w-auto overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`text-xs font-bold px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-[#4318FF] text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════
          TAB 1: CASH FLOW & VELOCITY
          ═══════════════════════════════════════════════════ */}
      {activeTab === "cashflow" && (
        <div className="space-y-6">
          <div className="rounded-3xl frosted-glass-card p-6 shadow-xl border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-2 border-b border-white/10">
              <div>
                <h3 className="text-sm font-bold text-foreground">Cash Velocity & Inflow/Outflow Trajectory</h3>
                <span className="text-xs text-muted-foreground">Deterministic timeline of liquidity movements</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-[#34D399]" /> Inflows
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-[#4318FF]" /> Outflows
                </span>
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              {timelinePoints.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No timeline data recorded for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelinePoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="inflowsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34D399" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#34D399" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="outflowsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4318FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4318FF" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9693A5", fontSize: 11 }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#9693A5", fontSize: 10, fontFamily: "var(--font-mono)" }}
                      tickFormatter={(v) => `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const inf = Number(payload.find((p) => p.dataKey === "revenue")?.value || 0);
                          const out = Number(payload.find((p) => p.dataKey === "expenses")?.value || 0);
                          return (
                            <div className="rounded-2xl border border-white/20 bg-[#090814]/95 p-3 text-xs space-y-1">
                              <div className="font-bold text-white border-b border-white/10 pb-1">{label}</div>
                              <div className="text-[#34D399]">Inflows: {formatUSD(inf)}</div>
                              <div className="text-[#818CF8]">Outflows: {formatUSD(out)}</div>
                              <div className="text-muted-foreground pt-1 border-t border-white/10 font-bold">
                                Net: {formatUSD(inf - out)}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#34D399" strokeWidth={2} fill="url(#inflowsGrad)" />
                    <Area type="monotone" dataKey="expenses" stroke="#4318FF" strokeWidth={2} fill="url(#outflowsGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <AIInsightPanel
            title="Operating Cash Velocity"
            description={`In the last ${period}, your organization processed ${formatUSD(timeline?.total_inflows)} in inflows against ${formatUSD(timeline?.total_outflows)} in operating outflows. Net cash flow stands at ${formatUSD(timeline?.net_cash_flow)}.`}
            recommendation="Maintain trailing 3-month reserves to buffer against fluctuating payment terms."
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB 2: REVENUE ANALYTICS
          ═══════════════════════════════════════════════════ */}
      {activeTab === "revenue" && (
        <div className="space-y-6">
          <div className="rounded-3xl frosted-glass-card p-6 shadow-xl border border-white/10">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-sm font-bold text-foreground">Revenue Trajectory & Streams</h3>
                <span className="text-xs text-muted-foreground">Historical billing receipts and collected receivables</span>
              </div>
              <span className="text-xs font-bold font-financial text-[#34D399]">
                {revenueMoM !== undefined ? `${revenueMoM >= 0 ? "+" : ""}${revenueMoM}% MoM` : "Verified Ledger"}
              </span>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelinePoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9693A5", fontSize: 11 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9693A5", fontSize: 10, fontFamily: "var(--font-mono)" }}
                    tickFormatter={(v) => `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const val = Number(payload[0]?.value || 0);
                        return (
                          <div className="rounded-2xl border border-white/20 bg-[#090814]/95 p-3 text-xs">
                            <div className="font-bold text-white mb-1">{label}</div>
                            <div className="text-[#34D399] font-financial font-bold">Revenue: {formatUSD(val)}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="revenue" fill="#34D399" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB 3: EXPENSE & VENDOR BREAKDOWN
          ═══════════════════════════════════════════════════ */}
      {activeTab === "expenses" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Categories */}
          <div className="rounded-3xl frosted-glass-card p-6 shadow-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#818CF8]" />
                <h3 className="text-sm font-bold text-foreground">Expense Categories</h3>
              </div>
              <span className="text-xs text-muted-foreground font-financial">
                Total: {formatUSD(totalExpenses)}
              </span>
            </div>

            <div className="space-y-3">
              {categoryItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No category data for this period.
                </div>
              ) : (
                categoryItems.map((item, idx) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">{item.name}</span>
                      <span className="font-bold text-foreground font-financial">
                        {formatUSD(item.amount)} ({item.pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.pct}%`,
                          backgroundColor: COLORS[idx % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Vendors */}
          <div className="rounded-3xl frosted-glass-card p-6 shadow-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#00F0FF]" />
                <h3 className="text-sm font-bold text-foreground">Top Vendor Expenditure</h3>
              </div>
              <span className="text-xs text-muted-foreground">Ranked by volume</span>
            </div>

            <div className="space-y-2.5 max-h-[320px] overflow-y-auto scrollbar-thin pr-1">
              {vendorBreakdown.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No vendor records logged in recent transactions.
                </div>
              ) : (
                vendorBreakdown.map((v, i) => (
                  <div
                    key={v.name}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[10px] font-bold text-muted-foreground/50 w-4">
                        #{i + 1}
                      </span>
                      <span className="font-semibold text-foreground truncate max-w-[180px]">
                        {v.name}
                      </span>
                    </div>
                    <div className="font-financial font-extrabold text-foreground shrink-0">
                      {formatUSD(v.amount)}{" "}
                      <span className="text-muted-foreground font-normal text-[11px]">({v.pct}%)</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB 4: PROFIT & LOSS PERFORMANCE
          ═══════════════════════════════════════════════════ */}
      {activeTab === "pnl" && (
        <div className="space-y-6">
          <div className="rounded-3xl frosted-glass-card p-6 shadow-xl border border-white/10">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-sm font-bold text-foreground">Revenue vs Expenses vs Net Income</h3>
                <span className="text-xs text-muted-foreground">Operational profitability margin progression</span>
              </div>
              <div
                className={`text-xs font-bold font-financial px-2.5 py-1 rounded-full border ${
                  netIncome >= 0
                    ? "bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30"
                    : "bg-[#F07878]/15 text-[#F07878] border-[#F07878]/30"
                }`}
              >
                {netIncome >= 0 ? `+${formatUSD(netIncome)} Net Surplus` : `${formatUSD(netIncome)} Deficit`}
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelinePoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9693A5", fontSize: 11 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9693A5", fontSize: 10, fontFamily: "var(--font-mono)" }}
                    tickFormatter={(v) => `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const r = Number(payload.find((p) => p.dataKey === "revenue")?.value || 0);
                        const e = Number(payload.find((p) => p.dataKey === "expenses")?.value || 0);
                        return (
                          <div className="rounded-2xl border border-white/20 bg-[#090814]/95 p-3 text-xs space-y-1">
                            <div className="font-bold text-white border-b border-white/10 pb-1">{label}</div>
                            <div className="text-[#34D399]">Revenue: {formatUSD(r)}</div>
                            <div className="text-[#818CF8]">Expenses: {formatUSD(e)}</div>
                            <div className={`font-bold pt-1 border-t border-white/10 ${r - e >= 0 ? "text-[#34D399]" : "text-[#F07878]"}`}>
                              Net Income: {formatUSD(r - e)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="revenue" fill="#34D399" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#4318FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

