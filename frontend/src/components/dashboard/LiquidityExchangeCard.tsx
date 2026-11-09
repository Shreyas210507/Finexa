"use client";

import React, { useState } from "react";
import { ArrowUpDown, TrendingUp } from "lucide-react";

interface LiquidityExchangeCardProps {
  availableBalance: string;
}

export function LiquidityExchangeCard({
  availableBalance,
}: LiquidityExchangeCardProps) {
  const [usdAmount] = useState("10000.00");
  const eurRate = 0.92;
  const eurAmount = (parseFloat(usdAmount || "0") * eurRate).toFixed(2);

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
              <ArrowUpDown className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-foreground">Treasury & Liquidity</span>
          </div>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#48D597]/15 text-[#48D597]">
            Active
          </span>
        </div>

        {/* Balance & Mini Trend Sparkline */}
        <div className="flex items-baseline justify-between mt-2">
          <div>
            <div className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-foreground tabular-nums">
              {availableBalance}
            </div>
            <span className="text-xs text-muted-foreground">Liquid operating reserves</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-[#48D597] bg-[#48D597]/15 px-2.5 py-1 rounded-full">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+8.4%</span>
          </div>
        </div>
      </div>

      {/* Currency Exchange Widget */}
      <div className="mt-6 pt-4 border-t border-border/60 space-y-2">
        <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border">
          <div className="flex items-center gap-2.5">
            <span className="text-base">🇺🇸</span>
            <span className="text-xs font-bold text-foreground">USD</span>
          </div>
          <div className="text-xs font-bold text-foreground tabular-nums">
            ${parseFloat(usdAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="relative flex justify-center -my-2.5 z-10">
          <div className="h-7 w-7 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground shadow-sm">
            <ArrowUpDown className="w-3 h-3 text-[#8B7CFF]" />
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border">
          <div className="flex items-center gap-2.5">
            <span className="text-base">🇪🇺</span>
            <span className="text-xs font-bold text-foreground">EUR</span>
          </div>
          <div className="text-xs font-bold text-foreground tabular-nums">
            €{parseFloat(eurAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>
  );
}
