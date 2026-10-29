"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import PopupModal from "@/components/ui/popup-modal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const isChatPage = pathname === "/ai-agent";

  useEffect(() => {
    const verify = async () => {
      await checkAuth();
      setChecking(false);
    };
    verify();
  }, []);

  useEffect(() => {
    if (!checking && !isAuthenticated) {
      router.push("/login");
    }
  }, [checking, isAuthenticated, router]);

  // Show loading spinner while checking auth
  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">
            INITIALIZING_ENGINE...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">
            AUTHENTICATION_REQUIRED // REDIRECTING_TO_LOGIN...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      {/* Sidebar - Hidden on mobile by default */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out`}
      >
        <Sidebar collapsed={sidebarCollapsed} />
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main
          className={`flex-1 ${
            isChatPage
              ? "overflow-hidden flex flex-col p-3 lg:p-4"
              : "overflow-y-auto px-6 py-5"
          }`}
        >
          <div
            className={`w-full mx-auto ${
              isChatPage
                ? "flex-1 flex flex-col min-h-0 max-w-full"
                : "max-w-7xl"
            }`}
          >
            {children}
          </div>
        </main>
      </div>
      <PopupModal />
    </div>
  );
}
