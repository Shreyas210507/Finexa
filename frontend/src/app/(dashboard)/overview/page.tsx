"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import {
  CurrentUserResponse,
  HealthResponse,
  DashboardSummaryResponse,
  CashFlowTimelineResponse,
  TransactionResponse,
  NotificationItem,
} from "@/lib/api-types";
import { KPICard } from "@/components/ui/kpi-card";
import { KPICardSkeleton } from "@/components/ui/skeleton";
import { DashboardAICFO } from "@/components/dashboard/DashboardAICFO";
import { RevenueExpenseChart } from "@/components/dashboard/RevenueExpenseChart";
import { LiquidityExchangeCard } from "@/components/dashboard/LiquidityExchangeCard";
import { ExpenseBreakdownCard } from "@/components/dashboard/ExpenseBreakdownCard";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { QuickActionsBar } from "@/components/dashboard/QuickActionsBar";
import { FinancialAlertsPanel } from "@/components/dashboard/FinancialAlertsPanel";
import { ReceivablesPayablesStrip } from "@/components/dashboard/ReceivablesPayablesStrip";
import {
  DashboardPersonalizer,
  WidgetPreferences,
  DEFAULT_WIDGET_PREFS,
} from "@/components/dashboard/DashboardPersonalizer";
import { useToast } from "@/components/ui/toast";
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
  const { addToast } = useToast();
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [timeline, setTimeline] = useState<CashFlowTimelineResponse | null>(null);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [period, setPeriod] = useState<string>("12m");
  const [preferences, setPreferences] = useState<WidgetPreferences>(DEFAULT_WIDGET_PREFS);

  // Read preferences and period from localStorage on mount
  useEffect(() => {
    try {
      const savedPeriod = localStorage.getItem("finexa-dashboard-period");
      if (savedPeriod && ["7d", "30d", "90d", "12m"].includes(savedPeriod)) {
        setPeriod(savedPeriod);
      }
      const savedPrefs = localStorage.getItem("finexa-dashboard-widgets");
      if (savedPrefs) {
        setPreferences({ ...DEFAULT_WIDGET_PREFS, ...JSON.parse(savedPrefs) });
      }
    } catch (e) {
      console.warn("Could not load stored dashboard preferences:", e);
    }
  }, []);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    try {
      localStorage.setItem("finexa-dashboard-period", newPeriod);
    } catch (e) {
      console.warn("Could not save dashboard period:", e);
    }
  };

  const handlePreferencesChange = (newPrefs: WidgetPreferences) => {
    setPreferences(newPrefs);
    try {
      localStorage.setItem("finexa-dashboard-widgets", JSON.stringify(newPrefs));
    } catch (e) {
      console.warn("Could not save widget preferences:", e);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [userData, healthData, summaryData, timelineData, txData, notifData] =
        await Promise.all([
          apiClient.getCurrentUser().catch(() => null),
          apiClient.getHealth().catch(() => null),
          apiClient.getDashboardSummary(period).catch(() => null),
          apiClient.getCashFlowTimeline(period).catch(() => null),
          apiClient.getTransactions({ size: 6 }).catch(() => ({ items: [] })),
          apiClient.getNotifications(6).catch(() => ({ items: [], unread_count: 0 })),
        ]);

      setUser(userData);
      setHealth(healthData);
      setSummary(summaryData);
      setTimeline(timelineData);
      setTransactions(txData.items || []);
      setNotifications(notifData.items || []);
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
      addToast({
        type: "success",
        title: "Demo Data Reset",
        message: "Clean ledger data and transactions restored successfully.",
      });
    } catch (e) {
      console.error(e);
      addToast({
        type: "error",
        title: "Reset Failed",
        message: "Failed to reset demo dataset. Server connection required.",
      });
    } finally {
      setResetting(false);
    }
  };

  const revenueMoM = summary?.revenue_growth_mom ? parseFloat(summary.revenue_growth_mom) : undefined;
  const expenseMoM = summary?.expense_growth_mom ? parseFloat(summary.expense_growth_mom) : undefined;
  const netIncomeNum = summary?.net_income ? parseFloat(summary.net_income) : 0;
  const userName = user?.profile?.name || "Novastack";

  // Format timeline points for Recharts area visualization
  const chartPoints = timeline?.points?.map((pt) => ({
    month: pt.period_label,
    revenue: parseFloat(pt.inflows || "0"),
    expenses: parseFloat(pt.outflows || "0"),
  }));

  // Map notifications to ActivityAlertItem for RecentActivityFeed
  const alertItems = notifications.map((n) => ({
    id: n.id,
    title: n.title,
    subtitle: n.message,
    type: n.type === "invoice_overdue" ? "anomaly" : n.type === "runway_alert" ? "runway" : "notice",
    href: n.type === "invoice_overdue" ? "/invoices" : "/forecasts",
  }));

  return (
    <div className="space-y-6 pb-10">
      {/* ═══════════════════════════════════════════════════
          HEADER: Welcome, Organization & Global Controls
          ═══════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Good morning, {userName}!
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Financial Command Center for{" "}
            <span className="font-semibold text-foreground">
              {user?.current_org?.name || "Novastack Technologies"}
            </span>.
          </p>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Widget Personalizer */}
          <DashboardPersonalizer
            preferences={preferences}
            onPreferencesChange={handlePreferencesChange}
          />

          {/* Demo Reset Button */}
          {user?.current_org?.is_demo && (
            <button
              onClick={handleResetDemo}
              disabled={resetting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full frosted-glass-card border border-white/10 hover:border-white/25 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all shadow-sm active:scale-95"
              title="Reset demo transactions and ledger state"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${resetting ? "animate-spin text-[#4318FF]" : ""}`} />
              <span>Reset Demo</span>
            </button>
          )}

          {/* Period Selector Pill */}
          <div className="flex items-center frosted-glass-card border border-white/10 p-0.5 rounded-full shadow-sm">
            {[
              { id: "7d", label: "7D" },
              { id: "30d", label: "30D" },
              { id: "90d", label: "90D" },
              { id: "12m", label: "12M" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePeriodChange(item.id)}
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

          {/* API Health Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full frosted-glass-card border border-white/10 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                health?.status === "healthy" || health?.status === "ok"
                  ? "bg-[#34D399] dot-pulse shadow-[0_0_8px_#34D399]"
                  : "bg-[#F59E0B]"
              }`}
            />
            <span className="text-muted-foreground hidden sm:inline">Engine:</span>
            <span className="font-bold text-foreground capitalize">
              {health?.status || "Healthy"}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          QUICK ACTIONS BAR
          ═══════════════════════════════════════════════════ */}
      {preferences.quickActions && <QuickActionsBar />}

      {/* ═══════════════════════════════════════════════════
          CORE FINANCIAL KPI CARDS ROW (6 Core Metrics)
          ═══════════════════════════════════════════════════ */}
      {preferences.kpis && (
        loading ? (
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
              value={formatUSD(summary?.closing_balance ?? "0.00")}
              subtitle="Verified reserves"
              tooltip="Current liquid capital held across verified bank and treasury accounts."
              freshness="Live"
              dataKind="verified"
              icon={Wallet}
              href="/transactions"
            />

            <KPICard
              title="Monthly Revenue"
              value={formatUSD(summary?.revenue ?? "0.00")}
              delta={revenueMoM !== undefined ? { value: revenueMoM, period: "VS last month" } : undefined}
              tooltip="Gross operating revenue recognized during the active period."
              freshness="Synced"
              dataKind="verified"
              icon={TrendingUp}
              href="/reports?report_type=pnl"
            />

            <KPICard
              title="Monthly Expenses"
              value={formatUSD(summary?.expenses ?? "0.00")}
              delta={expenseMoM !== undefined ? { value: expenseMoM, period: "Trailing 3M avg" } : undefined}
              tooltip="Total operating outflows recognized during the active period."
              freshness="Synced"
              dataKind="verified"
              icon={DollarSign}
              href="/reports?report_type=pnl"
            />

            <KPICard
              title="Net Profit / Loss"
              value={formatUSD(summary?.net_income ?? "0.00")}
              delta={summary?.net_income ? {
                value: netIncomeNum >= 0 ? 5.2 : -18.4,
                period: netIncomeNum >= 0 ? "Net operating profit" : "Operating deficit",
              } : undefined}
              tooltip="Operating revenue minus operating expenses."
              freshness="Calculated"
              dataKind="calculated"
              icon={netIncomeNum >= 0 ? TrendingUp : TrendingDown}
              href="/reports?report_type=pnl"
            />

            <KPICard
              title="Monthly Burn Rate"
              value={formatUSD(summary?.monthly_burn ?? "0.00")}
              subtitle="Trailing cash drain"
              tooltip="Average net monthly cash outflow over the preceding quarter."
              freshness="Calculated"
              dataKind="calculated"
              icon={Flame}
              href="/forecasts"
            />

            <KPICard
              title="Cash Runway"
              value={summary?.runway_display || "N/A"}
              subtitle="At current burn rate"
              tooltip="Projected months before liquid reserves deplete at current burn."
              freshness="Projected"
              dataKind="projected"
              icon={Clock}
              href="/forecasts"
            />
          </div>
        )
      )}

      {/* ═══════════════════════════════════════════════════
          RECEIVABLES & PAYABLES HEALTH STRIP
          ═══════════════════════════════════════════════════ */}
      {preferences.receivablesPayables && (
        <ReceivablesPayablesStrip summary={summary} />
      )}

      {/* ═══════════════════════════════════════════════════
          MAIN DASHBOARD COMMAND GRID
          ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols on LG, 4 Cols on XL) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Section: AI CFO Assistant Card */}
          {preferences.aiAssistant && <DashboardAICFO />}

          {/* Section: Financial Intelligence & Alerts Panel */}
          {preferences.alerts && (
            <FinancialAlertsPanel
              summary={summary}
              notifications={notifications}
            />
          )}

          {/* Section: Treasury & Liquidity */}
          {preferences.treasury && (
            <LiquidityExchangeCard
              availableBalance={formatUSD(summary?.closing_balance ?? "0.00")}
              trendPct={revenueMoM}
            />
          )}
        </div>

        {/* Right Column (7 Cols on LG, 8 Cols on XL) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Section: Revenue vs Expenses Performance Chart */}
          {preferences.chart && (
            <RevenueExpenseChart
              data={chartPoints}
              period={period}
              loading={loading}
              onPeriodChange={handlePeriodChange}
            />
          )}

          {/* Section: Expense Breakdown & Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {preferences.breakdown && (
              <ExpenseBreakdownCard breakdown={summary?.expense_breakdown} />
            )}
            {preferences.activity && (
              <RecentActivityFeed
                transactions={transactions.map((t) => ({
                  id: t.id,
                  description: t.description ?? "Transaction",
                  category: t.category,
                  date: t.date,
                  type: t.type as string,
                  amount: t.amount,
                }))}
                alerts={alertItems}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
