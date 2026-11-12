"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { apiClient } from "@/lib/api-client";
import { CurrentUserResponse } from "@/lib/api-types";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { FloatingAIButton } from "@/components/layout/FloatingAIButton";
import { ToastProvider } from "@/components/ui/toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<CurrentUserResponse | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      try {
        const user = await apiClient.getCurrentUser();
        setUserData(user);
      } catch (err) {
        console.warn("Backend profile sync unavailable:", err);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Phase 9: Signature Glass Reflection Pointer Tracking
  useEffect(() => {
    let ticking = false;

    const handlePointerMove = (e: PointerEvent) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const target = (e.target as HTMLElement)?.closest(
            ".frosted-glass-card, .glass-card, [data-glass-surface]"
          ) as HTMLElement | null;

          if (target) {
            const rect = target.getBoundingClientRect();
            target.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
            target.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="pointer-events-none fixed top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#4318FF]/15 blur-[120px] -z-10" />
        <div className="pointer-events-none fixed top-[30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#00F0FF]/10 blur-[140px] -z-10" />
        <div className="flex flex-col items-center gap-3 relative z-10">
          <div className="w-9 h-9 border-2 border-[#4318FF] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(67,24,255,0.4)]" />
          <p className="text-xs font-medium text-muted-foreground tracking-wide">Loading FINEXA Intelligence...</p>
        </div>
      </div>
    );
  }

  const orgName = userData?.current_org?.name || "Novastack Technologies";
  const userName = userData?.profile?.name || "User";
  const userEmail = "admin@novastack.io";

  return (
    <ToastProvider>
      <div className="h-screen w-full bg-background text-foreground flex flex-col md:flex-row overflow-hidden relative">
        {/* ═══════════════════════════════════════════════════
            AMBIENT GLOW — SPATIAL 3D RADIAL GRADIENTS
            ═══════════════════════════════════════════════════ */}
        <div className="pointer-events-none fixed -top-40 -left-40 w-[650px] h-[650px] rounded-full bg-[#4318FF]/15 blur-[140px] -z-0" />
        <div className="pointer-events-none fixed top-1/4 -right-40 w-[550px] h-[550px] rounded-full bg-[#00F0FF]/12 blur-[150px] -z-0" />
        <div className="pointer-events-none fixed -bottom-40 left-1/3 w-[600px] h-[600px] rounded-full bg-[#4318FF]/10 blur-[160px] -z-0" />

        {/* Desktop Collapsible Sidebar (Fixed to viewport, never scrolls with page) */}
        <Sidebar className="shrink-0 z-20" />

        {/* Mobile Navigation Drawer */}
        <MobileDrawer
          isOpen={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          orgName={orgName}
        />

        {/* Main Content Area — Only this right container scrolls */}
        <div className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden min-w-0 relative z-10 scrollbar-thin">
          <TopBar
            onOpenMobileMenu={() => setMobileDrawerOpen(true)}
            orgName={orgName}
            userEmail={userEmail}
            userName={userName}
            onUserNameChange={(newName) => {
              setUserData((prev) =>
                prev
                  ? {
                      ...prev,
                      profile: {
                        ...prev.profile,
                        name: newName,
                      },
                    }
                  : prev
              );
            }}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8 animate-in fade-in-50 duration-200">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileNav onOpenMore={() => setMobileDrawerOpen(true)} />

        {/* Mobile Floating AI Button */}
        <FloatingAIButton />
      </div>
    </ToastProvider>
  );
}
