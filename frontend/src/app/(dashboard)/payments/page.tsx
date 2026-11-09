"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FinexaDataGrid } from "@/components/grid/FinexaDataGrid";
import { StatusChip } from "@/components/ui/chips";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  CheckCircle2,
  ShieldAlert,
  CreditCard,
  Plus,
  RefreshCw,
  Loader2,
  DollarSign,
} from "lucide-react";
import { ColDef } from "ag-grid-community";
import { CustomCellRendererProps } from "ag-grid-react";
import { apiClient } from "@/lib/api-client";
import {
  GatewayStatusResponse,
  InvoiceResponse,
} from "@/lib/api-types";

interface DisplayPaymentRow {
  id: string;
  date: string;
  invoice_ref: string;
  amount: number;
  method: string;
  status: string;
  paypal_order_id?: string | null;
  paypal_capture_id?: string | null;
}

export default function PaymentsPage() {
  const { addToast } = useToast();

  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatusResponse | null>(null);
  const [payments, setPayments] = useState<DisplayPaymentRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);

  // Load Status and Payments
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statusRes, payRes] = await Promise.all([
        apiClient.getGatewayStatus(),
        apiClient.getPayments(50, 0),
      ]);
      setGatewayStatus(statusRes);

      const mapped: DisplayPaymentRow[] = payRes.items.map((p) => ({
        id: p.reference || p.id.slice(0, 8),
        date: p.payment_date,
        invoice_ref: p.reference || "Invoice Settlement",
        amount: Number(p.amount),
        method: p.method === "paypal" ? "PayPal Sandbox (Orders v2)" : p.method,
        status: p.status,
        paypal_order_id: p.paypal_order_id,
        paypal_capture_id: p.paypal_capture_id,
      }));
      setPayments(mapped);
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
    setIsModalOpen(true);
  };

  const handleInvoiceSelect = (id: string) => {
    setSelectedInvoiceId(id);
    const selected = invoices.find((inv) => inv.id === id);
    if (selected) {
      setCustomAmount(selected.balance);
    }
  };

  // 1-Click Sandbox Capture Simulation
  const handleSimulatePayment = async () => {
    if (!selectedInvoiceId) return;
    try {
      setProcessing(true);
      const amountVal = customAmount ? parseFloat(customAmount) : undefined;
      const res = await apiClient.demoSimulatePayment(selectedInvoiceId, amountVal);

      addToast({
        type: "success",
        title: "Payment Captured",
        message: `$${res.amount_captured} settled on ${res.invoice_number}. Status: ${res.invoice_new_status}.`,
      });

      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment capture failed";
      addToast({ type: "error", title: "Capture Failed", message: msg });
    } finally {
      setProcessing(false);
    }
  };

  const columnDefs: ColDef[] = [
    { field: "id", headerName: "Payment ID", width: 140 },
    { field: "date", headerName: "Date", width: 120 },
    { field: "invoice_ref", headerName: "Reference", width: 180 },
    { field: "method", headerName: "Channel / Gateway", flex: 2 },
    {
      field: "amount",
      headerName: "Amount (USD)",
      width: 150,
      cellRenderer: (params: CustomCellRendererProps<DisplayPaymentRow, number>) => (
        <span className="tabular-nums font-semibold text-foreground">
          ${params.value ? params.value.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "0.00"}
        </span>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      cellRenderer: (params: CustomCellRendererProps<DisplayPaymentRow, string>) => (
        <StatusChip status={params.value || "successful"} />
      ),
    },
  ];

  const selectedInv = invoices.find((inv) => inv.id === selectedInvoiceId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Payments & Collections
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Idempotent payment capture, PayPal sandbox gateway, and automated ledger reconciliation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleOpenModal}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Collect Payment</span>
          </Button>
        </div>
      </div>

      {/* Gateway Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-full bg-[#48D597]/15 text-[#48D597]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
              Gateway Status
            </span>
            <h4 className="text-sm font-semibold text-foreground mt-0.5">
              {gatewayStatus?.mode === "sandbox" ? "PayPal Sandbox Connected" : "PayPal Live Connected"}
            </h4>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-full bg-[#8B7CFF]/15 text-[#8B7CFF]">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
              Webhook Engine
            </span>
            <h4 className="text-sm font-semibold text-foreground mt-0.5">
              {gatewayStatus?.webhook_id_configured ? "HMAC Verification Active" : "Idempotent Deduplication Active"}
            </h4>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-full bg-[#F59E0B]/15 text-[#F59E0B]">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
              Environment
            </span>
            <h4 className="text-sm font-semibold text-foreground mt-0.5">
              {gatewayStatus?.client_id_masked !== "Not Set"
                ? `Active: ${gatewayStatus?.client_id_masked}`
                : "Demo Sandbox Emulation"}
            </h4>
          </div>
        </div>
      </div>

      {/* AG Grid */}
      <FinexaDataGrid
        rowData={payments}
        columnDefs={columnDefs}
        gridHeight="420px"
        renderMobileCard={(item) => (
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-muted-foreground">{item.id} • {item.date}</span>
                <h4 className="text-sm font-semibold text-foreground mt-0.5">{item.invoice_ref}</h4>
                <span className="text-xs text-muted-foreground">{item.method}</span>
              </div>
              <StatusChip status={item.status} />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Captured Amount</span>
              <span className="tabular-nums font-bold text-sm text-foreground">
                ${item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      />

      {/* Collect / Simulate Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Collect Invoice Payment via PayPal Sandbox"
        description="Select an outstanding invoice to trigger a sandbox payment capture and auto-reconcile the ledger."
      >
        <div className="space-y-4 pt-2">
          {invoices.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No outstanding or unpaid invoices available. All current invoices are settled!
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Select Unpaid Invoice
                </label>
                <Select
                  value={selectedInvoiceId}
                  onChange={(e) => handleInvoiceSelect(e.target.value)}
                  options={invoices.map((inv) => ({
                    value: inv.id,
                    label: `${inv.invoice_number} — $${Number(inv.balance).toLocaleString()} balance (${inv.customer_name || "Client"})`,
                  }))}
                />
              </div>

              {selectedInv && (
                <div className="p-3.5 rounded-lg bg-panel border border-border/60 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client:</span>
                    <span className="font-semibold text-foreground">{selectedInv.customer_name || "Client"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice Total:</span>
                    <span className="tabular-nums font-semibold">${Number(selectedInv.total).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining Balance:</span>
                    <span className="tabular-nums font-bold text-[#20D9F2]">${Number(selectedInv.balance).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Settlement Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedInv ? Number(selectedInv.balance) : undefined}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-input text-xs text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-[#20D9F2]"
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Defaults to the full outstanding balance. Partial settlements are supported.
                </span>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setIsModalOpen(false)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSimulatePayment}
                  disabled={processing || !selectedInvoiceId}
                  className="flex items-center gap-1.5"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Capturing...</span>
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      <span>Simulate PayPal Capture</span>
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
