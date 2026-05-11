"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Database, Send, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectStore } from "@/store/projectStore";
import { formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  const { projects, fetchProjects } = useProjectStore();
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeConnections: 0,
    totalPayloadSent: 0,
    connectedDevices: 0,
  });

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    setStats({
      totalProjects: projects.length,
      activeConnections: projects.filter((p) => p.status === "active").length,
      totalPayloadSent: 0,
      connectedDevices: projects.filter((p) => p.status === "active").length,
    });
  }, [projects]);

  const statCards = [
    {
      title: "Total Projects",
      value: stats.totalProjects,
      icon: Database,
      color: "text-blue-500",
    },
    {
      title: "Active Connections",
      value: stats.activeConnections,
      icon: Zap,
      color: "text-green-500",
    },
    {
      title: "Total Payload Sent",
      value: formatNumber(stats.totalPayloadSent),
      icon: Send,
      color: "text-purple-500",
    },
    {
      title: "Connected Devices",
      value: stats.connectedDevices,
      icon: Activity,
      color: "text-cyan-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to IoTKit-Studio. Monitor your IoT simulations in real-time.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              No recent activity
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Protocol Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {["HTTP", "MQTT", "WebSocket"].map((protocol) => {
                const count = projects.filter((p) =>
                  p.protocol.includes(protocol.toUpperCase()),
                ).length;
                return (
                  <div
                    key={protocol}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{protocol}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
