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
import { Activity } from "lucide-react";

interface ChartPoint {
  month: string;
  revenue: number;
  expenses: number;
}

interface RevenueExpenseChartProps {
  data?: ChartPoint[];
  period: string;
  onPeriodChange?: (p: string) => void;
}

export function RevenueExpenseChart({
  data,
  period,
  onPeriodChange,
}: RevenueExpenseChartProps) {
  // Default benchmark dataset if loading
  const chartData = data && data.length > 0 ? data : [
    { month: "Jan", revenue: 85000, expenses: 95000 },
    { month: "Feb", revenue: 92000, expenses: 102000 },
    { month: "Mar", revenue: 105000, expenses: 110000 },
    { month: "Apr", revenue: 115000, expenses: 125000 },
    { month: "May", revenue: 122000, expenses: 140000 },
    { month: "Jun", revenue: 130000, expenses: 155000 },
    { month: "Jul", revenue: 138000, expenses: 172000 },
    { month: "Aug", revenue: 145000, expenses: 185000 },
    { month: "Sep", revenue: 138000, expenses: 192000 },
    { month: "Oct", revenue: 142000, expenses: 200500 },
  ];

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
            <Activity className="w-4 h-4 text-[#8B7CFF]" />
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
              <span className="h-2 w-2 rounded-full bg-[#48D597]" /> Revenue
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <span className="h-2 w-2 rounded-full bg-[#8B7CFF]" /> Expenses
            </span>
          </div>

          {onPeriodChange && (
            <div className="flex items-center bg-muted/50 p-0.5 rounded-full border border-border">
              {["7d", "30d", "90d", "12m"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPeriodChange(p)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase transition-all ${
                    period === p
                      ? "bg-foreground text-background dark:bg-white dark:text-[#111019] shadow-sm"
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

      {/* Recharts Area Chart */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#48D597" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#48D597" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B7CFF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8B7CFF" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 147, 165, 0.1)" />

            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9693A5", fontSize: 11, fontWeight: 500 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9693A5", fontSize: 10 }}
              tickFormatter={(v) => `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-2xl border border-border bg-[#191823] p-3 text-white shadow-xl text-xs space-y-1.5 min-w-[130px]">
                      <div className="font-bold text-[#A78BFA] pb-1 border-b border-white/10">
                        {label} 2026
                      </div>
                      <div className="flex items-center justify-between text-[#48D597] font-semibold">
                        <span>● Revenue</span>
                        <span>${Number(payload[0]?.value).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#8B7CFF] font-semibold">
                        <span>● Expenses</span>
                        <span>${Number(payload[1]?.value).toLocaleString()}</span>
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
              stroke="#48D597"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#revenueGrad)"
              activeDot={{ r: 5, fill: "#48D597", stroke: "#111019", strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="#8B7CFF"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#expenseGrad)"
              activeDot={{ r: 5, fill: "#8B7CFF", stroke: "#111019", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
