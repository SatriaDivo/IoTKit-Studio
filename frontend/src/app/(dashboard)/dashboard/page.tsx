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
  ChevronRight,
} from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";

interface ActivityLog {
  id: string;
  timestamp: string;
  project: string;
  projectId: string;
  protocol: string;
  payloadSize: string;
  status: "success" | "error";
  statusCode?: number;
  latency?: number;
  message: string;
}

function formatTime(isoStr: string) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString("en-GB", { hour12: false });
  } catch {
    return "--:--:--";
  }
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [filterProtocol, setFilterProtocol] = useState<string>("ALL");
  const [projectStatuses, setProjectStatuses] = useState<
    Record<string, { isRunning: boolean; totalSent: number }>
  >({});

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

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await Promise.all([
        fetchProjects(),
        fetchRecentLogs(),
        fetchSimulationStats(),
      ]);
    } catch (e) {
      console.error("Manual sync error:", e);
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  useEffect(() => {
    if (projects.length === 0) return;

    const checkRunning = async () => {
      let count = 0;
      let totalSent = 0;
      let totalSuccess = 0;
      const statuses: Record<string, { isRunning: boolean; totalSent: number }> = {};

      await Promise.all(
        projects.map(async (p) => {
          try {
            const res = await api.get(`/simulations/status/${p.id}`);
            const isRun = Boolean(res.data.isRunning);
            const sent =
              res.data.stats?.totalSent || res.data.simulation?.totalSent || 0;
            statuses[p.id] = { isRunning: isRun, totalSent: sent };
            if (isRun) count++;
            if (res.data.stats) {
              totalSent += res.data.stats.totalSent || 0;
              totalSuccess += res.data.stats.successCount || 0;
            }
          } catch {
            statuses[p.id] = { isRunning: false, totalSent: 0 };
          }
        })
      );

      setProjectStatuses(statuses);
      setRunningCount(count);

      // Complement with global stats if needed
      try {
        const statsRes = await api.get("/simulations/stats");
        if (statsRes.data && statsRes.data.totalSent > totalSent) {
          totalSent = statsRes.data.totalSent;
          totalSuccess = statsRes.data.successCount;
        }
      } catch {}

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
        params: { limit: 50, sort: "desc" },
      });
      if (response.data && Array.isArray(response.data)) {
        const logs: ActivityLog[] = response.data.map((log: any) => ({
          id: log.id,
          timestamp: log.timestamp || log.createdAt,
          project:
            log.project?.name ||
            log.projectName ||
            useProjectStore.getState().projects.find((p) => p.id === log.projectId)?.name ||
            "Node Telemetry",
          projectId: log.projectId,
          protocol: log.protocol || "HTTP",
          payloadSize: log.payloadSize || "--",
          status:
            log.type === "error" || (log.statusCode && log.statusCode >= 400)
              ? "error"
              : "success",
          statusCode: log.statusCode,
          latency: log.latency,
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
            <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              CLUSTER_ACTIVE
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5 font-mono">
            LIVE_DATA_STREAM // MULTI-PROTOCOL INDUSTRIAL SUITE
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium text-[#475569] bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] transition-colors active:scale-95 disabled:opacity-50"
            title="Refresh stream & simulation metrics"
          >
            <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
            <span>SYNC</span>
          </button>
          <button
            onClick={() => router.push("/projects/new")}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] shadow-sm transition-all active:translate-y-[1px]"
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
        <div className="p-4 flex flex-col justify-between bg-slate-50/20">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              ACTIVE_SIMS
            </span>
            <Activity className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div>
            <div className="font-mono text-3xl font-bold text-[#0F172A] tracking-tight tabular-nums flex items-baseline gap-1.5">
              <span>{runningCount.toString().padStart(2, "0")}</span>
              <span className="text-xs font-normal text-[#64748B]">
                / {projects.length} ACTIVE
              </span>
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
              {totalPayloadsSent.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-[#64748B]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
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
            <div className="font-mono text-3xl font-bold text-[#0F172A] tracking-tight tabular-nums flex items-baseline">
              <span>{totalPayloadsSent > 0 ? successRate : "100.0"}</span>
              <span className="text-sm font-semibold text-[#64748B] ml-0.5">%</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono">
              {successRate >= 95 || totalPayloadsSent === 0 ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-emerald-700 font-medium">OPTIMAL_REACH</span>
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span className="text-amber-700 font-medium">ANOMALIES_DETECTED</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Protocol Matrix & Live Telemetry Teleprinter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Protocol Channel Status + Node Registry (5 cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col">
          {/* Card 1: Protocol Bus */}
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-[#0F172A]" />
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  PROTOCOL_BUS
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#64748B] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                3 CHANNELS ACTIVE
              </span>
            </div>

            <div className="p-3 space-y-2">
              {/* MQTT Channel */}
              <div
                onClick={() => router.push("/mqtt-inspector")}
                className="p-2.5 rounded border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100/60 hover:border-[#CBD5E1] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-emerald-100 text-emerald-800">
                      <Radio className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="font-mono text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                        <span>MQTT / MQTTS</span>
                        <span className="text-[10px] text-[#64748B] font-normal">
                          PORT 1883
                        </span>
                      </div>
                      <p className="text-[10px] text-[#64748B] font-mono mt-0.5">
                        BROKER_PUBSUB // QoS 0,1,2
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#0F172A]">
                      {protocolCounts.MQTT} NODES
                    </span>
                  </div>
                </div>
              </div>

              {/* HTTP Channel */}
              <div
                onClick={() => router.push("/projects")}
                className="p-2.5 rounded border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100/60 hover:border-[#CBD5E1] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-blue-100 text-blue-800">
                      <Globe className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="font-mono text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                        <span>HTTP / REST</span>
                        <span className="text-[10px] text-[#64748B] font-normal">
                          PORT 80/443
                        </span>
                      </div>
                      <p className="text-[10px] text-[#64748B] font-mono mt-0.5">
                        POST/PUT PAYLOAD ENGINE
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#0F172A]">
                      {protocolCounts.HTTP} NODES
                    </span>
                  </div>
                </div>
              </div>

              {/* WebSocket Channel */}
              <div
                onClick={() => router.push("/projects")}
                className="p-2.5 rounded border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100/60 hover:border-[#CBD5E1] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-teal-100 text-teal-800">
                      <Wifi className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="font-mono text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                        <span>WS / WSS</span>
                        <span className="text-[10px] text-[#64748B] font-normal">
                          BIDIRECTIONAL
                        </span>
                      </div>
                      <p className="text-[10px] text-[#64748B] font-mono mt-0.5">
                        SOCKET_STREAM EMITTER
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#0F172A]">
                      {protocolCounts.WS} NODES
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Link Footer */}
            <div className="px-4 py-2 border-t border-[#E2E8F0] bg-white flex items-center justify-between text-[11px] font-mono text-[#64748B]">
              <span>TELEMETRY_STREAM: ACTIVE</span>
              <button
                onClick={() => router.push("/analytics")}
                className="text-[#2563EB] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Full Telemetry</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Card 2: Configured Node Registry (Balances Left & Right Columns!) */}
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden flex-1 flex flex-col">
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5 text-[#0F172A]" />
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  NODE_REGISTRY
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                  {projects.length} NODES
                </span>
              </div>
              <button
                onClick={() => router.push("/projects")}
                className="text-xs font-mono text-[#2563EB] hover:underline font-semibold flex items-center gap-1"
              >
                <span>ALL_NODES</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            <div className="p-2.5 divide-y divide-[#F1F5F9] overflow-y-auto max-h-[260px] flex-1">
              {projects.length === 0 ? (
                <div className="p-8 text-center text-[#94A3B8] font-mono text-xs space-y-1">
                  <FolderKanban className="h-6 w-6 mx-auto opacity-30 mb-2" />
                  <p className="font-bold uppercase tracking-wider">NO_NODES_CONFIGURED</p>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Create an IoT project node to start dispatching telemetry.
                  </p>
                </div>
              ) : (
                projects.map((project) => {
                  const isRun = projectStatuses[project.id]?.isRunning;
                  const totalSent = projectStatuses[project.id]?.totalSent || 0;

                  return (
                    <div
                      key={project.id}
                      onClick={() => router.push(`/projects/${project.id}`)}
                      className="py-2.5 px-2 flex items-center justify-between hover:bg-[#F8FAFC] rounded transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            isRun ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#0F172A] truncate max-w-[140px]">
                              {project.name}
                            </span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 uppercase shrink-0">
                              {project.protocol}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-[#64748B] truncate max-w-[180px] mt-0.5">
                            {project.endpoint ||
                              project.topic ||
                              `${project.host}:${project.port || "default"}`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-2">
                        {isRun && totalSent > 0 && (
                          <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                            {totalSent.toLocaleString()} TX
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                            isRun
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {isRun ? "STREAMING" : "IDLE"}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Telemetry Teleprinter / Log Feed (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden h-[580px] flex flex-col">
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
                <span className="flex h-1.5 w-1.5 relative ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
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

            {/* Sub-Header Column Labels for Precision Monospace Alignment */}
            <div className="px-4 py-1.5 bg-[#F1F5F9]/70 border-b border-[#E2E8F0] flex items-center justify-between font-mono text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="w-16 shrink-0">TIMESTAMP</span>
                <span className="w-12 shrink-0">PROTO</span>
                <span className="w-28 shrink-0">NODE_SOURCE</span>
                <span className="flex-1 min-w-0">PAYLOAD_DISPATCH / EVENT</span>
              </div>
              <div className="flex items-center gap-4 shrink-0 pr-1">
                <span className="hidden sm:inline">LATENCY</span>
                <span>STATUS</span>
              </div>
            </div>

            {/* Log Stream Content */}
            <div className="flex-1 overflow-x-auto overflow-y-auto divide-y divide-[#F1F5F9] font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-10 text-[#94A3B8] font-mono space-y-2">
                  <Terminal className="h-8 w-8 opacity-25" />
                  <p className="text-xs uppercase tracking-wider font-bold">
                    NO_TELEMETRY_LOGS_CAPTURED
                  </p>
                  <p className="text-[11px] text-slate-400 font-sans text-center max-w-sm">
                    Start a simulation in Projects to begin streaming real-time sensor payloads.
                  </p>
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const isSuccess = log.status === "success";
                  const cleanMsg = log.message.replace(/^[→\->]\s*/, "");

                  return (
                    <div
                      key={log.id}
                      className="px-4 py-2 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors"
                    >
                      {/* Left: Time, Protocol, Node, Message */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Timestamp */}
                        <span className="text-[11px] text-[#94A3B8] tabular-nums shrink-0 w-16">
                          {formatTime(log.timestamp)}
                        </span>

                        {/* Protocol Pill */}
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 border w-12 text-center ${
                            log.protocol?.toUpperCase().includes("MQTT")
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : log.protocol?.toUpperCase().includes("WS")
                              ? "bg-teal-50 text-teal-800 border-teal-200"
                              : "bg-blue-50 text-blue-800 border-blue-200"
                          }`}
                        >
                          {log.protocol}
                        </span>

                        {/* Project / Node Name */}
                        <span
                          className="text-xs font-semibold text-[#0F172A] shrink-0 truncate w-28"
                          title={log.project}
                        >
                          {log.project}
                        </span>

                        {/* Message / Payload Preview */}
                        <span
                          className="text-xs text-[#64748B] truncate flex-1 min-w-0"
                          title={cleanMsg}
                        >
                          {cleanMsg}
                        </span>
                      </div>

                      {/* Right: Metrics & Status Badges */}
                      <div className="flex items-center gap-2 shrink-0">
                        {log.latency != null && (
                          <span className="text-[11px] text-[#64748B] tabular-nums hidden sm:inline">
                            {log.latency}ms
                          </span>
                        )}

                        {log.statusCode != null && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border tabular-nums ${
                              log.statusCode < 400
                                ? "bg-slate-100 text-slate-700 border-slate-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {log.statusCode}
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                            isSuccess
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {isSuccess ? "ACK_OK" : "FAIL"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Monitor Bar */}
            <div className="px-4 py-2 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between text-[11px] font-mono text-[#64748B]">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>POLLING_INTERVAL: 4000ms // BUFFER: 50 ENTRIES</span>
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
