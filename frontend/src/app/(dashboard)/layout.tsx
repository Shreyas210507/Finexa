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
        console.error("Error fetching user data:", err);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#8B7CFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading FINEXA Intelligence...</p>
        </div>
      </div>
    );
  }

  const orgName = userData?.current_org?.name || "Novastack Technologies";
  const userEmail = userData?.profile?.name || "admin@novastack.io";

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
        {/* Desktop Collapsible Sidebar */}
        <Sidebar />

        {/* Mobile Navigation Drawer */}
        <MobileDrawer
          isOpen={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          orgName={orgName}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar
            onOpenMobileMenu={() => setMobileDrawerOpen(true)}
            orgName={orgName}
            userEmail={userEmail}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
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
