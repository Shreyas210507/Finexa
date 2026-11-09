"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { KPICard } from "@/components/ui/kpi-card";
import { StatusChip, LabelChip } from "@/components/ui/chips";
import { AIInsightPanel } from "@/components/ui/ai-insight-panel";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { KPICardSkeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { FinexaDataGrid } from "@/components/grid/FinexaDataGrid";
import { useToast, ToastProvider } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  Sparkles,
  TrendingUp,
  DollarSign,
  CreditCard,
  Download,
  Filter,
  MoreVertical,
  Plus,
} from "lucide-react";
import { ColDef } from "ag-grid-community";
import { CustomCellRendererProps } from "ag-grid-react";

interface SampleRow {
  id: string;
  date: string;
  desc: string;
  category: string;
  amount: number;
  status: string;
}

function ShowcaseContent() {
  const { addToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const sampleGridData = [
    { id: "TX-101", date: "2026-10-31", desc: "AWS Cloud Infrastructure", category: "Technology", amount: -42500, status: "completed" },
    { id: "TX-102", date: "2026-10-30", desc: "Client Retainer (Acme Corp)", category: "Revenue", amount: 250000, status: "completed" },
    { id: "TX-103", date: "2026-10-28", desc: "Office Lease Mumbai", category: "Rent", amount: -85000, status: "pending" },
    { id: "TX-104", date: "2026-10-25", desc: "Google Workspace Subscription", category: "Software", amount: -12800, status: "completed" },
  ];

  const gridColumns: ColDef<SampleRow>[] = [
    { field: "id", headerName: "Transaction ID", width: 140 },
    { field: "date", headerName: "Date", width: 120 },
    { field: "desc", headerName: "Description", flex: 2 },
    { field: "category", headerName: "Category", width: 130 },
    {
      field: "amount",
      headerName: "Amount (USD)",
      width: 150,
      cellRenderer: (params: CustomCellRendererProps<SampleRow, number>) => {
        const val = params.value || 0;
        const isNeg = val < 0;
        return (
          <span className={`tabular-nums font-semibold ${isNeg ? "text-foreground" : "text-[#22C55E]"}`}>
            {isNeg ? `- $${Math.abs(val).toLocaleString("en-US")}` : `+ $${val.toLocaleString("en-US")}`}
          </span>
        );
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      cellRenderer: (params: CustomCellRendererProps<SampleRow, string>) => (
        <StatusChip status={params.value || "completed"} />
      ),
    },
  ];

  return (
    <div className="space-y-12 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-[#20D9F2]">
            FINEXA Design System
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-1">
            Component Showcase
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Living catalog of FINEXA UI tokens, interactive components, and theme states.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            variant="gradient"
            size="md"
            onClick={() =>
              addToast({
                type: "success",
                title: "FINEXA Intelligence",
                message: "Design system toast verified successfully.",
              })
            }
          >
            Trigger Toast
          </Button>
        </div>
      </div>

      {/* 1. Buttons */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground border-b border-border/60 pb-2">
          1. Buttons & Variants
        </h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="primary">Primary Button</Button>
          <Button variant="gradient">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Gradient
          </Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="primary" isLoading>
            Loading
          </Button>
          <Button variant="primary" size="sm">
            Small
          </Button>
          <Button variant="primary" size="lg">
            Large
          </Button>
          <Button variant="outline" size="icon" aria-label="Add item">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* 2. Form Inputs */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground border-b border-border/60 pb-2">
          2. Inputs & Selects
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Standard Input
            </label>
            <Input
              placeholder="e.g. Acme Corp"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Monetary (Tabular Nums)
            </label>
            <Input isNumeric defaultValue="1,250,000.00" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Input with Error
            </label>
            <Input defaultValue="invalid-entry" error="Amount cannot exceed balance" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Select Dropdown
            </label>
            <Select
              options={[
                { value: "30d", label: "Last 30 Days" },
                { value: "90d", label: "Last 90 Days" },
                { value: "12m", label: "Last 12 Months" },
              ]}
            />
          </div>
        </div>
      </section>

      {/* 3. Chips: Status & FINEXA Data Kinds */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground border-b border-border/60 pb-2">
          3. FINEXA Transparency Chips & Statuses
        </h2>
        <div className="space-y-3">
          <div>
            <span className="text-xs text-muted-foreground block mb-2 font-medium">
              Data Kind Chips (Spec Requirement: Verified / Calculated / Forecast / Assumption / Recommendation)
            </span>
            <div className="flex flex-wrap gap-2">
              <LabelChip kind="verified" />
              <LabelChip kind="calculated" />
              <LabelChip kind="forecast" />
              <LabelChip kind="assumption" />
              <LabelChip kind="recommendation" />
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block mb-2 font-medium">
              Status Chips
            </span>
            <div className="flex flex-wrap gap-2">
              <StatusChip status="paid" />
              <StatusChip status="pending" />
              <StatusChip status="overdue" />
              <StatusChip status="draft" />
              <StatusChip status="sent" />
              <StatusChip status="partially_paid" />
              <StatusChip status="running" />
              <StatusChip status="completed" />
              <StatusChip status="failed" />
              <StatusChip status="needs_approval" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. KPI Cards */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground border-b border-border/60 pb-2">
          4. Metric & KPI Cards
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Revenue"
            value="$142,000.00"
            delta={{ value: 8.4, period: "vs last month" }}
            dataKind="verified"
            icon={TrendingUp}
          />
          <KPICard
            title="Monthly Burn Rate"
            value="$51,166.67"
            delta={{ value: 12.0, period: "trailing 3M avg" }}
            dataKind="calculated"
            icon={DollarSign}
          />
          <KPICard
            title="Cash Runway"
            value="4.8 Months"
            subtitle="Based on $246K liquid balance"
            dataKind="calculated"
            icon={CreditCard}
          />
          <KPICard
            title="Overdue Receivables"
            value="$31,000.00"
            delta={{ value: 0, period: "no change" }}
            dataKind="verified"
            icon={DollarSign}
          />
        </div>
      </section>

      {/* 5. AI Insight Panel */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground border-b border-border/60 pb-2">
          5. AI Insight Panel
        </h2>
        <AIInsightPanel
          title="Burn Rate Acceleration Detected"
          description="Software subscription outlays increased by 22% in October. Trailing 3-month burn rate is $51,166.67/mo giving 4.8 months runway."
          recommendation="Delay hiring 2 additional engineers until December to extend runway safely past 6.2 months."
          actionLabel="Simulate in Scenario Planner"
          onAction={() =>
            addToast({
              type: "info",
              title: "AI Scenario Planner",
              message: "Opening simulation workspace with pre-populated parameters.",
            })
          }
        />
      </section>

      {/* 6. Overlays & Dialogs */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground border-b border-border/60 pb-2">
          6. Modals, Dialogs & Tooltips
        </h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open Standard Modal
          </Button>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            Open Confirm Dialog
          </Button>

          <Tooltip content="Verified against bank reconciliation ledger">
            <span className="text-xs underline decoration-dotted cursor-help text-[#20D9F2]">
              Hover for Tooltip
            </span>
          </Tooltip>

          <DropdownMenu
            trigger={
              <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <span>Actions Menu</span>
              </Button>
            }
            items={[
              { label: "Export to CSV", onClick: () => {}, icon: Download },
              { label: "Delete Batch", onClick: () => {}, icon: MoreVertical, destructive: true },
            ]}
          />
        </div>

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Create Transaction Record"
          description="Record a manual transaction into the organisation ledger."
        >
          <div className="space-y-4">
            <Input placeholder="Description" defaultValue="Consulting Fee" />
            <Input placeholder="Amount" isNumeric defaultValue="45000" />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setModalOpen(false);
                  addToast({ type: "success", title: "Saved", message: "Transaction created." });
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </Modal>

        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            addToast({ type: "error", title: "Action Confirmed", message: "Batch items purged." });
          }}
          title="Purge Selected Records?"
          description="This action cannot be undone. All audit log entries will mark this deletion."
          confirmText="Yes, Purge"
          isDestructive={true}
        />
      </section>

      {/* 7. AG Grid Community Themed Data Grid */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground border-b border-border/60 pb-2">
          7. AG Grid Community (Themed + Mobile Card Fallback)
        </h2>
        <FinexaDataGrid
          rowData={sampleGridData}
          columnDefs={gridColumns}
          gridHeight="260px"
          renderMobileCard={(item) => (
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className="text-xs text-muted-foreground">{item.id} • {item.date}</span>
                <p className="text-sm font-semibold text-foreground mt-0.5">{item.desc}</p>
                <span className="text-xs text-muted-foreground">{item.category}</span>
              </div>
              <div className="text-right">
                <span className="tabular-nums font-bold text-sm block">
                  {item.amount < 0 ? `- $${Math.abs(item.amount).toLocaleString("en-US")}` : `+ $${item.amount.toLocaleString("en-US")}`}
                </span>
                <StatusChip status={item.status} className="mt-1" />
              </div>
            </div>
          )}
        />
      </section>

      {/* 8. Skeletons & Empty / Error States */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground border-b border-border/60 pb-2">
          8. Feedback States (Skeletons, Empty, Error)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICardSkeleton />
          <EmptyState
            title="No Invoices Issued"
            description="Create your first client invoice with automated PDF generation."
            actionLabel="Create Invoice"
            onAction={() => {}}
          />
          <ErrorState
            title="Failed to Sync Bank Feed"
            message="Server responded with HTTP 503. Automatic retry scheduled in 30s."
            onRetry={() => {}}
          />
        </div>
      </section>
    </div>
  );
}

export default function ShowcasePage() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <ToastProvider>
        <ShowcaseContent />
      </ToastProvider>
    </div>
  );
}
