import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  isNumeric?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, isNumeric, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-xl border border-border bg-input px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CFF] focus-visible:border-transparent",
            "disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
            isNumeric && "tabular-nums text-right",
            error && "border-[#EF4444] focus-visible:ring-[#EF4444]",
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
Input.displayName = "Input";

