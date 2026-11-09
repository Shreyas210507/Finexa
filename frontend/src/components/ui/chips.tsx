import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Calculator, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";

export type DataKind = "verified" | "calculated" | "forecast" | "projected" | "assumption" | "recommendation";

interface LabelChipProps {
  kind: DataKind;
  className?: string;
}

export function LabelChip({ kind, className }: LabelChipProps) {
  const configs: Record<
    DataKind,
    { label: string; icon: React.ComponentType<{ className?: string }>; bg: string; text: string; border: string }
  > = {
    verified: {
      label: "Verified data",
      icon: CheckCircle2,
      bg: "bg-[#22C55E]/10",
      text: "text-[#22C55E]",
      border: "border-[#22C55E]/30",
    },
    calculated: {
      label: "Calculated estimate",
      icon: Calculator,
      bg: "bg-[#8B7CFF]/10",
      text: "text-[#8B7CFF]",
      border: "border-[#8B7CFF]/30",
    },
    forecast: {
      label: "Forecast",
      icon: TrendingUp,
      bg: "bg-[#A78BFA]/10",
      text: "text-[#A78BFA]",
      border: "border-[#A78BFA]/30",
    },
    projected: {
      label: "Projected",
      icon: TrendingUp,
      bg: "bg-[#A78BFA]/10",
      text: "text-[#A78BFA]",
      border: "border-[#A78BFA]/30",
    },
    assumption: {
      label: "Assumption",
      icon: AlertTriangle,
      bg: "bg-[#F59E0B]/10",
      text: "text-[#F59E0B]",
      border: "border-[#F59E0B]/30",
    },
    recommendation: {
      label: "Recommendation",
      icon: Sparkles,
      bg: "bg-[#8B7CFF]/10",
      text: "text-[#8B7CFF]",
      border: "border-[#8B7CFF]/30",
    },
  };

  const config = configs[kind];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border select-none transition-colors",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
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
    paid: { bg: "bg-[#22C55E]/10", text: "text-[#22C55E]", dot: "bg-[#22C55E]" },
    completed: { bg: "bg-[#22C55E]/10", text: "text-[#22C55E]", dot: "bg-[#22C55E]" },
    active: { bg: "bg-[#22C55E]/10", text: "text-[#22C55E]", dot: "bg-[#22C55E]" },
    
    pending: { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", dot: "bg-[#F59E0B]" },
    sent: { bg: "bg-[#8B7CFF]/10", text: "text-[#8B7CFF]", dot: "bg-[#8B7CFF]" },
    partially_paid: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", dot: "bg-[#F59E0B]" },
    needs_approval: { bg: "bg-[#A78BFA]/10", text: "text-[#A78BFA]", dot: "bg-[#A78BFA]" },
    running: { bg: "bg-[#8B7CFF]/10", text: "text-[#8B7CFF]", dot: "bg-[#8B7CFF] animate-pulse" },
    
    draft: { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" },
    inactive: { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" },
    
    overdue: { bg: "bg-[#EF4444]/10", text: "text-[#EF4444]", dot: "bg-[#EF4444]" },
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

