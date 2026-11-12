"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, HelpCircle } from "lucide-react";
import { LabelChip, DataKind } from "./chips";
import { AnimatedNumber } from "./animated-number";

export interface KPICardProps {
  title: string;
  value: string | number;
  delta?: {
    value: number;
    period?: string;
  };
  dataKind?: DataKind;
  icon?: React.ComponentType<{ className?: string }>;
  subtitle?: string;
  tooltip?: string;
  freshness?: string;
  className?: string;
  href?: string;
}

export function KPICard({
  title,
  value,
  delta,
  dataKind = "verified",
  icon: Icon,
  subtitle,
  tooltip,
  freshness,
  className,
  href,
}: KPICardProps) {
  const isPositive = delta ? delta.value > 0 : null;
  const isZero = delta ? delta.value === 0 : null;
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

  const cardContent = (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "relative rounded-2xl frosted-glass-card p-4 sm:p-5 transition-all duration-300 flex flex-col justify-between group h-full select-none overflow-hidden",
        href && "cursor-pointer hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_20px_40px_rgba(0,0,0,0.65),0_0_24px_rgba(67,24,255,0.22)] hover:border-[#818CF8]/40 active:scale-[0.99]",
        !href && "hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.60),0_0_20px_rgba(67,24,255,0.16)] hover:border-white/20",
        className
      )}
    >
      {/* Top Header Row: Icon on left, Tag / Delta Badge + Arrow on right */}
      <div className="flex items-center justify-between gap-2">
        {Icon ? (
          <div className="h-8 w-8 rounded-xl bg-[#4318FF]/15 text-[#4318FF] dark:text-[#818CF8] border border-[#4318FF]/25 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 shadow-[0_0_12px_rgba(67,24,255,0.15)]">
            <Icon className="w-4 h-4" />
          </div>
        ) : (
          <div />
        )}

        {/* Delta Pill Badge or DataKind Tag + Arrow */}
        <div className="flex items-center gap-1.5 shrink-0">
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full font-financial whitespace-nowrap",
                isZero
                  ? "bg-white/5 text-muted-foreground"
                  : isPositive
                  ? "bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/25 shadow-[0_0_8px_rgba(52,211,153,0.15)]"
                  : "bg-[#F07878]/15 text-[#F07878] border border-[#F07878]/25 shadow-[0_0_8px_rgba(240,120,120,0.15)]"
              )}
            >
              {isZero ? (
                <Minus className="w-3 h-3 shrink-0" />
              ) : isPositive ? (
                <TrendingUp className="w-3 h-3 shrink-0" />
              ) : (
                <TrendingDown className="w-3 h-3 shrink-0" />
              )}
              <span>{isPositive ? `+${delta.value}%` : `${delta.value}%`}</span>
            </span>
          )}
          {dataKind && !delta && <LabelChip kind={dataKind} compact />}
          {href && (
            <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground/40 group-hover:text-[#818CF8] group-hover:bg-[#4318FF]/20 transition-all shrink-0">
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          )}
        </div>
      </div>

      {/* Main Metric Section */}
      <div className="mt-3.5">
        {/* Title row with optional tooltip & freshness */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 min-w-0">
            <span
              className="text-xs font-semibold text-muted-foreground tracking-tight group-hover:text-foreground transition-colors truncate"
              title={title}
            >
              {title}
            </span>
            {tooltip && (
              <span
                className="text-muted-foreground/50 hover:text-foreground/80 transition-colors cursor-help shrink-0"
                title={tooltip}
                aria-label={tooltip}
              >
                <HelpCircle className="w-3 h-3" />
              </span>
            )}
          </div>
          {freshness && (
            <span className="text-[9px] font-medium text-muted-foreground/60 shrink-0 font-financial">
              {freshness}
            </span>
          )}
        </div>

        {/* Large Monetary / Numeric Value */}
        <div className="text-xl sm:text-2xl xl:text-[25px] font-extrabold tracking-tight text-foreground font-financial mt-1 truncate">
          {typeof value === "number" ? (
            <AnimatedNumber value={value} />
          ) : typeof value === "string" && value.startsWith("$") && !isNaN(parseFloat(value.replace(/[^0-9.-]+/g, ""))) ? (
            <AnimatedNumber
              prefix="$"
              value={parseFloat(value.replace(/[^0-9.-]+/g, ""))}
              decimals={value.includes(".") ? Math.min(2, value.split(".")[1]?.length || 2) : 2}
            />
          ) : (
            value
          )}
        </div>

        {/* Subtitle / Period */}
        {(delta?.period || subtitle) && (
          <div className="mt-1 text-[11px] text-muted-foreground/80 truncate">
            {delta?.period ? delta.period : subtitle}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full group focus:outline-none">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
