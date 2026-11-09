"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className={`p-2 rounded-lg border border-border bg-card/60 hover:bg-card text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${className}`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-[#20D9F2]" />
      ) : (
        <Moon className="w-4 h-4 text-[#315BFF]" />
      )}
    </button>
  );
}

