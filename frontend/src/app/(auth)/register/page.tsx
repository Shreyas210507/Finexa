"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { apiClient } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen bg-[#070B1A] text-[#F5F7FF] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111B32] border border-[#0D1428] rounded-[10px] p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 bg-gradient-to-r from-[#20D9F2] to-[#315BFF] text-xs font-bold rounded-full mb-3 text-black">
            FINEXA
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="text-sm text-[#9AA8C7] mt-1">Get started with AI-powered financial intelligence</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-[#EF4444] rounded text-sm text-[#EF4444]">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#9AA8C7] mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 bg-[#0D1428] border border-[#1E293B] rounded-[8px] text-[#F5F7FF] placeholder-[#9AA8C7]/50 focus:outline-none focus:border-[#20D9F2]"
              placeholder="Alex Mercer"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#9AA8C7] mb-1">Company / Organization</label>
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-3 py-2 bg-[#0D1428] border border-[#1E293B] rounded-[8px] text-[#F5F7FF] placeholder-[#9AA8C7]/50 focus:outline-none focus:border-[#20D9F2]"
              placeholder="Novastack Technologies"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#9AA8C7] mb-1">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#0D1428] border border-[#1E293B] rounded-[8px] text-[#F5F7FF] placeholder-[#9AA8C7]/50 focus:outline-none focus:border-[#20D9F2]"
              placeholder="alex@novastack.io"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#9AA8C7] mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[#0D1428] border border-[#1E293B] rounded-[8px] text-[#F5F7FF] placeholder-[#9AA8C7]/50 focus:outline-none focus:border-[#20D9F2]"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-[#315BFF] to-[#963BFF] hover:opacity-95 transition-opacity text-white font-medium rounded-[8px] shadow-lg disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Complete Setup"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#9AA8C7]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#20D9F2] hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
