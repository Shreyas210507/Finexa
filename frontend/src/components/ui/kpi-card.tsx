import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LabelChip, DataKind } from "./chips";

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
  className?: string;
}

export function KPICard({
  title,
  value,
  delta,
  dataKind = "verified",
  icon: Icon,
  subtitle,
  className,
}: KPICardProps) {
  const isPositive = delta ? delta.value > 0 : null;
  const isZero = delta ? delta.value === 0 : null;

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:border-border/80 flex flex-col justify-between group",
        "hover:shadow-md",
        className
      )}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <span className="text-xs font-semibold text-muted-foreground tracking-tight">
            {title}
          </span>
        </div>

        {/* Delta Pill Badge or DataKind */}
        <div className="flex items-center gap-2">
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full tabular-nums",
                isZero
                  ? "bg-muted text-muted-foreground"
                  : isPositive
                  ? "bg-[#48D597]/15 text-[#48D597]"
                  : "bg-[#F07878]/15 text-[#F07878]"
              )}
            >
              {isZero ? (
                <Minus className="w-3 h-3" />
              ) : isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {isPositive ? `+${delta.value}%` : `${delta.value}%`}
            </span>
          )}
          {dataKind && !delta && <LabelChip kind={dataKind} />}
        </div>
      </div>

      {/* Main Monetary Value */}
      <div className="mt-4">
        <div className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-foreground tabular-nums">
          {value}
        </div>

        {/* Subtitle / Period */}
        {(delta?.period || subtitle) && (
          <div className="mt-1.5 text-xs text-muted-foreground">
            {delta?.period ? delta.period : subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
