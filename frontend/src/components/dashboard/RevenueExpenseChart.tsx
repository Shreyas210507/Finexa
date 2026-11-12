"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Activity, BarChart2 } from "lucide-react";

interface ChartPoint {
  month: string;
  revenue: number;
  expenses: number;
}

interface RevenueExpenseChartProps {
  data?: ChartPoint[];
  period: string;
  loading?: boolean;
  onPeriodChange?: (p: string) => void;
}

export function RevenueExpenseChart({
  data,
  period,
  loading = false,
  onPeriodChange,
}: RevenueExpenseChartProps) {
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

  const chartData = data || [];
  const hasData = chartData.length > 0;

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="rounded-3xl frosted-glass-card p-6 shadow-xl flex flex-col justify-between relative overflow-hidden"
    >
      {/* Background radial glow */}
      <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#4318FF]/10 blur-3xl" />

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-[#4318FF]/10 border border-[#4318FF]/20 flex items-center justify-center text-[#4318FF] dark:text-[#818CF8]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Revenue vs. Expenses</h3>
            <span className="text-[11px] text-muted-foreground">
              Cash trajectory & operating performance
            </span>
          </div>
        </div>

        {/* Legend & Period Selector */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <span className="h-2 w-2 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]" /> Revenue
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <span className="h-2 w-2 rounded-full bg-[#4318FF] shadow-[0_0_8px_#4318FF]" /> Expenses
            </span>
          </div>

          {onPeriodChange && (
            <div className="flex items-center bg-white/5 p-0.5 rounded-full border border-white/10">
              {["7d", "30d", "90d", "12m"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPeriodChange(p)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase transition-all ${
                    period === p
                      ? "bg-[#4318FF] text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recharts Area Chart or Empty State */}
      <div className="h-64 sm:h-72 w-full pt-2 relative z-10 flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="w-7 h-7 border-2 border-[#4318FF] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Loading cash flow trajectory...</span>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <BarChart2 className="w-10 h-10 mb-2 opacity-40 text-[#4318FF]" />
            <p className="text-sm font-semibold text-foreground">No Timeline Records</p>
            <p className="text-xs text-muted-foreground/80 mt-1 max-w-sm">
              No income or expense data recorded for the {period.toUpperCase()} period. Ingest ledger data or record transactions to visualize trajectory.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34D399" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#34D399" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4318FF" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#4318FF" stopOpacity={0.0} />
                </linearGradient>
                <filter id="neonGlowRevenue" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#34D399" floodOpacity="0.6" />
                </filter>
                <filter id="neonGlowExpense" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#4318FF" floodOpacity="0.6" />
                </filter>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />

              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                tickFormatter={(v) => `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
              />

              <Tooltip
                cursor={{ stroke: "rgba(129, 140, 248, 0.3)", strokeWidth: 1.5, strokeDasharray: "4 4" }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const revItem = payload.find((p) => p.dataKey === "revenue");
                    const expItem = payload.find((p) => p.dataKey === "expenses");
                    const revVal = Number(revItem?.value ?? payload[0]?.value ?? 0);
                    const expVal = Number(expItem?.value ?? payload[1]?.value ?? 0);
                    const net = revVal - expVal;

                    return (
                      <div className="rounded-2xl border border-border frosted-glass-tooltip p-3.5 text-foreground shadow-xl text-xs space-y-1.5 min-w-[170px]">
                        <div className="font-bold text-foreground pb-1 border-b border-border">
                          {String(label)}
                        </div>
                        <div className="flex items-center justify-between text-[#10B981] dark:text-[#34D399] font-semibold font-financial">
                          <span>● Revenue</span>
                          <span>${revVal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex items-center justify-between text-[#818CF8] font-semibold font-financial">
                          <span>● Expenses</span>
                          <span>${expVal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className={`flex items-center justify-between font-bold font-financial pt-1 border-t border-border ${net >= 0 ? "text-[#10B981] dark:text-[#34D399]" : "text-[#EF4444] dark:text-[#F07878]"}`}>
                          <span>Net Cash Flow</span>
                          <span>{net >= 0 ? `+$${net.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : `-$${Math.abs(net).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#34D399"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#revenueGrad)"
                filter="url(#neonGlowRevenue)"
                activeDot={{ r: 5, fill: "#34D399", stroke: "#050507", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#4318FF"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#expenseGrad)"
                filter="url(#neonGlowExpense)"
                activeDot={{ r: 5, fill: "#4318FF", stroke: "#050507", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
