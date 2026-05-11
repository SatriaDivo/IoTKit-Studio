"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  Database,
  Send,
  CheckCircle2,
  Plus,
  FolderKanban,
  TrendingUp,
  TrendingDown,
  Circle,
  Radio,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/store/projectStore";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";

interface ActivityLog {
  id: string;
  timestamp: string;
  project: string;
  protocol: string;
  payloadSize: string;
  status: "success" | "error";
  message: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { projects, fetchProjects } = useProjectStore();
  const { user } = useAuthStore();
  const [runningCount, setRunningCount] = useState(0);
  const [totalPayloadsSent, setTotalPayloadsSent] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = recentActivity.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(recentActivity.length / itemsPerPage);

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await fetchProjects();
      await fetchRecentLogs();
      await fetchSimulationStats();
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projects.length === 0) return;

    const checkRunning = async () => {
      let count = 0;
      let totalSent = 0;
      let totalSuccess = 0;

      await Promise.all(
        projects.map(async (p) => {
          try {
            const res = await api.get(`/simulations/status/${p.id}`);
            if (res.data.isRunning) count++;
            if (res.data.stats) {
              totalSent += res.data.stats.totalSent || 0;
              totalSuccess += res.data.stats.successCount || 0;
            }
          } catch {}
        }),
      );

      setRunningCount(count);
      setTotalPayloadsSent(totalSent);
      if (totalSent > 0) {
        const rate = (totalSuccess / totalSent) * 100;
        setSuccessRate(parseFloat(rate.toFixed(1)));
      }
    };

    checkRunning();
    const interval = setInterval(checkRunning, 5000);
    return () => clearInterval(interval);
  }, [projects]);

  const fetchRecentLogs = async () => {
    try {
      const response = await api.get("/logs", {
        params: { limit: 50, sort: "desc" },
      });
      if (response.data && Array.isArray(response.data)) {
        const logs: ActivityLog[] = response.data.map((log: any) => ({
          id: log.id,
          timestamp: log.timestamp || log.createdAt,
          project: log.projectName || log.project?.name || "Unknown Project",
          protocol: log.protocol || "N/A",
          payloadSize: log.payloadSize || "--",
          status: log.status === "success" ? "success" : "error",
          message: log.message || log.payload || "No message",
        }));
        setRecentActivity(logs);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      setRecentActivity([]);
    }
  };

  const fetchSimulationStats = async () => {
    try {
      const response = await api.get("/simulations/stats");
      if (response.data) {
        const { totalSent, successCount } = response.data;
        setTotalPayloadsSent(totalSent || 0);
        if (totalSent > 0) {
          const rate = (successCount / totalSent) * 100;
          setSuccessRate(parseFloat(rate.toFixed(1)));
        }
      }
    } catch (error) {
      console.error("Error fetching simulation stats:", error);
    }
  };

  const protocolUsage = {
    MQTT: projects.filter((p) => p.protocol.includes("MQTT")).length,
    HTTP: projects.filter((p) => p.protocol.includes("HTTP")).length,
    WS: projects.filter((p) => p.protocol.includes("WS")).length,
  };
  const totalProtocols = Object.values(protocolUsage).reduce(
    (a, b) => a + b,
    0,
  );

  const statCards = [
    {
      title: "Total Projects",
      value: projects.length,
      icon: FolderKanban,
      trend:
        projects.length > 0 ? `${projects.length} active` : "No projects yet",
      trendUp: true,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Active Simulations",
      value: runningCount,
      icon: Activity,
      trend:
        projects.length > 0
          ? `${runningCount} of ${projects.length} running`
          : "No simulations",
      trendUp: runningCount > 0,
      iconBg: "bg-cyan-50",
      iconColor: "text-cyan-600",
    },
    {
      title: "Payloads Sent",
      value:
        totalPayloadsSent >= 1000000
          ? `${(totalPayloadsSent / 1000000).toFixed(1)}M`
          : totalPayloadsSent >= 1000
            ? `${(totalPayloadsSent / 1000).toFixed(1)}K`
            : totalPayloadsSent,
      icon: Send,
      trend: totalPayloadsSent > 0 ? "Total sent" : "No payloads yet",
      trendUp: true,
      iconBg: "bg-sky-50",
      iconColor: "text-sky-600",
    },
    {
      title: "Success Rate",
      value: totalPayloadsSent > 0 ? `${successRate}%` : "--",
      icon: CheckCircle2,
      trend: totalPayloadsSent > 0 ? "Overall success" : "No data",
      trendUp: successRate >= 95,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Dashboard Overview
          </h1>
          <p className="text-slate-600 mt-1">
            Real-time telemetry and simulation status.
          </p>
        </div>
        <Button
          onClick={() => router.push("/projects/new")}
          className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Simulation
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-white border-blue-100 shadow-md hover:shadow-lg transition-all duration-200">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 mb-1">{stat.title}</p>
                    <p className="text-4xl font-bold text-slate-800">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.iconBg}`}>
                    <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                </div>
                {stat.trend && (
                  <div className="flex items-center gap-1 text-xs">
                    {stat.trendUp ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <span
                      className={
                        stat.trendUp ? "text-green-600" : "text-red-600"
                      }
                    >
                      {stat.trend}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-white border-blue-100 shadow-md h-full">
            <CardHeader className="border-b border-blue-50">
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-lg text-slate-800">
                  Protocol Usage
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center mb-6">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="#E0F2FE"
                      strokeWidth="20"
                    />
                    {totalProtocols > 0 && (
                      <>
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          fill="none"
                          stroke="#0EA5E9"
                          strokeWidth="20"
                          strokeDasharray={`${(protocolUsage.MQTT / totalProtocols) * 440} 440`}
                          strokeDashoffset="0"
                        />
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          fill="none"
                          stroke="#38BDF8"
                          strokeWidth="20"
                          strokeDasharray={`${(protocolUsage.HTTP / totalProtocols) * 440} 440`}
                          strokeDashoffset={`-${(protocolUsage.MQTT / totalProtocols) * 440}`}
                        />
                      </>
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {totalPayloadsSent >= 1000000
                        ? `${(totalPayloadsSent / 1000000).toFixed(1)}M`
                        : totalPayloadsSent >= 1000
                          ? `${(totalPayloadsSent / 1000).toFixed(1)}K`
                          : totalPayloadsSent || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-cyan-500"></div>
                    <span className="text-sm text-slate-700">MQTT</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    (
                    {Math.round((protocolUsage.MQTT / totalProtocols) * 100) ||
                      0}
                    %)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-slate-700">HTTP</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    (
                    {Math.round((protocolUsage.HTTP / totalProtocols) * 100) ||
                      0}
                    %)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-sky-500"></div>
                    <span className="text-sm text-slate-700">WS</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    (
                    {Math.round((protocolUsage.WS / totalProtocols) * 100) || 0}
                    %)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-white border-blue-100 shadow-md h-full">
            <CardHeader className="border-b border-blue-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-blue-500" />
                  <CardTitle className="text-lg text-slate-800">
                    Real-time Activity Feed
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-green-50 border border-green-200">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs font-medium text-green-700">
                    Live
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {recentActivity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Radio className="h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-sm text-slate-600 font-medium">
                      No activity yet
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Start a simulation to see real-time activity
                    </p>
                  </div>
                ) : (
                  recentActivity.slice(0, 10).map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className={`p-3 rounded-lg border-l-4 ${activity.status === "success" ? "bg-green-50/50 border-l-green-500" : "bg-red-50/50 border-l-red-500"}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">
                            {new Date(activity.timestamp).toLocaleTimeString()}
                          </span>
                          <span
                            className={`text-xs font-mono px-2 py-0.5 rounded ${activity.protocol === "MQTT" ? "bg-cyan-100 text-cyan-700" : activity.protocol === "HTTP" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}
                          >
                            [{activity.protocol}]
                          </span>
                        </div>
                        {activity.status === "success" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Circle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <p className="text-sm text-slate-700">
                        {activity.message}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="bg-white border-blue-100 shadow-md">
          <CardHeader className="border-b border-blue-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-slate-800">
                Recent Activity
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => router.push("/logs")}
              >
                View All Logs →
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Database className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-sm text-slate-600 font-medium">
                  No recent activity
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Activity will appear here when simulations are running
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-blue-50">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">
                          Timestamp
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">
                          Project
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">
                          Protocol
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">
                          Payload Size
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map((activity) => (
                        <tr
                          key={activity.id}
                          className="border-b border-blue-50 hover:bg-blue-50/30 transition-colors"
                        >
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {new Date(activity.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <FolderKanban className="h-4 w-4 text-blue-500" />
                              <span className="text-sm text-slate-700">
                                {activity.project}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-xs font-mono px-2 py-1 rounded ${activity.protocol === "MQTT" ? "bg-cyan-100 text-cyan-700" : activity.protocol === "HTTP" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}
                            >
                              {activity.protocol}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {activity.payloadSize}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${activity.status === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}
                            >
                              <div
                                className={`h-1.5 w-1.5 rounded-full ${activity.status === "success" ? "bg-green-500" : "bg-red-500"}`}
                              ></div>
                              {activity.status === "success"
                                ? "Success"
                                : "Error"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-blue-50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Show:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) =>
                        handleItemsPerPageChange(Number(e.target.value))
                      }
                      className="px-3 py-1.5 text-sm border border-blue-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400"
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={20}>20</option>
                    </select>
                    <span className="text-sm text-slate-600">
                      entries per page
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">
                      Showing {indexOfFirstItem + 1} to{" "}
                      {Math.min(indexOfLastItem, recentActivity.length)} of{" "}
                      {recentActivity.length} entries
                    </span>
                    <div className="flex items-center gap-1 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0 border-blue-200 text-slate-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ‹
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => {
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <Button
                                key={page}
                                variant={
                                  currentPage === page ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className={`h-8 w-8 p-0 ${currentPage === page ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white" : "border-blue-200 text-slate-700 hover:bg-blue-50"}`}
                              >
                                {page}
                              </Button>
                            );
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <span key={page} className="px-1 text-slate-400">
                                ...
                              </span>
                            );
                          }
                          return null;
                        },
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0 border-blue-200 text-slate-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ›
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
