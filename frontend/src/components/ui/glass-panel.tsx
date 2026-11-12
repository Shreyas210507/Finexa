"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "thick" | "standard" | "elevated";
  padded?: boolean;
}

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, variant = "thick", padded = true, children, ...props }, ref) => {
    const variantStyles = {
      thick: "frosted-glass-panel",
      standard: "glass-card",
      elevated: "frosted-glass-panel shadow-[0_24px_50px_rgba(0,0,0,0.8)] border-white/15",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl transition-all duration-300 relative overflow-hidden",
          variantStyles[variant],
          padded && "p-5 sm:p-6",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
GlassPanel.displayName = "GlassPanel";

