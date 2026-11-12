"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/chips";
import { Modal } from "@/components/ui/modal";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  Plus,
  Download,
  Eye,
  FileText,
  Inbox,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  Send,
  Trash2,
  Calendar,
  ExternalLink,
  DollarSign,
  Percent,
  Receipt,
  User,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { InvoiceResponse, InvoiceLineItemCreate } from "@/lib/api-types";

function formatUSD(val: string | number): string {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

interface FormLineItem {
  id: string;
  description: string;
  quantity: string;
  unit_price: string;
}

export default function InvoicesPage() {
  const { addToast } = useToast();
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState("0.00");
  const [totalOverdue, setTotalOverdue] = useState("0.00");
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceResponse | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponse | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Multi-line-item form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [taxRate, setTaxRate] = useState("0.00");
  const [discountAmount, setDiscountAmount] = useState("0.00");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<FormLineItem[]>([
    { id: "1", description: "Cloud Engineering & Architecture Retainer", quantity: "1", unit_price: "5000.00" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Fetch invoices from real backend
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.getInvoices(statusFilter !== "all" ? statusFilter : undefined);
      setInvoices(res.items || []);
      setTotalOutstanding(res.total_outstanding || "0.00");
      setTotalOverdue(res.total_overdue || "0.00");
    } catch (e) {
      console.error("Failed to load invoices:", e);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Client-side live preview calculation (validated server-side on creation)
  const calculatedTotals = useMemo(() => {
    let subtotal = 0;
    lineItems.forEach((item) => {
      const q = parseFloat(item.quantity) || 0;
      const p = parseFloat(item.unit_price) || 0;
      subtotal += q * p;
    });

    const taxPct = parseFloat(taxRate) || 0;
    const taxAmt = (subtotal * taxPct) / 100;
    const discount = parseFloat(discountAmount) || 0;
    const total = Math.max(0, subtotal + taxAmt - discount);

    return {
      subtotal,
      taxAmount: taxAmt,
      discount,
      total,
    };
  }, [lineItems, taxRate, discountAmount]);

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        description: "",
        quantity: "1",
        unit_price: "0.00",
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) {
      addToast({ type: "info", title: "Minimum Line Items", message: "Invoices must contain at least 1 item." });
      return;
    }
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof FormLineItem, value: string) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleCreate = async () => {
    if (!customerName.trim()) {
      addToast({ type: "error", title: "Customer Required", message: "Please enter a valid client name." });
      return;
    }

    const validLines = lineItems.filter(
      (l) => l.description.trim() && parseFloat(l.unit_price) > 0 && parseFloat(l.quantity) > 0
    );

    if (validLines.length === 0) {
      addToast({
        type: "error",
        title: "Invalid Items",
        message: "Please enter at least one valid line item with description, quantity, and unit price.",
      });
      return;
    }

    try {
      setSubmitting(true);
      const payloadLineItems: InvoiceLineItemCreate[] = validLines.map((l) => ({
        description: l.description.trim(),
        quantity: l.quantity,
        unit_price: parseFloat(l.unit_price).toFixed(2),
      }));

      await apiClient.createInvoice({
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || undefined,
        issue_date: issueDate,
        due_date: dueDate,
        tax_rate: (parseFloat(taxRate) / 100).toFixed(4),
        discount_amount: parseFloat(discountAmount).toFixed(2),
        notes: notes.trim() || undefined,
        line_items: payloadLineItems,
      });

      addToast({
        type: "success",
        title: "Invoice Generated",
        message: "Invoice created with Python Decimal verification and assigned to client ledger.",
      });

      setIsCreateOpen(false);
      setCustomerName("");
      setCustomerEmail("");
      setLineItems([
        { id: "1", description: "Cloud Engineering & Architecture Retainer", quantity: "1", unit_price: "5000.00" },
      ]);
      setNotes("");
      setTaxRate("0.00");
      setDiscountAmount("0.00");
      fetchInvoices();
    } catch (e: unknown) {
      const err = e as Error;
      addToast({ type: "error", title: "Invoice Creation Failed", message: err.message || "Failed to create invoice." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (
    invoiceId: string,
    newStatus: "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled"
  ) => {
    try {
      setUpdatingStatus(invoiceId);
      const updated = await apiClient.updateInvoiceStatus(invoiceId, newStatus);
      addToast({
        type: "success",
        title: "Status Updated",
        message: `Invoice ${updated.invoice_number} transitioned to "${newStatus}".`,
      });
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(updated);
      }
      if (previewInvoice?.id === invoiceId) {
        setPreviewInvoice(updated);
      }
      fetchInvoices();
    } catch (e: unknown) {
      const err = e as Error;
      addToast({ type: "error", title: "Update Failed", message: err.message || "Failed to update invoice status." });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const filteredInvoices = useMemo(() => {
    let result = invoices;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.invoice_number.toLowerCase().includes(q) ||
          (inv.customer_name && inv.customer_name.toLowerCase().includes(q))
      );
    }
    return result;
  }, [invoices, searchQuery]);

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════
          HEADER: Title, Subtitle, and Creation Trigger
          ═══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Invoices & Receivables
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Automated billing lifecycle, double-entry aging, and instant payment settlement
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Create Invoice</span>
        </Button>
      </div>

      {/* ═══════════════════════════════════════════════════
          SUMMARY KPI FLOATING CARDS
          ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Outstanding */}
        <div className="rounded-2xl frosted-glass-card p-5 flex items-center justify-between shadow-lg border border-white/10 group transition-all hover:-translate-y-1">
          <div>
            <span className="text-xs text-muted-foreground font-semibold tracking-tight">Total Outstanding</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1 font-financial">
              {formatUSD(totalOutstanding)}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">Active receivables balance</span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-[#4318FF]/15 border border-[#4318FF]/25 flex items-center justify-center text-[#818CF8] group-hover:scale-110 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Overdue Invoices */}
        <div className="rounded-2xl frosted-glass-card p-5 flex items-center justify-between shadow-lg border border-white/10 group transition-all hover:-translate-y-1">
          <div>
            <span className="text-xs text-muted-foreground font-semibold tracking-tight">Overdue Invoices</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#F07878] mt-1 font-financial">
              {formatUSD(totalOverdue)}
            </div>
            <span className="text-[11px] text-[#F07878]/80 mt-0.5 block">Requires immediate collections follow-up</span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/25 flex items-center justify-center text-[#EF4444] group-hover:scale-110 transition-transform">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Total Invoice Records */}
        <div className="rounded-2xl frosted-glass-card p-5 flex items-center justify-between shadow-lg border border-white/10 group transition-all hover:-translate-y-1">
          <div>
            <span className="text-xs text-muted-foreground font-semibold tracking-tight">Total Invoices</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1 font-financial">
              {invoices.length}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">Indexed client records</span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-[#00F0FF]/15 border border-[#00F0FF]/25 flex items-center justify-center text-[#00F0FF] group-hover:scale-110 transition-transform">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          SEARCH & STATUS FILTERS
          ═══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoice number or customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 frosted-glass-input"
          />
        </div>

        <div className="flex items-center frosted-glass-card border border-white/10 p-0.5 rounded-xl shrink-0 overflow-x-auto scrollbar-none">
          {["all", "Draft", "Sent", "Paid", "Overdue", "Cancelled"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                statusFilter === s
                  ? "bg-[#4318FF] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "All Invoices" : s}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          FROSTED GLASS INVOICE LIST
          ═══════════════════════════════════════════════════ */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="frosted-glass-card rounded-2xl p-4 flex items-center justify-between gap-4 animate-pulse border border-white/5"
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-9 h-9 rounded-xl bg-white/5" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-28 bg-white/5 rounded" />
                  <div className="h-4 w-44 bg-white/10 rounded" />
                </div>
              </div>
              <div className="h-4 w-24 bg-white/10 rounded" />
            </div>
          ))
        ) : filteredInvoices.length === 0 ? (
          <div className="frosted-glass-card rounded-3xl p-12 text-center text-muted-foreground border border-white/10">
            <Inbox className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="text-base font-bold text-foreground">No Invoices Found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              No invoice records matched your query. Create a new branded invoice to initiate client billing.
            </p>
          </div>
        ) : (
          filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              onClick={() => setSelectedInvoice(inv)}
              className="frosted-glass-card rounded-2xl px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(67,24,255,0.15)] hover:border-white/20 border border-white/10 cursor-pointer select-none"
            >
              {/* Left: Icon, Number, Customer, Dates */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-[#4318FF]/10 border border-[#4318FF]/20 flex items-center justify-center text-[#818CF8] shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-financial text-xs font-bold text-foreground tracking-tight">
                      {inv.invoice_number}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs font-semibold text-foreground/90 truncate">
                      {inv.customer_name || "Client"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>
                      Issued: <span className="font-financial">{inv.issue_date}</span>
                    </span>
                    <span>•</span>
                    <span>
                      Due: <span className="font-financial">{inv.due_date}</span>
                    </span>
                    {inv.line_items && (
                      <span className="text-[11px] text-muted-foreground/60 hidden sm:inline">
                        ({inv.line_items.length} item{inv.line_items.length !== 1 ? "s" : ""})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Middle: Status Badge */}
              <div className="shrink-0 flex items-center gap-2">
                <StatusChip status={inv.status} />
              </div>

              {/* Right: Amounts & Quick Actions */}
              <div className="flex items-center justify-between md:justify-end gap-5 shrink-0">
                <div className="text-right">
                  <div className="font-financial text-sm md:text-base font-extrabold text-foreground">
                    {formatUSD(inv.total)}
                  </div>
                  {parseFloat(inv.balance) > 0 && inv.status !== "Paid" && (
                    <div className="font-financial text-[11px] text-[#F07878] font-semibold">
                      Due: {formatUSD(inv.balance)}
                    </div>
                  )}
                </div>

                {/* Hover-reveal action buttons */}
                <div className="opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewInvoice(inv);
                    }}
                    className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all"
                    title="Quick Preview"
                    aria-label="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <a
                    href={apiClient.getInvoicePdfUrl(inv.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg border border-[#4318FF]/30 bg-[#4318FF]/10 hover:bg-[#4318FF]/20 text-[#818CF8] hover:text-white transition-all"
                    title="Download Branded PDF"
                    aria-label="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          CREATE INVOICE MODAL (MULTI-LINE ITEMS & LIVE TOTALS)
          ═══════════════════════════════════════════════════ */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Branded Client Invoice"
        description="Line item amounts, tax rates, and total balances are computed server-side in Python Decimal."
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto scrollbar-thin pr-1 text-xs">
          {/* Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Customer / Client Name *</label>
              <Input
                placeholder="e.g. Meridian Systems Inc."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Customer Email</label>
              <Input
                placeholder="billing@meridiansys.com"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Issue Date</label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Line Items</span>
              <button
                type="button"
                onClick={addLineItem}
                className="text-[11px] font-semibold text-[#818CF8] hover:text-white flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {lineItems.map((item, index) => (
                <div key={item.id} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground/60">ITEM {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeLineItem(item.id)}
                      className="text-muted-foreground/60 hover:text-[#EF4444] transition-colors p-0.5"
                      title="Remove item"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div>
                    <Input
                      placeholder="Item description (e.g. Cloud Architecture Consultation)"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Quantity</label>
                      <Input
                        type="number"
                        placeholder="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, "quantity", e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Unit Price ($)</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(item.id, "unit_price", e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tax, Discount & Notes */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Tax Rate (%)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Discount ($)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Notes / Terms</label>
            <Input
              placeholder="Payment due within 30 days of receipt."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Live Calculated Summary Box */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5 font-financial">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal:</span>
              <span>{formatUSD(calculatedTotals.subtotal)}</span>
            </div>
            {calculatedTotals.taxAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax ({taxRate}%):</span>
                <span>+{formatUSD(calculatedTotals.taxAmount)}</span>
              </div>
            )}
            {calculatedTotals.discount > 0 && (
              <div className="flex justify-between text-[#34D399]">
                <span>Discount:</span>
                <span>-{formatUSD(calculatedTotals.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-foreground text-sm pt-1 border-t border-white/10">
              <span>Total Invoice Amount:</span>
              <span>{formatUSD(calculatedTotals.total)}</span>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={submitting}>
              {submitting ? "Generating..." : "Generate Invoice"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════
          INVOICE DETAIL DRAWER
          ═══════════════════════════════════════════════════ */}
      {selectedInvoice && (
        <Drawer
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title={`Invoice ${selectedInvoice.invoice_number}`}
        >
          <div className="space-y-5 text-xs">
            {/* Top Status & Amount Card */}
            <div className="p-4 rounded-2xl frosted-glass-card border border-white/10 text-center">
              <div className="text-2xl font-extrabold font-financial text-foreground">
                {formatUSD(selectedInvoice.total)}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <StatusChip status={selectedInvoice.status} />
                {parseFloat(selectedInvoice.balance) > 0 && selectedInvoice.status !== "Paid" && (
                  <span className="text-[11px] font-bold text-[#F07878] font-financial">
                    Balance Due: {formatUSD(selectedInvoice.balance)}
                  </span>
                )}
              </div>
            </div>

            {/* Workflow Status Actions */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-[11px] font-bold text-muted-foreground block">Transition Workflow State</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedInvoice.status !== "Sent" && selectedInvoice.status !== "Paid" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(selectedInvoice.id, "Sent")}
                    disabled={updatingStatus === selectedInvoice.id}
                    className="flex items-center gap-1 text-[11px]"
                  >
                    <Send className="w-3 h-3 text-[#818CF8]" />
                    <span>Mark as Sent</span>
                  </Button>
                )}
                {selectedInvoice.status !== "Paid" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(selectedInvoice.id, "Paid")}
                    disabled={updatingStatus === selectedInvoice.id}
                    className="flex items-center gap-1 text-[11px] text-[#34D399] border-[#34D399]/30 hover:bg-[#34D399]/10"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Mark as Paid</span>
                  </Button>
                )}
                {selectedInvoice.status !== "Cancelled" && selectedInvoice.status !== "Paid" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(selectedInvoice.id, "Cancelled")}
                    disabled={updatingStatus === selectedInvoice.id}
                    className="flex items-center gap-1 text-[11px] text-[#EF4444] border-[#EF4444]/30 hover:bg-[#EF4444]/10"
                  >
                    <AlertCircle className="w-3 h-3" />
                    <span>Cancel Invoice</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Metadata Properties */}
            <div className="p-4 rounded-2xl frosted-glass-card border border-white/10 space-y-2.5">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Client Name</span>
                <span className="font-semibold text-foreground">{selectedInvoice.customer_name || "Client"}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Issue Date</span>
                <span className="font-financial text-foreground">{selectedInvoice.issue_date}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Due Date</span>
                <span className="font-financial text-foreground">{selectedInvoice.due_date}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-financial text-foreground">{formatUSD(selectedInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Tax Amount</span>
                <span className="font-financial text-foreground">+{formatUSD(selectedInvoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-financial text-foreground">-{formatUSD(selectedInvoice.discount_amount)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-financial text-[#34D399]">{formatUSD(selectedInvoice.amount_paid)}</span>
              </div>
            </div>

            {/* Line Items List */}
            <div className="p-4 rounded-2xl frosted-glass-card border border-white/10 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Line Items Breakdown
              </span>
              <div className="space-y-1.5 divide-y divide-white/5">
                {selectedInvoice.line_items.map((item, idx) => (
                  <div key={idx} className="pt-2 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-foreground">{item.description}</div>
                      <div className="text-[10px] text-muted-foreground font-financial">
                        Qty: {item.quantity} × {formatUSD(item.unit_price)}
                      </div>
                    </div>
                    <div className="font-financial font-bold text-foreground">
                      {formatUSD(item.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes if present */}
            {selectedInvoice.notes && (
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-muted-foreground text-[11px]">
                <strong className="text-foreground block mb-0.5">Notes & Terms:</strong>
                {selectedInvoice.notes}
              </div>
            )}

            {/* Export and Payment Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <a
                href={apiClient.getInvoicePdfUrl(selectedInvoice.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#4318FF] hover:bg-[#3615CC] text-white font-semibold text-xs shadow-md transition-all text-center"
              >
                <Download className="w-4 h-4" />
                <span>Download Official PDF Invoice</span>
              </a>

              {parseFloat(selectedInvoice.balance) > 0 && selectedInvoice.status !== "Paid" && (
                <a
                  href={`/payments?invoice_id=${selectedInvoice.id}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl border border-[#34D399]/30 bg-[#34D399]/10 hover:bg-[#34D399]/20 text-[#34D399] font-semibold text-xs transition-all text-center"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Collect Payment Online</span>
                </a>
              )}
            </div>
          </div>
        </Drawer>
      )}

      {/* ═══════════════════════════════════════════════════
          INVOICE QUICK PREVIEW MODAL
          ═══════════════════════════════════════════════════ */}
      {previewInvoice && (
        <Modal
          isOpen={!!previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          title={`Invoice Preview: ${previewInvoice.invoice_number}`}
        >
          <div className="space-y-4 border border-white/10 rounded-2xl p-5 frosted-glass-card text-foreground">
            <div className="flex justify-between items-start border-b border-white/10 pb-3">
              <div>
                <span className="text-xs font-extrabold tracking-wider text-[#00F0FF]">FINEXA INVOICE</span>
                <h3 className="font-bold text-lg text-foreground mt-0.5">{previewInvoice.invoice_number}</h3>
              </div>
              <StatusChip status={previewInvoice.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div>
                <span className="block text-[11px] uppercase tracking-wider text-muted-foreground/70">Client</span>
                <strong className="text-foreground text-sm">{previewInvoice.customer_name || "Standard Client"}</strong>
              </div>
              <div className="text-right">
                <span className="block text-[11px] uppercase tracking-wider text-muted-foreground/70">Timeline</span>
                <div>Issued: <span className="font-financial">{previewInvoice.issue_date}</span></div>
                <div>Due: <span className="font-financial">{previewInvoice.due_date}</span></div>
              </div>
            </div>

            <div className="border rounded-xl border-white/10 p-3 space-y-2 text-xs bg-white/5">
              {previewInvoice.line_items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span>{item.description} (x{item.quantity})</span>
                  <span className="font-semibold font-financial text-foreground">{formatUSD(item.amount)}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-between items-center">
              <div>
                <span className="text-xs text-muted-foreground block">Balance Due</span>
                <span className="text-xl font-extrabold text-foreground font-financial">
                  {formatUSD(previewInvoice.balance)}
                </span>
              </div>
              <a
                href={apiClient.getInvoicePdfUrl(previewInvoice.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#4318FF] hover:bg-[#3615CC] text-white shadow-[0_4px_14px_rgba(67,24,255,0.4)] transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
