"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PieChart, MoreHorizontal, Inbox, ArrowUpRight } from "lucide-react";

interface ExpenseBreakdownProps {
  breakdown?: Record<string, string>;
}

export function ExpenseBreakdownCard({ breakdown }: ExpenseBreakdownProps) {
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

  const entries = breakdown ? Object.entries(breakdown) : [];
  const totalExpenses = entries.reduce((acc, [, amount]) => acc + parseFloat(amount || "0"), 0);

  const items = entries.map(([category, amount]) => {
    const num = parseFloat(amount || "0");
    const pct = totalExpenses > 0 ? Math.min(100, Math.round((num / totalExpenses) * 100)) : 0;
    return {
      name: category,
      amount: num,
      pct,
    };
  }).sort((a, b) => b.amount - a.amount);

  const colors = ["#4318FF", "#34D399", "#00F0FF", "#F07878", "#F59E0B", "#818CF8"];

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="rounded-3xl frosted-glass-card p-6 shadow-xl flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-[#4318FF]/10 border border-[#4318FF]/20 flex items-center justify-center text-[#4318FF] dark:text-[#818CF8]">
            <PieChart className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-foreground">Expense Breakdown</span>
        </div>
        <button
          type="button"
          onClick={() => router.push("/reports?report_type=pnl")}
          className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1 text-[11px]"
          title="View detailed expense report"
          aria-label="View detailed expense report"
        >
          <span className="hidden sm:inline">Details</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Segmented Stems / Bars */}
      <div className="space-y-3 mt-3 min-h-[180px] flex flex-col justify-center">
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <Inbox className="w-6 h-6 mx-auto mb-2 text-muted-foreground/60" />
            <p className="font-semibold text-foreground">No expense categories</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Expenses will be automatically grouped as transactions are recorded.
            </p>
          </div>
        ) : (
          items.slice(0, 5).map((item, idx) => {
            const barColor = colors[idx % colors.length];
            return (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium truncate max-w-[150px]">
                    {item.name}
                  </span>
                  <span className="font-bold text-foreground font-financial">
                    ${item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ({item.pct}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(67,24,255,0.3)]"
                    style={{ width: `${item.pct}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
