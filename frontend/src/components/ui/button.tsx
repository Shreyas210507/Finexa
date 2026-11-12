import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "gradient";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4318FF] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none rounded-xl";

    const sizeStyles = {
      sm: "h-9 px-3 text-xs min-h-[36px] rounded-lg",
      md: "h-11 px-4 text-sm min-h-[44px] rounded-xl", // >= 44px touch target
      lg: "h-12 px-6 text-base min-h-[48px] rounded-2xl",
      icon: "h-11 w-11 min-h-[44px] min-w-[44px] p-0 flex items-center justify-center rounded-xl",
    };

    const variantStyles = {
      primary:
        "bg-[#4318FF] hover:bg-[#3615CC] text-white shadow-[0_4px_14px_rgba(67,24,255,0.35)] hover:shadow-[0_6px_20px_rgba(67,24,255,0.5)] active:scale-[0.98]",
      gradient:
        "bg-gradient-to-r from-[#4318FF] via-[#5B33FF] to-[#00F0FF] text-white shadow-[0_4px_16px_rgba(67,24,255,0.35)] hover:opacity-95 active:scale-[0.98]",
      secondary:
        "glass-card text-foreground border border-white/10 hover:border-white/20 hover:bg-white/5 active:scale-[0.98]",
      outline:
        "border border-white/10 bg-transparent hover:bg-white/5 text-foreground active:scale-[0.98]",
      ghost:
        "bg-transparent hover:bg-white/5 text-foreground active:scale-[0.98]",
      destructive:
        "bg-[#F07878] hover:bg-[#e06565] text-white shadow-sm active:scale-[0.98]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Loading...
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

