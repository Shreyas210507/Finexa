"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { LabelChip } from "@/components/ui/chips";
import { useToast } from "@/components/ui/toast";
import {
  Download,
  FileSpreadsheet,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { KPICard } from "@/components/ui/kpi-card";
import { apiClient } from "@/lib/api-client";
import { ReportDataResponse } from "@/lib/api-types";

export default function ReportsPage() {
  const { addToast } = useToast();
  const [reportType, setReportType] = useState<string>("pnl");
  const [period, setPeriod] = useState<string>("30d");

  const [reportData, setReportData] = useState<ReportDataResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [exportingCsv, setExportingCsv] = useState<boolean>(false);

  const reports = [
    { id: "pnl", name: "Profit & Loss Statement (P&L)", desc: "Comprehensive revenue, operating expenses, and net deficit breakdown." },
    { id: "cashflow", name: "Cash Flow Statement", desc: "Operating inflows, outflows, closing liquid balance, and runway estimate." },
    { id: "receivables", name: "Accounts Receivable Aging Ledger", desc: "Aging brackets (0-30, 31-60, 61-90, 90+ days) and overdue exposure." },
    { id: "tax", name: "Corporate Tax Estimate Statement", desc: "Estimated US federal corporate tax obligation on taxable operating profit." },
  ];

  // Fetch Report Data
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getReportData(reportType, period);
      setReportData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load report";
      addToast({ type: "error", title: "Report Error", message: msg });
    } finally {
      setLoading(false);
    }
  }, [reportType, period, addToast]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Handle PDF Export
  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      const blob = await apiClient.downloadReportPdf(reportType, period);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FINEXA_${reportType.toUpperCase()}_${period}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      addToast({
        type: "success",
        title: "PDF Generated",
        message: `FINEXA_${reportType.toUpperCase()}_${period}.pdf downloaded.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to download PDF";
      addToast({ type: "error", title: "PDF Export Error", message: msg });
    } finally {
      setExportingPdf(false);
    }
  };

  // Handle CSV Export
  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const csvText = await apiClient.downloadReportCsv(reportType, period);
      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FINEXA_${reportType.toUpperCase()}_${period}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      addToast({
        type: "success",
        title: "CSV Exported",
        message: `FINEXA_${reportType.toUpperCase()}_${period}.csv downloaded.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to download CSV";
      addToast({ type: "error", title: "CSV Export Error", message: msg });
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Financial Reports
            </h1>
            <LabelChip kind="verified" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Audit-ready statements compiled directly from verified ledger transactions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={handleExportCsv}
            disabled={exportingCsv || loading}
            className="flex items-center gap-1.5 rounded-full"
          >
            {exportingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            <span className="hidden sm:inline">Export CSV</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleExportPdf}
            disabled={exportingPdf || loading}
            className="flex items-center gap-1.5 rounded-full"
          >
            {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Export Branded PDF</span>
          </Button>
        </div>
      </div>

      {/* Report Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
            Statement Type
          </label>
          <Select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            options={reports.map((r) => ({ value: r.id, label: r.name }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
            Accounting Period
          </label>
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={[
              { value: "30d", label: "October 2026 (Trailing 30 Days)" },
              { value: "90d", label: "Trailing 90 Days (Aug - Oct 2026)" },
              { value: "12m", label: "Full Trailing 12 Months" },
            ]}
          />
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {reportType === "cashflow" ? (
          <>
            <KPICard
              title="Opening Balance"
              value={`$${Number(reportData?.opening_balance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              subtitle="Period start position"
              dataKind="verified"
              icon={DollarSign}
            />
            <KPICard
              title="Net Cash Flow"
              value={`$${Number(reportData?.net_cash_flow ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              subtitle="Net liquid movement"
              dataKind="calculated"
              icon={TrendingUp}
            />
            <KPICard
              title="Closing Cash Balance"
              value={`$${Number(reportData?.closing_balance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              subtitle={`Estimated Runway: ${reportData?.runway ?? "N/A"} Months`}
              dataKind="verified"
              icon={CheckCircle2}
            />
          </>
        ) : reportType === "receivables" ? (
          <>
            <KPICard
              title="Total Outstanding"
              value={`$${Number(reportData?.total_outstanding ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              subtitle={`${reportData?.invoice_count ?? 0} active invoices`}
              dataKind="verified"
              icon={DollarSign}
            />
            <KPICard
              title="Total Overdue"
              value={`$${Number(reportData?.total_overdue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              subtitle="Requires immediate reminder"
              dataKind="calculated"
              icon={AlertTriangle}
            />
            <KPICard
              title="Current (0-30 Days)"
              value={`$${Number(reportData?.aging_0_30 ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              subtitle="Healthy aging bracket"
              dataKind="verified"
              icon={CheckCircle2}
            />
          </>
        ) : reportType === "tax" ? (
          <>
            <KPICard
              title="Operating Revenue"
              value={`$${Number(reportData?.operating_revenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              subtitle="Gross receipts"
              dataKind="verified"
              icon={TrendingUp}
            />
            <KPICard
              title="Taxable Net Profit"
              value={`$${Number(reportData?.taxable_net_income ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              subtitle="Net positive basis"
              dataKind="calculated"
              icon={DollarSign}
            />
            <KPICard
              title="Estimated Tax Obligation"
              value={`$${Number(reportData?.estimated_tax_obligation ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              subtitle="At 21.00% US Corp Rate"
              dataKind="calculated"
              icon={CheckCircle2}
            />
          </>
        ) : (
          <>
            <KPICard
              title="Gross Operating Revenue"
              value={`$${Number(reportData?.operating_revenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              delta={reportData?.revenue_growth_mom ? { value: Number(reportData.revenue_growth_mom), period: "MoM growth" } : undefined}
              dataKind="verified"
              icon={TrendingUp}
            />
            <KPICard
              title="Total Operating Expenses"
              value={`$${Number(reportData?.operating_expenses ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              delta={reportData?.expense_growth_mom ? { value: Number(reportData.expense_growth_mom), period: "MoM increase" } : undefined}
              dataKind="verified"
              icon={DollarSign}
            />
            <KPICard
              title="Net Operating Income"
              value={`$${Number(reportData?.net_operating_income ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              subtitle="Operating profit / (loss)"
              dataKind="calculated"
              icon={CheckCircle2}
            />
          </>
        )}
      </div>

      {/* Statement Sheet Preview */}
      <div className="rounded-[10px] border border-border bg-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/60 gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8B7CFF] tracking-wider">
              FINEXA FINANCIAL INTELLIGENCE
            </span>
            <h3 className="text-lg font-semibold text-foreground">
              {reportData?.title ?? "Financial Statement"}
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            Organisation: <strong>{reportData?.organisation ?? "Novastack Technologies"}</strong> • Currency: USD ($)
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Compiling audit-ready statement figures...
          </div>
        ) : (
          <div className="divide-y divide-border/60 text-sm">
            {reportType === "pnl" && (
              <>
                <div className="py-2.5 flex justify-between font-semibold text-foreground">
                  <span>Gross Operating Revenue</span>
                  <span className="tabular-nums">
                    ${Number(reportData?.operating_revenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="py-2.5 flex justify-between font-semibold text-foreground pt-4">
                  <span>Total Operating Expenses (OpEx)</span>
                  <span className="tabular-nums">
                    ${Number(reportData?.operating_expenses ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {reportData?.expense_breakdown &&
                  Object.entries(reportData.expense_breakdown).map(([cat, amt]) => (
                    <div key={cat} className="py-1.5 pl-4 flex justify-between text-xs text-muted-foreground">
                      <span>{cat}</span>
                      <span className="tabular-nums">
                        ${Number(amt).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}

                <div className="py-3 flex justify-between font-bold text-base text-foreground pt-4">
                  <span>Net Operating Income / Deficit</span>
                  <span className={`tabular-nums ${Number(reportData?.net_operating_income ?? 0) < 0 ? "text-[#F07878]" : "text-[#48D597]"}`}>
                    ${Number(reportData?.net_operating_income ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            )}

            {reportType === "cashflow" && (
              <>
                <div className="py-2.5 flex justify-between text-foreground">
                  <span>Opening Liquid Balance</span>
                  <span className="tabular-nums font-semibold">
                    ${Number(reportData?.opening_balance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between text-foreground">
                  <span>Total Operating Cash Inflows</span>
                  <span className="tabular-nums font-semibold text-[#48D597]">
                    +${Number(reportData?.total_inflows ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between text-foreground">
                  <span>Total Operating Cash Outflows</span>
                  <span className="tabular-nums font-semibold text-[#F07878]">
                    -${Number(reportData?.total_outflows ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between text-foreground">
                  <span>Net Cash Movement</span>
                  <span className="tabular-nums font-semibold">
                    ${Number(reportData?.net_cash_flow ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="py-3 flex justify-between font-bold text-base text-foreground pt-4">
                  <span>Closing Liquid Balance</span>
                  <span className="tabular-nums text-[#8B7CFF] font-extrabold">
                    ${Number(reportData?.closing_balance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="py-2 flex justify-between text-xs text-muted-foreground">
                  <span>Operational Runway Estimate</span>
                  <span className="font-semibold text-foreground">{reportData?.runway ?? "4.8"} Months</span>
                </div>
              </>
            )}

            {reportType === "receivables" && (
              <>
                <div className="py-2.5 flex justify-between font-semibold text-foreground">
                  <span>0 - 30 Days (Current)</span>
                  <span className="tabular-nums text-[#10B981]">
                    ${Number(reportData?.aging_0_30 ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between font-semibold text-foreground">
                  <span>31 - 60 Days (Grace Period)</span>
                  <span className="tabular-nums text-amber-400">
                    ${Number(reportData?.aging_31_60 ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between font-semibold text-foreground">
                  <span>61 - 90 Days</span>
                  <span className="tabular-nums text-orange-400">
                    ${Number(reportData?.aging_61_90 ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between font-semibold text-foreground">
                  <span>90+ Days (Severe Overdue)</span>
                  <span className="tabular-nums text-[#EF4444]">
                    ${Number(reportData?.aging_90_plus ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="py-3 flex justify-between font-bold text-base text-foreground pt-4">
                  <span>Total Outstanding Invoiced</span>
                  <span className="tabular-nums text-[#20D9F2]">
                    ${Number(reportData?.total_outstanding ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="py-2 flex justify-between text-xs text-muted-foreground">
                  <span>Overdue Subtotal</span>
                  <span className="font-semibold text-[#EF4444]">
                    ${Number(reportData?.total_overdue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            )}

            {reportType === "tax" && (
              <>
                <div className="py-2.5 flex justify-between font-semibold text-foreground">
                  <span>Operating Revenue</span>
                  <span className="tabular-nums">
                    ${Number(reportData?.operating_revenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between font-semibold text-foreground">
                  <span>Operating Deductions (OpEx)</span>
                  <span className="tabular-nums">
                    ${Number(reportData?.operating_expenses ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between font-semibold text-foreground">
                  <span>Taxable Net Operating Income</span>
                  <span className="tabular-nums">
                    ${Number(reportData?.taxable_net_income ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between text-foreground">
                  <span>Statutory US Federal Rate</span>
                  <span className="tabular-nums font-semibold">{reportData?.estimated_tax_rate ?? "21.00%"}</span>
                </div>
                <div className="py-3 flex justify-between font-bold text-base text-foreground pt-4">
                  <span>Estimated Tax Obligation</span>
                  <span className="tabular-nums text-[#20D9F2]">
                    ${Number(reportData?.estimated_tax_obligation ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-3 mt-4 rounded-lg bg-panel border border-border/60 text-xs text-muted-foreground">
                  {reportData?.notice ?? "For informational estimation purposes only; consult licensed CPA for statutory filings."}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
