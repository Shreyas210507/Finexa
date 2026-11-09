import * as React from "react";
import { cn } from "@/lib/utils";
import { Sparkles, ArrowRight } from "lucide-react";
import { LabelChip } from "./chips";
import { Button } from "./button";

export interface AIInsightPanelProps {
  title: string;
  description: string;
  recommendation?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function AIInsightPanel({
  title,
  description,
  recommendation,
  actionLabel,
  onAction,
  className,
}: AIInsightPanelProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[10px] border border-border bg-card p-5 shadow-sm transition-colors",
        "dark:bg-gradient-to-br dark:from-[#111B32] dark:via-[#0D1428] dark:to-[#111B32] dark:border-[#315BFF]/30 dark:shadow-md",
        className
      )}
    >
      {/* Top Gradient Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#20D9F2] via-[#315BFF] to-[#963BFF]" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#315BFF]/10 text-[#315BFF] dark:bg-gradient-to-r dark:from-[#20D9F2]/20 dark:via-[#315BFF]/20 dark:to-[#963BFF]/20 dark:text-[#20D9F2]">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#315BFF] dark:text-[#20D9F2]">
            FINEXA AI Intelligence
          </span>
        </div>
        <LabelChip kind="recommendation" />
      </div>

      <div className="mt-3">
        <h4 className="text-base font-semibold text-foreground">{title}</h4>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {recommendation && (
        <div className="mt-3.5 p-3.5 rounded-lg bg-card border border-border text-xs text-foreground shadow-sm flex items-start gap-2.5">
          <span className="font-bold text-[#315BFF] dark:text-[#20D9F2] shrink-0">Insight:</span>
          <span className="leading-relaxed text-foreground/90">{recommendation}</span>
        </div>
      )}

      {actionLabel && onAction && (
        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            variant="gradient"
            onClick={onAction}
            className="flex items-center gap-1.5"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
