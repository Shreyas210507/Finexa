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
  Building2, 
  ArrowLeft,
  Cpu
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    try {
      // Call onboarding API to configure profile and initial organization
      if (authData.session) {
        await apiClient.onboard(fullName, orgName);
      }
      router.push("/overview");
    } catch (apiErr: unknown) {
      const msg = apiErr instanceof Error ? apiErr.message : "Failed to complete onboarding setup.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070913] text-[#F5F7FF] flex flex-col lg:flex-row relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[400px] bg-[#6335FF]/15 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#00F0FF]/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Left Column: Brand Showcase */}
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
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-xs font-semibold text-[#00F0FF]">
            <Cpu className="w-3.5 h-3.5" />
            INSTANT 60-SECOND TENANT ONBOARDING
          </div>

          <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15]">
            Set Up Your Organization&apos;s{" "}
            <span className="bg-gradient-to-r from-[#6335FF] via-[#8B7CFF] to-[#00F0FF] bg-clip-text text-transparent">
              Autonomous OS
            </span>
          </h2>

          <p className="text-sm text-neutral-300 leading-relaxed">
            Get instant access to a dedicated multi-tenant double-entry ledger, an active AI CFO assistant, and five autonomous financial agents.
          </p>

          {/* Proof Points */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-neutral-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Full PostgreSQL Row-Level Security tenant isolation</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-neutral-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Pre-loaded sandbox charts of accounts &amp; demo ledger</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-neutral-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Verified PayPal Orders v2 sandbox checkout enabled</span>
            </div>
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="flex items-center gap-4 text-xs text-neutral-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> SOC2 Type II Aligned Architecture
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Zero Credit Card Required
          </span>
        </div>
      </div>

      {/* Right Column: Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-7">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to website
          </Link>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Create Your Organization
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1.5">
              Launch your financial intelligence workspace in under 60 seconds
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-xs text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#8B7CFF] focus:bg-white/10 transition-all"
                  placeholder="Alex Mercer"
                />
              </div>
            </div>

            {/* Organization Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Company / Organization
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#8B7CFF] focus:bg-white/10 transition-all"
                  placeholder="Novastack Technologies Inc."
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
                  placeholder="alex@novastack.io"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Password <span className="text-neutral-500 font-normal">(min 6 characters)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
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
                  <span>Configuring Organization...</span>
                </>
              ) : (
                <>
                  <span>Complete Setup &amp; Launch</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-neutral-400">
            Already have an organization?{" "}
            <Link
              href="/login"
              className="text-[#00F0FF] hover:underline font-bold"
            >
              Sign in to workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
