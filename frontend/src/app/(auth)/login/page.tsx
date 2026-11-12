"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { apiClient } from "@/lib/api-client";
import { 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Lock, 
  Mail, 
  User, 
  TrendingUp,
  ArrowLeft
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (fullName.trim()) {
      try {
        await apiClient.updateProfile({ name: fullName.trim() });
      } catch {
        // Continue even if profile sync has warning
      }
    }

    router.push("/overview");
  };

  return (
    <div className="min-h-screen bg-[#070913] text-[#F5F7FF] flex flex-col lg:flex-row relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[400px] bg-[#6335FF]/15 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#00F0FF]/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Left Column: Brand Showcase (Hidden on small mobile, visible on desktop) */}
      <div className="hidden lg:flex lg:w-1/2 p-12 lg:p-16 flex-col justify-between relative border-r border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent">
        {/* Top Logo */}
        <Link href="/" className="flex items-center gap-2.5 group w-fit">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6335FF] to-[#00F0FF] flex items-center justify-center p-[1px] shadow-lg shadow-[#6335FF]/30">
            <div className="w-full h-full bg-[#08080D] rounded-[11px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#8B7CFF]" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-wider text-white">
              FINEXA
            </span>
            <span className="text-[9px] font-semibold tracking-widest uppercase text-[#8B7CFF] -mt-1">
              Autonomous Finance
            </span>
          </div>
        </Link>

        {/* Centerpiece Content */}
        <div className="space-y-8 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#6335FF]/10 border border-[#8B7CFF]/30 text-xs font-semibold text-[#8B7CFF]">
            <Sparkles className="w-3.5 h-3.5" />
            THE FINANCIAL OS FOR HIGH-GROWTH COMPANIES
          </div>

          <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15]">
            Command Your Capital with{" "}
            <span className="bg-gradient-to-r from-[#6335FF] via-[#8B7CFF] to-[#00F0FF] bg-clip-text text-transparent">
              Absolute Precision
            </span>
          </h2>

          <p className="text-sm text-neutral-300 leading-relaxed">
            Deterministic double-entry accounting, five cooperative autonomous agents, and an AI CFO grounded in actual general ledger reality.
          </p>

          {/* Mini Preview Glass Card */}
          <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/15 backdrop-blur-xl shadow-2xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Live Ledger Telemetry</span>
              <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Double-Entry Balanced
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                <span className="text-[10px] text-neutral-400">Cash Runway</span>
                <div className="text-base font-bold text-white">9.4 Months</div>
              </div>
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                <span className="text-[10px] text-neutral-400">Active Agents</span>
                <div className="text-base font-bold text-[#00F0FF]">5 Swarm Units</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="flex items-center gap-4 text-xs text-neutral-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> PostgreSQL RLS Isolation
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Python Decimal Math
          </span>
        </div>
      </div>

      {/* Right Column: Authentication Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-8">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to website
          </Link>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Sign in to FINEXA
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1.5">
              Enter your credentials to access your financial intelligence workspace
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-xs text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Optional Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Your Name <span className="text-neutral-500 font-normal">(optional greeting)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#8B7CFF] focus:bg-white/10 transition-all"
                  placeholder="Alex Mercer"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#8B7CFF] focus:bg-white/10 transition-all"
                  placeholder="alex@company.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#8B7CFF] focus:bg-white/10 transition-all"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#6335FF] via-[#7B42FF] to-[#00F0FF] shadow-lg shadow-[#6335FF]/30 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-neutral-400">
            Don&apos;t have an organization account?{" "}
            <Link
              href="/register"
              className="text-[#00F0FF] hover:underline font-bold"
            >
              Create organization free
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
