"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderKanban,
  Code,
  ScrollText,
  Settings,
  ChevronDown,
  ChevronRight,
  Bot,
  BarChart3,
  Zap,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
  collapsible?: boolean;
}

interface SidebarV2Props {
  collapsed?: boolean;
}

const navigation: NavGroup[] = [
  {
    title: "Main",
    items: [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "IoT Management",
    collapsible: true,
    items: [
      { name: "Projects", href: "/projects", icon: FolderKanban },
      { name: "Payload Builder", href: "/payload-builder", icon: Code },
      { name: "Logs", href: "/logs", icon: ScrollText },
    ],
  },
  {
    title: "AI & Analytics",
    collapsible: true,
    items: [
      { name: "AI Agent", href: "/ai-agent", icon: Bot, badge: "New" },
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "System",
    items: [{ name: "Settings", href: "/settings", icon: Settings }],
  },
];

export default function SidebarV2({ collapsed = false }: SidebarV2Props) {
  const pathname = usePathname();
  const [collapsedGroups, setCollapsedGroups] = useState<{
    [key: string]: boolean;
  }>({});

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div
      className={`${collapsed ? "w-20" : "w-64"} bg-white border-r border-blue-100 flex flex-col shadow-sm transition-all duration-300`}
    >
      {/* Logo Section */}
      <div
        className={`p-6 border-b border-blue-100 ${collapsed ? "px-4" : ""}`}
      >
        <div
          className={`flex items-center ${collapsed ? "justify-center" : "gap-2"}`}
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-md shrink-0">
            <Zap className="h-6 w-6 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-sky-500 via-blue-600 to-cyan-500 bg-clip-text text-transparent">
                IoTKit-Studio
              </h1>
              <p className="text-xs text-slate-500 -mt-0.5">
                IoT Simulation Platform
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {navigation.map((group) => {
          const isCollapsed = collapsedGroups[group.title];

          return (
            <div key={group.title}>
              {/* Group Header */}
              {!collapsed && (
                <>
                  {group.collapsible ? (
                    <button
                      onClick={() => toggleGroup(group.title)}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700 transition-colors"
                    >
                      <span>{group.title}</span>
                      {isCollapsed ? (
                        <ChevronRight className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                  ) : (
                    <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {group.title}
                    </div>
                  )}
                </>
              )}

              {/* Group Items */}
              {(!group.collapsible || !isCollapsed || collapsed) && (
                <div className="space-y-1 mt-2">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group",
                          isActive
                            ? "bg-blue-50 text-blue-600 shadow-sm"
                            : "text-slate-600 hover:bg-blue-50/50 hover:text-blue-600",
                          collapsed ? "justify-center" : "justify-between",
                        )}
                        title={collapsed ? item.name : undefined}
                      >
                        <div
                          className={`flex items-center ${collapsed ? "" : "gap-3"}`}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          {!collapsed && <span>{item.name}</span>}
                        </div>
                        {!collapsed && item.badge && (
                          <span className="px-1.5 py-0.5 text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded">
                            {item.badge}
                          </span>
                        )}
                        {collapsed && item.badge && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full border-2 border-white"></span>
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

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-blue-100 bg-blue-50/30">
          <div className="text-xs text-slate-500 font-medium">
            Version 1.0.0
          </div>
          <div className="text-xs text-slate-400 mt-0.5">© 2026 IoTKit</div>
        </div>
      )}
    </div>
  );
}
