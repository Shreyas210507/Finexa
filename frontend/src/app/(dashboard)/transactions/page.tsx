"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FinexaDataGrid } from "@/components/grid/FinexaDataGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusChip } from "@/components/ui/chips";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Plus, Download, Search, Trash2 } from "lucide-react";
import { ColDef } from "ag-grid-community";
import { CustomCellRendererProps } from "ag-grid-react";
import { apiClient } from "@/lib/api-client";
import { TransactionResponse } from "@/lib/api-types";

function formatUSD(val: string | number): string {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

export default function TransactionsPage() {
  const { addToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TransactionResponse | null>(null);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // New transaction form state
  const [formType, setFormType] = useState<"expense" | "income">("expense");
  const [formCategory, setFormCategory] = useState("Software");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formVendor, setFormVendor] = useState("");
  const [formReference, setFormReference] = useState("");
  const [formDate, setFormDate] = useState("2026-10-31");
  const [submitting, setSubmitting] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.getTransactions({
        page: 1,
        size: 100,
        search: searchTerm || undefined,
      });
      setTransactions(res.items);
    } catch {
      // Fallback fallback seed if backend not reachable
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleCreate = async () => {
    if (!formAmount || isNaN(parseFloat(formAmount)) || parseFloat(formAmount) <= 0) {
      addToast({ type: "error", title: "Invalid Amount", message: "Please enter a valid amount." });
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
        message: "Entry stored in double-entry ledger with audit logging.",
      });
      setIsAddOpen(false);
      setFormDescription("");
      setFormAmount("");
      setFormVendor("");
      setFormReference("");
      fetchTransactions();
    } catch (e: unknown) {
      const err = e as Error;
      addToast({ type: "error", title: "Failed", message: err.message || "Failed to create transaction." });
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
        message: "Soft deleted and recorded in audit log.",
      });
      setDeleteTarget(null);
      fetchTransactions();
    } catch (e: unknown) {
      const err = e as Error;
      addToast({ type: "error", title: "Error", message: err.message || "Failed to delete transaction." });
    }
  };

  const columnDefs: ColDef<TransactionResponse>[] = [
    { field: "date", headerName: "Date", width: 120 },
    { field: "reference", headerName: "Reference", width: 150, valueGetter: (p) => p.data?.reference || p.data?.id.slice(0, 8) },
    { field: "description", headerName: "Description", flex: 2 },
    { field: "vendor_or_client", headerName: "Counterparty", width: 180 },
    { field: "category", headerName: "Category", width: 150 },
    {
      field: "amount",
      headerName: "Amount (USD)",
      width: 150,
      cellRenderer: (params: CustomCellRendererProps<TransactionResponse, string>) => {
        const row = params.data as TransactionResponse;
        if (!row) return null;
        const isExp = row.type === "expense";
        return (
          <span
            className={`tabular-nums font-semibold ${
              isExp ? "text-foreground" : "text-[#22C55E]"
            }`}
          >
            {isExp ? `- ${formatUSD(row.amount)}` : `+ ${formatUSD(row.amount)}`}
          </span>
        );
      },
    },
    {
      headerName: "Actions",
      width: 90,
      cellRenderer: (params: CustomCellRendererProps<TransactionResponse>) => {
        const row = params.data as TransactionResponse;
        if (!row) return null;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(row)}
            className="text-muted-foreground hover:text-red-400 p-1 h-7 w-7"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
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
            Transactions Ledger
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Verified organisation transactions with immutable audit logging
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={apiClient.getExportCsvUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-[8px] border border-border bg-card text-foreground hover:bg-accent transition-colors"
          >
            <Download className="w-4 h-4" />
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by description, counterparty, or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* AG Grid Community Table */}
      <FinexaDataGrid
        rowData={transactions}
        columnDefs={columnDefs}
        gridHeight="520px"
        loading={loading}
        renderMobileCard={(item) => (
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-muted-foreground">
                  {item.reference || item.id.slice(0, 8)} • {item.date}
                </span>
                <h4 className="text-sm font-semibold text-foreground mt-0.5">
                  {item.description || item.vendor_or_client || "Transaction"}
                </h4>
              </div>
              <StatusChip status={item.type === "expense" ? "expense" : "income"} />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">{item.category}</span>
              <span
                className={`tabular-nums font-bold text-sm ${
                  item.type === "expense" ? "text-foreground" : "text-[#22C55E]"
                }`}
              >
                {item.type === "expense" ? `- ${formatUSD(item.amount)}` : `+ ${formatUSD(item.amount)}`}
              </span>
            </div>
          </div>
        )}
      />

      {/* Add Transaction Modal */}
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
                  { value: "expense", label: "Expense" },
                  { value: "income", label: "Income" },
                ]}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <Select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                options={[
                  { value: "Salaries", label: "Salaries" },
                  { value: "Software", label: "Software" },
                  { value: "Marketing", label: "Marketing" },
                  { value: "Infrastructure", label: "Infrastructure" },
                  { value: "Operations", label: "Operations" },
                  { value: "Software Services", label: "Software Services" },
                  { value: "Other", label: "Other" },
                ]}
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
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Save Transaction"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Transaction?"
        description={`Are you sure you want to delete "${deleteTarget?.description || deleteTarget?.reference}"? This will record an immutable audit entry.`}
        confirmText="Confirm Delete"
        isDestructive={true}
      />
    </div>
  );
}
