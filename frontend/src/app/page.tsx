"use client";

import React from "react";
import Navbar from "@/components/marketing/navbar";
import HeroSection from "@/components/marketing/hero-section";
import ProductExplorer from "@/components/marketing/product-explorer";
import AgentEcosystem from "@/components/marketing/agent-ecosystem";
import AICfoDemo from "@/components/marketing/ai-cfo-demo";
import FinancialIntelligence from "@/components/marketing/financial-intelligence";
import PaymentShowcase from "@/components/marketing/payment-showcase";
import SecuritySection from "@/components/marketing/security-section";
import ComparisonSection from "@/components/marketing/comparison-section";
import FinalCTA from "@/components/marketing/final-cta";
import Footer from "@/components/marketing/footer";
import CursorLight from "@/components/motion/cursor-light";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070913] text-[#F5F7FF] selection:bg-[#6335FF] selection:text-white relative overflow-x-hidden">
      {/* Dynamic Cursor Light Effect */}
      <CursorLight opacity={0.12} size={650} color="99, 53, 255" />

      {/* Floating Top Navigation */}
      <Navbar />

      {/* Main Landing Page Experience */}
      <main className="relative z-10 flex flex-col">
        {/* Cinematic Hero */}
        <HeroSection />

        {/* 6-Module Interactive Product Explorer */}
        <ProductExplorer />

        {/* 5-Agent Autonomous Swarm Visualization */}
        <AgentEcosystem />

        {/* Interactive AI CFO Copilot Demo */}
        <AICfoDemo />

        {/* Cash Flow Forecasts & Velocity */}
        <FinancialIntelligence />

        {/* Verified PayPal Sandbox Orders v2 Pipeline */}
        <PaymentShowcase />

        {/* Enterprise Security Architecture */}
        <SecuritySection />

        {/* Why FINEXA Comparison */}
        <ComparisonSection />

        {/* Conversion CTA */}
        <FinalCTA />
      </main>

      {/* Comprehensive Footer */}
      <Footer />
    </div>
  );
}
