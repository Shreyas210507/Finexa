"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

export function FloatingAIButton() {
  const pathname = usePathname();

  // Hide when already on /ai-cfo page
  if (pathname === "/ai-cfo") return null;

  return (
    <Link
      href="/ai-cfo"
      className="md:hidden fixed bottom-20 right-4 z-40 h-13 w-13 min-h-[48px] min-w-[48px] rounded-full bg-gradient-to-tr from-[#8B7CFF] to-[#A78BFA] text-white shadow-xl hover:shadow-2xl flex items-center justify-center p-3 transition-transform active:scale-95"
      aria-label="Ask FINEXA AI CFO"
      title="Ask FINEXA AI CFO"
    >
      <Sparkles className="h-6 w-6" />
    </Link>
  );
}

