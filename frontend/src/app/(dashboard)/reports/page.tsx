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
  TrendingDown,
  AlertTriangle,
  Loader2,
  Wallet,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
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
    { id: "expenses", name: "Operating Expense Summary", desc: "Detailed departmental categorization and proportional cost allocation." },
    { id: "cashflow", name: "Cash Flow Statement", desc: "Operating inflows, outflows, closing liquid balance, and runway estimate." },
    { id: "receivables", name: "Accounts Receivable Aging Ledger", desc: "Aging brackets (0-30, 31-60, 61-90, 90+ days) and overdue exposure." },
    { id: "tax", name: "Corporate Tax Estimate Statement", desc: "Estimated US federal corporate tax obligation on taxable operating profit." },
  ];

  // Fetch Report Data
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      // "expenses" maps to pnl data on backend which contains full expense breakdown
      const apiReportType = reportType === "expenses" ? "pnl" : reportType;
      const data = await apiClient.getReportData(apiReportType, period);
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
      <div className="rounded-3xl border border-white/10 frosted-glass-card p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#4318FF] dark:text-[#818CF8] tracking-wider">
              FINEXA FINANCIAL INTELLIGENCE
            </span>
            <h3 className="text-lg font-bold text-foreground">
              {reportType === "expenses" ? "Operating Expense Summary Statement" : (reportData?.title ?? "Financial Statement")}
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            Organisation: <strong className="text-foreground">{reportData?.organisation ?? "Novastack Technologies"}</strong> • Currency: USD ($)
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Compiling audit-ready statement figures...
          </div>
        ) : (
          <div className="space-y-4">
            {(reportType === "pnl" || reportType === "expenses") && (
              <div className="space-y-2.5">
                {/* Gross Operating Revenue Pill (only show for P&L) */}
                {reportType === "pnl" && (
                  <div className="rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_15px_rgba(52,211,153,0.15)] hover:border-white/20 frosted-glass-card border border-white/10">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#34D399]/15 border border-[#34D399]/25 flex items-center justify-center text-[#34D399] shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_12px_rgba(52,211,153,0.2)]">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">Gross Operating Revenue</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/25">
                            Inflows
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground block mt-0.5">
                          Recognized revenue from settled client billings and active contracts
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-financial font-extrabold text-base sm:text-lg text-[#34D399]">
                        +${Number(reportData?.operating_revenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                      <span className="text-[10px] text-muted-foreground block font-medium">
                        Audited Top-Line
                      </span>
                    </div>
                  </div>
                )}

                {/* OpEx Section Header */}
                <div className="pt-2 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Operating Expenses Breakdown
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground font-financial">
                      {reportData?.expense_breakdown ? Object.keys(reportData.expense_breakdown).length : 0} Categories
                    </span>
                  </div>
                  <div className="text-xs font-bold text-foreground font-financial">
                    Total: ${Number(reportData?.operating_expenses ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* OpEx Floating Glass Pills */}
                {reportData?.expense_breakdown &&
                  Object.entries(reportData.expense_breakdown).map(([cat, amt]) => {
                    const numAmt = Number(amt);
                    const totalOpex = Number(reportData?.operating_expenses || 1);
                    const pct = totalOpex > 0 ? ((numAmt / totalOpex) * 100).toFixed(1) : "0.0";
                    return (
                      <div
                        key={cat}
                        className="glass-pill rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_15px_rgba(67,24,255,0.12)] hover:border-white/20"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-xl bg-[#4318FF]/10 border border-[#4318FF]/20 flex items-center justify-center text-[#4318FF] dark:text-[#818CF8] shrink-0 group-hover:scale-105 transition-transform">
                            <DollarSign className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-foreground">{cat}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted/60 dark:bg-white/5 text-muted-foreground font-financial border border-border dark:border-white/5">
                                {pct}% of OpEx
                              </span>
                            </div>
                            {/* Visual Progress Bar */}
                            <div className="w-full max-w-sm h-1.5 rounded-full bg-muted dark:bg-white/5 mt-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#4318FF] to-[#818CF8]"
                                style={{ width: `${Math.min(100, Math.max(3, parseFloat(pct)))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-financial font-extrabold text-sm sm:text-base text-foreground">
                            ${numAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </div>
                          <span className="text-[10px] text-muted-foreground block font-medium">
                            Disbursed cash
                          </span>
                        </div>
                      </div>
                    );
                  })}

                {/* Net Operating Income Hero Card */}
                <div
                  className={`rounded-2xl p-5 flex items-center justify-between shadow-lg transition-all duration-300 border ${
                    Number(reportData?.net_operating_income ?? 0) < 0
                      ? "bg-[#F07878]/5 border-[#F07878]/30 shadow-[0_10px_30px_rgba(240,120,120,0.12)]"
                      : "bg-[#34D399]/5 border-[#34D399]/30 shadow-[0_10px_30px_rgba(52,211,153,0.12)]"
                  }`}
                >
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                      Net Operating Performance
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold mt-1 font-financial flex items-center gap-2.5">
                      <span
                        className={
                          Number(reportData?.net_operating_income ?? 0) < 0
                            ? "text-[#F07878]"
                            : "text-[#34D399]"
                        }
                      >
                        ${Number(reportData?.net_operating_income ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground mt-0.5 block">
                      {Number(reportData?.net_operating_income ?? 0) < 0
                        ? "Operating Deficit • Outflows exceed revenues for period"
                        : "Operating Surplus • Profitable business unit performance"}
                    </span>
                  </div>
                  <div
                    className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-md ${
                      Number(reportData?.net_operating_income ?? 0) < 0
                        ? "bg-[#F07878]/15 border border-[#F07878]/25 text-[#F07878]"
                        : "bg-[#34D399]/15 border border-[#34D399]/25 text-[#34D399]"
                    }`}
                  >
                    {Number(reportData?.net_operating_income ?? 0) < 0 ? (
                      <TrendingDown className="w-6 h-6" />
                    ) : (
                      <TrendingUp className="w-6 h-6" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {reportType === "cashflow" && (
              <div className="space-y-2.5">
                {/* Opening Balance */}
                <div className="glass-pill rounded-2xl px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">Opening Liquid Balance</span>
                      <span className="text-[10px] text-muted-foreground">Cash at start of accounting period</span>
                    </div>
                  </div>
                  <div className="font-financial font-bold text-sm sm:text-base text-foreground">
                    ${Number(reportData?.opening_balance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Operating Inflows */}
                <div className="glass-pill rounded-2xl px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#34D399]/15 border border-[#34D399]/25 flex items-center justify-center text-[#34D399]">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">Operating Cash Inflows</span>
                      <span className="text-[10px] text-muted-foreground">Collections & revenue receipts</span>
                    </div>
                  </div>
                  <div className="font-financial font-bold text-sm sm:text-base text-[#34D399]">
                    +${Number(reportData?.total_inflows ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Operating Outflows */}
                <div className="glass-pill rounded-2xl px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F07878]/15 border border-[#F07878]/25 flex items-center justify-center text-[#F07878]">
                      <ArrowDownRight className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">Operating Cash Outflows</span>
                      <span className="text-[10px] text-muted-foreground">Payroll, software, vendors & overhead</span>
                    </div>
                  </div>
                  <div className="font-financial font-bold text-sm sm:text-base text-[#F07878]">
                    -${Number(reportData?.total_outflows ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Net Cash Movement */}
                <div className="glass-pill rounded-2xl px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#4318FF]/15 border border-[#4318FF]/25 flex items-center justify-center text-[#818CF8]">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">Net Cash Movement</span>
                      <span className="text-[10px] text-muted-foreground">Inflows minus outflows</span>
                    </div>
                  </div>
                  <div className="font-financial font-bold text-sm sm:text-base text-foreground">
                    ${Number(reportData?.net_cash_flow ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Closing Balance Hero Card */}
                <div className="rounded-2xl p-5 glass-card border border-[#4318FF]/30 bg-[#4318FF]/5 flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                      Closing Liquid Reserves
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold mt-1 font-financial text-[#818CF8]">
                      ${Number(reportData?.closing_balance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-xs text-muted-foreground mt-0.5 block">
                      Runway Estimate: <strong className="text-foreground">{reportData?.runway ?? "5.4"} Months</strong>
                    </span>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-[#4318FF]/15 border border-[#4318FF]/25 flex items-center justify-center text-[#818CF8]">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>
              </div>
            )}

            {reportType === "receivables" && (
              <div className="space-y-2.5">
                {[
                  { bracket: "0 - 30 Days (Current)", val: reportData?.aging_0_30, color: "text-[#34D399]", bg: "bg-[#34D399]/15 border-[#34D399]/25 text-[#34D399]" },
                  { bracket: "31 - 60 Days (Grace Period)", val: reportData?.aging_31_60, color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/15 border-[#F59E0B]/25 text-[#F59E0B]" },
                  { bracket: "61 - 90 Days (Late)", val: reportData?.aging_61_90, color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/25 text-orange-400" },
                  { bracket: "90+ Days (Severe Overdue)", val: reportData?.aging_90_plus, color: "text-[#F07878]", bg: "bg-[#F07878]/15 border-[#F07878]/25 text-[#F07878]" },
                ].map((item) => (
                  <div key={item.bracket} className="glass-pill rounded-2xl px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${item.bg}`}>
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-foreground">{item.bracket}</span>
                    </div>
                    <div className={`font-financial font-extrabold text-sm sm:text-base ${item.color}`}>
                      ${Number(item.val ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}

                {/* Total Outstanding Hero */}
                <div className="rounded-2xl p-5 glass-card border border-white/10 flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                      Total Outstanding Invoiced
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold mt-1 font-financial text-foreground">
                      ${Number(reportData?.total_outstanding ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-xs text-[#F07878] mt-0.5 block font-semibold">
                      Overdue Subtotal: ${Number(reportData?.total_overdue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-foreground">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>
              </div>
            )}

            {reportType === "tax" && (
              <div className="space-y-2.5">
                <div className="glass-pill rounded-2xl px-5 py-3.5 flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Operating Revenue</span>
                  <span className="font-financial font-bold text-sm sm:text-base text-[#34D399]">
                    ${Number(reportData?.operating_revenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="glass-pill rounded-2xl px-5 py-3.5 flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Operating Deductions (OpEx)</span>
                  <span className="font-financial font-bold text-sm sm:text-base text-foreground">
                    ${Number(reportData?.operating_expenses ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="glass-pill rounded-2xl px-5 py-3.5 flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Taxable Net Operating Income</span>
                  <span className="font-financial font-bold text-sm sm:text-base text-[#818CF8]">
                    ${Number(reportData?.taxable_net_income ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="glass-pill rounded-2xl px-5 py-3.5 flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Statutory US Federal Rate</span>
                  <span className="font-financial font-bold text-sm sm:text-base text-foreground">
                    {reportData?.estimated_tax_rate ?? "21.00%"}
                  </span>
                </div>

                <div className="rounded-2xl p-5 glass-card border border-[#4318FF]/30 bg-[#4318FF]/5 flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                      Estimated Tax Obligation
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold mt-1 font-financial text-[#818CF8]">
                      ${Number(reportData?.estimated_tax_obligation ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-xs text-muted-foreground mt-0.5 block">
                      At 21.00% US Corp Rate
                    </span>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-[#4318FF]/15 border border-[#4318FF]/25 flex items-center justify-center text-[#818CF8]">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-muted-foreground">
                  {reportData?.notice ?? "For informational estimation purposes only; consult licensed CPA for statutory filings."}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
