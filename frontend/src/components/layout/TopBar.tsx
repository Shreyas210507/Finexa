"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Menu,
  Building2,
  User,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { apiClient } from "@/lib/api-client";
import { NotificationItem } from "@/lib/api-types";

interface TopBarProps {
  onOpenMobileMenu?: () => void;
  orgName?: string;
  userEmail?: string;
}

export function TopBar({
  onOpenMobileMenu,
  orgName = "Novastack Technologies",
  userEmail = "admin@novastack.io",
}: TopBarProps) {
  const router = useRouter();

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifMenu, setShowNotifMenu] = useState<boolean>(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await apiClient.getNotifications(20);
      setNotifications(res.items);
      setUnreadCount(res.unread_count);
    } catch {
      // Graceful fallback
    }
  }, []);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  // Click outside to close notification popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
    };
    if (showNotifMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifMenu]);

  const handleMarkRead = async (id: string) => {
    try {
      await apiClient.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  };

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const userMenuItems = [
    {
      label: userEmail,
      onClick: () => router.push("/settings"),
      icon: User,
    },
    {
      label: "Organisation Settings",
      onClick: () => router.push("/settings"),
      icon: Building2,
    },
    {
      label: "Sign out",
      onClick: handleSignOut,
      icon: LogOut,
      destructive: true,
    },
  ];

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "invoice_overdue":
        return <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />;
      case "forecast_shortage":
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-[#20D9F2]" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-panel/95 backdrop-blur-sm px-4 sm:px-6 select-none">
      {/* Left: Mobile hamburger + Active Org */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            type="button"
            className="md:hidden p-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Open mobile menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-muted/40 border border-border">
          <Building2 className="h-3.5 w-3.5 text-[#8B7CFF]" />
          <span className="text-xs font-semibold text-foreground truncate max-w-[140px] sm:max-w-[180px]">
            {orgName}
          </span>
          <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full bg-[#8B7CFF]/15 text-[#8B7CFF] hidden sm:inline-block">
            Pro
          </span>
        </div>
      </div>

      {/* Center: Global Search Pill */}
      <div className="hidden lg:flex items-center w-full max-w-xs xl:max-w-md mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search transactions, invoices, or ask AI..."
            className="h-9 w-full rounded-full border border-border bg-muted/40 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8B7CFF] transition-colors"
          />
        </div>
      </div>

      {/* Right: Actions, Notifications, Theme, User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2 rounded-full border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[#F07878] text-[9px] font-bold text-white ring-2 ring-panel">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Popover Dropdown */}
          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-white dark:bg-[#0D1428] text-foreground shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between p-3.5 border-b border-border/80 bg-slate-50 dark:bg-muted/40">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#EF4444]/15 text-[#EF4444]">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-medium text-[#315BFF] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border/60 text-xs bg-white dark:bg-[#0D1428]">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground bg-white dark:bg-[#0D1428]">
                    <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-muted-foreground/60" />
                    <p className="text-xs">All clear. No notifications.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && handleMarkRead(n.id)}
                      className={`p-3 transition-colors cursor-pointer flex gap-2.5 items-start ${
                        n.is_read
                          ? "bg-white hover:bg-slate-50/80 text-muted-foreground dark:bg-[#0D1428] dark:hover:bg-muted/30"
                          : "bg-blue-50/50 hover:bg-blue-50 text-foreground dark:bg-[#315BFF]/10 dark:hover:bg-[#315BFF]/15"
                      }`}
                    >
                      <div className="p-1.5 rounded-md bg-muted shrink-0 mt-0.5">
                        {getNotifIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`truncate ${n.is_read ? "font-medium text-muted-foreground" : "font-bold text-foreground"}`}>
                            {n.title}
                          </span>
                          {!n.is_read && (
                            <span className="h-2 w-2 rounded-full bg-[#315BFF] shrink-0" />
                          )}
                        </div>
                        <p className={`text-[11px] line-clamp-2 mt-0.5 ${n.is_read ? "text-muted-foreground/80" : "text-foreground/80"}`}>
                          {n.message}
                        </p>
                        <span className="text-[9px] text-muted-foreground/70 block mt-1">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu */}
        <DropdownMenu
          trigger={
            <button
              type="button"
              className="flex items-center gap-2 p-1 rounded-full border border-border bg-card/80 hover:bg-card min-h-[44px] min-w-[44px] justify-center"
              aria-label="User profile menu"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#315BFF] to-[#963BFF] flex items-center justify-center text-white text-xs font-bold">
                {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
              </div>
            </button>
          }
          items={userMenuItems}
        />
      </div>
    </header>
  );
}
