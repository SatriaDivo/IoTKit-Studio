"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Edit, Play, Square, Radio, Globe, Wifi, Cpu, Layers } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { usePopupStore } from "@/store/popupStore";

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, fetchProjects, deleteProject } = useProjectStore();
  const [loading, setLoading] = useState(true);
  const [runningProjects, setRunningProjects] = useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [projectStatus, setProjectStatus] = useState<Record<string, "idle" | "running" | "stopped">>({});
  const intervalsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const idleTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const confirm = usePopupStore((state) => state.confirm);

  useEffect(() => {
    fetchProjects().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (projects.length === 0) return;

    projects.forEach((project) => {
      fetchProjectSimStatus(project.id);
    });

    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
      Object.values(idleTimersRef.current).forEach(clearTimeout);
      intervalsRef.current = {};
      idleTimersRef.current = {};
    };
  }, [projects.length]);

  const setIdleAfterDelay = (projectId: string) => {
    if (idleTimersRef.current[projectId]) {
      clearTimeout(idleTimersRef.current[projectId]);
    }
    idleTimersRef.current[projectId] = setTimeout(() => {
      setProjectStatus((prev) => ({ ...prev, [projectId]: "idle" }));
      fetchProjects();
      delete idleTimersRef.current[projectId];
    }, 10000);
  };

  const fetchProjectSimStatus = async (projectId: string) => {
    try {
      const res = await api.get(`/simulations/status/${projectId}`);
      const isRunning = res.data.isRunning;
      setRunningProjects((prev) => ({ ...prev, [projectId]: isRunning }));
      setProjectStatus((prev) => ({
        ...prev,
        [projectId]: isRunning ? "running" : "idle",
      }));
      if (isRunning) startPolling(projectId);
    } catch {
      setRunningProjects((prev) => ({ ...prev, [projectId]: false }));
      setProjectStatus((prev) => ({ ...prev, [projectId]: "idle" }));
    }
  };

  const startPolling = (projectId: string) => {
    if (intervalsRef.current[projectId]) return;

    intervalsRef.current[projectId] = setInterval(async () => {
      try {
        const res = await api.get(`/simulations/status/${projectId}`);
        const isRunning = res.data.isRunning;
        setRunningProjects((prev) => ({ ...prev, [projectId]: isRunning }));
        if (!isRunning) {
          setProjectStatus((prev) => ({ ...prev, [projectId]: "stopped" }));
          setIdleAfterDelay(projectId);
          clearInterval(intervalsRef.current[projectId]);
          delete intervalsRef.current[projectId];
        }
      } catch {
        clearInterval(intervalsRef.current[projectId]);
        delete intervalsRef.current[projectId];
      }
    }, 4000);
  };

  const stopPolling = (projectId: string) => {
    if (intervalsRef.current[projectId]) {
      clearInterval(intervalsRef.current[projectId]);
      delete intervalsRef.current[projectId];
    }
  };

  const handleStart = async (projectId: string) => {
    setActionLoading((prev) => ({ ...prev, [projectId]: true }));
    try {
      const payloadRes = await api.get(`/payloads/project/${projectId}`);
      const payloads = payloadRes.data;

      if (!payloads || payloads.length === 0) {
        toast.error("No payload structure found. Redirecting to configuration...");
        setActionLoading((prev) => ({ ...prev, [projectId]: false }));
        router.push(`/projects/${projectId}`);
        return;
      }

      const latestPayload = payloads[0];
      let structure = JSON.parse(latestPayload.structure);

      const savedUseDataset = localStorage.getItem(`useDataset_${projectId}`);
      const savedDatasetId = localStorage.getItem(`selectedDatasetId_${projectId}`);

      if (savedUseDataset === "true" && savedDatasetId) {
        const staticFields = Array.isArray(structure)
          ? structure.filter((f: any) => f.mode === "static")
          : [];
        structure = [
          ...staticFields,
          {
            name: "__dataset_mode__",
            type: "string",
            mode: "static",
            value: savedDatasetId,
            required: true,
          },
        ];
      }

      let interval = 1000;
      let batchSize = 1;
      let swarmMode = false;
      let swarmCount = 100;
      let stages = [{ duration: 30, target: 100 }];
      let chaosMode = false;
      let chaosProbability = 5;
      let chaosFields: string[] = [];

      const savedSettings = localStorage.getItem(`simSettings_${projectId}`);
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          interval = (parseFloat(parsed.interval) || 1) * 1000;
          batchSize = parseInt(parsed.batchSize) || 1;
          swarmMode = parsed.swarmMode || false;
          swarmCount = parsed.swarmCount || 100;
          stages = parsed.stages || stages;
          chaosMode = parsed.chaosMode || false;
          chaosProbability = parsed.chaosProbability || 5;
          chaosFields = parsed.chaosFields || [];
        } catch (e) {}
      }

      await api.post("/simulations/start", {
        projectId,
        payloadStructure: structure,
        interval,
        batchSize,
        swarmMode,
        swarmCount,
        stages: stages.map((s: any) => ({
          duration: parseInt(s.duration) || 0,
          target: parseInt(s.target) || 0,
        })),
        chaosMode,
        chaosProbability,
        chaosFields,
      });

      setRunningProjects((prev) => ({ ...prev, [projectId]: true }));
      setProjectStatus((prev) => ({ ...prev, [projectId]: "running" }));
      toast.success("Simulation stream started");
      startPolling(projectId);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to start simulation");
    } finally {
      setActionLoading((prev) => ({ ...prev, [projectId]: false }));
    }
  };

  const handleStop = async (projectId: string) => {
    setActionLoading((prev) => ({ ...prev, [projectId]: true }));
    try {
      await api.post("/simulations/stop", { projectId });
      setRunningProjects((prev) => ({ ...prev, [projectId]: false }));
      setProjectStatus((prev) => ({ ...prev, [projectId]: "stopped" }));
      setIdleAfterDelay(projectId);
      stopPolling(projectId);
      toast.success("Simulation stream stopped");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to stop simulation");
    } finally {
      setActionLoading((prev) => ({ ...prev, [projectId]: false }));
    }
  };

  const getProtocolBadge = (protocol: string) => {
    const p = protocol?.toUpperCase() || "";
    if (p.includes("MQTT")) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
          <Radio className="h-2.5 w-2.5" />
          {p}
        </span>
      );
    }
    if (p.includes("WS")) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
          <Wifi className="h-2.5 w-2.5" />
          {p}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
        <Globe className="h-2.5 w-2.5" />
        {p}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">
          FETCHING_NODES...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
              Simulation Nodes
            </h1>
            <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
              {projects.length} NODES
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5 font-mono">
            MANAGE_ENDPOINTS // CONFIGURE_PAYLOADS // TRIGGER_SIMULATIONS
          </p>
        </div>

        <button
          onClick={() => router.push("/projects/new")}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Simulation Node</span>
        </button>
      </div>

      {/* Grid of Simulation Nodes */}
      {projects.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#E2E8F0] rounded-md shadow-hairline">
          <Cpu className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-mono text-sm font-bold text-[#0F172A] uppercase tracking-wider">
            NO_NODES_CONFIGURED
          </h3>
          <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto font-sans">
            Create your first IoT node to start dispatching HTTP requests, publishing MQTT telemetry, or streaming WebSockets.
          </p>
          <button
            onClick={() => router.push("/projects/new")}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] shadow-sm transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create First Node</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const isRunning = runningProjects[project.id] ?? false;
            const isLoading = actionLoading[project.id] ?? false;
            const status = projectStatus[project.id] ?? "idle";

            return (
              <div
                key={project.id}
                className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-md shadow-hairline flex flex-col justify-between transition-all"
              >
                {/* Node Card Header */}
                <div className="p-4 border-b border-[#F1F5F9]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getProtocolBadge(project.protocol)}
                        {isRunning ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            LIVE
                          </span>
                        ) : status === "stopped" ? (
                          <span className="font-mono text-[10px] font-medium text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                            STOPPED
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200">
                            STANDBY
                          </span>
                        )}
                      </div>
                      <h3
                        onClick={() => router.push(`/projects/${project.id}`)}
                        className="font-bold text-sm text-[#0F172A] truncate hover:text-[#2563EB] cursor-pointer transition-colors"
                      >
                        {project.name}
                      </h3>
                      <p className="text-xs text-[#64748B] mt-0.5 line-clamp-1">
                        {project.description || "No description provided."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Node Metadata Table (Monospace tabular) */}
                <div className="p-4 space-y-2 text-xs font-mono bg-[#F8FAFC]/50 flex-1">
                  <div className="flex items-center justify-between text-[#64748B]">
                    <span>HOST / TARGET:</span>
                    <span className="text-[#0F172A] font-semibold truncate max-w-[170px]">
                      {project.host || "localhost"}
                    </span>
                  </div>

                  {project.topic && (
                    <div className="flex items-center justify-between text-[#64748B]">
                      <span>MQTT_TOPIC:</span>
                      <span className="text-emerald-700 font-semibold truncate max-w-[170px]">
                        {project.topic}
                      </span>
                    </div>
                  )}

                  {project.endpoint && (
                    <div className="flex items-center justify-between text-[#64748B]">
                      <span>ENDPOINT:</span>
                      <span className="text-[#2563EB] font-semibold truncate max-w-[170px]">
                        {project.endpoint}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[#64748B]">
                    <span>LAST_EVENT:</span>
                    <span className="text-slate-600 text-[11px]">
                      {project.lastActivity ? formatDate(project.lastActivity) : "NEVER"}
                    </span>
                  </div>
                </div>

                {/* Node Actions Bar */}
                <div className="p-3 border-t border-[#E2E8F0] bg-white flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/projects/${project.id}`)}
                    className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-medium px-3 py-1.5 rounded border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC] transition-colors"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Config</span>
                  </button>

                  {!isRunning ? (
                    <button
                      onClick={() => handleStart(project.id)}
                      disabled={isLoading}
                      className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded bg-[#0F172A] text-white hover:bg-[#1E293B] disabled:opacity-50 transition-all shadow-xs"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>{isLoading ? "Starting..." : "Start"}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStop(project.id)}
                      disabled={isLoading}
                      className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-all shadow-xs"
                    >
                      <Square className="h-3 w-3 fill-current" />
                      <span>{isLoading ? "Stopping..." : "Halt"}</span>
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      const ok = await confirm(
                        `Delete simulation node "${project.name}" permanently?`,
                        "Delete Node"
                      );
                      if (ok) deleteProject(project.id);
                    }}
                    className="p-1.5 rounded text-[#94A3B8] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Node"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
