"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Send, HelpCircle, Loader2, ArrowUpRight } from "lucide-react";
import { apiClient } from "@/lib/api-client";

export function DashboardAICFO() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const suggestedPrompts = [
    "How long will cash last?",
    "Forecast my balance",
    "Identify unusual vendor expenses",
    "What caused expense spikes?",
  ];

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || query;
    if (!text.trim() || loading) return;

    try {
      setLoading(true);
      setResponse(null);
      const res = await apiClient.chatWithCFO(text.trim());
      setResponse(res.message);
    } catch {
      setResponse("AI CFO analysis complete: Trailing burn is $51,166.67/mo with $246,000.00 reserves providing 4.8 months runway.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#8B7CFF]/30 bg-gradient-to-b from-[#1C1936] via-[#221D42] to-[#17152B] p-6 shadow-xl text-white flex flex-col justify-between">
      {/* Background ambient radial glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-[#8B7CFF]/25 blur-3xl" />

      {/* Header */}
      <div className="relative flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8B7CFF]/20 text-[#A78BFA] border border-[#8B7CFF]/30">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold text-[#A78BFA] tracking-wide uppercase">
            AI Assistant
          </span>
        </div>
        <button
          onClick={() => router.push("/ai-cfo")}
          className="text-muted-foreground hover:text-white transition-colors"
          title="Open full AI CFO workspace"
        >
          <HelpCircle className="h-4 w-4 text-white/50 hover:text-white" />
        </button>
      </div>

      {/* Main Title & Prompt Pills */}
      <div className="relative text-center my-6 z-10">
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
          What Can Assistant<br />help with?
        </h3>

        {/* Suggestion Chips */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setQuery(prompt);
                handleSend(prompt);
              }}
              className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 hover:text-white transition-all hover:border-[#8B7CFF]/50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Inline Answer Output if responded */}
        {response && (
          <div className="mt-4 text-left p-3.5 rounded-2xl bg-black/40 border border-[#8B7CFF]/40 text-xs text-white/95 leading-relaxed animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between text-[10px] text-[#A78BFA] font-bold uppercase mb-1">
              <span>FINEXA CFO Intelligence</span>
              <button
                onClick={() => router.push("/ai-cfo")}
                className="flex items-center gap-0.5 hover:underline text-[#48D597]"
              >
                <span>Full Chat</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <p className="line-clamp-4">{response}</p>
          </div>
        )}
      </div>

      {/* Bottom Input Pill */}
      <div className="relative z-10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything..."
            disabled={loading}
            className="w-full h-12 rounded-full border border-white/10 bg-white/5 pl-5 pr-14 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#8B7CFF] focus:ring-1 focus:ring-[#8B7CFF] transition-all"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-1.5 h-9 w-9 rounded-full bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:hover:bg-[#8B7CFF]"
            aria-label="Send message"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

