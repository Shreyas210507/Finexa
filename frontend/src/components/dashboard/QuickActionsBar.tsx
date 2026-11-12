"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  CreditCard,
  PlusCircle,
  BarChart3,
  Sparkles,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  accent?: string;
}

const actions: QuickAction[] = [
  {
    label: "Create Invoice",
    icon: FileText,
    href: "/invoices",
    accent: "#4318FF",
  },
  {
    label: "Collect Payment",
    icon: CreditCard,
    href: "/payments",
    accent: "#34D399",
  },
  {
    label: "Add Transaction",
    icon: PlusCircle,
    href: "/transactions",
    accent: "#00F0FF",
  },
  {
    label: "View Reports",
    icon: BarChart3,
    href: "/reports",
    accent: "#818CF8",
  },
  {
    label: "Ask AI CFO",
    icon: Sparkles,
    href: "/ai-cfo",
    accent: "#F59E0B",
  },
  {
    label: "Review Pending",
    icon: ClipboardCheck,
    href: "/invoices?status=pending",
    accent: "#F07878",
  },
];

export function QuickActionsBar() {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            type="button"
            onClick={() => router.push(action.href)}
            className="group flex items-center gap-2 px-3.5 py-2 rounded-xl frosted-glass-card border border-white/10 hover:border-white/25 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all active:scale-[0.97] hover:shadow-lg"
          >
            <div
              className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0 border transition-transform group-hover:scale-110"
              style={{
                backgroundColor: `${action.accent}15`,
                borderColor: `${action.accent}30`,
                color: action.accent,
              }}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="whitespace-nowrap">{action.label}</span>
            <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all" />
          </button>
        );
      })}
    </div>
  );
}

