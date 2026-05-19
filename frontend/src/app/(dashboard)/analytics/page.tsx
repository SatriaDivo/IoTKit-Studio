"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Activity,
  Zap,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectStore } from "@/store/projectStore";
import { api } from "@/lib/api";
import { toast } from "react-hot-toast";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface AnalyticsData {
  timestamp: string;
  payloadsSent: number;
  successRate: number;
  avgLatency: number;
}

interface ProtocolStats {
  name: string;
  value: number;
  color: string;
}

export default function AnalyticsPage() {
  const { projects, fetchProjects } = useProjectStore();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d" | "30d">(
    "24h",
  );
  const [exporting, setExporting] = useState(false);

  // Real-time metrics
  const [totalPayloads, setTotalPayloads] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [avgLatency, setAvgLatency] = useState(0);
  const [activeSimulations, setActiveSimulations] = useState(0);

  // Chart data
  const [timeSeriesData, setTimeSeriesData] = useState<AnalyticsData[]>([]);
  const [protocolData, setProtocolData] = useState<ProtocolStats[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);

  useEffect(() => {
    loadAnalyticsData();
    const interval = setInterval(loadAnalyticsData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      await fetchProjects();
      await fetchMetrics();
      await generateChartData();
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      // Fetch simulation stats
      const statsResponse = await api.get("/simulations/stats");
      if (statsResponse.data) {
        const { totalSent, successCount } = statsResponse.data;
        setTotalPayloads(totalSent || 0);
        if (totalSent > 0) {
          setSuccessRate(
            parseFloat(((successCount / totalSent) * 100).toFixed(1)),
          );
        }
      }

      // Count active simulations
      let activeCount = 0;
      let totalLatency = 0;
      let latencyCount = 0;

      await Promise.all(
        projects.map(async (p) => {
          try {
            const res = await api.get(`/simulations/status/${p.id}`);
            if (res.data.isRunning) activeCount++;

            // Get recent logs for latency calculation
            const logsRes = await api.get(`/logs/project/${p.id}`, {
              params: { limit: 10 },
            });
            if (logsRes.data && Array.isArray(logsRes.data)) {
              logsRes.data.forEach((log: any) => {
                if (log.latency) {
                  totalLatency += log.latency;
                  latencyCount++;
                }
              });
            }
          } catch {}
        }),
      );

      setActiveSimulations(activeCount);
      if (latencyCount > 0) {
        setAvgLatency(Math.round(totalLatency / latencyCount));
      }
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };

  const generateChartData = async () => {
    try {
      // Fetch real logs data
      const logsResponse = await api.get("/logs", {
        params: { limit: 1000, sort: "desc" },
      });

      if (!logsResponse.data || !Array.isArray(logsResponse.data)) {
        setTimeSeriesData([]);
        setProtocolData([]);
        return;
      }

      const logs = logsResponse.data;

      // Calculate time range in milliseconds
      const now = Date.now();
      const rangeMs =
        timeRange === "1h"
          ? 60 * 60 * 1000
          : timeRange === "24h"
            ? 24 * 60 * 60 * 1000
            : timeRange === "7d"
              ? 7 * 24 * 60 * 60 * 1000
              : 30 * 24 * 60 * 60 * 1000;

      // Filter logs by time range
      const filteredLogs = logs.filter((log: any) => {
        const logTime = new Date(log.timestamp || log.createdAt).getTime();
        return now - logTime <= rangeMs;
      });

      // Group logs by time intervals
      const interval =
        timeRange === "1h"
          ? 5 * 60 * 1000
          : timeRange === "24h"
            ? 60 * 60 * 1000
            : timeRange === "7d"
              ? 6 * 60 * 60 * 1000
              : 24 * 60 * 60 * 1000;

      const points =
        timeRange === "1h"
          ? 12
          : timeRange === "24h"
            ? 24
            : timeRange === "7d"
              ? 28
              : 30;

      // Create time buckets
      const buckets: { [key: string]: any[] } = {};
      for (let i = 0; i < points; i++) {
        const bucketTime = now - (points - 1 - i) * interval;
        const bucketKey = new Date(bucketTime).toISOString();
        buckets[bucketKey] = [];
      }

      // Distribute logs into buckets
      filteredLogs.forEach((log: any) => {
        const logTime = new Date(log.timestamp || log.createdAt).getTime();
        const bucketIndex = Math.floor((now - logTime) / interval);
        const bucketTime = now - bucketIndex * interval;
        const bucketKey = new Date(bucketTime).toISOString();

        if (buckets[bucketKey]) {
          buckets[bucketKey].push(log);
        }
      });

      // Generate time series data from real logs
      const timeSeries: AnalyticsData[] = Object.keys(buckets)
        .sort()
        .map((bucketKey) => {
          const bucketLogs = buckets[bucketKey];
          const timestamp = new Date(bucketKey);

          const payloadsSent = bucketLogs.length;
          const successCount = bucketLogs.filter(
            (log: any) => log.type === "response" || log.statusCode === 200,
          ).length;
          const successRate =
            payloadsSent > 0 ? (successCount / payloadsSent) * 100 : 0;

          const latencies = bucketLogs
            .filter((log: any) => log.latency)
            .map((log: any) => log.latency);
          const avgLatency =
            latencies.length > 0
              ? latencies.reduce((a: number, b: number) => a + b, 0) /
                latencies.length
              : 0;

          return {
            timestamp:
              timeRange === "1h" || timeRange === "24h"
                ? timestamp.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : timestamp.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  }),
            payloadsSent,
            successRate: parseFloat(successRate.toFixed(1)),
            avgLatency: Math.round(avgLatency),
          };
        });

      setTimeSeriesData(timeSeries);

      // Protocol distribution from real projects
      const protocolStats: ProtocolStats[] = [
        {
          name: "MQTT",
          value: projects.filter((p) => p.protocol.includes("MQTT")).length,
          color: "#6A89A7",
        },
        {
          name: "HTTP",
          value: projects.filter((p) => p.protocol.includes("HTTP")).length,
          color: "#88BDF2",
        },
        {
          name: "WebSocket",
          value: projects.filter((p) => p.protocol.includes("WS")).length,
          color: "#BDDDFC",
        },
      ];
      setProtocolData(protocolStats.filter((p) => p.value > 0));

      // Performance data
      const performance = [
        { name: "Success", value: successRate, color: "#4CAF50" },
        { name: "Failed", value: 100 - successRate, color: "#F44336" },
      ];
      setPerformanceData(performance);
    } catch (error) {
      console.error("Error generating chart data:", error);
      setTimeSeriesData([]);
      setProtocolData([]);
    }
  };

  const captureChartAsBase64 = async (
    containerId: string,
    fallbackTitle: string,
    fallbackSubtitle: string
  ): Promise<string> => {
    const container = document.getElementById(containerId);
    if (!container) return "";
    const rechartsSvg = container.querySelector(".recharts-svg");
    
    let svgString = "";
    let width = 500;
    let height = 300;

    if (rechartsSvg) {
      const serializer = new XMLSerializer();
      svgString = serializer.serializeToString(rechartsSvg);
      width = rechartsSvg.clientWidth || 500;
      height = rechartsSvg.clientHeight || 300;
      
      if (!svgString.includes("http://www.w3.org/2000/svg")) {
        svgString = svgString.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      svgString = svgString.replace(
        "<svg",
        `<svg style="background: white;"`
      );
    } else {
      // Return a pristine, beautiful vector placeholder SVG for the empty state
      svgString = `
        <svg width="500" height="300" viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg">
          <rect width="500" height="300" fill="#F8F9FA" rx="8" ry="8" stroke="#E8EDF2" stroke-width="1"/>
          <circle cx="250" cy="100" r="28" fill="#6A89A7" fill-opacity="0.1" />
          <path d="M242 108 L246 104 L250 108 L258 100" stroke="#6A89A7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          <text x="250" y="165" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#2C3E50" text-anchor="middle">${fallbackTitle}</text>
          <text x="250" y="190" font-family="Arial, sans-serif" font-size="11" fill="#5A6C7D" text-anchor="middle">${fallbackSubtitle}</text>
        </svg>
      `;
      width = 500;
      height = 300;
    }

    return new Promise((resolve) => {
      try {
        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const DOMURL = window.URL || window.webkitURL || window;
        const url = DOMURL.createObjectURL(svgBlob);

        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0);
          }
          const pngBase64 = canvas.toDataURL("image/png");
          DOMURL.revokeObjectURL(url);
          resolve(pngBase64);
        };
        image.onerror = () => {
          DOMURL.revokeObjectURL(url);
          resolve("");
        };
        image.src = url;
      } catch (e) {
        console.error(e);
        resolve("");
      }
    });
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      toast.loading("Serializing charts and compiling PDF report...", { id: "export-pdf" });

      // Capture all 4 Recharts SVGs
      const [payloadTrends, successRateTrends, latencyTrends, protocolDistribution] = await Promise.all([
        captureChartAsBase64("chart-payload-trends", "No Telemetry Logs Recorded", "Run simulations or send webhooks to view live data"),
        captureChartAsBase64("chart-success-rate", "No Telemetry Logs Recorded", "Run simulations or send webhooks to view live data"),
        captureChartAsBase64("chart-latency", "No Telemetry Logs Recorded", "Run simulations or send webhooks to view live data"),
        captureChartAsBase64("chart-protocols", "No Registered IoT Projects", "Create HTTP, MQTT, or WS projects to analyze"),
      ]);

      const activeProj = projects[0];
      const payload = {
        projectId: activeProj?.id || "Global",
        projectName: activeProj?.name || "Global Sandbox",
        protocol: activeProj?.protocol || "HTTP/WS/MQTT",
        host: activeProj?.host || "localhost",
        port: activeProj?.port || "Various",
        totalLogs: totalPayloads,
        successRate: successRate,
        averageLatency: avgLatency,
        timeRange: timeRange === "1h" ? "1 Hour" : timeRange === "24h" ? "24 Hours" : timeRange === "7d" ? "7 Days" : "30 Days",
        charts: {
          payloadTrends,
          successRateTrends,
          latencyTrends,
          protocolDistribution,
        },
      };

      // Hit standard backend export API (works seamlessly on Go & Node since both have identical route setup)
      const response = await api.post("/reports/export", payload, { responseType: "blob" });
      
      const now = new Date();
      const pad = (num: number) => String(num).padStart(2, '0');
      const timestamp = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `IoTKit-Industrial-Report-${activeProj?.id || "Global"}-${timestamp}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Industrial PDF report exported successfully!", { id: "export-pdf" });
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("Failed to export professional PDF report.", { id: "export-pdf" });
    } finally {
      setExporting(false);
    }
  };

  const metricCards = [
    {
      title: "Total Payloads",
      value:
        totalPayloads >= 1000000
          ? `${(totalPayloads / 1000000).toFixed(1)}M`
          : totalPayloads >= 1000
            ? `${(totalPayloads / 1000).toFixed(1)}K`
            : totalPayloads,
      icon: Zap,
      iconBg: "bg-[#6A89A7]/20",
      iconColor: "text-[#6A89A7]",
    },
    {
      title: "Success Rate",
      value: totalPayloads > 0 ? `${successRate}%` : "--",
      icon: CheckCircle2,
      iconBg: "bg-[#4CAF50]/20",
      iconColor: "text-[#4CAF50]",
    },
    {
      title: "Avg Latency",
      value: avgLatency > 0 ? `${avgLatency}ms` : "--",
      icon: Clock,
      iconBg: "bg-[#88BDF2]/20",
      iconColor: "text-[#88BDF2]",
    },
    {
      title: "Active Simulations",
      value: activeSimulations,
      icon: Activity,
      iconBg: "bg-[#BDDDFC]/30",
      iconColor: "text-[#384959]",
    },
  ];

  if (loading && timeSeriesData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#6A89A7]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2C3E50]">
            Analytics Dashboard
          </h1>
          <p className="text-[#5A6C7D] mt-1">
            Advanced analytics with real-time charts and performance metrics
          </p>
        </div>

        {/* Time Range Selector & Export PDF */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-[#D1DBE5] rounded-lg p-1">
            {(["1h", "24h", "7d", "30d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  timeRange === range
                    ? "bg-[#6A89A7] text-white"
                    : "text-[#5A6C7D] hover:bg-[#E8EDF2]"
                }`}
              >
                {range === "1h"
                  ? "1 Hour"
                  : range === "24h"
                    ? "24 Hours"
                    : range === "7d"
                      ? "7 Days"
                      : "30 Days"}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportPDF}
            disabled={exporting || timeSeriesData.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-[#384959] hover:bg-[#2C3E50] text-white border border-[#384959] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <FileDown className="h-4 w-4" />
            {exporting ? "Exporting..." : "Export Report (PDF)"}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="card-industrial hover:shadow-industrial-lg transition-all duration-200">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-[#8B9AA8] mb-1">
                      {metric.title}
                    </p>
                    <p className="text-3xl font-bold text-[#2C3E50]">
                      {metric.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${metric.iconBg}`}>
                    <metric.icon className={`h-6 w-6 ${metric.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Payload Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="card-industrial" id="chart-payload-trends">
            <CardHeader className="border-b border-[#E8EDF2]">
              <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#6A89A7]" />
                Payload Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {timeSeriesData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <BarChart3 className="h-12 w-12 text-[#D1DBE5] mb-3" />
                  <p className="text-sm text-[#5A6C7D] font-medium">
                    No data available
                  </p>
                  <p className="text-xs text-[#8B9AA8] mt-1">
                    Start a simulation to see payload trends
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={timeSeriesData}>
                    <defs>
                      <linearGradient
                        id="colorPayloads"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#6A89A7"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#6A89A7"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF2" />
                    <XAxis
                      dataKey="timestamp"
                      stroke="#8B9AA8"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis stroke="#8B9AA8" style={{ fontSize: "12px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #D1DBE5",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="payloadsSent"
                      stroke="#6A89A7"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPayloads)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Success Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="card-industrial" id="chart-success-rate">
            <CardHeader className="border-b border-[#E8EDF2]">
              <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#4CAF50]" />
                Success Rate Over Time
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {timeSeriesData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <TrendingUp className="h-12 w-12 text-[#D1DBE5] mb-3" />
                  <p className="text-sm text-[#5A6C7D] font-medium">
                    No data available
                  </p>
                  <p className="text-xs text-[#8B9AA8] mt-1">
                    Start a simulation to see success rate trends
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF2" />
                    <XAxis
                      dataKey="timestamp"
                      stroke="#8B9AA8"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      stroke="#8B9AA8"
                      style={{ fontSize: "12px" }}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #D1DBE5",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="successRate"
                      stroke="#4CAF50"
                      strokeWidth={3}
                      dot={{ fill: "#4CAF50", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Protocol Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="card-industrial" id="chart-protocols">
            <CardHeader className="border-b border-[#E8EDF2]">
              <CardTitle className="text-lg text-[#2C3E50]">
                Protocol Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {protocolData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[250px] text-center">
                  <Activity className="h-12 w-12 text-[#D1DBE5] mb-3" />
                  <p className="text-sm text-[#5A6C7D] font-medium">
                    No projects yet
                  </p>
                  <p className="text-xs text-[#8B9AA8] mt-1">
                    Create projects to see protocol distribution
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={protocolData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {protocolData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Latency Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="card-industrial" id="chart-latency">
            <CardHeader className="border-b border-[#E8EDF2]">
              <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#88BDF2]" />
                Latency Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {timeSeriesData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[250px] text-center">
                  <Clock className="h-12 w-12 text-[#D1DBE5] mb-3" />
                  <p className="text-sm text-[#5A6C7D] font-medium">
                    No data available
                  </p>
                  <p className="text-xs text-[#8B9AA8] mt-1">
                    Start a simulation to see latency trends
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF2" />
                    <XAxis
                      dataKey="timestamp"
                      stroke="#8B9AA8"
                      style={{ fontSize: "10px" }}
                    />
                    <YAxis stroke="#8B9AA8" style={{ fontSize: "12px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #D1DBE5",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar
                      dataKey="avgLatency"
                      fill="#88BDF2"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Performance Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="card-industrial">
            <CardHeader className="border-b border-[#E8EDF2]">
              <CardTitle className="text-lg text-[#2C3E50]">
                Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#4CAF50]/5 rounded-lg border border-[#4CAF50]/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-[#4CAF50]" />
                    <div>
                      <p className="text-sm text-[#8B9AA8]">Successful</p>
                      <p className="text-2xl font-bold text-[#2C3E50]">
                        {Math.round((totalPayloads * successRate) / 100)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-[#4CAF50]">
                      {successRate}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#F44336]/5 rounded-lg border border-[#F44336]/20">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-8 w-8 text-[#F44336]" />
                    <div>
                      <p className="text-sm text-[#8B9AA8]">Failed</p>
                      <p className="text-2xl font-bold text-[#2C3E50]">
                        {Math.round(
                          (totalPayloads * (100 - successRate)) / 100,
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-[#F44336]">
                      {(100 - successRate).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#88BDF2]/5 rounded-lg border border-[#88BDF2]/20">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-8 w-8 text-[#88BDF2]" />
                    <div>
                      <p className="text-sm text-[#8B9AA8]">Avg Response</p>
                      <p className="text-2xl font-bold text-[#2C3E50]">
                        {avgLatency}ms
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
