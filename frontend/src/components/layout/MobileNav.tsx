"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sparkles, ArrowLeftRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  onOpenMore: () => void;
}

export function MobileNav({ onOpenMore }: MobileNavProps) {
  const pathname = usePathname();

  const primaryTabs = [
    { title: "Overview", href: "/overview", icon: LayoutDashboard },
    { title: "AI CFO", href: "/ai-cfo", icon: Sparkles, isAi: true },
    { title: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-border/40 frosted-glass-nav px-2 flex items-center justify-around select-none">
      {primaryTabs.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full min-h-[44px] min-w-[44px] py-1 transition-colors",
              isActive
                ? "text-[#8B7CFF]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div
              className={cn(
                "p-1 rounded-lg transition-transform",
                isActive && "bg-[#8B7CFF]/15"
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-medium mt-0.5">{tab.title}</span>
          </Link>
        );
      })}

      {/* More Button */}
      <button
        type="button"
        onClick={onOpenMore}
        className="flex flex-col items-center justify-center flex-1 h-full min-h-[44px] min-w-[44px] py-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Open more menu"
      >
        <div className="p-1 rounded-lg">
          <MoreHorizontal className="h-5 w-5" />
        </div>
        <span className="text-[11px] font-medium mt-0.5">More</span>
      </button>
    </nav>
  );
}

