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
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Trash2,
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
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Initialize empty notifications tray (no static dummy alerts)
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Subscribe to real-time events for live header alerts (Go Native WebSocket or Node Socket.IO fallback)
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    let socket: any = null;
    let ws: WebSocket | null = null;
    let active = true;

    const initConnection = async () => {
      try {
        // Query backend health to identify the running engine
        const healthRes = await fetch(`${API_URL}/health`)
          .then((res) => res.json())
          .catch(() => ({}));
        
        const isGo = healthRes.engine === "Go/Fiber";

        if (isGo) {
          // Go Backend uses native WebSockets.
          const wsUrl = API_URL.replace(/^http/, "ws") + "/ws";
          ws = new WebSocket(wsUrl);

          ws.onopen = () => {
            if (!active) return;
            
            // Get user's token for project retrieval
            const token = localStorage.getItem("token") || "";
            
            // Retrieve user's projects to subscribe to their specific rooms
            fetch(`${API_URL}/api/projects`, {
              headers: {
                "Authorization": `Bearer ${token}`
              }
            })
            .then((res) => {
              if (!res.ok) throw new Error("Unauthorized");
              return res.json();
            })
            .then((projects) => {
              if (Array.isArray(projects) && ws && ws.readyState === WebSocket.OPEN) {
                projects.forEach((proj: any) => {
                  ws?.send(JSON.stringify({
                    action: "subscribe",
                    room: `project:${proj.id}`
                  }));
                });
              }
            })
            .catch(() => {
              // If fetching projects fails, subscribe to default global notification rooms
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  action: "subscribe",
                  room: "project:all"
                }));
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
                  title: "Webhook Payload Received",
                  message: payloadBrief,
                  type: "success",
                  timestamp: new Date(),
                  read: false,
                  link: "/webhook",
                };
                setNotifications((prev) => [newNotif, ...prev].slice(0, 5));
              } else if (msg.event === "alertTriggered" && msg.data) {
                const isCritical = msg.data.severity === "critical" || msg.data.severity === "error";
                const newNotif: NotificationItem = {
                  id: msg.data.id || Math.random().toString(),
                  title: msg.data.title || "Anomaly Alert Triggered",
                  message: msg.data.message || "A threshold has been exceeded",
                  type: isCritical ? "error" : (msg.data.severity === "warning" ? "warning" : "info"),
                  timestamp: new Date(),
                  read: false,
                  link: "/alerts",
                };
                setNotifications((prev) => [newNotif, ...prev].slice(0, 5));
                
                // Trigger live toast alert
                if (isCritical) {
                  toast.error(`⚠️ CRITICAL ALERT: ${msg.data.message}`, { duration: 6000 });
                } else if (msg.data.severity === "warning") {
                  toast.error(`⚠️ WARNING: ${msg.data.message}`, { duration: 5000 });
                } else {
                  toast(`ℹ️ INFO: ${msg.data.message}`, { duration: 4000 });
                }
              }
            } catch (e) {}
          };
        } else {
          // Node.js Backend: Socket.IO
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
            title: "Webhook Payload Received",
            message: payloadBrief,
            type: "success",
            timestamp: new Date(),
            read: false,
            link: "/webhook",
          };
          setNotifications((prev) => [newNotif, ...prev].slice(0, 5));
        });
        socket.on("alertTriggered", (data: any) => {
          if (!active) return;
          const isCritical = data.severity === "critical" || data.severity === "error";
          const newNotif: NotificationItem = {
            id: data.id || Math.random().toString(),
            title: data.title || "Anomaly Alert Triggered",
            message: data.message || "A threshold has been exceeded",
            type: isCritical ? "error" : (data.severity === "warning" ? "warning" : "info"),
            timestamp: new Date(),
            read: false,
            link: "/alerts",
          };
          setNotifications((prev) => [newNotif, ...prev].slice(0, 5));
          
          if (isCritical) {
            toast.error(`⚠️ CRITICAL ALERT: ${data.message}`, { duration: 6000 });
          } else if (data.severity === "warning") {
            toast.error(`⚠️ WARNING: ${data.message}`, { duration: 5000 });
          } else {
            toast(`ℹ️ INFO: ${data.message}`, { duration: 4000 });
          }
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

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotifClick = (n: NotificationItem) => {
    // Remove the notification completely when clicked
    setNotifications((prev) => prev.filter((notif) => notif.id !== n.id));
    // Navigate to page
    if (n.link) {
      router.push(n.link);
    }
    // Close dropdown
    setShowNotifications(false);
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const getNotifIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />;
      default:
        return <Info className="h-4 w-4 text-[#6A89A7] shrink-0" />;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-[#D1DBE5] shadow-industrial sticky top-0 z-40">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left: Toggle Buttons */}
        <div className="flex items-center gap-2">
          {/* Mobile Menu Toggle */}
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-[#5A6C7D] hover:bg-[#E8EDF2] transition-colors"
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
            className="hidden lg:flex p-2 rounded-lg text-[#5A6C7D] hover:bg-[#E8EDF2] transition-colors"
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
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
                if (!showNotifications) markAllAsRead();
              }}
              className={`relative p-2 rounded-lg transition-colors ${
                showNotifications ? "bg-[#E8EDF2]" : "text-[#5A6C7D] hover:bg-[#E8EDF2]"
              }`}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-[#F44336] rounded-full border-2 border-white animate-pulse"></span>
              )}
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#D1DBE5] rounded-lg shadow-industrial-lg z-50 overflow-hidden">
                  <div className="p-3 border-b border-[#E8EDF2] flex items-center justify-between bg-muted/30">
                    <p className="text-sm font-semibold text-[#2C3E50] flex items-center gap-2">
                      Notifications
                      {unreadCount > 0 && (
                        <span className="text-[10px] bg-[#F44336] text-white px-1.5 py-0.5 rounded-full font-bold">
                          {unreadCount}
                        </span>
                      )}
                    </p>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        className="text-xs text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-1 font-medium"
                      >
                        <Trash2 className="h-3 w-3" />
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-[#E8EDF2]">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground text-xs space-y-1">
                        <Bell className="h-8 w-8 mx-auto opacity-20 mb-2" />
                        <p>All caught up!</p>
                        <p className="text-[10px]">No new notifications.</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className={`p-3 text-xs space-y-1 transition-colors hover:bg-[#E8EDF2] cursor-pointer border-l-2 ${
                            !n.read 
                              ? "bg-[#6A89A7]/5 border-[#6A89A7]" 
                              : "border-transparent"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {getNotifIcon(n.type)}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[#2C3E50] truncate">
                                {n.title}
                              </p>
                              <p className="text-muted-foreground leading-relaxed line-clamp-2">
                                {n.message}
                              </p>
                              <p className="text-[9px] text-[#8B9AA8] mt-1 flex items-center gap-1 font-mono">
                                <Clock className="h-2.5 w-2.5" />
                                {new Date(n.timestamp).toLocaleTimeString("id-ID", {
                                  hour12: false,
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
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

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#E8EDF2] border border-[#D1DBE5] hover:bg-[#D1DBE5] transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#6A89A7] to-[#5a7997] flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-[#2C3E50]">
                  {user?.email?.split("@")[0] || "User"}
                </p>
                <p className="text-xs text-[#8B9AA8]">
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
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#D1DBE5] rounded-lg shadow-industrial-lg z-50">
                  <div className="p-3 border-b border-[#E8EDF2]">
                    <p className="text-sm font-medium text-[#2C3E50]">
                      {user?.email || "user@example.com"}
                    </p>
                    <p className="text-xs text-[#8B9AA8] mt-0.5">Free Plan</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        router.push("/settings");
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#5A6C7D] hover:bg-[#E8EDF2] rounded-lg transition-colors"
                    >
                      <User className="h-4 w-4" />
                      Profile Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#F44336] hover:bg-[#FFEBEE] rounded-lg transition-colors"
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
