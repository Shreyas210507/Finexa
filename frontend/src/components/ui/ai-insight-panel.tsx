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
        "relative overflow-hidden rounded-2xl glass-card p-5 shadow-lg transition-all",
        "border border-white/10 hover:border-white/20",
        className
      )}
    >
      {/* Top Gradient Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#4318FF] via-[#00F0FF] to-[#34D399]" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#4318FF]/15 text-[#00F0FF] border border-[#4318FF]/25">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00F0FF]">
            FINEXA AI Intelligence
          </span>
        </div>
        <LabelChip kind="recommendation" />
      </div>

      <div className="mt-3">
        <h4 className="text-base font-bold text-foreground">{title}</h4>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {recommendation && (
        <div className="mt-3.5 p-3.5 rounded-xl glass-card border border-white/10 text-xs text-foreground shadow-sm flex items-start gap-2.5">
          <span className="font-bold text-[#00F0FF] shrink-0">Insight:</span>
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
