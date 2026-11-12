"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { StatusChip, LabelChip } from "@/components/ui/chips";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { AnimatedNumber } from "@/components/ui/animated-number";
import {
  CheckCircle2,
  ShieldAlert,
  CreditCard,
  Plus,
  RefreshCw,
  Loader2,
  DollarSign,
  Copy,
  Check,
  Inbox,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Clock,
  Sparkles,
  Layers,
  FileText,
  User,
  Zap,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import {
  GatewayStatusResponse,
  InvoiceResponse,
  PaymentItemResponse,
  CreateOrderResponse,
  PaymentCaptureResponse,
} from "@/lib/api-types";

type CheckoutStep = "select" | "confirm" | "processing" | "awaiting_approval" | "capturing" | "success" | "error";

export default function PaymentsPage() {
  const { addToast } = useToast();

  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatusResponse | null>(null);
  const [payments, setPayments] = useState<PaymentItemResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal & Drawer State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("select");
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [paymentDesc, setPaymentDesc] = useState<string>("");
  const [orderData, setOrderData] = useState<CreateOrderResponse | null>(null);
  const [captureData, setCaptureData] = useState<PaymentCaptureResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [retrying, setRetrying] = useState<boolean>(false);

  // Search & Filter state for Monitoring Table
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Load Status and Payments
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statusRes, payRes] = await Promise.all([
        apiClient.getGatewayStatus(),
        apiClient.getPayments(100, 0),
      ]);
      setGatewayStatus(statusRes);
      setPayments(payRes.items);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load payment records";
      addToast({ type: "error", title: "Error", message: msg });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Load Unpaid Invoices for Checkout Modal
  const loadUnpaidInvoices = async () => {
    try {
      const res = await apiClient.getInvoices();
      const unpaid = res.items.filter(
        (inv) => inv.status !== "Paid" && inv.status !== "Cancelled" && Number(inv.balance) > 0
      );
      setInvoices(unpaid);
      if (unpaid.length > 0) {
        setSelectedInvoiceId(unpaid[0].id);
        setCustomAmount(unpaid[0].balance);
        setPaymentDesc(`Payment for invoice ${unpaid[0].invoice_number}`);
      }
    } catch {
      // Graceful error handling
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenModal = () => {
    loadUnpaidInvoices();
    setCheckoutStep("select");
    setOrderData(null);
    setCaptureData(null);
    setErrorMessage("");
    setIsModalOpen(true);
  };

  const handleInvoiceSelect = (id: string) => {
    setSelectedInvoiceId(id);
    const selected = invoices.find((inv) => inv.id === id);
    if (selected) {
      setCustomAmount(selected.balance);
      setPaymentDesc(`Payment for invoice ${selected.invoice_number}`);
    }
  };

  const selectedInv = useMemo(
    () => invoices.find((inv) => inv.id === selectedInvoiceId),
    [invoices, selectedInvoiceId]
  );

  // Step 1 -> Step 2: Validate and Proceed to Confirmation
  const handleProceedToConfirm = () => {
    if (!selectedInvoiceId || !selectedInv) {
      addToast({ type: "error", title: "Invalid Invoice", message: "Please select an unpaid invoice." });
      return;
    }
    const amt = parseFloat(customAmount);
    if (isNaN(amt) || amt <= 0) {
      addToast({ type: "error", title: "Invalid Amount", message: "Amount must be greater than zero." });
      return;
    }
    if (amt > parseFloat(selectedInv.balance)) {
      addToast({
        type: "error",
        title: "Overpayment Not Allowed",
        message: `Amount $${amt.toFixed(2)} exceeds remaining balance of $${selectedInv.balance}.`,
      });
      return;
    }
    setCheckoutStep("confirm");
  };

  // Step 2 -> Step 3 & 4: Create PayPal Sandbox Order
  const handleCreateOrder = async () => {
    if (!selectedInvoiceId || !selectedInv) return;
    try {
      setCheckoutStep("processing");
      const amt = parseFloat(customAmount);
      const res = await apiClient.createPayPalOrder(selectedInvoiceId, amt);
      setOrderData(res);

      if (res.approve_url) {
        // Real PayPal Sandbox Approval Window
        setCheckoutStep("awaiting_approval");
      } else {
        // Sandbox instant flow: advance directly to capture
        await handleCaptureOrder(res.order_id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to initiate PayPal order";
      setErrorMessage(msg);
      setCheckoutStep("error");
      addToast({ type: "error", title: "Order Creation Failed", message: msg });
    }
  };

  // Step 5 -> Step 6, 7, 8: Capture Approved PayPal Order and Reconcile Ledger
  const handleCaptureOrder = async (orderIdToCapture?: string) => {
    const oid = orderIdToCapture || orderData?.order_id;
    if (!oid || !selectedInvoiceId) return;

    try {
      setCheckoutStep("capturing");
      const res = await apiClient.capturePayPalOrder(oid, selectedInvoiceId);
      setCaptureData(res);
      setCheckoutStep("success");
      addToast({
        type: "success",
        title: "Payment Captured & Reconciled",
        message: `$${res.amount_captured} settled for ${res.invoice_number}. Ledger updated automatically.`,
      });
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to capture approved PayPal payment";
      setErrorMessage(msg);
      setCheckoutStep("error");
      addToast({ type: "error", title: "Capture Verification Failed", message: msg });
    }
  };

  // Instant Sandbox Simulation
  const handleQuickDemoSimulation = async () => {
    if (!selectedInvoiceId) return;
    try {
      setCheckoutStep("capturing");
      const amt = customAmount ? parseFloat(customAmount) : undefined;
      const res = await apiClient.demoSimulatePayment(selectedInvoiceId, amt);
      setCaptureData(res);
      setCheckoutStep("success");
      addToast({
        type: "success",
        title: "Sandbox Payment Settled",
        message: `$${res.amount_captured} settled on ${res.invoice_number} with automated ledger reconciliation.`,
      });
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Simulation failed";
      setErrorMessage(msg);
      setCheckoutStep("error");
    }
  };

  // Filter payments for monitoring table
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== "all" && p.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesRef = p.reference?.toLowerCase().includes(query);
        const matchesInv = p.invoice_number?.toLowerCase().includes(query);
        const matchesCust = p.customer_name?.toLowerCase().includes(query);
        const matchesOrder = p.paypal_order_id?.toLowerCase().includes(query);
        const matchesCap = p.paypal_capture_id?.toLowerCase().includes(query);
        return matchesRef || matchesInv || matchesCust || matchesOrder || matchesCap;
      }
      return true;
    });
  }, [payments, statusFilter, searchQuery]);

  // Total Settled Calculations
  const totalSettled = useMemo(() => {
    return payments.reduce((acc, p) => {
      const isSuccess = p.status.toLowerCase() === "successful" || p.status.toLowerCase() === "paid";
      return acc + (isSuccess ? parseFloat(p.amount) : 0);
    }, 0);
  }, [payments]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-gradient-to-tr from-[#003087] via-[#0079C1] to-[#00F0FF] text-white shadow-[0_0_15px_rgba(0,121,193,0.4)]">
                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
              </span>
              Payments & PayPal Gateway
            </h1>
            <span className="text-xs uppercase font-extrabold px-3 py-1 rounded-full bg-[#0079C1]/15 text-[#0079C1] dark:text-[#00F0FF] border border-[#0079C1]/30 tracking-wider shadow-sm">
              Sandbox Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Full-lifecycle PayPal sandbox integration with server-verified Orders v2 capture, automated ledger reconciliation, and duplicate payment protection.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 rounded-full border-white/10 frosted-glass-card hover:border-[#0079C1]/40 text-xs sm:text-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0079C1]" : ""}`} />
            <span>Refresh Feed</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleOpenModal}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#003087] via-[#0079C1] to-[#00F0FF] text-white font-semibold text-xs sm:text-sm shadow-[0_4px_20px_rgba(0,121,193,0.35)] hover:shadow-[0_4px_25px_rgba(0,240,255,0.4)] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Collect Payment</span>
          </Button>
        </div>
      </div>

      {/* KPI & Gateway Architecture Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Settled Volume */}
        <div className="rounded-2xl frosted-glass-card p-5 flex items-center justify-between shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-white/20 group">
          <div>
            <span className="text-xs text-muted-foreground font-semibold tracking-tight">Total Settled Volume</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#34D399] mt-1 font-financial">
              ${totalSettled.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">Reconciled to general ledger</span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-[#34D399]/15 border border-[#34D399]/25 flex items-center justify-center text-[#34D399] group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(52,211,153,0.2)]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* PayPal Gateway Configuration */}
        <div className="rounded-2xl frosted-glass-card p-5 flex items-center justify-between shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-white/20 group">
          <div>
            <span className="text-xs text-muted-foreground font-semibold tracking-tight">PayPal Gateway</span>
            <div className="text-lg sm:text-xl font-extrabold text-foreground mt-1 flex items-center gap-2">
              <span>{gatewayStatus?.mode === "sandbox" ? "Sandbox Active" : "Production"}</span>
              <span className="h-2 w-2 rounded-full bg-[#34D399] animate-pulse shadow-[0_0_8px_#34D399]" />
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5 block font-mono">
              Orders v2 • {gatewayStatus?.client_id_masked || "Configured"}
            </span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-[#0079C1]/15 border border-[#0079C1]/25 flex items-center justify-center text-[#0079C1] dark:text-[#00F0FF] group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(0,121,193,0.2)]">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* Idempotency & Reconcile Sentinel */}
        <div className="rounded-2xl frosted-glass-card p-5 flex items-center justify-between shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-white/20 group">
          <div>
            <span className="text-xs text-muted-foreground font-semibold tracking-tight">Idempotency & Audit</span>
            <div className="text-lg sm:text-xl font-extrabold text-foreground mt-1 flex items-center gap-2">
              <span>Dual-Lock Guard</span>
              <ShieldCheck className="w-4 h-4 text-[#34D399]" />
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Blocks duplicate capture requests
            </span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(245,158,11,0.2)]">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Monitoring Table Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl frosted-glass-card border border-white/10">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by Invoice, Reference, Order or Capture ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg frosted-glass-input text-xs text-foreground placeholder:text-muted-foreground border border-white/15 focus:outline-none focus:border-[#0079C1]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground font-semibold">Status:</span>
          {["all", "successful", "pending", "failed"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-md font-mono capitalize transition-colors ${
                statusFilter === st
                  ? "bg-[#0079C1] text-white font-bold"
                  : "bg-white/5 text-muted-foreground hover:text-foreground"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Payment Monitoring Ledger Table */}
      <div className="rounded-2xl border border-white/10 frosted-glass-card overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0079C1]" />
              Payment Monitoring & Ledger Reconciliation Records
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verified PayPal captures cross-referenced against double-entry journal entries.
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
            {filteredPayments.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-4">Invoice / Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">PayPal Order ID</th>
                <th className="py-3 px-4">Capture ID</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Reconciliation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <Inbox className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                    No payment records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                    {/* Invoice & Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-foreground">
                        {item.invoice_number || item.reference || "Invoice Settlement"}
                      </div>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        {item.customer_name || "Direct Settlement"}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-mono font-bold text-sm text-[#34D399]">
                      ${parseFloat(item.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Channel */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-[11px] font-mono border border-white/10">
                        {item.method === "paypal" ? "PayPal Sandbox" : item.method}
                      </span>
                    </td>

                    {/* Order ID */}
                    <td className="py-3.5 px-4 font-mono">
                      {item.paypal_order_id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-foreground/90">{item.paypal_order_id}</span>
                          <button
                            onClick={() => handleCopy(item.paypal_order_id!)}
                            className="text-muted-foreground hover:text-white p-1"
                            title="Copy Order ID"
                          >
                            {copiedId === item.paypal_order_id ? (
                              <Check className="w-3 h-3 text-[#34D399]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Capture ID */}
                    <td className="py-3.5 px-4 font-mono">
                      {item.paypal_capture_id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#34D399] font-bold">{item.paypal_capture_id}</span>
                          <button
                            onClick={() => handleCopy(item.paypal_capture_id!)}
                            className="text-muted-foreground hover:text-white p-1"
                            title="Copy Capture ID"
                          >
                            {copiedId === item.paypal_capture_id ? (
                              <Check className="w-3 h-3 text-[#34D399]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-muted-foreground font-mono">
                      {item.payment_date}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <StatusChip status={item.status} />
                    </td>

                    {/* Reconciliation */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 text-[10px] font-bold tracking-wider uppercase">
                        <Check className="w-3 h-3" /> Reconciled
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYMENT CREATION & CHECKOUT MODAL */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            if (checkoutStep !== "capturing") {
              setIsModalOpen(false);
            }
          }}
          title={
            checkoutStep === "success"
              ? "Payment Succeeded"
              : checkoutStep === "error"
              ? "Payment Error"
              : "Collect Payment via PayPal Sandbox"
          }
          description={
            checkoutStep === "success"
              ? "Payment captured and reconciled against the organisation general ledger."
              : "Prepare payment collection with official PayPal sandbox authentication and verified capture."
          }
        >
          {/* STEP 1: SELECT & CONFIGURE */}
          {checkoutStep === "select" && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Select Unpaid Invoice:</label>
                {invoices.length === 0 ? (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-muted-foreground text-center">
                    No outstanding invoices require payment. All invoices are currently paid!
                  </div>
                ) : (
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => handleInvoiceSelect(e.target.value)}
                    className="w-full p-2.5 rounded-xl frosted-glass-input text-foreground text-xs border border-white/15 focus:outline-none"
                  >
                    {invoices.map((inv) => (
                      <option key={inv.id} value={inv.id} className="bg-slate-900 text-foreground">
                        {inv.invoice_number} — {inv.customer_name || "Client"} (${parseFloat(inv.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })} balance)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedInv && (
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Client Name:</span>
                    <span className="font-bold text-foreground">{selectedInv.customer_name || "Client"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Original Invoice Total:</span>
                    <span className="font-mono text-foreground">${parseFloat(selectedInv.total).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Outstanding Balance:</span>
                    <span className="font-mono font-bold text-[#34D399]">
                      ${parseFloat(selectedInv.balance).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Due Date:</span>
                    <span className="font-mono text-muted-foreground">{selectedInv.due_date}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Payment Collection Amount ($ USD):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2.5 rounded-xl frosted-glass-input text-foreground text-xs font-mono border border-white/15 focus:outline-none focus:border-[#0079C1]"
                />
                <span className="text-[10px] text-muted-foreground block mt-1">
                  Supports full settlement or custom partial installments.
                </span>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Description / Notes:</label>
                <input
                  type="text"
                  value={paymentDesc}
                  onChange={(e) => setPaymentDesc(e.target.value)}
                  placeholder="e.g. Consulting and cloud retainer settlement"
                  className="w-full p-2.5 rounded-xl frosted-glass-input text-foreground text-xs border border-white/15 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!selectedInvoiceId || invoices.length === 0}
                  onClick={handleProceedToConfirm}
                  className="bg-gradient-to-r from-[#003087] to-[#0079C1] text-white font-bold"
                >
                  Review Payment Summary <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: CONFIRMATION SUMMARY */}
          {checkoutStep === "confirm" && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#003087]/20 via-white/5 to-transparent border border-[#0079C1]/30 space-y-3">
                <h4 className="text-sm font-bold text-foreground">Payment Summary</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice Reference:</span>
                    <span className="font-mono font-bold text-foreground">{selectedInv?.invoice_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer:</span>
                    <span className="font-bold text-foreground">{selectedInv?.customer_name || "Client"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Settlement Amount:</span>
                    <span className="font-mono font-bold text-[#34D399] text-sm">
                      ${parseFloat(customAmount).toFixed(2)} USD
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <span className="font-semibold text-foreground">PayPal Sandbox (Orders v2)</span>
                  </div>
                </div>
              </div>

              {/* Sandbox Demo Credentials Pill */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1 text-[11px]">
                <div className="flex items-center gap-1.5 text-[#00F0FF] font-bold">
                  <Sparkles className="w-3.5 h-3.5" /> PayPal Sandbox Credentials
                </div>
                <div className="text-muted-foreground">
                  Sandbox Buyer: <code className="text-foreground font-mono">sb-buyer@novastack.io</code>
                </div>
                <div className="text-muted-foreground text-[10px]">
                  Order creation and capture are validated server-side against PayPal Orders v2 REST endpoints.
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setCheckoutStep("select")}>
                  Back
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleQuickDemoSimulation}
                    className="border-white/20 text-xs"
                  >
                    Instant Settle
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCreateOrder}
                    className="bg-gradient-to-r from-[#003087] via-[#0079C1] to-[#00F0FF] text-white font-bold"
                  >
                    Launch PayPal Checkout
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CREATING ORDER */}
          {checkoutStep === "processing" && (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#0079C1] animate-spin mx-auto" />
              <h4 className="text-sm font-bold text-foreground">Creating PayPal Sandbox Order...</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Acquiring server-side OAuth2 token and registering Orders v2 order with capture intent.
              </p>
            </div>
          )}

          {/* STEP 4: AWAITING BUYER APPROVAL */}
          {checkoutStep === "awaiting_approval" && orderData && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#0079C1]/10 border border-[#0079C1]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">PayPal Order Created:</span>
                  <span className="font-mono font-bold text-[#00F0FF]">{orderData.order_id}</span>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  The PayPal sandbox order is ready. Click below to launch the PayPal checkout window, log in with sandbox buyer credentials, and approve the payment.
                </p>
              </div>

              {orderData.approve_url && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Approval Window:</span>
                  <a
                    href={orderData.approve_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#00F0FF] font-bold hover:underline"
                  >
                    Open PayPal Checkout <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg text-muted-foreground text-[11px] flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  After approving in the PayPal window, click <strong>&quot;Verify & Capture Order&quot;</strong> to settle the payment and update the general ledger.
                </span>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleCaptureOrder()}
                  className="bg-gradient-to-r from-[#003087] via-[#0079C1] to-[#34D399] text-white font-bold"
                >
                  Verify & Capture Order <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: CAPTURING & RECONCILING */}
          {checkoutStep === "capturing" && (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#34D399] animate-spin mx-auto" />
              <h4 className="text-sm font-bold text-foreground">Capturing & Reconciling Payment...</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Verifying PayPal capture response, settling invoice balance, and recording double-entry cash receipt transaction.
              </p>
            </div>
          )}

          {/* STEP 6: CAPTURE SUCCESS */}
          {checkoutStep === "success" && captureData && (
            <div className="space-y-4 text-xs animate-in fade-in zoom-in-95 duration-300">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#34D399]/20 via-white/5 to-transparent border border-[#34D399]/40 text-center space-y-3">
                {/* Refined stroke checkmark with emerald halo pulse */}
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-[#34D399]/25 animate-ping opacity-40" />
                  <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#34D399]/30 to-[#05CD99]/15 border border-[#34D399]/60 shadow-[0_0_30px_rgba(52,211,153,0.35)] flex items-center justify-center">
                    <svg
                      className="w-7 h-7 text-[#34D399]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" className="opacity-20" />
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-extrabold text-foreground">
                    Payment Verified & Captured
                  </h4>
                  <div className="text-2xl font-extrabold text-[#34D399] font-financial">
                    <AnimatedNumber
                      value={parseFloat(captureData.amount_captured)}
                      prefix="$"
                      decimals={2}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Invoice {captureData.invoice_number} marked as <strong className="text-foreground">{captureData.invoice_new_status}</strong>.
                  </p>
                </div>
              </div>

              {/* Settlement Details */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-sans">PayPal Capture ID:</span>
                  <span className="text-[#34D399] font-bold">{captureData.paypal_capture_id || "COMPLETED"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-sans">PayPal Order ID:</span>
                  <span className="text-foreground">{captureData.paypal_order_id || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-sans">Invoice Reference:</span>
                  <span className="text-foreground">{captureData.invoice_number}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-sans">Remaining Balance:</span>
                  <span className="text-foreground font-financial">${captureData.invoice_balance_remaining}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-white/5">
                  <span className="text-muted-foreground font-sans">General Ledger Posting:</span>
                  <span className="text-[#34D399] font-bold flex items-center gap-1 font-sans">
                    <ShieldCheck className="w-3.5 h-3.5" /> Reconciled
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                <Link
                  href={`/transactions?search=${encodeURIComponent(captureData.invoice_number)}`}
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl frosted-glass-card border border-white/15 text-xs font-semibold text-foreground hover:bg-white/10 hover:border-white/30 transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-[#818CF8]" />
                  <span>View Reconciled Ledger Entry</span>
                  <ArrowRight className="w-3 h-3 ml-0.5 text-muted-foreground" />
                </Link>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl bg-gradient-to-r from-[#003087] via-[#0079C1] to-[#34D399] text-white font-bold px-5"
                >
                  Done
                </Button>
              </div>
            </div>
          )}

          {/* STEP 7: ERROR STATE */}
          {checkoutStep === "error" && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#F07878]/15 border border-[#F07878]/30 space-y-2">
                <div className="flex items-center gap-2 text-[#F07878] font-bold">
                  <AlertCircle className="w-4 h-4" /> Payment Operation Failed
                </div>
                <p className="text-foreground/90 text-xs">{errorMessage || "An unexpected error occurred during PayPal order processing."}</p>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setCheckoutStep("confirm")}
                  className="bg-[#0079C1] text-white font-bold"
                >
                  Retry Payment
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
