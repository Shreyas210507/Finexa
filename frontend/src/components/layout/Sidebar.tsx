"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

export function Sidebar({ className }: { className?: string }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("finexa-sidebar-collapsed");
      if (stored !== null) {
        setIsCollapsed(stored === "true");
      }
    } catch {}
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("finexa-sidebar-collapsed", String(next));
      } catch {}
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 border-r border-border/40 frosted-glass-nav transition-all duration-300 select-none shrink-0 z-20",
        isCollapsed ? "w-20" : "w-64",
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-border/40">
        {!isCollapsed ? (
          <Link href="/overview" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#111019] dark:bg-[#12111E] border border-white/10 shadow-inner">
              <span className="h-3 w-3 rounded-full bg-[#34D399] shadow-[0_0_12px_#34D399]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-tight text-foreground">
                FINEXA
              </span>
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-[#4318FF]/15 text-[#4318FF] border border-[#4318FF]/30 tracking-wider">
                PRO
              </span>
            </div>
          </Link>
        ) : (
          <Link href="/overview" className="mx-auto">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#111019] dark:bg-[#12111E] border border-white/10">
              <span className="h-3 w-3 rounded-full bg-[#34D399] shadow-[0_0_12px_#34D399]" />
            </div>
          </Link>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={toggleCollapse}
          className={cn(
            "p-1.5 rounded-full border border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all min-h-[28px] min-w-[28px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8]",
            isCollapsed && "mx-auto mt-2"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5 scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.children && item.children.some(c => pathname === c.href));
          const Icon = item.icon;
          const hasChildren = Boolean(item.children && item.children.length > 0);

          if (hasChildren && !isCollapsed) {
            return (
              <div key={item.title} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setAnalyticsOpen(!analyticsOpen)}
                  aria-expanded={analyticsOpen}
                  className={cn(
                    "w-full group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8]",
                    isActive
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-4 w-4", isActive ? "text-[#4318FF] dark:text-[#818CF8]" : "text-muted-foreground")} />
                    <span>{item.title}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                      analyticsOpen && "rotate-180"
                    )}
                  />
                </button>

                {/* Sub-tree branches with smooth slide and fade */}
                <div
                  className={cn(
                    "ml-5 pl-3 border-l border-border/40 space-y-1 transition-all duration-200 overflow-hidden",
                    analyticsOpen ? "max-h-40 opacity-100 my-1" : "max-h-0 opacity-0 my-0"
                  )}
                >
                  {item.children?.map((sub) => {
                    const isSubActive = pathname === sub.href;
                    return (
                      <Link
                        key={sub.title}
                        href={sub.href}
                        className={cn(
                          "relative flex items-center gap-2 py-1.5 px-2.5 text-xs rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#818CF8]",
                          isSubActive
                            ? "text-[#4318FF] dark:text-[#818CF8] font-semibold bg-[#4318FF]/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                      >
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full transition-colors",
                          isSubActive ? "bg-[#4318FF] dark:bg-[#818CF8]" : "bg-border group-hover:bg-[#4318FF]"
                        )} />
                        <span>{sub.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all duration-200 min-h-[40px] overflow-hidden",
                isActive
                  ? "bg-[#4318FF] text-white shadow-[0_4px_16px_rgba(67,24,255,0.35)] font-semibold"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                isCollapsed && "justify-center px-0"
              )}
              title={isCollapsed ? item.title : undefined}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-white shadow-[0_0_8px_#ffffff]" />
              )}
              <div className="shrink-0 flex items-center justify-center">
                <Icon
                  className={cn(
                    "h-4 w-4 transition-transform duration-200 group-hover:scale-110",
                    isActive
                      ? "text-white"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
              </div>

              {!isCollapsed && (
                <div className="flex flex-1 items-center justify-between">
                  <span className="truncate">{item.title}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        "ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full transition-transform duration-200 group-hover:scale-105",
                        isActive
                          ? "bg-white/20 text-white"
                          : item.isAi
                          ? "bg-[#4318FF]/15 text-[#4318FF] border border-[#4318FF]/20"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Quota Widget (Anti-Gravity Floating Glass) */}
      {!isCollapsed && (
        <div className="p-3.5 m-3 rounded-2xl glass-card border border-white/5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#34D399] bg-[#34D399]/10 shadow-[0_0_10px_rgba(52,211,153,0.3)]">
              <span className="text-[10px] font-extrabold text-[#34D399]">70%</span>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-foreground truncate">
                2,800 credits left
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight truncate">
                We aren&apos;t enforcing AI limits.
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
