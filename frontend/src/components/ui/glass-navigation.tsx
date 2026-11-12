"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface GlassNavigationProps extends React.HTMLAttributes<HTMLElement> {
  as?: "header" | "aside" | "nav" | "div";
  orientation?: "horizontal" | "vertical";
}

export const GlassNavigation = React.forwardRef<HTMLElement, GlassNavigationProps>(
  ({ as: Component = "nav", orientation = "horizontal", className, children, ...props }, ref) => {
    return (
      <Component
        ref={ref as any}
        className={cn(
          "frosted-glass-nav transition-all duration-200 select-none",
          orientation === "horizontal" ? "w-full border-b" : "h-full border-r",
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
GlassNavigation.displayName = "GlassNavigation";

