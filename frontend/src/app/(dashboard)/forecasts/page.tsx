"use client";

import React, { useState, useEffect, useCallback } from "react";
import { KPICard } from "@/components/ui/kpi-card";
import { LabelChip } from "@/components/ui/chips";
import { Button } from "@/components/ui/button";
import { AIInsightPanel } from "@/components/ui/ai-insight-panel";
import { useToast } from "@/components/ui/toast";
import {
  AlertCircle,
  Sliders,
  Play,
  RotateCcw,
  Bookmark,
  ShieldAlert,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import {
  CashFlowForecastResponse,
  SimulationResult,
  SavedScenario,
} from "@/lib/api-types";

export default function ForecastsPage() {
  const { addToast } = useToast();

  // Horizon State
  const [horizon, setHorizon] = useState<number>(90);
  const [forecast, setForecast] = useState<CashFlowForecastResponse | null>(null);
  const [loadingForecast, setLoadingForecast] = useState<boolean>(true);

  // Simulator Inputs
  const [scenarioType, setScenarioType] = useState<"hiring" | "expense_surge" | "investment" | "revenue_change">("hiring");
  const [devCount, setDevCount] = useState<number>(2);
  const [devSalary, setDevSalary] = useState<number>(6000);
  const [expenseDelta, setExpenseDelta] = useState<number>(0);
  const [revDelta, setRevDelta] = useState<number>(0);
  const [investmentAmt, setInvestmentAmt] = useState<number>(0);

  // Simulation State
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [scenarioName, setScenarioName] = useState<string>("Expansion Scenario");

  // Saved Scenarios
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [saving, setSaving] = useState<boolean>(false);

  // Fetch Forecast
  const fetchForecast = useCallback(async (days: number) => {
    try {
      setLoadingForecast(true);
      const data = await apiClient.getForecast(days);
      setForecast(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load forecast";
      addToast({ type: "error", title: "Forecast Error", message: msg });
    } finally {
      setLoadingForecast(false);
    }
  }, [addToast]);

  // Run Simulation
  const executeSimulation = useCallback(async () => {
    try {
      setSimulating(true);
      const result = await apiClient.runSimulation({
        scenario_name: scenarioName,
        scenario_type: scenarioType,
        hire_count: scenarioType === "hiring" ? devCount : 0,
        salary_per_hire: scenarioType === "hiring" ? devSalary : 0,
        expense_increase_pct: scenarioType === "expense_surge" ? expenseDelta : 0,
        revenue_change_pct: scenarioType === "revenue_change" ? revDelta : 0,
        investment_amount: scenarioType === "investment" ? investmentAmt : 0,
      });
      setSimResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Simulation failed";
      addToast({ type: "error", title: "Simulation Failed", message: msg });
    } finally {
      setSimulating(false);
    }
  }, [scenarioName, scenarioType, devCount, devSalary, expenseDelta, revDelta, investmentAmt, addToast]);

  // Load Saved Scenarios
  const fetchSaved = useCallback(async () => {
    try {
      const data = await apiClient.getSavedScenarios();
      setSavedScenarios(data);
    } catch {
      // Silent error fallback
    }
  }, []);

  // Save Scenario
  const handleSaveScenario = async () => {
    if (!scenarioName.trim()) {
      addToast({ type: "info", title: "Missing Name", message: "Provide a scenario title before saving." });
      return;
    }
    try {
      setSaving(true);
      await apiClient.saveScenario({
        scenario_name: scenarioName,
        scenario_type: scenarioType,
        hire_count: scenarioType === "hiring" ? devCount : 0,
        salary_per_hire: scenarioType === "hiring" ? devSalary : 0,
        expense_increase_pct: scenarioType === "expense_surge" ? expenseDelta : 0,
        revenue_change_pct: scenarioType === "revenue_change" ? revDelta : 0,
        investment_amount: scenarioType === "investment" ? investmentAmt : 0,
      });
      addToast({ type: "success", title: "Scenario Saved", message: `"${scenarioName}" successfully persisted.` });
      fetchSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save scenario";
      addToast({ type: "error", title: "Save Error", message: msg });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchForecast(horizon);
    executeSimulation();
    fetchSaved();
  }, [horizon, fetchForecast, executeSimulation, fetchSaved]);

  const getRiskBadge = (level?: string) => {
    switch (level) {
      case "critical":
        return {
          bg: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20",
          icon: ShieldAlert,
          label: "CRITICAL RISK",
        };
      case "high":
        return {
          bg: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20",
          icon: AlertCircle,
          label: "HIGH RISK",
        };
      case "medium":
        return {
          bg: "bg-[#8B7CFF]/10 text-[#8B7CFF] border-[#8B7CFF]/20",
          icon: ShieldCheck,
          label: "MODERATE RISK",
        };
      default:
        return {
          bg: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20",
          icon: ShieldCheck,
          label: "LOW RISK",
        };
    }
  };

  const riskBadge = getRiskBadge(simResult?.risk_level);
  const RiskIcon = riskBadge.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Forecasts & What-If Simulator
            </h1>
            <LabelChip kind="forecast" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Deterministic cash flow uncertainty modeling with daily burn integration
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Horizon Toggle */}
          <div className="flex items-center rounded-full border border-white/10 frosted-glass-card p-0.5 text-xs">
            {[30, 90, 180].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setHorizon(d)}
                className={`px-3.5 py-1.5 rounded-full font-bold transition-all ${
                  horizon === d
                    ? "bg-[#4318FF] text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-xs text-[#F59E0B]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Projection, not a guarantee</span>
          </div>
        </div>
      </div>

      {/* Projection Chart & Milestone Banner */}
      <div className="rounded-3xl border border-white/10 frosted-glass-card p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                {horizon}-Day Cash Projection & Uncertainty Cone
              </h2>
              <LabelChip kind="forecast" />
            </div>
            <p className="text-xs text-muted-foreground">
              Uncertainty bounds: ±10% at 30 days • ±20% at 90 days • Daily burn rate: $
              {forecast?.daily_burn_rate ?? "0.00"}/day
            </p>
          </div>

          {forecast?.warning_shortage_date && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500">
              <Clock className="w-4 h-4 shrink-0" />
              <span>
                Safety Threshold (&lt;$150k):{" "}
                <strong>{forecast.warning_shortage_date}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Milestone Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl border border-white/10 frosted-glass-card">
            <span className="text-muted-foreground block text-[11px] font-semibold">Starting Balance</span>
            <span className="text-base font-extrabold text-foreground font-financial">
              ${Number(forecast?.opening_balance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl border border-white/10 frosted-glass-card">
            <span className="text-muted-foreground block text-[11px] font-semibold">Projected Closing ({horizon}d)</span>
            <span className="text-base font-extrabold text-foreground font-financial">
              ${Number(forecast?.projected_closing_balance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl border border-white/10 frosted-glass-card">
            <span className="text-muted-foreground block text-[11px] font-semibold">Safety Buffer Date (&lt;$150k)</span>
            <span className="text-base font-extrabold text-amber-400 font-financial">
              {forecast?.warning_shortage_date ?? "Safe for period"}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl border border-white/10 frosted-glass-card">
            <span className="text-muted-foreground block text-[11px] font-semibold">Projected Zero Depletion</span>
            <span className="text-base font-extrabold text-[#EF4444] font-financial">
              {forecast?.zero_depletion_date ?? "Over 6 months"}
            </span>
          </div>
        </div>

        {/* Visual Forecast Timeline Strip */}
        {loadingForecast ? (
          <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
            Calculating deterministic daily burn trajectory...
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            <div className="h-40 w-full flex items-end gap-1 px-2 pt-6 pb-2 bg-panel/50 rounded-lg border border-border/40 overflow-x-auto">
              {forecast?.points
                .filter((_, idx) => idx % Math.ceil((forecast?.points.length || 90) / 30) === 0)
                .map((pt, i) => {
                  const maxBal = Math.max(...(forecast?.points.map((p) => Number(p.upper_bound)) || [300000]));
                  const heightPct = Math.max(8, Math.min(100, (Number(pt.projected_balance) / maxBal) * 100));
                  const isShortage = Number(pt.projected_balance) < 150000;

                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center min-w-[28px] group relative cursor-pointer"
                    >
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1 p-2 rounded bg-popover text-popover-foreground text-[10px] whitespace-nowrap shadow-lg border border-border z-20 pointer-events-none">
                        <div className="font-semibold">{pt.date}</div>
                        <div>Proj: ${Number(pt.projected_balance).toLocaleString()}</div>
                        <div className="text-muted-foreground">
                          Cone: ${Number(pt.lower_bound).toLocaleString()} - ${Number(pt.upper_bound).toLocaleString()}
                        </div>
                      </div>

                      {/* Bar indicator */}
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t transition-all ${isShortage
                          ? "bg-[#F07878]/80 hover:bg-[#F07878]"
                          : "bg-[#8B7CFF]/70 hover:bg-[#8B7CFF]"
                          }`}
                      />
                      <span className="text-[9px] text-muted-foreground mt-1 truncate max-w-full">
                        {pt.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#8B7CFF]/70" />
                <span>Standard Cash Trajectory</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#F07878]/80" />
                <span>Below Threshold (&lt;$150k)</span>
              </span>
              <span>{forecast?.seasonal_note}</span>
            </div>
          </div>
        )}
      </div>

      {/* Simulator Inputs & Comparison Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#8B7CFF]" />
              <span>Simulator Parameters</span>
            </h3>
            <LabelChip kind="assumption" />
          </div>

          {/* Scenario Type Selection */}
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1.5">Scenario Type</label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { id: "hiring", label: "Team Expansion" },
                { id: "expense_surge", label: "OpEx Surge" },
                { id: "revenue_change", label: "Revenue Shift" },
                { id: "investment", label: "Capital Injection" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setScenarioType(t.id as typeof scenarioType)}
                  className={`p-2 rounded-xl font-medium text-center border transition-colors ${scenarioType === t.id
                    ? "bg-[#8B7CFF]/15 text-[#8B7CFF] border-[#8B7CFF]/30 font-semibold"
                    : "border-border/60 text-muted-foreground hover:bg-panel"
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Sliders based on scenario */}
          {scenarioType === "hiring" && (
            <>
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-muted-foreground">New Hires</span>
                  <span className="text-foreground font-bold">{devCount} team members</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={devCount}
                  onChange={(e) => setDevCount(Number(e.target.value))}
                  className="w-full accent-[#8B7CFF]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-muted-foreground">Monthly Salary / Person</span>
                  <span className="text-foreground font-bold tabular-nums">
                    ${devSalary.toLocaleString("en-US")}
                  </span>
                </div>
                <input
                  type="range"
                  min="3000"
                  max="15000"
                  step="500"
                  value={devSalary}
                  onChange={(e) => setDevSalary(Number(e.target.value))}
                  className="w-full accent-[#8B7CFF]"
                />
              </div>
            </>
          )}

          {scenarioType === "expense_surge" && (
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-muted-foreground">OpEx Increase</span>
                <span className="text-foreground font-bold">+{expenseDelta}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={expenseDelta}
                onChange={(e) => setExpenseDelta(Number(e.target.value))}
                className="w-full accent-[#4318FF]"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Applied against organisation trailing 3M average operating expenses.
              </p>
            </div>
          )}

          {scenarioType === "revenue_change" && (
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-muted-foreground">Revenue Shift</span>
                <span className="text-foreground font-bold">
                  {revDelta >= 0 ? `+${revDelta}%` : `${revDelta}%`}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="5"
                value={revDelta}
                onChange={(e) => setRevDelta(Number(e.target.value))}
                className="w-full accent-[#8B7CFF]"
              />
            </div>
          )}

          {scenarioType === "investment" && (
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-muted-foreground">Capital Injection</span>
                <span className="text-foreground font-bold tabular-nums">
                  ${investmentAmt.toLocaleString("en-US")}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="500000"
                step="25000"
                value={investmentAmt}
                onChange={(e) => setInvestmentAmt(Number(e.target.value))}
                className="w-full accent-[#8B7CFF]"
              />
            </div>
          )}

          {/* Scenario Name & Persistence */}
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">Scenario Label</label>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="e.g. Q1 Engineering Scale"
              className="w-full h-8 px-2.5 text-xs rounded-xl border border-border bg-input text-foreground"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDevCount(0);
                setExpenseDelta(0);
                setRevDelta(0);
                setInvestmentAmt(0);
                executeSimulation();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </Button>
            <Button
              variant="gradient"
              size="sm"
              onClick={executeSimulation}
              disabled={simulating}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{simulating ? "Calculating..." : "Run Engine"}</span>
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveScenario}
            disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 text-xs rounded-xl"
          >
            <Bookmark className="w-3.5 h-3.5 text-[#8B7CFF]" />
            <span>{saving ? "Saving..." : "Save This Scenario"}</span>
          </Button>
        </div>

        {/* Before vs After Comparison Cards */}
        <div className="lg:col-span-2 space-y-4">
          {/* Risk Level Callout */}
          <div className={`flex items-center justify-between p-3.5 rounded-lg border ${riskBadge.bg}`}>
            <div className="flex items-center gap-2">
              <RiskIcon className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wide">{riskBadge.label}</span>
            </div>
            <span className="text-xs">
              Simulated Runway: <strong>{simResult?.simulated_runway_months ?? "4.8"} Months</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KPICard
              title="Baseline Runway"
              value={`${simResult?.baseline_runway_months ?? "4.8"} Months`}
              subtitle="Novastack current velocity"
              dataKind="verified"
            />
            <KPICard
              title="Simulated Runway"
              value={simResult?.simulated_runway_months ? `${simResult.simulated_runway_months} Months` : "N/A"}
              delta={{
                value: Number(simResult?.delta_runway_months ?? 0),
                period: "runway shift under scenario",
              }}
              dataKind="calculated"
            />
            <KPICard
              title="Baseline Monthly Burn"
              value={`$${Number(simResult?.baseline_burn ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              subtitle="Trailing 3-month average"
              dataKind="verified"
            />
            <KPICard
              title="Simulated Monthly Burn"
              value={`$${Number(simResult?.simulated_burn ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              delta={{
                value: Number(simResult?.delta_burn ?? 0),
                period: "burn rate adjustment",
              }}
              dataKind="calculated"
            />
          </div>

          {/* Engine Narrative */}
          <AIInsightPanel
            title={simResult?.scenario_name ?? "Simulation Analysis"}
            description={
              simResult?.explanation ||
              (forecast
                ? `Under the baseline scenario, daily operational burn is $${parseFloat(forecast.daily_burn_rate || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}/day with projected closing balance of $${parseFloat(forecast.projected_closing_balance || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}.`
                : "Deterministic cash runway simulation based on live double-entry disbursements.")
            }
            recommendation={
              simResult
                ? `Simulated net burn shifts by $${parseFloat(simResult.delta_burn || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}/mo. Maintain at least a 6-month safety runway buffer before committing to recurring fixed liabilities.`
                : "Maintain at least a 6-month safety runway buffer before initiating high-fixed-cost salary commitments."
            }
          />

          {/* Saved Scenarios Strip */}
          {savedScenarios.length > 0 && (
            <div className="rounded-2xl border border-white/10 frosted-glass-card p-4 space-y-2">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                <Bookmark className="w-3.5 h-3.5 text-[#4318FF]" />
                <span>Saved Scenarios ({savedScenarios.length})</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {savedScenarios.map((sc) => (
                  <div
                    key={sc.id}
                    className="p-2.5 rounded-xl border border-white/10 frosted-glass-card flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-foreground block">{sc.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{sc.type}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(sc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
