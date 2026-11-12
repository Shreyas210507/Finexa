"use client";

import React, { useState } from "react";
import { ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react";

interface LiquidityExchangeCardProps {
  availableBalance: string;
  trendPct?: number;
}

export function LiquidityExchangeCard({
  availableBalance,
  trendPct,
}: LiquidityExchangeCardProps) {
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

  // Strip non-numeric characters from balance for default exchange calculation
  const cleanBalance = parseFloat(availableBalance.replace(/[^0-9.-]+/g, "")) || 0;
  const [usdInput, setUsdInput] = useState<string>(
    cleanBalance > 0 ? (cleanBalance * 0.1).toFixed(2) : "1000.00"
  );
  const eurRate = 0.92;
  const numInput = parseFloat(usdInput) || 0;
  const eurAmount = (numInput * eurRate).toFixed(2);

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="rounded-3xl frosted-glass-card p-6 shadow-xl flex flex-col justify-between"
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-[#4318FF]/10 border border-[#4318FF]/20 flex items-center justify-center text-[#4318FF] dark:text-[#818CF8]">
              <ArrowUpDown className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-foreground">Treasury & Liquidity</span>
          </div>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/20">
            Active
          </span>
        </div>

        {/* Balance & Mini Trend Sparkline */}
        <div className="flex items-baseline justify-between mt-2">
          <div>
            <div className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-foreground font-financial">
              {availableBalance}
            </div>
            <span className="text-xs text-muted-foreground">Liquid operating reserves</span>
          </div>

          {trendPct !== undefined && (
            <div
              className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full font-financial ${
                trendPct >= 0
                  ? "text-[#34D399] bg-[#34D399]/15 border border-[#34D399]/20"
                  : "text-[#F07878] bg-[#F07878]/15 border border-[#F07878]/20"
              }`}
            >
              {trendPct >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{trendPct >= 0 ? `+${trendPct.toFixed(1)}%` : `${trendPct.toFixed(1)}%`}</span>
            </div>
          )}
        </div>
      </div>

      {/* Currency Exchange Widget */}
      <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
        <div className="flex items-center justify-between p-3 rounded-2xl glass-card border border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="text-base">🇺🇸</span>
            <span className="text-xs font-bold text-foreground">USD</span>
          </div>
          <input
            type="number"
            value={usdInput}
            onChange={(e) => setUsdInput(e.target.value)}
            className="w-28 text-right bg-transparent text-xs font-bold text-foreground font-financial focus:outline-none"
            placeholder="0.00"
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl glass-card border border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="text-base">🇪🇺</span>
            <span className="text-xs font-bold text-foreground">EUR</span>
          </div>
          <div className="text-xs font-bold text-foreground font-financial">
            €{parseFloat(eurAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>
  );
}
