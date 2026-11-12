"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface GlassInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  isNumeric?: boolean;
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, type, error, isNumeric, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-xl frosted-glass-input px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8]/40 focus-visible:border-transparent",
            "disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
            isNumeric && "tabular-nums text-right font-financial",
            error && "border-[#EF4444] focus-visible:ring-[#EF4444]/40",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-[#EF4444]">{error}</p>
        )}
      </div>
    );
  }
);
GlassInput.displayName = "GlassInput";

