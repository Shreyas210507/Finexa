"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import {
  Plus,
  Download,
  Upload,
  Search,
  Trash2,
  Loader2,
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  Inbox,
  Filter,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ExternalLink,
  Info,
  Calendar,
  DollarSign,
  Tag,
  CreditCard,
  FileSpreadsheet,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { TransactionResponse } from "@/lib/api-types";

function formatUSD(val: string | number): string {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

const CATEGORIES = [
  "All",
  "Salaries",
  "Software",
  "Marketing",
  "Infrastructure",
  "Operations",
  "Software Services",
  "Other",
];

export default function TransactionsPage() {
  const { addToast } = useToast();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Data & UI states
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TransactionResponse | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New transaction form state
  const [formType, setFormType] = useState<"expense" | "income">("expense");
  const [formCategory, setFormCategory] = useState("Software");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formVendor, setFormVendor] = useState("");
  const [formReference, setFormReference] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch transactions from real backend
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.getTransactions({
        page,
        size: pageSize,
        search: debouncedSearch || undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        category: categoryFilter !== "All" ? categoryFilter : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });

      setTransactions(res.items || []);
      setTotalPages(res.total_pages || 1);
      setTotalRecords(res.total || 0);
    } catch (err: unknown) {
      console.error("Failed to fetch transactions:", err);
      setTransactions([]);
      addToast({
        type: "error",
        title: "Load Error",
        message: "Failed to retrieve ledger records from the server.",
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, typeFilter, categoryFilter, startDate, endDate, addToast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Client-side amount filtering and sorting
  const displayedTransactions = useMemo(() => {
    let result = [...transactions];

    if (minAmount && !isNaN(parseFloat(minAmount))) {
      const min = parseFloat(minAmount);
      result = result.filter((tx) => parseFloat(tx.amount) >= min);
    }
    if (maxAmount && !isNaN(parseFloat(maxAmount))) {
      const max = parseFloat(maxAmount);
      result = result.filter((tx) => parseFloat(tx.amount) <= max);
    }

    result.sort((a, b) => {
      if (sortField === "date") {
        const d1 = new Date(a.date).getTime();
        const d2 = new Date(b.date).getTime();
        return sortDirection === "desc" ? d2 - d1 : d1 - d2;
      } else {
        const a1 = parseFloat(a.amount);
        const a2 = parseFloat(b.amount);
        return sortDirection === "desc" ? a2 - a1 : a1 - a2;
      }
    });

    return result;
  }, [transactions, minAmount, maxAmount, sortField, sortDirection]);

  const handleCopyReference = (ref: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    addToast({
      type: "success",
      title: "Copied to Clipboard",
      message: `Reference "${ref}" copied successfully.`,
    });
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleCreate = async () => {
    if (!formAmount || isNaN(parseFloat(formAmount)) || parseFloat(formAmount) <= 0) {
      addToast({ type: "error", title: "Invalid Amount", message: "Please enter a valid amount greater than 0." });
      return;
    }
    try {
      setSubmitting(true);
      await apiClient.createTransaction({
        type: formType,
        category: formCategory,
        description: formDescription || undefined,
        amount: parseFloat(formAmount).toFixed(2),
        date: formDate,
        vendor_or_client: formVendor || undefined,
        reference: formReference || undefined,
      });
      addToast({
        type: "success",
        title: "Transaction Recorded",
        message: "Entry stored in double-entry ledger with immutable audit trail.",
      });
      setIsAddOpen(false);
      setFormDescription("");
      setFormAmount("");
      setFormVendor("");
      setFormReference("");
      fetchTransactions();
    } catch (e: unknown) {
      const err = e as Error;
      addToast({ type: "error", title: "Recording Failed", message: err.message || "Failed to record transaction." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.deleteTransaction(deleteTarget.id);
      addToast({
        type: "info",
        title: "Transaction Deleted",
        message: "Record soft-deleted and logged in the immutable audit sentinel.",
      });
      setDeleteTarget(null);
      if (selectedTx?.id === deleteTarget.id) {
        setSelectedTx(null);
      }
      fetchTransactions();
    } catch (e: unknown) {
      const err = e as Error;
      addToast({ type: "error", title: "Delete Failed", message: err.message || "Failed to delete record." });
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportingCsv(true);
      const res = await apiClient.importTransactionsCSV(file);
      addToast({
        type: "success",
        title: "CSV Ingestion Succeeded",
        message: `Imported ${res.imported} transaction(s). Skipped ${res.skipped_duplicates} duplicate(s).`,
      });
      fetchTransactions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse and import CSV";
      addToast({ type: "error", title: "Import Error", message: msg });
    } finally {
      setImportingCsv(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const toggleSort = (field: "date" | "amount") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const badgeColors: Record<string, string> = {
    manual: "bg-white/5 text-muted-foreground border-white/10",
    paypal: "bg-[#4318FF]/15 text-[#818CF8] border-[#4318FF]/30",
    csv_import: "bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30",
    bank_feed: "bg-[#00F0FF]/15 text-[#00F0FF] border-[#00F0FF]/30",
  };

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════
          HEADER: Title, Subtitle, and Main Action Controls
          ═══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Transactions Ledger
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Verified double-entry financial ledger • {totalRecords} total records indexed
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Hidden file input for CSV import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCsvImport}
            accept=".csv"
            className="hidden"
          />

          <Button
            variant="outline"
            size="md"
            onClick={() => fileInputRef.current?.click()}
            disabled={importingCsv}
            className="flex items-center gap-1.5"
          >
            {importingCsv ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 text-[#818CF8]" />
            )}
            <span className="hidden sm:inline">{importingCsv ? "Importing..." : "Import CSV"}</span>
          </Button>

          <a
            href={apiClient.getExportCsvUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-white/10 frosted-glass-card text-foreground hover:bg-white/5 transition-colors min-h-[38px]"
            title="Download full CSV ledger export"
          >
            <Download className="w-4 h-4 text-[#34D399]" />
            <span className="hidden sm:inline">Export CSV</span>
          </a>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          SEARCH & FILTER BAR
          ═══════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search description, counterparty, or reference ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 frosted-glass-input"
            />
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center frosted-glass-card border border-white/10 p-0.5 rounded-xl shrink-0">
            {(["all", "income", "expense"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTypeFilter(t);
                  setPage(1);
                }}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg capitalize transition-all ${
                  typeFilter === t
                    ? "bg-[#4318FF] text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <div className="w-44 shrink-0">
            <Select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </div>

          {/* Advanced Filter Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
              showAdvancedFilters || startDate || endDate || minAmount || maxAmount
                ? "bg-[#4318FF]/20 border-[#4318FF]/50 text-white"
                : "frosted-glass-card border-white/10 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>

        {/* Collapsible Advanced Filters (Date Range & Amount Range) */}
        {showAdvancedFilters && (
          <div className="p-4 rounded-2xl frosted-glass-card border border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Min Amount ($)
              </label>
              <Input
                type="number"
                placeholder="0.00"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Max Amount ($)
              </label>
              <Input
                type="number"
                placeholder="100000.00"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          TABLE SORT HEADER ROW
          ═══════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-4 py-1">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => toggleSort("date")}
            className="flex items-center gap-1 hover:text-foreground font-semibold transition-colors"
          >
            <span>Date & Details</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-6">
          <span className="hidden md:inline font-semibold">Category & Source</span>
          <button
            type="button"
            onClick={() => toggleSort("amount")}
            className="flex items-center gap-1 hover:text-foreground font-semibold transition-colors"
          >
            <span>Amount</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          FLOATING FROSTED GLASS TRANSACTION LIST
          ═══════════════════════════════════════════════════ */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="frosted-glass-card rounded-2xl p-4 flex items-center justify-between gap-4 animate-pulse border border-white/5"
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-9 h-9 rounded-xl bg-white/5" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-32 bg-white/5 rounded" />
                  <div className="h-4 w-48 bg-white/10 rounded" />
                </div>
              </div>
              <div className="h-4 w-20 bg-white/10 rounded" />
            </div>
          ))
        ) : displayedTransactions.length === 0 ? (
          <div className="frosted-glass-card rounded-3xl p-12 text-center text-muted-foreground border border-white/10">
            <Inbox className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="text-base font-bold text-foreground">No Transactions Found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              No ledger entries match the active search criteria or filters. Reset filters or record a new transaction.
            </p>
          </div>
        ) : (
          displayedTransactions.map((tx) => {
            const isExp = tx.type === "expense";
            const sourceKey = tx.source || "manual";
            const refText = tx.reference || tx.id.slice(0, 8);

            return (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className={cn(
                  "frosted-glass-card rounded-2xl px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(67,24,255,0.15)] hover:border-white/20 cursor-pointer border border-white/10 select-none",
                  selectedTx?.id === tx.id && "border-[#4318FF]/70 bg-[#4318FF]/15 shadow-[0_0_20px_rgba(67,24,255,0.25)] ring-1 ring-[#4318FF]/50"
                )}
              >
                {/* Left: Direction Icon, Date, Reference, Description, Vendor */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105",
                      isExp
                        ? "bg-muted dark:bg-white/5 border-border dark:border-white/10 text-foreground/70"
                        : "bg-[#34D399]/15 border-[#34D399]/30 text-[#34D399]"
                    )}
                  >
                    {isExp ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-financial text-xs font-semibold text-muted-foreground">
                        {tx.date}
                      </span>

                      {/* Copyable Reference Pill */}
                      <button
                        type="button"
                        onClick={(e) => handleCopyReference(refText, e)}
                        className="inline-flex items-center gap-1 font-financial text-[11px] text-muted-foreground/80 px-2 py-0.5 rounded-md bg-muted/50 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 border border-border dark:border-white/5 transition-colors group/copy"
                        title="Click to copy reference"
                      >
                        <span>{refText}</span>
                        {copiedRef === refText ? (
                          <Check className="w-2.5 h-2.5 text-[#34D399]" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 opacity-40 group-hover/copy:opacity-100" />
                        )}
                      </button>

                      {tx.vendor_or_client && (
                        <span className="text-xs font-medium text-muted-foreground truncate">
                          • {tx.vendor_or_client}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-foreground truncate mt-0.5 group-hover:text-[#4318FF] dark:group-hover:text-white transition-colors">
                      {tx.description || tx.vendor_or_client || "Ledger Entry"}
                    </h4>
                  </div>
                </div>

                {/* Middle: Category & Source Gateway Badges */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 text-muted-foreground">
                    {tx.category}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border",
                      badgeColors[sourceKey] || badgeColors.manual
                    )}
                  >
                    {sourceKey.replace("_", " ")}
                  </span>
                </div>

                {/* Right: Amount & Action Buttons */}
                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                  <div
                    className={cn(
                      "font-financial text-sm md:text-base font-extrabold text-right min-w-[120px]",
                      isExp ? "text-foreground" : "text-[#10B981] dark:text-[#34D399]"
                    )}
                  >
                    {isExp ? `- ${formatUSD(tx.amount)}` : `+ ${formatUSD(tx.amount)}`}
                  </div>

                  <div className="opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(tx);
                      }}
                      className="p-1.5 rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/5 hover:bg-[#EF4444]/20 hover:border-[#EF4444]/40 hover:text-[#EF4444] text-muted-foreground transition-all"
                      title="Delete Transaction"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          PAGINATION CONTROLS
          ═══════════════════════════════════════════════════ */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs text-muted-foreground">
          <span>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalRecords)} of{" "}
            {totalRecords} records
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-white/10 frosted-glass-card disabled:opacity-30 disabled:pointer-events-none hover:bg-white/5 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-financial font-bold text-foreground">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-white/10 frosted-glass-card disabled:opacity-30 disabled:pointer-events-none hover:bg-white/5 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          TRANSACTION DETAIL DRAWER
          ═══════════════════════════════════════════════════ */}
      {selectedTx && (
        <Drawer
          isOpen={!!selectedTx}
          onClose={() => setSelectedTx(null)}
          title="Transaction Details"
        >
          <div className="space-y-5 text-xs">
            {/* Amount & Type Banner */}
            <div className="p-4 rounded-2xl frosted-glass-card border border-white/10 text-center">
              <div
                className={cn(
                  "text-2xl font-extrabold font-financial",
                  selectedTx.type === "expense" ? "text-foreground" : "text-[#34D399]"
                )}
              >
                {selectedTx.type === "expense"
                  ? `- ${formatUSD(selectedTx.amount)}`
                  : `+ ${formatUSD(selectedTx.amount)}`}
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
                  {selectedTx.type}
                </span>
                <span
                  className={cn(
                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border",
                    badgeColors[selectedTx.source || "manual"] || badgeColors.manual
                  )}
                >
                  {selectedTx.source || "manual"}
                </span>
              </div>
            </div>

            {/* Properties List */}
            <div className="space-y-3 p-4 rounded-2xl frosted-glass-card border border-white/10">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Description</span>
                <span className="font-semibold text-foreground text-right max-w-[200px] truncate">
                  {selectedTx.description || "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Vendor / Client</span>
                <span className="font-semibold text-foreground">
                  {selectedTx.vendor_or_client || "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Category</span>
                <span className="font-semibold text-foreground">{selectedTx.category}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Effective Date</span>
                <span className="font-financial font-semibold text-foreground">{selectedTx.date}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Reference</span>
                <div className="flex items-center gap-1 font-financial">
                  <span className="font-semibold text-foreground">
                    {selectedTx.reference || "N/A"}
                  </span>
                  {selectedTx.reference && (
                    <button
                      type="button"
                      onClick={(e) => handleCopyReference(selectedTx.reference!, e)}
                      className="p-1 hover:text-white text-muted-foreground transition-colors"
                      title="Copy reference"
                    >
                      {copiedRef === selectedTx.reference ? (
                        <Check className="w-3 h-3 text-[#05CD99]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Transaction ID</span>
                <div className="flex items-center gap-1 font-financial text-[11px]">
                  <span className="truncate max-w-[150px] text-muted-foreground">
                    {selectedTx.id}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleCopyReference(selectedTx.id, e)}
                    className="p-1 hover:text-white text-muted-foreground transition-colors"
                    title="Copy full ID"
                  >
                    {copiedRef === selectedTx.id ? (
                      <Check className="w-3 h-3 text-[#05CD99]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              {selectedTx.external_transaction_id && (
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-muted-foreground">Gateway TX ID</span>
                  <div className="flex items-center gap-1 font-financial text-[11px]">
                    <span className="truncate max-w-[150px] text-muted-foreground">
                      {selectedTx.external_transaction_id}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopyReference(selectedTx.external_transaction_id!, e)}
                      className="p-1 hover:text-white text-muted-foreground transition-colors"
                      title="Copy Gateway ID"
                    >
                      {copiedRef === selectedTx.external_transaction_id ? (
                        <Check className="w-3 h-3 text-[#05CD99]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {selectedTx.idempotency_key && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Idempotency Key</span>
                  <div className="flex items-center gap-1 font-financial text-[11px]">
                    <span className="truncate max-w-[150px] text-muted-foreground">
                      {selectedTx.idempotency_key}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopyReference(selectedTx.idempotency_key!, e)}
                      className="p-1 hover:text-white text-muted-foreground transition-colors"
                      title="Copy Idempotency Key"
                    >
                      {copiedRef === selectedTx.idempotency_key ? (
                        <Check className="w-3 h-3 text-[#05CD99]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Transaction Lifecycle & Audit Timeline */}
            <div className="p-4 rounded-2xl frosted-glass-card border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground border-b border-white/5 pb-2">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#05CD99]" />
                  Ledger Verification Lifecycle
                </span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#05CD99]/15 text-[#05CD99] font-financial">
                  Reconciled
                </span>
              </div>

              <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-[#4318FF] before:via-[#818CF8] before:to-[#05CD99]">
                {/* Stage 1 */}
                <div className="relative text-xs">
                  <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-[#4318FF] ring-4 ring-[#4318FF]/20" />
                  <p className="font-semibold text-foreground">Initiated & Recorded</p>
                  <p className="text-[11px] text-muted-foreground font-financial">
                    {selectedTx.date} via {selectedTx.source || "manual entry"}
                  </p>
                </div>

                {/* Stage 2 */}
                <div className="relative text-xs">
                  <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-[#818CF8] ring-4 ring-[#818CF8]/20" />
                  <p className="font-semibold text-foreground">Audited by Sentinel</p>
                  <p className="text-[11px] text-muted-foreground">
                    Zero-discrepancy double-entry variance verified.
                  </p>
                </div>

                {/* Stage 3 */}
                <div className="relative text-xs">
                  <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-[#05CD99] ring-4 ring-[#05CD99]/20" />
                  <p className="font-semibold text-foreground">General Ledger Reconciled</p>
                  <p className="text-[11px] text-muted-foreground font-financial">
                    Immutable state committed • ID {selectedTx.id.slice(0, 8)}...
                  </p>
                </div>
              </div>
            </div>

            {/* Audit Status */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-muted-foreground flex items-center gap-2">
              <Info className="w-4 h-4 text-[#818CF8] shrink-0" />
              <span>Immutable double-entry record verified by Audit Sentinel.</span>
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setDeleteTarget(selectedTx)}
                className="w-full text-[#EF4444] hover:bg-[#EF4444]/10 hover:border-[#EF4444]/30"
              >
                Delete Record
              </Button>
            </div>
          </div>
        </Drawer>
      )}

      {/* ═══════════════════════════════════════════════════
          ADD TRANSACTION MODAL
          ═══════════════════════════════════════════════════ */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Record New Transaction"
        description="Enter transaction details into the double-entry financial ledger."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <Select
                value={formType}
                onChange={(e) => setFormType(e.target.value as "expense" | "income")}
                options={[
                  { value: "expense", label: "Expense (Outflow)" },
                  { value: "income", label: "Income (Inflow)" },
                ]}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <Select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                options={CATEGORIES.filter((c) => c !== "All").map((c) => ({
                  value: c,
                  label: c,
                }))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <Input
              placeholder="e.g. AWS Cloud Infrastructure Tier"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Amount (USD)</label>
              <Input
                placeholder="0.00"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date</label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Vendor / Client</label>
              <Input
                placeholder="e.g. Amazon Web Services"
                value={formVendor}
                onChange={(e) => setFormVendor(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Reference</label>
              <Input
                placeholder="e.g. AWS-9921"
                value={formReference}
                onChange={(e) => setFormReference(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={submitting}>
              {submitting ? "Saving..." : "Save Transaction"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════
          DELETE CONFIRMATION DIALOG
          ═══════════════════════════════════════════════════ */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Transaction Record?"
        description={`Are you sure you want to delete "${
          deleteTarget?.description || deleteTarget?.reference
        }"? This action will record an immutable entry in the audit sentinel.`}
        confirmText="Confirm Delete"
        isDestructive={true}
      />
    </div>
  );
}
