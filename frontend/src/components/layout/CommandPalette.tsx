"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  FileText,
  CreditCard,
  BarChart3,
  ArrowLeftRight,
  LineChart,
  Sparkles,
  Bot,
  Settings,
  Plus,
  RotateCcw,
  Clock,
  ArrowRight,
  X,
  Loader2,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { TransactionResponse, InvoiceResponse } from "@/lib/api-types";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Navigation" | "Action" | "Transaction" | "Invoice" | "AI";
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  onSelect: () => void;
}

function formatUSD(val: string | number): string {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchedTransactions, setSearchedTransactions] = useState<TransactionResponse[]>([]);
  const [searchedInvoices, setSearchedInvoices] = useState<InvoiceResponse[]>([]);
  const [allInvoices, setAllInvoices] = useState<InvoiceResponse[]>([]);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
      setAiAnswer(null);
      // Pre-fetch invoices for instant search
      apiClient.getInvoices().then((res) => setAllInvoices(res.items)).catch(() => {});
    }
  }, [isOpen]);

  // Handle keyboard navigation & escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Real backend search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setSearchedTransactions([]);
      setSearchedInvoices([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [txRes] = await Promise.all([
          apiClient.getTransactions({ search: query.trim(), size: 5 }).catch(() => ({ items: [] })),
        ]);
        setSearchedTransactions(txRes.items || []);

        // Filter invoices locally by query
        const q = query.toLowerCase();
        const matchedInvoices = allInvoices.filter(
          (inv) =>
            (inv.customer_name && inv.customer_name.toLowerCase().includes(q)) ||
            (inv.invoice_number && inv.invoice_number.toLowerCase().includes(q)) ||
            (inv.status && inv.status.toLowerCase().includes(q))
        ).slice(0, 5);
        setSearchedInvoices(matchedInvoices);
      } catch {
        // Fallback
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, allInvoices]);

  // Handle Ask AI CFO
  const handleAskAI = async (prompt: string) => {
    try {
      setAiLoading(true);
      setAiAnswer(null);
      const res = await apiClient.chatWithCFO(prompt);
      setAiAnswer(res.content);
    } catch {
      setAiAnswer("AI CFO service temporarily offline. Operational finance engine is available.");
    } finally {
      setAiLoading(false);
    }
  };

  // Static navigation commands
  const navCommands: CommandItem[] = [
    {
      id: "nav-overview",
      title: "Dashboard Overview",
      subtitle: "View key financial metrics & reserves",
      category: "Navigation",
      icon: LayoutDashboard,
      onSelect: () => {
        router.push("/overview");
        onClose();
      },
    },
    {
      id: "nav-transactions",
      title: "Transactions Ledger",
      subtitle: "Double-entry ledger & audit logs",
      category: "Navigation",
      icon: ArrowLeftRight,
      onSelect: () => {
        router.push("/transactions");
        onClose();
      },
    },
    {
      id: "nav-invoices",
      title: "Invoices & Accounts Receivable",
      subtitle: "Manage invoices & payment status",
      category: "Navigation",
      icon: FileText,
      onSelect: () => {
        router.push("/invoices");
        onClose();
      },
    },
    {
      id: "nav-payments",
      title: "Payments & Collections",
      subtitle: "PayPal gateway & settlement reconciliation",
      category: "Navigation",
      icon: CreditCard,
      onSelect: () => {
        router.push("/payments");
        onClose();
      },
    },
    {
      id: "nav-reports",
      title: "Financial Statements & Reports",
      subtitle: "P&L, Cash Flow, AR Aging, and Tax Reports",
      category: "Navigation",
      icon: BarChart3,
      onSelect: () => {
        router.push("/reports");
        onClose();
      },
    },
    {
      id: "nav-forecasts",
      title: "Cash Flow Forecasts & Simulator",
      subtitle: "Trajectory modeling & what-if simulator",
      category: "Navigation",
      icon: LineChart,
      badge: "Simulator",
      onSelect: () => {
        router.push("/forecasts");
        onClose();
      },
    },
    {
      id: "nav-ai-cfo",
      title: "AI CFO Autonomous Intelligence",
      subtitle: "Autonomous CFO financial reasoning",
      category: "Navigation",
      icon: Sparkles,
      badge: "AI",
      onSelect: () => {
        router.push("/ai-cfo");
        onClose();
      },
    },
    {
      id: "nav-ai-agents",
      title: "Audit Sentinel & AI Agents",
      subtitle: "Multi-agent autonomous ledger auditor",
      category: "Navigation",
      icon: Bot,
      badge: "5 Active",
      onSelect: () => {
        router.push("/ai-agents");
        onClose();
      },
    },
    {
      id: "nav-settings",
      title: "Organisation Settings",
      subtitle: "Currency, members, and API keys",
      category: "Navigation",
      icon: Settings,
      onSelect: () => {
        router.push("/settings");
        onClose();
      },
    },
  ];

  // Quick Action commands
  const actionCommands: CommandItem[] = [
    {
      id: "act-create-invoice",
      title: "Create New Invoice",
      subtitle: "Generate an invoice with line items",
      category: "Action",
      icon: Plus,
      onSelect: () => {
        router.push("/invoices");
        onClose();
      },
    },
    {
      id: "act-create-transaction",
      title: "Record New Transaction",
      subtitle: "Add an income or expense entry",
      category: "Action",
      icon: ArrowLeftRight,
      onSelect: () => {
        router.push("/transactions");
        onClose();
      },
    },
    {
      id: "act-collect-payment",
      title: "Collect Payment via PayPal",
      subtitle: "Capture idempotently through PayPal Sandbox",
      category: "Action",
      icon: CreditCard,
      onSelect: () => {
        router.push("/payments");
        onClose();
      },
    },
    {
      id: "act-reset-demo",
      title: "Reset Demo Data",
      subtitle: "Restore pristine seeded demonstration data",
      category: "Action",
      icon: RotateCcw,
      onSelect: async () => {
        try {
          await apiClient.resetDemoData();
          addToast({
            type: "success",
            title: "Demo Reset",
            message: "Application state restored to demo baseline.",
          });
          onClose();
          window.location.reload();
        } catch {
          addToast({ type: "error", title: "Reset Failed", message: "Could not reset demo data." });
        }
      },
    },
  ];

  // Build combined items list
  const transactionCommands: CommandItem[] = searchedTransactions.map((tx) => ({
    id: `tx-${tx.id}`,
    title: tx.description || `${tx.category} Transaction`,
    subtitle: `${tx.date} • ${tx.type === "income" ? "+" : "-"}${formatUSD(tx.amount)} (${tx.category})`,
    category: "Transaction",
    icon: tx.type === "income" ? CheckCircle2 : DollarSign,
    onSelect: () => {
      router.push(`/transactions?search=${encodeURIComponent(tx.description || tx.category)}`);
      onClose();
    },
  }));

  const invoiceCommands: CommandItem[] = searchedInvoices.map((inv) => ({
    id: `inv-${inv.id}`,
    title: `${inv.invoice_number} • ${inv.customer_name}`,
    subtitle: `Total: ${formatUSD(inv.total)} • Status: ${inv.status} (Due: ${inv.due_date})`,
    category: "Invoice",
    icon: FileText,
    badge: inv.status,
    onSelect: () => {
      router.push("/invoices");
      onClose();
    },
  }));

  // Filter navigation by query if typed
  const filteredNav = query.trim()
    ? navCommands.filter((c) =>
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.subtitle?.toLowerCase().includes(query.toLowerCase())
      )
    : navCommands;

  const filteredActions = query.trim()
    ? actionCommands.filter((c) =>
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.subtitle?.toLowerCase().includes(query.toLowerCase())
      )
    : actionCommands;

  // Flattened active list
  const activeList: CommandItem[] = [
    ...filteredActions,
    ...transactionCommands,
    ...invoiceCommands,
    ...filteredNav,
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, activeList.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + activeList.length) % Math.max(1, activeList.length));
    } else if (e.key === "Enter" && activeList[selectedIndex]) {
      e.preventDefault();
      activeList[selectedIndex].onSelect();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Command Palette Dialog Box */}
      <div className="relative z-50 w-full max-w-2xl rounded-2xl frosted-glass-modal shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden border border-border animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border bg-muted/20 dark:bg-white/[0.02]">
          <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, search transactions, invoices, or type 'ask [question]'..."
            className="w-full bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              aria-label="Clear query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {isSearching && <Loader2 className="w-4 h-4 text-[#818CF8] animate-spin ml-2 shrink-0" />}
        </div>

        {/* Ask AI CFO Quick Banner if query exists */}
        {query.trim().length > 2 && (
          <div className="px-4 py-2.5 bg-[#4318FF]/10 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#818CF8]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI CFO: &quot;{query}&quot;</span>
            </div>
            <button
              type="button"
              disabled={aiLoading}
              onClick={() => handleAskAI(query)}
              className="px-2.5 py-1 rounded-lg bg-[#4318FF] hover:bg-[#3615CC] text-white text-[11px] font-semibold transition-all shadow-sm flex items-center gap-1 active:scale-95 disabled:opacity-50"
            >
              {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
              <span>Consult CFO</span>
            </button>
          </div>
        )}

        {/* AI Answer Card if loaded */}
        {aiAnswer && (
          <div className="p-4 mx-4 my-3 rounded-xl bg-muted/50 dark:bg-black/60 border border-[#4318FF]/40 text-xs text-foreground dark:text-white leading-relaxed animate-in fade-in">
            <div className="flex items-center justify-between text-[10px] text-[#00F0FF] font-bold uppercase mb-1.5">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                FINEXA AI CFO Intelligence
              </span>
              <button
                onClick={() => setAiAnswer(null)}
                className="text-muted-foreground hover:text-foreground dark:text-white/60 dark:hover:text-white"
              >
                Dismiss
              </button>
            </div>
            <p className="whitespace-pre-line text-foreground/90 dark:text-white/90">{aiAnswer}</p>
          </div>
        )}

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {activeList.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <p>No matching commands, transactions, or invoices found.</p>
              <p className="text-[11px] mt-1 text-muted-foreground/80">
                Try searching by vendor, amount, invoice number, or module name.
              </p>
            </div>
          ) : (
            activeList.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-150 text-xs sm:text-sm",
                    isSelected
                      ? "bg-[#4318FF] text-white shadow-md font-semibold"
                      : "text-foreground hover:bg-muted/50 dark:hover:bg-white/[0.06]"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 text-muted-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate">{item.title}</div>
                      {item.subtitle && (
                        <div
                          className={cn(
                            "text-[11px] truncate",
                            isSelected ? "text-white/80" : "text-muted-foreground"
                          )}
                        >
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {item.badge && (
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-[#4318FF]/15 text-[#818CF8] border border-[#4318FF]/25"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-[10px] font-mono",
                        isSelected ? "text-white/70" : "text-muted-foreground/60"
                      )}
                    >
                      {item.category}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-[10px] text-foreground font-mono">
                ↑
              </kbd>{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-[10px] text-foreground font-mono">
                ↓
              </kbd>{" "}
              to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-[10px] text-foreground font-mono">
                Enter
              </kbd>{" "}
              to select
            </span>
          </div>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-[10px] text-foreground font-mono">
              Esc
            </kbd>{" "}
            to dismiss
          </span>
        </div>
      </div>
    </div>
  );
}
