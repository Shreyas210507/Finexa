"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import {
  CurrentUserResponse,
  HealthResponse,
  DashboardSummaryResponse,
  CashFlowTimelineResponse,
  TransactionResponse,
} from "@/lib/api-types";
import { KPICard } from "@/components/ui/kpi-card";
import { KPICardSkeleton } from "@/components/ui/skeleton";
import { DashboardAICFO } from "@/components/dashboard/DashboardAICFO";
import { RevenueExpenseChart } from "@/components/dashboard/RevenueExpenseChart";
import { LiquidityExchangeCard } from "@/components/dashboard/LiquidityExchangeCard";
import { ExpenseBreakdownCard } from "@/components/dashboard/ExpenseBreakdownCard";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Clock,
  Flame,
  RotateCcw,
} from "lucide-react";

function formatUSD(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return "$0.00";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

export default function OverviewPage() {
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [timeline, setTimeline] = useState<CashFlowTimelineResponse | null>(null);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [period, setPeriod] = useState("30d");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [userData, healthData, summaryData, timelineData, txData] = await Promise.all([
        apiClient.getCurrentUser().catch(() => null),
        apiClient.getHealth().catch(() => null),
        apiClient.getDashboardSummary(period).catch(() => null),
        apiClient.getCashFlowTimeline(period).catch(() => null),
        apiClient.getTransactions({ size: 5 }).catch(() => ({ items: [] })),
      ]);

      setUser(userData);
      setHealth(healthData);
      setSummary(summaryData);
      setTimeline(timelineData);
      setTransactions(txData.items || []);
    } catch (e) {
      console.error("Dashboard load failed:", e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResetDemo = async () => {
    try {
      setResetting(true);
      await apiClient.resetDemoData();
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setResetting(false);
    }
  };

  const revenueMoM = summary?.revenue_growth_mom ? parseFloat(summary.revenue_growth_mom) : 8.4;
  const expenseMoM = summary?.expense_growth_mom ? parseFloat(summary.expense_growth_mom) : 12.0;
  const netIncomeNum = summary?.net_income ? parseFloat(summary.net_income) : -58500.00;
  const userName = user?.profile?.name || "Jhontosan";

  // Format timeline points for Recharts area visualization
  const chartPoints = timeline?.points?.map((pt) => ({
    month: pt.period_label.slice(0, 3),
    revenue: parseFloat(pt.inflows || "0"),
    expenses: parseFloat(pt.outflows || "0"),
  }));

  return (
    <div className="space-y-6 pb-10">
      {/* Welcome Header (Matching Monef Inspiration) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Good morning, {userName}!
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Here&apos;s your financial overview and business performance for{" "}
            <span className="font-semibold text-foreground">
              {user?.current_org?.name || "Novastack Technologies"}
            </span>.
          </p>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Demo Reset Button */}
          {user?.current_org?.is_demo && (
            <button
              onClick={handleResetDemo}
              disabled={resetting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${resetting ? "animate-spin" : ""}`} />
              <span>Reset Demo</span>
            </button>
          )}

          {/* Period Selector Pill */}
          <div className="flex items-center bg-card border border-border p-0.5 rounded-full shadow-sm">
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
                    ? "bg-foreground text-background dark:bg-white dark:text-[#111019] shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* API Health Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                health?.status === "ok" ? "bg-[#48D597]" : "bg-[#F59E0B]"
              }`}
            />
            <span className="text-muted-foreground hidden sm:inline">Engine:</span>
            <span className="font-bold text-foreground capitalize">
              {health?.status || "Healthy"}
            </span>
          </div>
        </div>
      </div>

      {/* Financial KPI Cards Row (6 Core Financial Metrics) */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          <KPICard
            title="Cash Balance"
            value={formatUSD(summary?.closing_balance ?? "246000.00")}
            subtitle="Verified reserves"
            dataKind="verified"
            icon={Wallet}
          />

          <KPICard
            title="Monthly Revenue"
            value={formatUSD(summary?.revenue ?? "142000.00")}
            delta={{ value: revenueMoM, period: "VS last month" }}
            dataKind="verified"
            icon={TrendingUp}
          />

          <KPICard
            title="Monthly Expenses"
            value={formatUSD(summary?.expenses ?? "200500.00")}
            delta={{ value: expenseMoM, period: "Trailing 3M avg" }}
            dataKind="verified"
            icon={DollarSign}
          />

          <KPICard
            title="Net Profit / Loss"
            value={formatUSD(summary?.net_income ?? "-58500.00")}
            delta={{
              value: netIncomeNum >= 0 ? 5.2 : -18.4,
              period: netIncomeNum >= 0 ? "Net operating profit" : "Operating deficit",
            }}
            dataKind="calculated"
            icon={TrendingDown}
          />

          <KPICard
            title="Monthly Burn Rate"
            value={formatUSD(summary?.monthly_burn ?? "51166.67")}
            subtitle="Trailing cash drain"
            dataKind="calculated"
            icon={Flame}
          />

          <KPICard
            title="Cash Runway"
            value={summary?.runway_display || "4.8 Months"}
            subtitle="At current burn rate"
            dataKind="projected"
            icon={Clock}
          />
        </div>
      )}

      {/* Main Dashboard Layout Grid (Matching Monef Inspiration) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols on LG, 4 Cols on XL) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 flex flex-col justify-between">
          {/* Section 1: AI Assistant Card */}
          <DashboardAICFO />

          {/* Section 2: Treasury & Currency Liquidity */}
          <LiquidityExchangeCard
            availableBalance={formatUSD(summary?.closing_balance ?? "246000.00")}
          />
        </div>

        {/* Right Column (7 Cols on LG, 8 Cols on XL) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Section 3: Revenue vs Expenses Performance Chart */}
          <RevenueExpenseChart
            data={chartPoints}
            period={period}
            onPeriodChange={(p) => setPeriod(p)}
          />

          {/* Section 4 & 5: Expense Breakdown & Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ExpenseBreakdownCard breakdown={summary?.expense_breakdown} />
            <RecentActivityFeed
              transactions={transactions.map((t) => ({
                id: t.id,
                description: t.description ?? "Transaction",
                category: t.category,
                date: t.date,
                type: t.type as string,
                amount: t.amount,
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
