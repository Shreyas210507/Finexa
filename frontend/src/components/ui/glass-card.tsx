"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "frosted" | "liquid" | "elevated" | "pill" | "standard";
  interactive?: boolean;
  enablePointerLight?: boolean;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      variant = "frosted",
      interactive = false,
      enablePointerLight = true,
      children,
      onPointerMove,
      onPointerLeave,
      ...props
    },
    ref
  ) => {
    const cardRef = React.useRef<HTMLDivElement | null>(null);

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (enablePointerLight && cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        cardRef.current.style.setProperty("--mouse-x", `${x}px`);
        cardRef.current.style.setProperty("--mouse-y", `${y}px`);
      }
      onPointerMove?.(e);
    };

    const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
      if (cardRef.current) {
        cardRef.current.style.setProperty("--mouse-x", "-999px");
        cardRef.current.style.setProperty("--mouse-y", "-999px");
      }
      onPointerLeave?.(e);
    };

    const variantStyles = {
      frosted: "frosted-glass-card",
      liquid: "liquid-glass",
      elevated: "frosted-glass-card shadow-[0_28px_60px_rgba(0,0,0,0.85)] border-white/20",
      pill: "glass-pill",
      standard: "glass-card",
    };

    return (
      <div
        ref={(node) => {
          cardRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={cn(
          "rounded-2xl transition-all duration-300 relative select-none",
          variantStyles[variant],
          interactive && "cursor-pointer hover:-translate-y-1 active:scale-[0.99]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
GlassCard.displayName = "GlassCard";
