"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/components/theme/theme-provider";
import { 
  Sparkles, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  CreditCard
} from "lucide-react";

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Platform", href: "#product-demo", icon: Layers },
    { label: "AI Agents", href: "#ai-agents", icon: Cpu },
    { label: "AI CFO", href: "#ai-cfo", icon: Sparkles },
    { label: "Payments", href: "#payments", icon: CreditCard },
    { label: "Security", href: "#security", icon: ShieldCheck },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#070913]/85 dark:bg-[#070913]/85 bg-white/85 backdrop-blur-xl border-b border-white/10 dark:border-white/10 border-black/5 shadow-2xl py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6335FF] via-[#8B7CFF] to-[#00F0FF] flex items-center justify-center p-[1px] shadow-lg shadow-[#6335FF]/25 group-hover:scale-105 transition-transform duration-200">
              <div className="w-full h-full bg-[#08080D] dark:bg-[#08080D] bg-white rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#8B7CFF] group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-900 dark:from-white dark:via-white/90 dark:to-white/70 bg-clip-text text-transparent">
                FINEXA
              </span>
              <span className="text-[9px] font-semibold tracking-widest uppercase text-[#8B7CFF] -mt-1">
                Autonomous Finance
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-white/5 dark:bg-white/5 bg-black/[0.03] backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 dark:border-white/10 border-black/5">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white rounded-full transition-colors hover:bg-white/10 dark:hover:bg-white/10"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-white/5 dark:bg-white/5 hover:bg-white/10 border border-white/10 dark:border-white/10 border-black/5 transition-all"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Sign In */}
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>

            {/* Launch App / Start Free */}
            <Link
              href="/register"
              className="group relative inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-xl overflow-hidden transition-all duration-300 shadow-lg shadow-[#6335FF]/20 hover:shadow-[#6335FF]/40 active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#6335FF] via-[#7B42FF] to-[#00F0FF] opacity-90 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10">Start Free</span>
              <ArrowRight className="w-3.5 h-3.5 relative z-10 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 bg-white/5 border border-white/10"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-neutral-700 dark:text-neutral-200 bg-white/5 border border-white/10"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 p-4 rounded-2xl bg-[#0B0D1B]/95 dark:bg-[#0B0D1B]/95 bg-white/95 backdrop-blur-2xl border border-white/10 dark:border-white/10 border-black/10 shadow-2xl space-y-3 animate-in fade-in duration-200">
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <Icon className="w-4 h-4 text-[#8B7CFF]" />
                    {link.label}
                  </a>
                );
              })}
            </div>
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              <Link
                href="/login"
                className="w-full py-2.5 text-center text-sm font-semibold text-neutral-700 dark:text-neutral-200 hover:text-white bg-white/5 rounded-xl border border-white/10"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="w-full py-2.5 text-center text-sm font-semibold text-white bg-gradient-to-r from-[#6335FF] to-[#00F0FF] rounded-xl shadow-lg shadow-[#6335FF]/30"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;

