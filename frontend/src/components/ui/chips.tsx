import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Calculator, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";

export type DataKind = "verified" | "calculated" | "forecast" | "projected" | "assumption" | "recommendation";

interface LabelChipProps {
  kind: DataKind;
  compact?: boolean;
  className?: string;
}

export function LabelChip({ kind, compact = false, className }: LabelChipProps) {
  const configs: Record<
    DataKind,
    { label: string; compactLabel: string; icon: React.ComponentType<{ className?: string }>; bg: string; text: string; border: string }
  > = {
    verified: {
      label: "Verified data",
      compactLabel: "Verified",
      icon: CheckCircle2,
      bg: "bg-[#34D399]/10",
      text: "text-[#34D399]",
      border: "border-[#34D399]/30",
    },
    calculated: {
      label: "Calculated estimate",
      compactLabel: "Calculated",
      icon: Calculator,
      bg: "bg-[#4318FF]/10",
      text: "text-[#4318FF] dark:text-[#818CF8]",
      border: "border-[#4318FF]/30",
    },
    forecast: {
      label: "Forecast",
      compactLabel: "Forecast",
      icon: TrendingUp,
      bg: "bg-[#00F0FF]/10",
      text: "text-[#00F0FF]",
      border: "border-[#00F0FF]/30",
    },
    projected: {
      label: "Projected",
      compactLabel: "Projected",
      icon: TrendingUp,
      bg: "bg-[#4318FF]/10",
      text: "text-[#4318FF] dark:text-[#818CF8]",
      border: "border-[#4318FF]/30",
    },
    assumption: {
      label: "Assumption",
      compactLabel: "Assumption",
      icon: AlertTriangle,
      bg: "bg-[#F59E0B]/10",
      text: "text-[#F59E0B]",
      border: "border-[#F59E0B]/30",
    },
    recommendation: {
      label: "Recommendation",
      compactLabel: "AI Advised",
      icon: Sparkles,
      bg: "bg-[#4318FF]/10",
      text: "text-[#4318FF] dark:text-[#818CF8]",
      border: "border-[#4318FF]/30",
    },
  };

  const config = configs[kind];
  const Icon = config.icon;
  const displayLabel = compact ? config.compactLabel : config.label;

  return (
    <span
      className={cn(
        "inline-flex items-center select-none whitespace-nowrap transition-colors border",
        compact
          ? "gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold font-financial"
          : "gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <Icon className={cn("shrink-0", compact ? "w-2.5 h-2.5" : "w-3 h-3")} />
      <span>{displayLabel}</span>
    </span>
  );
}

export type StatusVariant =
  | "paid"
  | "pending"
  | "overdue"
  | "draft"
  | "sent"
  | "partially_paid"
  | "cancelled"
  | "running"
  | "completed"
  | "failed"
  | "needs_approval"
  | "active"
  | "inactive";

interface StatusChipProps {
  status: StatusVariant | string;
  label?: string;
  className?: string;
}

export function StatusChip({ status, label, className }: StatusChipProps) {
  const normalized = status.toLowerCase().replace(/[\s-]/g, "_") as StatusVariant;

  const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
    paid: { bg: "bg-[#34D399]/10", text: "text-[#34D399]", dot: "bg-[#34D399] dot-pulse" },
    completed: { bg: "bg-[#34D399]/10", text: "text-[#34D399]", dot: "bg-[#34D399]" },
    active: { bg: "bg-[#34D399]/10", text: "text-[#34D399]", dot: "bg-[#34D399] dot-pulse" },
    
    pending: { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", dot: "bg-[#F59E0B] dot-pulse" },
    sent: { bg: "bg-[#4318FF]/10", text: "text-[#4318FF] dark:text-[#818CF8]", dot: "bg-[#4318FF] dark:bg-[#818CF8]" },
    partially_paid: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", dot: "bg-[#F59E0B]" },
    needs_approval: { bg: "bg-[#4318FF]/10", text: "text-[#4318FF] dark:text-[#818CF8]", dot: "bg-[#4318FF]" },
    running: { bg: "bg-[#00F0FF]/10", text: "text-[#00F0FF]", dot: "bg-[#00F0FF] dot-pulse" },
    
    draft: { bg: "bg-white/5", text: "text-muted-foreground", dot: "bg-muted-foreground" },
    inactive: { bg: "bg-white/5", text: "text-muted-foreground", dot: "bg-muted-foreground" },
    
    overdue: { bg: "bg-[#EF4444]/10", text: "text-[#EF4444]", dot: "bg-[#EF4444] dot-pulse" },
    failed: { bg: "bg-[#EF4444]/10", text: "text-[#EF4444]", dot: "bg-[#EF4444]" },
    cancelled: { bg: "bg-[#EF4444]/10", text: "text-[#EF4444]", dot: "bg-[#EF4444]" },
  };

  const style = statusStyles[normalized] || {
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  };

  const displayLabel =
    label ||
    status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium select-none",
        style.bg,
        style.text,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
      <span>{displayLabel}</span>
    </span>
  );
}

