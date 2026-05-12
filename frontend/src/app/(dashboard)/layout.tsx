"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import SidebarV2 from "@/components/layout/SidebarV2";
import HeaderV2 from "@/components/layout/HeaderV2";

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
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100/20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50/30 via-white to-blue-100/20">
      {/* Sidebar - Hidden on mobile by default */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out`}
      >
        <SidebarV2 collapsed={sidebarCollapsed} />
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <HeaderV2
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
