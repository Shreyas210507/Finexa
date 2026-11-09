"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

export function Sidebar({ className }: { className?: string }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-border bg-[#FFFFFF] dark:bg-[#191823] transition-all duration-300 relative select-none shrink-0 z-20",
        isCollapsed ? "w-20" : "w-64",
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-border/60">
        {!isCollapsed ? (
          <Link href="/overview" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111019] dark:bg-[#201F2B] border border-border shadow-inner">
              <span className="h-3 w-3 rounded-full bg-[#48D597] shadow-[0_0_10px_#48D597]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-tight text-foreground">
                FINEXA
              </span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#8B7CFF]/15 text-[#8B7CFF] border border-[#8B7CFF]/20">
                PRO
              </span>
            </div>
          </Link>
        ) : (
          <Link href="/overview" className="mx-auto">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111019] dark:bg-[#201F2B] border border-border">
              <span className="h-3 w-3 rounded-full bg-[#48D597] shadow-[0_0_10px_#48D597]" />
            </div>
          </Link>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "p-1.5 rounded-full border border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center",
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
                  className={cn(
                    "w-full group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all duration-150",
                    isActive
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-4 w-4", isActive ? "text-[#8B7CFF]" : "text-muted-foreground")} />
                    <span>{item.title}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                      analyticsOpen && "rotate-180"
                    )}
                  />
                </button>

                {/* Sub-tree branches */}
                {analyticsOpen && (
                  <div className="ml-5 pl-3 border-l border-border/60 space-y-1 my-1">
                    {item.children?.map((sub) => {
                      const isSubActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.title}
                          href={sub.href}
                          className={cn(
                            "relative flex items-center gap-2 py-1.5 px-2.5 text-xs rounded-lg transition-colors",
                            isSubActive
                              ? "text-[#8B7CFF] font-semibold bg-[#8B7CFF]/10"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                          )}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-border group-hover:bg-[#8B7CFF]" />
                          <span>{sub.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all duration-200 min-h-[40px]",
                isActive
                  ? "bg-foreground text-background dark:bg-[#FFFFFF] dark:text-[#111019] shadow-sm font-semibold"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                isCollapsed && "justify-center px-0"
              )}
              title={isCollapsed ? item.title : undefined}
            >
              <div className="shrink-0 flex items-center justify-center">
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isActive
                      ? "text-background dark:text-[#111019]"
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
                        "ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full",
                        isActive
                          ? "bg-background/20 text-background dark:bg-black/10 dark:text-[#111019]"
                          : item.isAi
                          ? "bg-[#8B7CFF]/15 text-[#8B7CFF]"
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

      {/* Bottom Quota Widget (Matching reference bottom widget) */}
      {!isCollapsed && (
        <div className="p-3.5 m-3 rounded-2xl bg-[#F4F3F8] dark:bg-[#201F2B] border border-border">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#48D597] bg-transparent">
              <span className="text-[10px] font-extrabold text-[#48D597]">70%</span>
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
