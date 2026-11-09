"use client";

import React from "react";
import { PieChart, MoreHorizontal } from "lucide-react";

interface ExpenseBreakdownProps {
  breakdown?: Record<string, string>;
}

export function ExpenseBreakdownCard({ breakdown }: ExpenseBreakdownProps) {
  const items = breakdown && Object.keys(breakdown).length > 0
    ? Object.entries(breakdown).map(([category, amount]) => ({
        name: category,
        amount: parseFloat(amount),
        pct: Math.min(100, Math.round((parseFloat(amount) / 200500) * 100)),
      }))
    : [
        { name: "Payroll & Salaries", amount: 110000, pct: 55 },
        { name: "Cloud Infrastructure", amount: 35000, pct: 17 },
        { name: "SaaS & Software", amount: 25000, pct: 12 },
        { name: "Office & Facilities", amount: 18500, pct: 9 },
        { name: "Legal & Professional", amount: 12000, pct: 6 },
      ];

  const colors = ["#8B7CFF", "#48D597", "#A78BFA", "#F07878", "#F59E0B"];

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
            <PieChart className="w-3.5 h-3.5 text-[#8B7CFF]" />
          </div>
          <span className="text-xs font-bold text-foreground">Expense Breakdown</span>
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Segmented Stems / Bars */}
      <div className="space-y-3 mt-3">
        {items.map((item, idx) => {
          const barColor = colors[idx % colors.length];
          return (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium truncate max-w-[150px]">
                  {item.name}
                </span>
                <span className="font-bold text-foreground tabular-nums">
                  ${item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${item.pct}%`, backgroundColor: barColor }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

