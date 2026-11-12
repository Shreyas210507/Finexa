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
  const cardRef = React.useRef<HTMLDivElement | null>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cardRef.current.style.setProperty("--mouse-x", `${x}px`);
      cardRef.current.style.setProperty("--mouse-y", `${y}px`);
    }
  };

  const handlePointerLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.setProperty("--mouse-x", "-999px");
      cardRef.current.style.setProperty("--mouse-y", "-999px");
    }
  };

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
      setResponse(res.content);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "AI service temporarily unavailable. Operational intelligence remains accessible via the Financial Engine.";
      setResponse(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative rounded-3xl frosted-glass-card p-6 text-white flex flex-col justify-between min-h-[380px] overflow-hidden shadow-[0_24px_60px_-10px_rgba(0,0,0,0.85),0_0_35px_rgba(67,24,255,0.18)]"
    >
      {/* Top Specular Meniscus Reflection */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      {/* Background ambient radial glows */}
      <div className="pointer-events-none absolute -top-16 -left-16 h-52 w-52 rounded-full bg-[#4318FF]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-[#00F0FF]/15 blur-3xl" />

      {/* Header */}
      <div className="relative flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#4318FF] via-[#6366F1] to-[#00F0FF] text-white shadow-[0_0_16px_rgba(67,24,255,0.5)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-[#A5B4FC] to-[#00F0FF] tracking-wider uppercase block">
              AI Assistant
            </span>
            <span className="text-[10px] text-white/50 block">Autonomous CFO Intelligence</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/ai-cfo")}
          className="text-white/50 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
          title="Open full AI CFO workspace"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      {/* Main Title & Prompt Pills */}
      <div className="relative text-center my-3.5 z-10">
        <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/70 leading-snug">
          What can Assistant<br />help with?
        </h3>

        {/* Suggestion Chips */}
        <div className="mt-3.5 flex flex-wrap justify-center gap-2">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setQuery(prompt);
                handleSend(prompt);
              }}
              className="text-[11px] font-medium px-3.5 py-1.5 rounded-full liquid-glass-pill text-white/90 hover:text-white transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
            >
              <span>{prompt}</span>
            </button>
          ))}
        </div>

        {/* Inline Answer Output if responded */}
        {response && (
          <div className="mt-3.5 text-left p-4 rounded-2xl bg-black/60 backdrop-blur-xl border border-[#4318FF]/40 text-xs text-white leading-relaxed shadow-[0_10px_30px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between text-[10px] text-[#00F0FF] font-bold uppercase mb-1.5">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#00F0FF]" />
                FINEXA CFO Intelligence
              </span>
              <button
                type="button"
                onClick={() => router.push("/ai-cfo")}
                className="flex items-center gap-0.5 hover:underline text-[#34D399]"
              >
                <span>Full Chat</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <p className="line-clamp-4 text-white/90 font-normal">{response}</p>
          </div>
        )}
      </div>

      {/* Bottom Input Pill */}
      <div className="relative z-10 pt-2">
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
            placeholder="Ask anything about cashflow, runway, expenses..."
            disabled={loading}
            className="w-full h-11 rounded-full border border-white/20 bg-white/10 pl-4 pr-12 text-xs text-white placeholder:text-white/50 focus:outline-none focus:border-[#4318FF] focus:ring-1 focus:ring-[#4318FF] transition-all backdrop-blur-md shadow-inner"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-1.5 h-8 w-8 rounded-full bg-gradient-to-r from-[#4318FF] to-[#6366F1] hover:from-[#3b14e6] hover:to-[#5558e6] text-white flex items-center justify-center transition-all disabled:opacity-40 shadow-[0_0_16px_rgba(67,24,255,0.45)] active:scale-95"
            aria-label="Send message"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
