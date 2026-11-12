"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { X, Building2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orgName?: string;
}

export function MobileDrawer({
  isOpen,
  onClose,
  orgName = "Novastack Technologies",
}: MobileDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();

  if (!isOpen) return null;

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden flex select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Body */}
      <div className="relative z-50 w-4/5 max-w-xs frosted-glass-modal h-full border-r border-border shadow-2xl flex flex-col justify-between">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-muted dark:bg-[#1F1E2C] border border-[#8B7CFF]/30">
              <span className="h-3 w-3 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]" />
            </div>
            <span className="text-base font-extrabold tracking-wider text-foreground">
              FINEXA
            </span>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-full text-muted-foreground hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Org Tag */}
        <div className="px-4 py-3 bg-card border-b border-border/70 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[#8B7CFF]" />
          <span className="text-xs font-semibold text-foreground truncate">
            {orgName}
          </span>
          <span className="ml-auto text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#8B7CFF]/15 text-[#8B7CFF] border border-[#8B7CFF]/30">
            Pro
          </span>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
                  isActive
                    ? "bg-foreground text-background dark:bg-white dark:text-[#111019] font-bold shadow-sm"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate flex-1">{item.title}</span>
                {item.badge && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-panel text-muted-foreground border-border">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer with Sign Out */}
        <div className="p-4 border-t border-border">
          <button
            onClick={() => {
              onClose();
              handleSignOut();
            }}
            type="button"
            className="flex w-full items-center gap-2.5 rounded-full px-3.5 py-2.5 text-sm font-semibold text-[#F07878] hover:bg-[#F07878]/10 transition-colors min-h-[44px]"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

