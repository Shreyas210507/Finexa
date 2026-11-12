import React from "react";
import {
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  ArrowLeftRight,
  FileText,
  CreditCard,
  LineChart,
  Bot,
  BarChart3,
  Sliders,
  Settings,
} from "lucide-react";

export interface SubNavItem {
  title: string;
  href: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isAi?: boolean;
  badge?: string;
  children?: SubNavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/overview",
    icon: LayoutDashboard,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: TrendingUp,
    children: [
      { title: "Revenue", href: "/analytics?tab=revenue" },
      { title: "Expenses", href: "/analytics?tab=expenses" },
      { title: "Profit & Loss", href: "/analytics?tab=pnl" },
      { title: "Cash Flow", href: "/analytics?tab=cashflow" },
    ],
  },
  {
    title: "Transactions",
    href: "/transactions",
    icon: ArrowLeftRight,
  },
  {
    title: "Invoices",
    href: "/invoices",
    icon: FileText,
  },
  {
    title: "Forecasts",
    href: "/forecasts",
    icon: LineChart,
  },
  {
    title: "Simulator",
    href: "/forecasts#simulator",
    icon: Sliders,
    badge: "What-If",
  },
  {
    title: "AI CFO",
    href: "/ai-cfo",
    icon: Sparkles,
    isAi: true,
    badge: "AI",
  },
  {
    title: "Audit Sentinel",
    href: "/ai-agents",
    icon: Bot,
    badge: "5",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
  {
    title: "Payments",
    href: "/payments",
    icon: CreditCard,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];
