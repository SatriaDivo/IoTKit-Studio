"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  Database,
  Send,
  Zap,
  Plus,
  ArrowRight,
  Wifi,
  WifiOff,
  Radio,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/store/projectStore";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const { projects, fetchProjects } = useProjectStore();
  const { user } = useAuthStore();
  const [runningCount, setRunningCount] = useState(0);

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch running simulation count
  useEffect(() => {
    if (projects.length === 0) return;

    const checkRunning = async () => {
      let count = 0;
      await Promise.all(
        projects.map(async (p) => {
          try {
            const res = await api.get(`/simulations/status/${p.id}`);
            if (res.data.isRunning) count++;
          } catch {}
        }),
      );
      setRunningCount(count);
    };

    checkRunning();
  }, [projects]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const protocolStats = ["HTTP", "HTTPS", "MQTT", "MQTTS", "WS", "WSS"]
    .map((proto) => ({
      name: proto,
      count: projects.filter((p) => p.protocol === proto).length,
      color: proto.includes("HTTP")
        ? "bg-blue-500"
        : proto.includes("MQTT")
          ? "bg-green-500"
          : "bg-purple-500",
    }))
    .filter((p) => p.count > 0);

  const statCards = [
    {
      title: "Total Projects",
      value: projects.length,
      icon: Database,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      desc: "IoT simulation projects",
    },
    {
      title: "Running Simulations",
      value: runningCount,
      icon: Activity,
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      desc: runningCount > 0 ? "Active right now" : "None active",
    },
    {
      title: "Protocols Used",
      value: new Set(projects.map((p) => p.protocol)).size,
      icon: Radio,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      desc: "Unique protocols",
    },
    {
      title: "Total Payload Sent",
      value: "—",
      icon: Send,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20",
      desc: "Across all simulations",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <p className="text-muted-foreground text-sm mb-1">{greeting()},</p>
          <h1 className="text-4xl font-bold">
            {user?.name || user?.email?.split("@")[0] || "User"} 👋
          </h1>
          <p className="text-muted-foreground mt-2">
            Here's what's happening with your IoT simulations today.
          </p>
        </div>
        <Button onClick={() => router.push("/projects/new")} className="mt-2">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <Card
              className={`glass border ${stat.border} hover:scale-[1.02] transition-transform`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.desc}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Bottom Section */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent Projects */}
        <motion.div
          className="md:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Recent Projects</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => router.push("/projects")}
              >
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Database className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No projects yet
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => router.push("/projects/new")}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create your first project
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {projects.slice(0, 4).map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-1.5 rounded-md ${
                            project.protocol.includes("HTTP")
                              ? "bg-blue-500/10"
                              : project.protocol.includes("MQTT")
                                ? "bg-green-500/10"
                                : "bg-purple-500/10"
                          }`}
                        >
                          {project.protocol.includes("HTTP") ? (
                            <Globe className={`h-3.5 w-3.5 text-blue-400`} />
                          ) : project.protocol.includes("MQTT") ? (
                            <Radio className={`h-3.5 w-3.5 text-green-400`} />
                          ) : (
                            <Zap className={`h-3.5 w-3.5 text-purple-400`} />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{project.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {project.host}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            project.protocol.includes("HTTP")
                              ? "bg-blue-500/10 text-blue-400"
                              : project.protocol.includes("MQTT")
                                ? "bg-green-500/10 text-green-400"
                                : "bg-purple-500/10 text-purple-400"
                          }`}
                        >
                          {project.protocol}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Protocol Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Protocol Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {protocolStats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <WifiOff className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No protocols yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {protocolStats.map((proto) => {
                    const pct =
                      projects.length > 0
                        ? Math.round((proto.count / projects.length) * 100)
                        : 0;
                    return (
                      <div key={proto.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">{proto.name}</span>
                          <span className="text-sm font-medium">
                            {proto.count}
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${proto.color}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.6, duration: 0.6 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick Links */}
              <div className="mt-6 pt-4 border-t border-border space-y-2">
                <p className="text-xs text-muted-foreground font-medium mb-2">
                  Quick Actions
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => router.push("/projects/new")}
                >
                  <Plus className="h-3 w-3 mr-2" />
                  New Project
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => router.push("/logs")}
                >
                  <Activity className="h-3 w-3 mr-2" />
                  View Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
