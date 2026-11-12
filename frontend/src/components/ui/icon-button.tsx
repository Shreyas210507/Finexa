import * as React from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "glass";
  size?: "xs" | "sm" | "md" | "lg";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = "ghost",
      size = "md",
      icon: Icon,
      label,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      xs: "h-7 w-7 min-h-[28px] min-w-[28px] rounded-lg",
      sm: "h-9 w-9 min-h-[36px] min-w-[36px] rounded-lg",
      md: "h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl",
      lg: "h-12 w-12 min-h-[48px] min-w-[48px] rounded-2xl",
    };

    const iconSizes = {
      xs: "w-3.5 h-3.5",
      sm: "w-4 h-4",
      md: "w-4 h-4",
      lg: "w-5 h-5",
    };

    const variantStyles = {
      primary:
        "bg-[#4318FF] hover:bg-[#3615CC] text-white shadow-[0_4px_14px_rgba(67,24,255,0.35)]",
      secondary:
        "glass-card text-foreground border border-white/10 hover:border-white/20 hover:bg-white/5",
      outline:
        "border border-white/10 bg-transparent hover:bg-white/5 text-foreground",
      ghost:
        "bg-transparent hover:bg-white/5 text-muted-foreground hover:text-foreground",
      glass:
        "liquid-glass text-foreground hover:border-white/30",
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8] disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.95]",
          sizeStyles[size],
          variantStyles[variant],
          className
        )}
        {...props}
      >
        <Icon className={iconSizes[size]} />
      </button>
    );
  }
);
IconButton.displayName = "IconButton";

