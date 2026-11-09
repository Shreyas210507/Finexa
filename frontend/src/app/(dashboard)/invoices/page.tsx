"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FinexaDataGrid } from "@/components/grid/FinexaDataGrid";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/chips";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Plus, Download, Eye, FileText } from "lucide-react";
import { ColDef } from "ag-grid-community";
import { CustomCellRendererProps } from "ag-grid-react";
import { apiClient } from "@/lib/api-client";
import { InvoiceResponse } from "@/lib/api-types";

function formatUSD(val: string | number): string {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

export default function InvoicesPage() {
  const { addToast } = useToast();
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState("0.00");
  const [totalOverdue, setTotalOverdue] = useState("0.00");
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceResponse | null>(null);

  // Create form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [issueDate, setIssueDate] = useState("2026-10-31");
  const [dueDate, setDueDate] = useState("2026-11-30");
  const [lineDesc, setLineDesc] = useState("");
  const [lineQty, setLineQty] = useState("1");
  const [lineUnitPrice, setLineUnitPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.getInvoices();
      setInvoices(res.items);
      setTotalOutstanding(res.total_outstanding);
      setTotalOverdue(res.total_overdue);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleCreate = async () => {
    if (!customerName.trim()) {
      addToast({ type: "error", title: "Customer Required", message: "Please enter a customer name." });
      return;
    }
    if (!lineUnitPrice || isNaN(parseFloat(lineUnitPrice))) {
      addToast({ type: "error", title: "Invalid Price", message: "Please enter a valid unit price." });
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.createInvoice({
        customer_name: customerName,
        customer_email: customerEmail || undefined,
        issue_date: issueDate,
        due_date: dueDate,
        line_items: [
          {
            description: lineDesc,
            quantity: lineQty,
            unit_price: parseFloat(lineUnitPrice).toFixed(2),
          },
        ],
      });
      addToast({
        type: "success",
        title: "Invoice Created",
        message: "Invoice totals computed server-side with Python Decimal.",
      });
      setIsCreateOpen(false);
      setCustomerName("");
      setCustomerEmail("");
      fetchInvoices();
    } catch (e: unknown) {
      const err = e as Error;
      addToast({ type: "error", title: "Failed", message: err.message || "Failed to create invoice." });
    } finally {
      setSubmitting(false);
    }
  };

  const columnDefs: ColDef<InvoiceResponse>[] = [
    { field: "invoice_number", headerName: "Invoice #", width: 150 },
    { field: "customer_name", headerName: "Customer", flex: 2 },
    { field: "issue_date", headerName: "Issued", width: 120 },
    { field: "due_date", headerName: "Due Date", width: 120 },
    {
      field: "total",
      headerName: "Total (USD)",
      width: 140,
      cellRenderer: (params: CustomCellRendererProps<InvoiceResponse, string>) => (
        <span className="tabular-nums font-semibold text-foreground">
          {formatUSD(params.value || "0.00")}
        </span>
      ),
    },
    {
      field: "balance",
      headerName: "Balance Due",
      width: 140,
      cellRenderer: (params: CustomCellRendererProps<InvoiceResponse, string>) => (
        <span className="tabular-nums font-semibold text-foreground">
          {formatUSD(params.value || "0.00")}
        </span>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      cellRenderer: (params: CustomCellRendererProps<InvoiceResponse, string>) => (
        <StatusChip status={params.value || "Draft"} />
      ),
    },
    {
      headerName: "Actions",
      width: 110,
      cellRenderer: (params: CustomCellRendererProps<InvoiceResponse>) => {
        const row = params.data as InvoiceResponse;
        if (!row) return null;
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPreviewInvoice(row)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Preview"
            >
              <Eye className="w-4 h-4" />
            </button>
            <a
              href={apiClient.getInvoicePdfUrl(row.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-[#8B7CFF] transition-colors"
              title="Download Branded PDF"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Invoices & Accounts Receivable
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Automated invoice generation, branded PDF rendering, and overdue aging
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-muted-foreground font-semibold">Total Outstanding</span>
            <div className="text-2xl font-extrabold text-foreground mt-1 tabular-nums">
              {formatUSD(totalOutstanding)}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">Unsettled receivables</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-[#8B7CFF]/15 flex items-center justify-center text-[#8B7CFF]">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-muted-foreground font-semibold">Overdue Invoices</span>
            <div className="text-2xl font-extrabold text-[#F07878] mt-1 tabular-nums">
              {formatUSD(totalOverdue)}
            </div>
            <span className="text-[11px] text-[#F07878]/80 mt-0.5 block">Requires collection follow-up</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-[#F07878]/15 flex items-center justify-center text-[#F07878]">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* AG Grid Community Table */}
      <FinexaDataGrid
        rowData={invoices}
        columnDefs={columnDefs}
        gridHeight="450px"
        loading={loading}
        renderMobileCard={(item) => (
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-muted-foreground">{item.invoice_number}</span>
                <h4 className="text-sm font-semibold text-foreground">{item.customer_name}</h4>
              </div>
              <StatusChip status={item.status} />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border/50 text-xs text-muted-foreground">
              <span>Due: {item.due_date}</span>
              <span className="tabular-nums font-bold text-sm text-foreground">
                {formatUSD(item.total)}
              </span>
            </div>
          </div>
        )}
      />

      {/* Create Invoice Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Draft New Invoice"
        description="Creates an invoice. Subtotals, tax, and balances are computed server-side in Python Decimal."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Customer Name</label>
              <Input
                placeholder="e.g. Meridian Systems"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Customer Email</label>
              <Input
                placeholder="billing@meridiansys.com"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Issue Date</label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Line Item Description</label>
            <Input
              placeholder="e.g. Q4 Cloud Retainer & Engineering"
              value={lineDesc}
              onChange={(e) => setLineDesc(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
              <Input
                value={lineQty}
                onChange={(e) => setLineQty(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Unit Price (USD)</label>
              <Input
                value={lineUnitPrice}
                onChange={(e) => setLineUnitPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Generate Invoice"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <Modal
          isOpen={!!previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          title={`Invoice Preview: ${previewInvoice.invoice_number}`}
        >
          <div className="space-y-4 border border-border rounded-[10px] p-5 bg-card text-foreground">
            <div className="flex justify-between items-start border-b border-border/60 pb-3">
              <div>
                <span className="text-xs font-bold tracking-wider text-[#20D9F2]">FINEXA INVOICE</span>
                <h3 className="font-bold text-lg text-foreground mt-0.5">{previewInvoice.invoice_number}</h3>
              </div>
              <StatusChip status={previewInvoice.status} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div>
                <span className="block text-[11px] uppercase tracking-wider text-muted-foreground/70">Client</span>
                <strong className="text-foreground text-sm">{previewInvoice.customer_name || "Customer"}</strong>
              </div>
              <div className="text-right">
                <span className="block text-[11px] uppercase tracking-wider text-muted-foreground/70">Dates</span>
                <div>Issued: {previewInvoice.issue_date}</div>
                <div>Due: {previewInvoice.due_date}</div>
              </div>
            </div>

            <div className="border rounded-[8px] border-border/60 p-3 space-y-2 text-xs">
              {previewInvoice.line_items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span>{item.description} (x{item.quantity})</span>
                  <span className="font-semibold tabular-nums text-foreground">{formatUSD(item.amount)}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border/60 flex justify-between items-center">
              <div>
                <span className="text-xs text-muted-foreground block">Balance Due</span>
                <span className="text-xl font-bold text-foreground tabular-nums">
                  {formatUSD(previewInvoice.balance)}
                </span>
              </div>
              <a
                href={apiClient.getInvoicePdfUrl(previewInvoice.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-[8px] bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
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
