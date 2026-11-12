"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface GlassDropdownItem {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
}

export interface GlassDropdownProps {
  trigger: React.ReactNode;
  items: GlassDropdownItem[];
  align?: "left" | "right";
  className?: string;
}

export function GlassDropdown({
  trigger,
  items,
  align = "right",
  className,
}: GlassDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-2.5 w-64 rounded-2xl frosted-glass-dropdown p-2 focus:outline-none animate-in fade-in-50 zoom-in-95 duration-150 overflow-hidden",
            align === "right" ? "right-0" : "left-0",
            className
          )}
        >
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <React.Fragment key={idx}>
                {item.destructive && idx > 0 && (
                  <div className="h-[1px] bg-white/10 my-1 mx-2" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    item.onClick();
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all min-h-[38px] text-left group",
                    item.destructive
                      ? "text-[#F07878] hover:bg-[#F07878]/15 hover:text-[#FF8E8E]"
                      : "text-foreground/90 hover:text-foreground hover:bg-white/[0.08] active:scale-[0.98]"
                  )}
                >
                  {Icon && (
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        item.destructive
                          ? "text-[#F07878] group-hover:text-[#FF8E8E]"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

