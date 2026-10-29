"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Activity,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  FileDown,
  Layers,
  ArrowUpRight,
  Filter,
} from "lucide-react";
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
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d" | "30d">("24h");
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
    const interval = setInterval(loadAnalyticsData, 4000);
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
      const statsResponse = await api.get("/simulations/stats");
      if (statsResponse.data) {
        const { totalSent, successCount } = statsResponse.data;
        setTotalPayloads(totalSent || 0);
        if (totalSent > 0) {
          setSuccessRate(parseFloat(((successCount / totalSent) * 100).toFixed(1)));
        }
      }

      let activeCount = 0;
      let totalLatency = 0;
      let latencyCount = 0;

      await Promise.all(
        projects.map(async (p) => {
          try {
            const res = await api.get(`/simulations/status/${p.id}`);
            if (res.data.isRunning) activeCount++;

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
        })
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
      const logsResponse = await api.get("/logs", {
        params: { limit: 1000, sort: "desc" },
      });

      if (!logsResponse.data || !Array.isArray(logsResponse.data)) {
        setTimeSeriesData([]);
        setProtocolData([]);
        return;
      }

      const logs = logsResponse.data;
      const now = Date.now();
      const rangeMs =
        timeRange === "1h"
          ? 60 * 60 * 1000
          : timeRange === "24h"
          ? 24 * 60 * 60 * 1000
          : timeRange === "7d"
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;

      const filteredLogs = logs.filter((log: any) => {
        const logTime = new Date(log.timestamp || log.createdAt).getTime();
        return now - logTime <= rangeMs;
      });

      const interval =
        timeRange === "1h"
          ? 5 * 60 * 1000
          : timeRange === "24h"
          ? 60 * 60 * 1000
          : timeRange === "7d"
          ? 6 * 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;

      const points =
        timeRange === "1h" ? 12 : timeRange === "24h" ? 24 : timeRange === "7d" ? 28 : 30;

      const buckets: { [key: string]: any[] } = {};
      for (let i = 0; i < points; i++) {
        const bucketTime = now - (points - 1 - i) * interval;
        const bucketKey = new Date(bucketTime).toISOString();
        buckets[bucketKey] = [];
      }

      filteredLogs.forEach((log: any) => {
        const logTime = new Date(log.timestamp || log.createdAt).getTime();
        const bucketIndex = Math.floor((now - logTime) / interval);
        const bucketTime = now - bucketIndex * interval;
        const bucketKey = new Date(bucketTime).toISOString();

        if (buckets[bucketKey]) {
          buckets[bucketKey].push(log);
        }
      });

      const timeSeries: AnalyticsData[] = Object.keys(buckets)
        .sort()
        .map((bucketKey) => {
          const bucketLogs = buckets[bucketKey];
          const timestamp = new Date(bucketKey);

          const payloadsSent = bucketLogs.length;
          const successCount = bucketLogs.filter(
            (log: any) => log.type === "response" || log.statusCode === 200
          ).length;
          const successRate =
            payloadsSent > 0 ? (successCount / payloadsSent) * 100 : 0;

          const latencies = bucketLogs
            .filter((log: any) => log.latency)
            .map((log: any) => log.latency);
          const avgLatency =
            latencies.length > 0
              ? latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length
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

      const protocolStats: ProtocolStats[] = [
        {
          name: "MQTT",
          value: projects.filter((p) => (p.protocol || "").toUpperCase().includes("MQTT")).length,
          color: "#059669", // Emerald
        },
        {
          name: "HTTP",
          value: projects.filter((p) => (p.protocol || "").toUpperCase().includes("HTTP")).length,
          color: "#2563EB", // Cobalt
        },
        {
          name: "WebSocket",
          value: projects.filter((p) => (p.protocol || "").toUpperCase().includes("WS")).length,
          color: "#0D9488", // Teal
        },
      ];
      setProtocolData(protocolStats.filter((p) => p.value > 0));

      const performance = [
        { name: "Success", value: successRate, color: "#16A34A" },
        { name: "Failed", value: 100 - successRate, color: "#DC2626" },
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

      svgString = svgString.replace("<svg", `<svg style="background: white;"`);
    } else {
      svgString = `
        <svg width="500" height="300" viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg">
          <rect width="500" height="300" fill="#F8FAFC" rx="4" stroke="#CBD5E1" stroke-width="1"/>
          <circle cx="250" cy="100" r="28" fill="#0F172A" fill-opacity="0.05" />
          <path d="M242 108 L246 104 L250 108 L258 100" stroke="#0F172A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          <text x="250" y="165" font-family="monospace" font-size="12" font-weight="bold" fill="#0F172A" text-anchor="middle">${fallbackTitle}</text>
          <text x="250" y="190" font-family="sans-serif" font-size="10" fill="#64748B" text-anchor="middle">${fallbackSubtitle}</text>
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
        resolve("");
      }
    });
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      toast.loading("Compiling precision telemetry report...", { id: "export-pdf" });

      const [payloadTrends, successRateTrends, latencyTrends, protocolDistribution] =
        await Promise.all([
          captureChartAsBase64(
            "chart-payload-trends",
            "NO_PAYLOAD_DATA",
            "Run simulations or send webhooks to view live data"
          ),
          captureChartAsBase64(
            "chart-success-rate",
            "NO_SUCCESS_METRICS",
            "Run simulations or send webhooks to view live data"
          ),
          captureChartAsBase64(
            "chart-latency",
            "NO_LATENCY_METRICS",
            "Run simulations or send webhooks to view live data"
          ),
          captureChartAsBase64(
            "chart-protocols",
            "NO_NODES_CONFIGURED",
            "Create HTTP, MQTT, or WS projects to analyze"
          ),
        ]);

      const activeProj = projects[0];
      const payload = {
        projectId: activeProj?.id || "Global",
        projectName: activeProj?.name || "Global Cluster",
        protocol: activeProj?.protocol || "HTTP/WS/MQTT",
        host: activeProj?.host || "localhost",
        port: activeProj?.port || "Various",
        totalLogs: totalPayloads,
        successRate: successRate,
        averageLatency: avgLatency,
        timeRange:
          timeRange === "1h"
            ? "1 Hour"
            : timeRange === "24h"
            ? "24 Hours"
            : timeRange === "7d"
            ? "7 Days"
            : "30 Days",
        charts: {
          payloadTrends,
          successRateTrends,
          latencyTrends,
          protocolDistribution,
        },
      };

      const response = await api.post("/reports/export", payload, { responseType: "blob" });

      const now = new Date();
      const pad = (num: number) => String(num).padStart(2, "0");
      const timestamp = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `IoTKit-Precision-Report-${activeProj?.id || "Global"}-${timestamp}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Industrial PDF report exported", { id: "export-pdf" });
    } catch (error) {
      toast.error("Failed to export industrial PDF report", { id: "export-pdf" });
    } finally {
      setExporting(false);
    }
  };

  if (loading && timeSeriesData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">
          AGGREGATING_TELEMETRY...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Precision Instrument Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-md p-4 shadow-hairline">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-slate-100 text-[#0F172A] border border-slate-200">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">
                  Telemetry Performance Analytics
                </h1>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  REALTIME_STREAM
                </span>
              </div>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                CLUSTER_DATA_ENGINE // LATENCY_DISTRIBUTION // SUCCESS_QUOTIENT
              </p>
            </div>
          </div>

          {/* Time Range Selector & Export PDF */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <div className="flex items-center bg-white border border-[#CBD5E1] rounded p-0.5">
              {(["1h", "24h", "7d", "30d"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2.5 py-1 text-xs font-mono font-semibold rounded uppercase transition-colors ${
                    timeRange === range
                      ? "bg-[#0F172A] text-white"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportPDF}
              disabled={exporting || timeSeriesData.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-50 transition-all shadow-xs"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>{exporting ? "Compiling..." : "Export PDF Report"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Cells Hairline Telemetry Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-[#E2E8F0] rounded-md divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8F0] shadow-hairline overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] font-bold text-[#64748B] uppercase">
              TOTAL_PAYLOADS
            </span>
            <Zap className="h-3.5 w-3.5 text-[#2563EB]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#0F172A] tabular-nums">
            {totalPayloads >= 1000000
              ? `${(totalPayloads / 1000000).toFixed(2)}M`
              : totalPayloads >= 1000
              ? `${(totalPayloads / 1000).toFixed(1)}K`
              : totalPayloads}
          </div>
          <span className="font-mono text-[10px] text-slate-400 mt-1 block">
            HISTORICAL_EVENTS
          </span>
        </div>

        <div className="p-4 bg-slate-50/20">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] font-bold text-[#64748B] uppercase">
              SUCCESS_RATE
            </span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#0F172A] tabular-nums">
            {totalPayloads > 0 ? `${successRate}%` : "100.0%"}
          </div>
          <span className="font-mono text-[10px] text-emerald-700 mt-1 block font-medium">
            REACH_OPTIMAL
          </span>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] font-bold text-[#64748B] uppercase">
              AVG_ROUNDTRIP
            </span>
            <Clock className="h-3.5 w-3.5 text-slate-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#0F172A] tabular-nums">
            {avgLatency > 0 ? `${avgLatency}ms` : "< 1ms"}
          </div>
          <span className="font-mono text-[10px] text-slate-400 mt-1 block">
            NETWORK_LATENCY
          </span>
        </div>

        <div className="p-4 bg-slate-50/20">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] font-bold text-[#64748B] uppercase">
              ACTIVE_TRANSMITTERS
            </span>
            <Activity className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#0F172A] tabular-nums">
            {activeSimulations.toString().padStart(2, "0")}
          </div>
          <span className="font-mono text-[10px] text-slate-400 mt-1 block">
            CONCURRENT_THREADS
          </span>
        </div>
      </div>

      {/* Row 1: Payload Trends & Success Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Payload Trends */}
        <div
          id="chart-payload-trends"
          className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden p-4 space-y-3"
        >
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
            <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              PAYLOAD_THROUGHPUT_TRENDS
            </span>
            <span className="font-mono text-[10px] text-[#64748B]">INTERVAL: {timeRange}</span>
          </div>

          <div className="h-64">
            {timeSeriesData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-mono text-xs">
                NO_TELEMETRY_LOGS_AVAILABLE
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="cobaltGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 2" stroke="#F1F5F9" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#94A3B8"
                    tick={{ fontSize: 10, fontFamily: "monospace" }}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    tick={{ fontSize: 10, fontFamily: "monospace" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "4px",
                      fontFamily: "monospace",
                      fontSize: "11px",
                      color: "#0F172A",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="payloadsSent"
                    stroke="#2563EB"
                    strokeWidth={1.5}
                    fill="url(#cobaltGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Success Rate Trends */}
        <div
          id="chart-success-rate"
          className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden p-4 space-y-3"
        >
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
            <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              SUCCESS_RATE_VARIANCE (%)
            </span>
            <span className="font-mono text-[10px] text-[#64748B]">THRESHOLD: 95%</span>
          </div>

          <div className="h-64">
            {timeSeriesData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-mono text-xs">
                NO_TELEMETRY_LOGS_AVAILABLE
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#F1F5F9" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#94A3B8"
                    tick={{ fontSize: 10, fontFamily: "monospace" }}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fontFamily: "monospace" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "4px",
                      fontFamily: "monospace",
                      fontSize: "11px",
                      color: "#0F172A",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="successRate"
                    stroke="#16A34A"
                    strokeWidth={2}
                    dot={{ r: 2, fill: "#16A34A" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Protocol Matrix, Latency Bar, and Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Protocol Distribution */}
        <div
          id="chart-protocols"
          className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden p-4 space-y-3"
        >
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
            <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              PROTOCOL_DISTRIBUTION
            </span>
            <span className="font-mono text-[10px] text-[#64748B]">NODES</span>
          </div>

          <div className="h-56">
            {protocolData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-mono text-xs">
                NO_PROJECT_CHANNELS
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={protocolData}
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    dataKey="value"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {protocolData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "4px",
                      fontFamily: "monospace",
                      fontSize: "11px",
                      color: "#0F172A",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Latency Trends */}
        <div
          id="chart-latency"
          className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden p-4 space-y-3"
        >
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
            <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              LATENCY_DISPERSION (MS)
            </span>
            <span className="font-mono text-[10px] text-[#64748B]">ROUNDTRIP</span>
          </div>

          <div className="h-56">
            {timeSeriesData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-mono text-xs">
                NO_LATENCY_DATA
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#F1F5F9" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#94A3B8"
                    tick={{ fontSize: 9, fontFamily: "monospace" }}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    tick={{ fontSize: 10, fontFamily: "monospace" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "4px",
                      fontFamily: "monospace",
                      fontSize: "11px",
                      color: "#0F172A",
                    }}
                  />
                  <Bar dataKey="avgLatency" fill="#475569" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Performance Summary */}
        <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
            <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              PERFORMANCE_SUMMARY
            </span>
            <span className="font-mono text-[10px] text-[#64748B]">AUDIT</span>
          </div>

          <div className="space-y-2 pt-1 font-mono text-xs">
            <div className="p-2.5 rounded border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <span className="text-[#64748B]">SUCCESSFUL_REACH:</span>
              <span className="font-bold text-emerald-700">
                {Math.round((totalPayloads * successRate) / 100)} ({successRate}%)
              </span>
            </div>

            <div className="p-2.5 rounded border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <span className="text-[#64748B]">FAILED_ANOMALIES:</span>
              <span className="font-bold text-rose-700">
                {Math.round((totalPayloads * (100 - successRate)) / 100)} (
                {(100 - successRate).toFixed(1)}%)
              </span>
            </div>

            <div className="p-2.5 rounded border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <span className="text-[#64748B]">AVG_RESPONSE_TIME:</span>
              <span className="font-bold text-[#0F172A]">{avgLatency}ms</span>
            </div>

            <div className="p-2.5 rounded border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <span className="text-[#64748B]">ENGINE_STATUS:</span>
              <span className="font-bold text-emerald-700">NOMINAL_OPERATING</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
