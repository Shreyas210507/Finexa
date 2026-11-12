"use client";

import React, { useState } from "react";
import { SlidersHorizontal, Eye, EyeOff, RotateCcw, Check } from "lucide-react";

export interface WidgetPreferences {
  quickActions: boolean;
  kpis: boolean;
  receivablesPayables: boolean;
  aiAssistant: boolean;
  chart: boolean;
  alerts: boolean;
  breakdown: boolean;
  activity: boolean;
  treasury: boolean;
}

export const DEFAULT_WIDGET_PREFS: WidgetPreferences = {
  quickActions: true,
  kpis: true,
  receivablesPayables: true,
  aiAssistant: true,
  chart: true,
  alerts: true,
  breakdown: true,
  activity: true,
  treasury: true,
};

interface DashboardPersonalizerProps {
  preferences: WidgetPreferences;
  onPreferencesChange: (newPrefs: WidgetPreferences) => void;
}

export function DashboardPersonalizer({
  preferences,
  onPreferencesChange,
}: DashboardPersonalizerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const widgetDefinitions: Array<{ key: keyof WidgetPreferences; label: string; desc: string }> = [
    { key: "quickActions", label: "Quick Actions Bar", desc: "Shortcuts for invoice, payment, and transaction" },
    { key: "kpis", label: "Core Financial KPIs", desc: "Cash balance, revenue, expenses, net profit, burn & runway" },
    { key: "receivablesPayables", label: "Receivables & Payables", desc: "Outstanding & overdue invoices strip" },
    { key: "aiAssistant", label: "AI CFO Assistant", desc: "Interactive intelligence & autonomous CFO chat" },
    { key: "chart", label: "Revenue vs Expenses Chart", desc: "Cash flow trajectory and performance area chart" },
    { key: "alerts", label: "Financial Intelligence Alerts", desc: "Grounded alerts and anomaly notices" },
    { key: "treasury", label: "Treasury & Liquidity", desc: "Available operating reserves and FX converter" },
    { key: "breakdown", label: "Expense Breakdown", desc: "Operating categories with proportional bars" },
    { key: "activity", label: "Recent Ledger & Activity", desc: "Latest ledger transactions & activity tabs" },
  ];

  const handleToggle = (key: keyof WidgetPreferences) => {
    onPreferencesChange({
      ...preferences,
      [key]: !preferences[key],
    });
  };

  const handleReset = () => {
    onPreferencesChange(DEFAULT_WIDGET_PREFS);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full frosted-glass-card border border-white/10 hover:border-white/25 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all shadow-sm active:scale-95"
        title="Customize dashboard widgets"
        aria-label="Customize dashboard widgets"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-[#818CF8]" />
        <span>Customize</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsOpen(false)}
          />

          {/* Frosted Dropdown Popover */}
          <div className="absolute right-0 top-10 z-50 w-80 rounded-2xl frosted-glass-dropdown p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-white/15 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h4 className="text-xs font-bold text-foreground">Dashboard Widgets</h4>
                <p className="text-[10px] text-muted-foreground">Show or hide modular command sections</p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-[10px] font-semibold text-[#818CF8] hover:text-white flex items-center gap-1 transition-colors"
                title="Reset to default"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <div className="mt-2.5 space-y-1.5 max-h-80 overflow-y-auto scrollbar-thin pr-1">
              {widgetDefinitions.map(({ key, label, desc }) => {
                const isVisible = preferences[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggle(key)}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors text-left group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold text-foreground truncate group-hover:text-white">
                        {label}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">{desc}</div>
                    </div>
                    <div
                      className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                        isVisible
                          ? "bg-[#34D399]/15 border-[#34D399]/30 text-[#34D399]"
                          : "bg-white/5 border-white/10 text-muted-foreground/40"
                      }`}
                    >
                      {isVisible ? <Check className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold px-3 py-1 rounded-full bg-[#4318FF] text-white hover:bg-[#3914e0] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

