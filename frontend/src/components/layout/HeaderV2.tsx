"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import {
  User,
  LogOut,
  Bell,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useState } from "react";

interface HeaderV2Props {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  onToggleCollapse?: () => void;
  sidebarCollapsed?: boolean;
}

export default function HeaderV2({
  onToggleSidebar,
  sidebarOpen,
  onToggleCollapse,
  sidebarCollapsed,
}: HeaderV2Props) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="h-16 bg-white border-b border-blue-100 shadow-sm sticky top-0 z-40">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left: Toggle Buttons */}
        <div className="flex items-center gap-2">
          {/* Mobile Menu Toggle */}
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-blue-50 transition-colors"
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          {/* Desktop Sidebar Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-2 rounded-lg text-slate-600 hover:bg-blue-50 transition-colors"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="relative p-2 rounded-lg text-slate-600 hover:bg-blue-50 transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-slate-800">
                  {user?.email?.split("@")[0] || "User"}
                </p>
                <p className="text-xs text-slate-500">
                  {user?.email || "user@example.com"}
                </p>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-blue-100 rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b border-blue-50">
                    <p className="text-sm font-medium text-slate-800">
                      {user?.email || "user@example.com"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Free Plan</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        router.push("/settings");
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <User className="h-4 w-4" />
                      Profile Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
