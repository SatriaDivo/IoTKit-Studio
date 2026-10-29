"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import {
  Menu,
  PanelLeftClose,
  PanelLeft,
  X,
  Bell,
  Trash2,
  CheckCircle,
  AlertCircle,
  Info,
  LogOut,
  User,
  Radio,
  ExternalLink,
} from "lucide-react";
import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { toast } from "react-hot-toast";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: Date;
  read: boolean;
  link?: string;
}

interface HeaderProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  onToggleCollapse?: () => void;
  sidebarCollapsed?: boolean;
}

export default function Header({
  onToggleSidebar,
  sidebarOpen,
  onToggleCollapse,
  sidebarCollapsed,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [engineType, setEngineType] = useState<string>("Go/Fiber");

  // Subscribe to real-time events for live header alerts (Go Native WebSocket or Node Socket.IO fallback)
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    let socket: any = null;
    let ws: WebSocket | null = null;
    let active = true;

    const initConnection = async () => {
      try {
        const healthRes = await fetch(`${API_URL}/health`)
          .then((res) => res.json())
          .catch(() => ({}));
        
        const isGo = healthRes.engine === "Go/Fiber";
        setEngineType(isGo ? "Go/Fiber" : "Node/Express");

        if (isGo) {
          const wsUrl = API_URL.replace(/^http/, "ws") + "/ws";
          ws = new WebSocket(wsUrl);

          ws.onopen = () => {
            if (!active) return;
            const token = localStorage.getItem("token") || "";
            fetch(`${API_URL}/api/projects`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then((res) => {
                if (!res.ok) throw new Error("Unauthorized");
                return res.json();
              })
              .then((projects) => {
                if (Array.isArray(projects) && ws && ws.readyState === WebSocket.OPEN) {
                  projects.forEach((proj: any) => {
                    ws?.send(
                      JSON.stringify({
                        action: "subscribe",
                        room: `project:${proj.id}`,
                      })
                    );
                  });
                }
              })
              .catch(() => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ action: "subscribe", room: "project:all" }));
                }
              });
          };

          ws.onmessage = (event) => {
            if (!active) return;
            try {
              const msg = JSON.parse(event.data);
              if (msg.event === "webhookReceived" && msg.data) {
                const payloadBrief = msg.data.log?.message || "Incoming payload received";
                const newNotif: NotificationItem = {
                  id: Math.random().toString(),
                  title: "Webhook Ingestion",
                  message: payloadBrief,
                  type: "success",
                  timestamp: new Date(),
                  read: false,
                  link: "/webhook",
                };
                setNotifications((prev) => [newNotif, ...prev].slice(0, 10));
              } else if (msg.event === "alertTriggered" && msg.data) {
                const isCritical = msg.data.severity === "critical" || msg.data.severity === "error";
                const newNotif: NotificationItem = {
                  id: msg.data.id || Math.random().toString(),
                  title: msg.data.title || "Anomaly Alert Triggered",
                  message: msg.data.message || "A threshold has been exceeded",
                  type: isCritical ? "error" : msg.data.severity === "warning" ? "warning" : "info",
                  timestamp: new Date(),
                  read: false,
                  link: "/alerts",
                };
                setNotifications((prev) => [newNotif, ...prev].slice(0, 10));

                if (isCritical) {
                  toast.error(`⚠️ CRITICAL: ${msg.data.message}`, { duration: 6000 });
                } else if (msg.data.severity === "warning") {
                  toast.error(`⚠️ WARNING: ${msg.data.message}`, { duration: 5000 });
                } else {
                  toast(`ℹ️ INFO: ${msg.data.message}`, { duration: 4000 });
                }
              }
            } catch (e) {}
          };
        } else {
          connectSocketIO();
        }
      } catch (err) {
        connectSocketIO();
      }
    };

    const connectSocketIO = () => {
      try {
        socket = io(API_URL);
        socket.on("webhookReceived", (data: any) => {
          if (!active) return;
          const payloadBrief = data.log?.message || "Incoming payload received";
          const newNotif: NotificationItem = {
            id: Math.random().toString(),
            title: "Webhook Ingestion",
            message: payloadBrief,
            type: "success",
            timestamp: new Date(),
            read: false,
            link: "/webhook",
          };
          setNotifications((prev) => [newNotif, ...prev].slice(0, 10));
        });
      } catch (e) {}
    };

    initConnection();

    return () => {
      active = false;
      if (ws) ws.close();
      if (socket) socket.disconnect();
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const getNotifIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />;
      case "warning":
        return <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />;
      case "error":
        return <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />;
      default:
        return <Info className="h-3.5 w-3.5 text-blue-600 shrink-0" />;
    }
  };

  return (
    <header className="h-13 bg-white border-b border-[#E2E8F0] sticky top-0 z-40 select-none">
      <div className="h-full px-5 flex items-center justify-between">
        {/* Left: Controls & Breadcrumb Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-1.5 rounded text-[#475569] hover:bg-[#F1F5F9] transition-colors"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded text-[#475569] hover:bg-[#F1F5F9] transition-colors"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>

          {/* Precision Telemetry Beacon Indicator */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[#E2E8F0]">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-mono text-[11px] font-semibold text-[#0F172A] tracking-wider uppercase">
              BUS_READY
            </span>
            <span className="text-[#CBD5E1]">/</span>
            <span className="font-mono text-[10px] text-[#64748B] uppercase">
              {engineType}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
                if (!showNotifications) markAllAsRead();
              }}
              className={`relative p-2 rounded text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors ${
                showNotifications ? "bg-[#F1F5F9] text-[#0F172A]" : ""
              }`}
              title="Notifications & Alerts"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E2E8F0] rounded-md shadow-popover z-50 overflow-hidden">
                  <div className="px-3.5 py-2.5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#0F172A] uppercase tracking-wider">
                        TELEMETRY_ALERTS
                      </span>
                      {unreadCount > 0 && (
                        <span className="font-mono text-[10px] bg-rose-600 text-white px-1.5 py-0.2 rounded font-bold">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        className="text-[11px] text-[#64748B] hover:text-rose-600 font-mono transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        CLEAR
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-[#F1F5F9]">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-[#94A3B8] font-mono text-xs space-y-1">
                        <Radio className="h-6 w-6 mx-auto opacity-30 mb-1.5" />
                        <p>NO ACTIVE ALERTS</p>
                        <p className="text-[10px] text-slate-400">All channels operating within limits.</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 text-left transition-colors cursor-pointer hover:bg-[#F8FAFC] ${
                            !n.read ? "bg-blue-50/20" : ""
                          }`}
                          onClick={() => {
                            if (n.link) router.push(n.link);
                            setShowNotifications(false);
                          }}
                        >
                          <div className="flex items-start gap-2.5">
                            {getNotifIcon(n.type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[#0F172A] truncate">
                                {n.title}
                              </p>
                              <p className="text-[11px] text-[#64748B] mt-0.5 line-clamp-2 font-mono">
                                {n.message}
                              </p>
                              <span className="text-[10px] text-[#94A3B8] mt-1 block font-mono">
                                {new Date(n.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative pl-1 border-l border-[#E2E8F0]">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 p-1.5 rounded hover:bg-[#F1F5F9] transition-colors"
            >
              <div className="h-7 w-7 rounded bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] font-mono font-bold text-xs flex items-center justify-center">
                {user?.name ? user.name[0].toUpperCase() : "U"}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-medium text-[#0F172A] leading-tight truncate max-w-[100px]">
                  {user?.name || "Operator"}
                </p>
                <p className="text-[10px] font-mono text-[#64748B] uppercase leading-none">
                  ADMIN
                </p>
              </div>
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-52 bg-white border border-[#E2E8F0] rounded-md shadow-popover z-50 py-1 divide-y divide-[#F1F5F9]">
                  <div className="px-3.5 py-2">
                    <p className="text-xs font-semibold text-[#0F172A] truncate">
                      {user?.name || "Operator"}
                    </p>
                    <p className="text-[11px] font-mono text-[#64748B] truncate">
                      {user?.email || "operator@iotkit.local"}
                    </p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        router.push("/settings");
                        setShowUserMenu(false);
                      }}
                      className="w-full px-3.5 py-1.5 text-xs text-[#334155] hover:bg-[#F8FAFC] flex items-center gap-2 font-medium"
                    >
                      <User className="h-3.5 w-3.5 text-[#64748B]" />
                      Operator Settings
                    </button>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        logout();
                        router.push("/login");
                      }}
                      className="w-full px-3.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
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
