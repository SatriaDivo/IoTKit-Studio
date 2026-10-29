"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderKanban,
  ScrollText,
  Settings,
  ChevronDown,
  ChevronRight,
  Bot,
  BarChart3,
  Activity,
  Database,
  Webhook,
  AlertTriangle,
  Radio,
  Cpu,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  code?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
  collapsible?: boolean;
}

interface SidebarProps {
  collapsed?: boolean;
}

const navigation: NavGroup[] = [
  {
    title: "System",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, code: "DSB" },
    ],
  },
  {
    title: "IoT Control",
    collapsible: true,
    items: [
      { name: "Projects", href: "/projects", icon: FolderKanban, code: "PRJ" },
      { name: "Datasets", href: "/datasets", icon: Database, code: "DAT" },
      { name: "Webhook", href: "/webhook", icon: Webhook, code: "WBH" },
      { name: "MQTT Inspector", href: "/mqtt-inspector", icon: Radio, code: "MQT" },
      { name: "Alert Rules", href: "/alerts", icon: AlertTriangle, code: "ALT" },
      { name: "Telemetry Logs", href: "/logs", icon: ScrollText, code: "LOG" },
    ],
  },
  {
    title: "Intelligence",
    collapsible: true,
    items: [
      { name: "AI Agent", href: "/ai-agent", icon: Bot, code: "AGI" },
      { name: "Analytics", href: "/analytics", icon: BarChart3, code: "ANL" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { name: "Settings", href: "/settings", icon: Settings, code: "SET" },
    ],
  },
];

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [collapsedGroups, setCollapsedGroups] = useState<{
    [key: string]: boolean;
  }>({});

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const currentNav: NavGroup[] = [
    ...navigation,
    ...(user?.role === "admin"
      ? [
          {
            title: "Administration",
            items: [
              {
                name: "User Management",
                href: "/users",
                icon: Users,
                code: "USR",
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <aside
      className={cn(
        "h-screen bg-white border-r border-[#E2E8F0] flex flex-col transition-all duration-200 select-none z-30",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Brand Header */}
      <div className={cn("px-4 py-4 border-b border-[#E2E8F0] shrink-0", collapsed && "px-2")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
          <div className="h-8 w-8 rounded bg-[#0F172A] flex items-center justify-center shrink-0 shadow-sm border border-slate-800">
            <Cpu className="h-4 w-4 text-emerald-400" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-[#0F172A] tracking-tight truncate">
                  IoTKit Studio
                </span>
                <span className="font-mono text-[9px] font-bold px-1 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  PRO
                </span>
              </div>
              <p className="font-mono text-[10px] text-[#64748B] tracking-wider uppercase -mt-0.5">
                TELEMETRY_ENGINE
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto">
        {currentNav.map((group) => {
          const isCollapsed = collapsedGroups[group.title];

          return (
            <div key={group.title}>
              {/* Group Header */}
              {!collapsed ? (
                <div className="px-2 mb-1.5 flex items-center justify-between">
                  {group.collapsible ? (
                    <button
                      onClick={() => toggleGroup(group.title)}
                      className="w-full flex items-center justify-between text-[10px] font-mono font-semibold text-[#94A3B8] uppercase tracking-wider hover:text-[#0F172A] transition-colors"
                    >
                      <span>{group.title}</span>
                      {isCollapsed ? (
                        <ChevronRight className="h-2.5 w-2.5 text-[#94A3B8]" />
                      ) : (
                        <ChevronDown className="h-2.5 w-2.5 text-[#94A3B8]" />
                      )}
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">
                      {group.title}
                    </span>
                  )}
                </div>
              ) : (
                <div className="h-px bg-slate-100 my-2 mx-1" />
              )}

              {/* Group Items */}
              {(!group.collapsible || !isCollapsed || collapsed) && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors relative group",
                          isActive
                            ? "bg-[#F1F5F9] text-[#0F172A] font-semibold border-l-2 border-[#2563EB]"
                            : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]",
                          collapsed ? "justify-center px-0 py-2" : "justify-between"
                        )}
                        title={collapsed ? item.name : undefined}
                      >
                        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2.5 min-w-0")}>
                          <item.icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              isActive ? "text-[#2563EB]" : "text-[#64748B] group-hover:text-[#0F172A]"
                            )}
                          />
                          {!collapsed && (
                            <span className="truncate tracking-tight">{item.name}</span>
                          )}
                        </div>
                        {!collapsed && item.code && (
                          <span className={cn(
                            "font-mono text-[10px] px-1 py-0.2 rounded transition-colors",
                            isActive ? "text-[#2563EB] font-bold" : "text-[#94A3B8] opacity-60 group-hover:opacity-100"
                          )}>
                            {item.code}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Engine Status Bottom Panel */}
      {!collapsed ? (
        <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC] shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
              CORE_ENGINE
            </span>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[10px] font-bold text-emerald-700">ONLINE</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#475569] font-mono">
            <span>TELEMETRY GATEWAY</span>
            <span className="text-[#94A3B8]">PORT: 4000</span>
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-[#E2E8F0] flex justify-center">
          <span className="h-2 w-2 rounded-full bg-emerald-500" title="Core Engine Online" />
        </div>
      )}
    </aside>
  );
}
