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
  Edit3,
  Loader2,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { apiClient } from "@/lib/api-client";
import { NotificationItem } from "@/lib/api-types";
import { CommandPalette } from "./CommandPalette";

interface TopBarProps {
  onOpenMobileMenu?: () => void;
  orgName?: string;
  userEmail?: string;
  userName?: string;
  onUserNameChange?: (newName: string) => void;
}

export function TopBar({
  onOpenMobileMenu,
  orgName = "Novastack Technologies",
  userEmail = "admin@novastack.io",
  userName = "User",
  onUserNameChange,
}: TopBarProps) {
  const router = useRouter();

  // Local user name state
  const [currentName, setCurrentName] = useState(userName);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [newNameInput, setNewNameInput] = useState(userName);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (userName) {
      setCurrentName(userName);
      setNewNameInput(userName);
    }
  }, [userName]);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifMenu, setShowNotifMenu] = useState<boolean>(false);
  const [isCommandOpen, setIsCommandOpen] = useState<boolean>(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleSaveProfileName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameInput.trim()) return;

    try {
      setSavingName(true);
      setNameError(null);
      await apiClient.updateProfile({ name: newNameInput.trim() });
      setCurrentName(newNameInput.trim());
      onUserNameChange?.(newNameInput.trim());
      setIsEditProfileOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile name";
      setNameError(msg);
    } finally {
      setSavingName(false);
    }
  };

  const userMenuItems = [
    {
      label: currentName ? `${currentName} (Edit Profile)` : "Edit Display Name",
      onClick: () => {
        setNewNameInput(currentName || "");
        setNameError(null);
        setIsEditProfileOpen(true);
      },
      icon: Edit3,
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
        return <AlertTriangle className="w-3.5 h-3.5 text-[#F07878]" />;
      case "forecast_shortage":
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-[#818CF8]" />;
    }
  };

  const avatarChar = (currentName || userEmail || "U").trim().charAt(0).toUpperCase();

  return (
    <>
      <header className="z-30 flex h-16 w-full items-center justify-between border-b border-border/40 frosted-glass-nav px-4 sm:px-6 select-none shrink-0">
        {/* Left: Mobile hamburger + Active Org */}
        <div className="flex items-center gap-3">
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              type="button"
              className="md:hidden p-2 rounded-xl border border-white/10 glass-card text-foreground hover:bg-white/5 min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Open mobile menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-inner">
            <Building2 className="h-3.5 w-3.5 text-[#4318FF] dark:text-[#818CF8]" />
            <span className="text-xs font-semibold text-foreground truncate max-w-[140px] sm:max-w-[180px]">
              {orgName}
            </span>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-[#4318FF]/15 text-[#4318FF] dark:text-[#818CF8] border border-[#4318FF]/20 hidden sm:inline-block">
              Pro
            </span>
          </div>
        </div>

        {/* Center: Global Search Pill (Command Centre Trigger) */}
        <div className="hidden lg:flex items-center w-full max-w-xs xl:max-w-md mx-4">
          <button
            type="button"
            onClick={() => setIsCommandOpen(true)}
            className="group flex items-center justify-between h-9 w-full rounded-full border border-white/10 bg-white/5 px-3.5 text-xs text-muted-foreground hover:text-foreground hover:border-white/20 hover:bg-white/[0.08] transition-all backdrop-blur-md cursor-pointer select-none shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span>Search transactions, invoices, or ask AI...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-[10px] font-mono text-muted-foreground group-hover:text-foreground">
              <span className="text-[11px]">⌘</span>K
            </kbd>
          </button>
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
                <span className="absolute top-0.5 right-0.5 flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[#F07878] text-[9px] font-bold text-white ring-2 ring-panel">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown (Apple / realme Fluid Liquid Glass) */}
            {showNotifMenu && (
              <div className="absolute right-0 mt-2.5 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-3xl liquid-glass z-50 overflow-hidden shadow-[0_24px_60px_-10px_rgba(0,0,0,0.85),0_0_35px_rgba(67,24,255,0.18)] animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.04] backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white tracking-tight">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F07878]/25 text-[#F07878] border border-[#F07878]/35 shadow-[0_0_8px_rgba(240,120,120,0.3)]">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAllRead(e)}
                      className="text-[11px] font-semibold text-[#818CF8] hover:text-white hover:underline transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notification Items List */}
                <div className="max-h-84 overflow-y-auto p-2 space-y-1.5">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <CheckCircle2 className="w-7 h-7 mx-auto mb-2 text-[#34D399]" />
                      <p className="text-xs text-white/70">All clear. No notifications.</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`rounded-2xl p-3 transition-all duration-200 flex gap-3 items-start group ${
                          n.is_read
                            ? "bg-white/[0.02] hover:bg-white/[0.07] border border-white/5 hover:border-white/15"
                            : "bg-[#4318FF]/20 hover:bg-[#4318FF]/30 border border-[#818CF8]/35 shadow-[0_4px_16px_rgba(67,24,255,0.18)]"
                        }`}
                      >
                        <div className="p-2 rounded-xl bg-white/10 border border-white/15 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                          {getNotifIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-xs truncate ${
                                n.is_read ? "font-medium text-white/80" : "font-bold text-white"
                              }`}
                            >
                              {n.title}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {!n.is_read && (
                                <button
                                  type="button"
                                  onClick={(e) => handleMarkRead(n.id, e)}
                                  className="text-[10px] font-medium text-[#818CF8] hover:text-[#A5B4FC] hover:underline whitespace-nowrap transition-colors"
                                >
                                  Mark read
                                </button>
                              )}
                              {!n.is_read && (
                                <span className="h-2 w-2 rounded-full bg-[#818CF8] shrink-0 shadow-[0_0_6px_#818CF8]" />
                              )}
                            </div>
                          </div>
                          <p
                            className={`text-[11px] line-clamp-2 mt-0.5 leading-relaxed ${
                              n.is_read ? "text-white/60" : "text-white/90"
                            }`}
                          >
                            {n.message}
                          </p>
                          <span className="text-[9px] text-white/45 block mt-1 font-medium font-financial">
                            {new Date(n.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
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
                className="flex items-center gap-2 p-1 rounded-full border border-border bg-card/80 hover:bg-card min-h-[44px] min-w-[44px] justify-center transition-transform hover:scale-105"
                aria-label="User profile menu"
                title={currentName ? `${currentName} (${userEmail})` : userEmail}
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#4318FF] via-[#8B7CFF] to-[#00F0FF] flex items-center justify-center text-white text-xs font-extrabold shadow-md border border-white/20">
                  {avatarChar}
                </div>
              </button>
            }
            items={userMenuItems}
          />
        </div>
      </header>

      {/* Edit Display Name Modal */}
      <Modal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        title="Edit User Profile"
        description="Update your display name to personalize greetings and reports across FINEXA."
      >
        <form onSubmit={handleSaveProfileName} className="space-y-4 pt-2">
          {nameError && (
            <div className="p-3 bg-red-950/60 border border-[#F07878] rounded-xl text-xs text-[#F07878]">
              {nameError}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              Your Display Name
            </label>
            <Input
              value={newNameInput}
              onChange={(e) => setNewNameInput(e.target.value)}
              placeholder="e.g. Alex Mercer"
              required
              disabled={savingName}
              className="rounded-xl"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditProfileOpen(false)}
              disabled={savingName}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={savingName || !newNameInput.trim()}
              className="flex items-center gap-1.5"
            >
              {savingName && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Name</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />
    </>
  );
}
