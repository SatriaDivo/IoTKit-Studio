"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Send,
  CheckCircle2,
  Plus,
  FolderKanban,
  Radio,
  Wifi,
  Globe,
  Terminal,
  RefreshCw,
  ExternalLink,
  Cpu,
  Layers,
} from "lucide-react";
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
  const [filterProtocol, setFilterProtocol] = useState<string>("ALL");

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
    const interval = setInterval(checkRunning, 4000);
    return () => clearInterval(interval);
  }, [projects]);

  const fetchRecentLogs = async () => {
    try {
      const response = await api.get("/logs", {
        params: { limit: 40, sort: "desc" },
      });
      if (response.data && Array.isArray(response.data)) {
        const logs: ActivityLog[] = response.data.map((log: any) => ({
          id: log.id,
          timestamp: log.timestamp || log.createdAt,
          project: log.projectName || log.project?.name || "Global Stream",
          protocol: log.protocol || "HTTP",
          payloadSize: log.payloadSize || "--",
          status: log.type === "error" || log.statusCode >= 400 ? "error" : "success",
          message: log.message || log.payload || "Payload dispatched",
        }));
        setRecentActivity(logs);
      }
    } catch (error) {
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
    } catch (error) {}
  };

  const protocolCounts = {
    MQTT: projects.filter((p) => p.protocol?.toUpperCase().includes("MQTT")).length,
    HTTP: projects.filter((p) => p.protocol?.toUpperCase().includes("HTTP")).length,
    WS: projects.filter((p) => p.protocol?.toUpperCase().includes("WS")).length,
  };

  const filteredLogs = recentActivity.filter((log) => {
    if (filterProtocol === "ALL") return true;
    if (filterProtocol === "ERROR") return log.status === "error";
    return log.protocol?.toUpperCase().includes(filterProtocol);
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">
          SYNCING_TELEMETRY...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Cockpit Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
              Mission Control
            </h1>
            <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              CLUSTER_ACTIVE
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5 font-mono">
            LIVE_DATA_STREAM // ENGINE: GO FIBER // MULTI-PROTOCOL SUITE
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadDashboardData()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium text-[#475569] bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            <span>SYNC</span>
          </button>
          <button
            onClick={() => router.push("/projects/new")}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] shadow-sm transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Node</span>
          </button>
        </div>
      </div>

      {/* Integrated Telemetry Instrument Bar (4 Cells Hairline Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-[#E2E8F0] rounded-md divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8F0] shadow-hairline overflow-hidden">
        {/* Cell 1: Total Nodes */}
        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              TOTAL_NODES
            </span>
            <FolderKanban className="h-3.5 w-3.5 text-[#94A3B8]" />
          </div>
          <div>
            <div className="font-mono text-3xl font-bold text-[#0F172A] tracking-tight tabular-nums">
              {projects.length.toString().padStart(2, "0")}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-[#64748B]">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span>CONFIGURED_PROJECTS</span>
            </div>
          </div>
        </div>

        {/* Cell 2: Active Simulations */}
        <div className="p-4 flex flex-col justify-between bg-slate-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              ACTIVE_SIMS
            </span>
            <Activity className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div>
            <div className="font-mono text-3xl font-bold text-[#0F172A] tracking-tight tabular-nums flex items-baseline gap-2">
              <span>{runningCount.toString().padStart(2, "0")}</span>
              <span className="text-xs font-normal text-[#64748B]">/ {projects.length}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono">
              {runningCount > 0 ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-700 font-semibold">STREAMING_LIVE</span>
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  <span className="text-[#64748B]">IDLE_STANDBY</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Cell 3: Payloads Sent */}
        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              PAYLOADS_SENT
            </span>
            <Send className="h-3.5 w-3.5 text-[#2563EB]" />
          </div>
          <div>
            <div className="font-mono text-3xl font-bold text-[#0F172A] tracking-tight tabular-nums">
              {totalPayloadsSent >= 1000000
                ? `${(totalPayloadsSent / 1000000).toFixed(2)}M`
                : totalPayloadsSent >= 1000
                ? `${(totalPayloadsSent / 1000).toFixed(1)}K`
                : totalPayloadsSent}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-[#64748B]">
              <span className="text-[#2563EB]">●</span>
              <span>TOTAL_DISPATCHED</span>
            </div>
          </div>
        </div>

        {/* Cell 4: Success Ratio */}
        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              SUCCESS_RATE
            </span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div>
            <div className="font-mono text-3xl font-bold text-[#0F172A] tracking-tight tabular-nums flex items-baseline gap-1">
              <span>{totalPayloadsSent > 0 ? successRate : "100.0"}</span>
              <span className="text-sm font-semibold text-[#64748B]">%</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono">
              {successRate >= 95 || totalPayloadsSent === 0 ? (
                <span className="text-emerald-700 font-medium">OPTIMAL_REACH</span>
              ) : (
                <span className="text-amber-700 font-medium">ANOMALIES_DETECTED</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Protocol Matrix & Live Telemetry Teleprinter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Protocol Channel Status (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-[#0F172A]" />
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  PROTOCOL_BUS
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#64748B]">
                3 CHANNELS
              </span>
            </div>

            <div className="p-3.5 space-y-3">
              {/* MQTT Channel */}
              <div
                onClick={() => router.push("/mqtt-inspector")}
                className="p-3 rounded border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100/60 hover:border-[#CBD5E1] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-emerald-100 text-emerald-800">
                      <Radio className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-mono text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                        <span>MQTT / MQTTS</span>
                        <span className="text-[10px] text-[#64748B] font-normal">
                          PORT 1883
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-0.5 font-mono">
                        BROKER_PUBSUB // QoS 0,1,2
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-base font-bold text-[#0F172A]">
                      {protocolCounts.MQTT}
                    </span>
                    <span className="block text-[10px] font-mono text-[#64748B]">
                      NODES
                    </span>
                  </div>
                </div>
              </div>

              {/* HTTP Channel */}
              <div
                onClick={() => router.push("/projects")}
                className="p-3 rounded border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100/60 hover:border-[#CBD5E1] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-blue-100 text-blue-800">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-mono text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                        <span>HTTP / REST</span>
                        <span className="text-[10px] text-[#64748B] font-normal">
                          PORT 80/443
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-0.5 font-mono">
                        POST/PUT PAYLOADS
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-base font-bold text-[#0F172A]">
                      {protocolCounts.HTTP}
                    </span>
                    <span className="block text-[10px] font-mono text-[#64748B]">
                      NODES
                    </span>
                  </div>
                </div>
              </div>

              {/* WebSocket Channel */}
              <div
                onClick={() => router.push("/projects")}
                className="p-3 rounded border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100/60 hover:border-[#CBD5E1] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-teal-100 text-teal-800">
                      <Wifi className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-mono text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                        <span>WS / WSS</span>
                        <span className="text-[10px] text-[#64748B] font-normal">
                          BIDIRECTIONAL
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-0.5 font-mono">
                        SOCKET_STREAM
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-base font-bold text-[#0F172A]">
                      {protocolCounts.WS}
                    </span>
                    <span className="block text-[10px] font-mono text-[#64748B]">
                      NODES
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Link Footer */}
            <div className="px-4 py-2.5 border-t border-[#E2E8F0] bg-white flex items-center justify-between text-xs font-mono text-[#475569]">
              <span>CORE_GATEWAY: GO_FIBER</span>
              <button
                onClick={() => router.push("/analytics")}
                className="text-[#2563EB] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Full Telemetry</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Telemetry Teleprinter / Log Feed (8 cols) */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden h-full flex flex-col">
            {/* Teleprinter Header */}
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#0F172A]" />
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  TELEMETRY_STREAM
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                  {filteredLogs.length} LOGS
                </span>
              </div>

              {/* Protocol Filters */}
              <div className="flex items-center gap-1 font-mono text-[11px]">
                {["ALL", "MQTT", "HTTP", "WS", "ERROR"].map((proto) => (
                  <button
                    key={proto}
                    onClick={() => setFilterProtocol(proto)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                      filterProtocol === proto
                        ? "bg-[#0F172A] text-white"
                        : "text-[#64748B] hover:bg-slate-200"
                    }`}
                  >
                    {proto}
                  </button>
                ))}
              </div>
            </div>

            {/* Log Stream Content */}
            <div className="flex-1 overflow-x-auto min-h-[320px] max-h-[460px] overflow-y-auto divide-y divide-[#F1F5F9] font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-10 text-[#94A3B8] font-mono space-y-2">
                  <Terminal className="h-8 w-8 opacity-25" />
                  <p className="text-xs uppercase tracking-wider">
                    NO_TELEMETRY_LOGS_CAPTURED
                  </p>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Start a simulation in Projects to begin streaming sensor payloads.
                  </p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Timestamp */}
                      <span className="text-[11px] text-[#94A3B8] tabular-nums shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>

                      {/* Protocol Pill */}
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                          log.protocol?.includes("MQTT")
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : log.protocol?.includes("WS")
                            ? "bg-teal-50 text-teal-800 border border-teal-200"
                            : "bg-blue-50 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {log.protocol}
                      </span>

                      {/* Project Name */}
                      <span className="text-xs font-semibold text-[#0F172A] truncate max-w-[140px]">
                        {log.project}
                      </span>

                      {/* Message / Payload Preview */}
                      <span className="text-xs text-[#64748B] truncate max-w-[260px] hidden md:inline">
                        {log.message}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Status */}
                      {log.status === "success" ? (
                        <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          ACK_OK
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          FAIL
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Monitor Bar */}
            <div className="px-4 py-2 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between text-[11px] font-mono text-[#64748B]">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>POLLING_INTERVAL: 4000ms</span>
              </div>
              <button
                onClick={() => router.push("/logs")}
                className="text-[#2563EB] hover:underline font-semibold"
              >
                View Full Audit Logs →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
