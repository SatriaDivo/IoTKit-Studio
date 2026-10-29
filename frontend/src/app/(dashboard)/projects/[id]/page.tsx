"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Play,
  Square,
  Plus,
  Trash2,
  Upload,
  Radio,
  Globe,
  Wifi,
  Terminal,
  Activity,
  Zap,
  Sliders,
  Database,
  FileCode,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  Send,
  Cpu,
  RefreshCw,
  ExternalLink,
  Download,
  FileSpreadsheet,
  Sparkles,
  X,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { PayloadField } from "@/types";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { io } from "socket.io-client";
import { parseHostInput } from "@/lib/utils";

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { currentProject, fetchProject } = useProjectStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationStats, setSimulationStats] = useState<any>(null);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastTotalSentRef = useRef<number>(0);
  const [lastSentPayload, setLastSentPayload] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [activeTab, setActiveTab] = useState<"builder" | "simulation" | "config">("builder");
  const [copiedPayload, setCopiedPayload] = useState(false);

  const [datasets, setDatasets] = useState<any[]>([]);
  const [useDataset, setUseDataset] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`useDataset_${params?.id}`);
      if (saved) return saved === "true";
    }
    return false;
  });

  const [selectedDatasetId, setSelectedDatasetId] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`selectedDatasetId_${params?.id}`);
      if (saved) return saved;
    }
    return "";
  });

  const [projectData, setProjectData] = useState({
    name: "",
    description: "",
    protocol: "",
    host: "",
    port: "",
    endpoint: "",
    topic: "",
    authToken: "",
    username: "",
    password: "",
  });

  const [headerItems, setHeaderItems] = useState<{ key: string; value: string }[]>([]);

  // Generate Synthetic Dataset State
  const [showGenerateDatasetModal, setShowGenerateDatasetModal] = useState(false);
  const [generatingDataset, setGeneratingDataset] = useState(false);
  const [genRows, setGenRows] = useState(500);
  const [genSaveToVault, setGenSaveToVault] = useState(true);
  const [genDatasetName, setGenDatasetName] = useState("");
  const [genModuleName, setGenModuleName] = useState("telemetry");

  const [payloadFields, setPayloadFields] = useState<PayloadField[]>([
    {
      name: "temperature",
      type: "number",
      mode: "random",
      min: 20,
      max: 30,
      unit: "°C",
      required: true,
    },
  ]);

  const [simulationSettings, setSimulationSettings] = useState(() => {
    const defaultSettings = {
      interval: 1,
      batchSize: 1,
      duration: 0,
      swarmMode: false,
      swarmCount: 100,
      stages: [{ duration: 30, target: 100 }],
      chaosMode: false,
      chaosProbability: 5,
      chaosFields: [] as string[],
    };

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`simSettings_${params?.id}`);
      if (saved) {
        try {
          return { ...defaultSettings, ...JSON.parse(saved) };
        } catch (e) {}
      }
    }
    return defaultSettings;
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const projectIdRef = useRef<string>("");

  const clearPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startPolling = (projectId: string) => {
    clearPolling();
    intervalRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/simulations/status/${projectId}`);
        const { isRunning, stats } = res.data;
        if (stats) setSimulationStats(stats);
        if (!isRunning) {
          setIsSimulationRunning(false);
          clearPolling();
        }
      } catch (err: any) {
        if (err.response?.status === 404 || err.response?.status === 401) {
          setIsSimulationRunning(false);
          clearPolling();
        }
      }
    }, 4000);
  };

  useEffect(() => {
    if (params.id && simulationSettings) {
      localStorage.setItem(`simSettings_${params.id}`, JSON.stringify(simulationSettings));
    }
  }, [simulationSettings, params.id]);

  useEffect(() => {
    if (params?.id) {
      localStorage.setItem(`useDataset_${params.id}`, String(useDataset));
    }
  }, [useDataset, params?.id]);

  useEffect(() => {
    if (params?.id && selectedDatasetId) {
      localStorage.setItem(`selectedDatasetId_${params.id}`, selectedDatasetId);
    }
  }, [selectedDatasetId, params?.id]);

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;

    projectIdRef.current = id;
    fetchProject(id)
      .then((proj) => {
        if (proj) {
          setProjectData({
            name: proj.name || "",
            description: proj.description || "",
            protocol: proj.protocol || "",
            host: proj.host || "",
            port: proj.port?.toString() || "",
            endpoint: proj.endpoint || "",
            topic: proj.topic || "",
            username: proj.username || "",
            password: proj.password || "",
            authToken: proj.authToken || "",
          });

          if (proj.headers) {
            try {
              const parsed = JSON.parse(proj.headers);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setHeaderItems(parsed);
              }
            } catch (e) {}
          }
        }
      })
      .finally(() => setLoading(false));

    api
      .get(`/payloads/project/${id}`)
      .then(({ data }) => {
        if (data && data.length > 0) {
          try {
            const structure = JSON.parse(data[0].structure);
            if (Array.isArray(structure) && structure.length > 0) {
              setPayloadFields(structure);
              setHasUnsavedChanges(false);
            }
          } catch {}
        }
      })
      .catch(() => {});

    api
      .get("/datasets")
      .then(({ data }) => {
        const loadedDatasets = data.datasets || [];
        setDatasets(loadedDatasets);
        setSelectedDatasetId((prev) => {
          if (prev && !loadedDatasets.find((x: any) => x.id === prev)) return "";
          return prev;
        });
      })
      .catch(() => {});

    api
      .get(`/simulations/status/${id}`)
      .then(({ data }) => {
        setIsSimulationRunning(data.isRunning);
        if (data.stats) setSimulationStats(data.stats);
        if (data.isRunning) {
          startPolling(id);
          const intervalSec = parseFloat(simulationSettings.interval as any) || 1;
          startCountdown(intervalSec);
        }
      })
      .catch(() => {
        setIsSimulationRunning(false);
      });

    return () => {
      clearPolling();
      stopCountdown();
    };
  }, [params.id]);

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    let socket: any = null;
    let ws: WebSocket | null = null;
    let active = true;

    const initConnection = async () => {
      try {
        const healthRes = await fetch(`${API_URL}/health`)
          .then((res) => res.json())
          .catch(() => ({}));

        const isWsSupported = healthRes.status === "ok";

        if (isWsSupported) {
          const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
          const wsUrl = `${API_URL.replace(/^http/, "ws")}/ws?token=${encodeURIComponent(token)}`;
          ws = new WebSocket(wsUrl);

          ws.onopen = () => {
            if (!active) return;
            ws?.send(
              JSON.stringify({
                action: "subscribe",
                projectId: id,
              })
            );
          };

          ws.onmessage = (event) => {
            if (!active) return;
            try {
              const msg = JSON.parse(event.data);
              if (msg.event === "payloadSent" && msg.data) {
                const data = msg.data;
                if (data.result) {
                  const isSuccess = data.result.success;
                  let responseData = data.result.data;

                  if (responseData === undefined) {
                    responseData = isSuccess
                      ? "Payload sent successfully (no response data)"
                      : data.result.error || "Request failed (no response data)";
                  }

                  setLastSentPayload(data.payload);
                  setLastResponse({
                    type: isSuccess ? "success" : "error",
                    data: responseData,
                    statusCode: data.result.statusCode,
                    latency: data.result.latency,
                    timestamp: new Date().toISOString(),
                  });
                }
              } else if (msg.event === "payloadError" && msg.data) {
                setLastResponse({
                  type: "error",
                  error: msg.data.error,
                  timestamp: new Date().toISOString(),
                });
              }
            } catch (e) {}
          };
        } else {
          socket = io(API_URL);

          socket.on("connect", () => {
            socket.emit("subscribe", id);
          });

          socket.on("payloadSent", (data: any) => {
            if (!active) return;
            if (data.result) {
              const isSuccess = data.result.success;
              let responseData = data.result.data;

              if (responseData === undefined) {
                responseData = isSuccess
                  ? "Payload sent successfully (no response data)"
                  : data.result.error || "Request failed (no response data)";
              }

              setLastSentPayload(data.payload);
              setLastResponse({
                type: isSuccess ? "success" : "error",
                data: responseData,
                statusCode: data.result.statusCode,
                latency: data.result.latency,
                timestamp: new Date().toISOString(),
              });
            }
          });

          socket.on("payloadError", (data: any) => {
            if (!active) return;
            setLastResponse({
              type: "error",
              error: data.error,
              timestamp: new Date().toISOString(),
            });
          });
        }
      } catch (err) {}
    };

    initConnection();

    return () => {
      active = false;
      if (ws) ws.close();
      if (socket) {
        socket.emit("unsubscribe", id);
        socket.disconnect();
      }
    };
  }, [params.id]);

  const addPayloadField = () => {
    setPayloadFields([
      ...payloadFields,
      {
        name: `metric_${payloadFields.length + 1}`,
        type: "number",
        mode: "random",
        min: 0,
        max: 100,
        unit: "",
        value: "",
        required: false,
      },
    ]);
    setHasUnsavedChanges(true);
  };

  const removePayloadField = (index: number) => {
    setPayloadFields(payloadFields.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const updatePayloadField = (index: number, updates: Partial<PayloadField>) => {
    setPayloadFields(
      payloadFields.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
    setHasUnsavedChanges(true);
  };

  const saveProjectConfig = async () => {
    setSaving(true);
    try {
      await api.put(`/projects/${params.id}`, {
        name: projectData.name,
        description: projectData.description,
        protocol: projectData.protocol,
        host: projectData.host,
        port: projectData.port ? parseInt(projectData.port) : null,
        endpoint: projectData.endpoint,
        topic: projectData.topic || null,
        authToken: projectData.authToken || null,
        headers:
          headerItems.length > 0
            ? JSON.stringify(headerItems.filter((h) => h.key.trim() !== ""))
            : null,
        username: projectData.username || null,
        password: projectData.password || null,
      });
      await fetchProject(params.id as string);
      toast.success("Node configuration updated");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update node configuration");
    } finally {
      setSaving(false);
    }
  };

  const savePayloadStructure = async () => {
    try {
      const existing = await api.get(`/payloads/project/${params.id}`);
      const payloads = existing.data;

      if (payloads && payloads.length > 0) {
        await api.put(`/payloads/${payloads[0].id}`, {
          name: `${currentProject?.name} Payload`,
          structure: payloadFields,
        });
      } else {
        await api.post("/payloads", {
          name: `${currentProject?.name} Payload`,
          structure: payloadFields,
          template: false,
          projectId: params.id,
        });
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        await api.post("/payloads", {
          name: `${currentProject?.name} Payload`,
          structure: payloadFields,
          template: false,
          projectId: params.id,
        });
      } else {
        throw err;
      }
    }
    setHasUnsavedChanges(false);
  };

  const handleSavePayload = async () => {
    if (payloadFields.length === 0) {
      toast.error("Add at least one payload field");
      return;
    }
    setSaving(true);
    try {
      await savePayloadStructure();
      toast.success("Payload schema saved");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save schema");
    } finally {
      setSaving(false);
    }
  };

  const handleStartSimulation = async () => {
    if (useDataset && !selectedDatasetId) {
      toast.error("Please select a dataset to replay");
      return;
    }

    if (!useDataset && payloadFields.length === 0) {
      toast.error("Add at least one payload field");
      return;
    }

    if (!useDataset && hasUnsavedChanges) {
      setSaving(true);
      try {
        await savePayloadStructure();
      } catch {
        toast.error("Failed to save schema before starting");
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    setStarting(true);
    try {
      const structure = useDataset
        ? [
            ...(Array.isArray(payloadFields)
              ? payloadFields.filter((f) => f.mode === "static")
              : []),
            {
              name: "__dataset_mode__",
              type: "string",
              mode: "static",
              value: selectedDatasetId,
              required: true,
            },
          ]
        : payloadFields;

      await api.post("/simulations/start", {
        projectId: params.id,
        payloadStructure: structure,
        interval: (parseFloat(simulationSettings.interval as any) || 1) * 1000,
        batchSize: parseInt(simulationSettings.batchSize as any) || 1,
        swarmMode: simulationSettings.swarmMode,
        swarmCount: simulationSettings.swarmCount,
        stages: simulationSettings.stages.map((stage: any) => ({
          duration: parseInt(stage.duration as any) || 0,
          target: parseInt(stage.target as any) || 0,
        })),
        chaosMode: simulationSettings.chaosMode,
        chaosProbability: parseInt(simulationSettings.chaosProbability as any) || 5,
        chaosFields: simulationSettings.chaosFields,
      });

      setIsSimulationRunning(true);
      toast.success("Simulation stream started");
      startPolling(params.id as string);

      const intervalSec = parseFloat(simulationSettings.interval as any) || 1;
      lastTotalSentRef.current = 0;
      setCountdown(intervalSec);
      startCountdown(intervalSec);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to start simulation");
    } finally {
      setStarting(false);
    }
  };

  const startCountdown = (intervalSec: number) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    let remaining = intervalSec;
    setCountdown(remaining);
    countdownRef.current = setInterval(() => {
      remaining = Math.max(0, remaining - 0.1);
      setCountdown(parseFloat(remaining.toFixed(1)));
      if (remaining <= 0) {
        remaining = intervalSec;
        setCountdown(intervalSec);
      }
    }, 100);
  };

  const stopCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(0);
  };

  const handleStopSimulation = async () => {
    setStopping(true);
    try {
      await api.post("/simulations/stop", { projectId: params.id });
      setIsSimulationRunning(false);
      clearPolling();
      stopCountdown();
      toast.success("Simulation stream halted");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to stop simulation");
    } finally {
      setStopping(false);
    }
  };

  const handleImportPayload = () => {
    try {
      const parsed = JSON.parse(importJson);
      const fields: PayloadField[] = [];
      const processObject = (obj: any, prefix = "") => {
        Object.entries(obj).forEach(([key, value]) => {
          const name = prefix ? `${prefix}.${key}` : key;
          const t = typeof value;
          if (t === "object" && value !== null && !Array.isArray(value)) {
            processObject(value, name);
          } else {
            const field: PayloadField = {
              name,
              type: "string",
              mode: "static",
              value: "",
              required: false,
            };
            if (t === "number") {
              field.type = "number";
              field.mode = "random";
              field.min = 0;
              field.max = 100;
              field.value = value;
            } else if (t === "boolean") {
              field.type = "boolean";
              field.mode = "static";
              field.value = value;
            } else {
              field.type = "string";
              field.mode = "static";
              field.value = value;
            }
            fields.push(field);
          }
        });
      };
      processObject(parsed);
      setPayloadFields(fields);
      setHasUnsavedChanges(true);
      setShowImportDialog(false);
      setImportJson("");
      toast.success(`Imported ${fields.length} schema fields`);
    } catch {
      toast.error("Invalid JSON format");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleDownloadDataset = async (datasetId: string) => {
    try {
      toast.loading("Mengunduh dataset...", { id: "download" });
      const res = await api.get(`/datasets/${datasetId}/download`, {
        responseType: "blob",
      });
      const targetDataset = datasets.find((d) => d.id === datasetId);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      let fileName = targetDataset?.fileName || `${targetDataset?.name || "dataset"}.csv`;
      if (!fileName.toLowerCase().endsWith(".csv")) {
        fileName += ".csv";
      }
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Dataset berhasil diunduh", { id: "download" });
    } catch {
      toast.error("Gagal mengunduh dataset", { id: "download" });
    }
  };

  const handleGenerateDataset = async () => {
    if (payloadFields.length === 0) {
      toast.error("Tambahkan minimal 1 field schema untuk men-generate data");
      return;
    }
    if (genRows <= 0) {
      toast.error("Jumlah baris harus lebih dari 0");
      return;
    }
    if (genRows > 50000) {
      toast.error("Jumlah baris maksimal adalah 50.000");
      return;
    }

    setGeneratingDataset(true);
    try {
      const res = await api.post("/datasets/generate", {
        name: genDatasetName.trim() || `${projectData.name || "Project"} - Dataset`,
        moduleName: genModuleName.trim() || "telemetry",
        rowCount: Number(genRows),
        saveToDataset: genSaveToVault,
        payloadStructure: payloadFields,
        chaosMode: simulationSettings.chaosMode,
        chaosProbability: simulationSettings.chaosProbability,
        chaosFields: simulationSettings.chaosFields,
      });

      // Trigger instant browser download
      const blob = new Blob([res.data.csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", res.data.fileName || "project-dataset.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      if (res.data.saved) {
        toast.success("Dataset berhasil di-generate, disimpan ke vault, dan diunduh!");
        if (res.data.dataset) {
          setDatasets((prev) => [res.data.dataset, ...prev]);
          setSelectedDatasetId(res.data.dataset.id);
        }
      } else {
        toast.success("Data berhasil di-generate dan langsung diunduh (tidak disimpan ke vault).");
      }

      setShowGenerateDatasetModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal membuat dataset sintetis");
    } finally {
      setGeneratingDataset(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">
          INITIALIZING_STUDIO...
        </span>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="p-12 text-center bg-white border border-[#E2E8F0] rounded-md">
        <h2 className="font-mono text-base font-bold text-[#0F172A]">PROJECT_NOT_FOUND</h2>
        <p className="text-xs text-slate-500 mt-1">
          The requested node ID does not exist in local cluster.
        </p>
        <button
          onClick={() => router.push("/projects")}
          className="mt-4 px-4 py-2 text-xs font-semibold bg-[#0F172A] text-white rounded"
        >
          Return to Nodes List
        </button>
      </div>
    );
  }

  const protocol = currentProject.protocol?.toUpperCase() || "HTTP";

  return (
    <div className="space-y-4">
      {/* Studio Command Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-md p-4 shadow-hairline">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Node Info & Status */}
          <div className="flex items-start gap-3">
            <button
              onClick={() => router.push("/projects")}
              className="p-1.5 rounded border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] transition-colors mt-0.5"
              title="Return to Projects"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">
                  {currentProject.name}
                </h1>
                {/* Protocol Badge */}
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {protocol}
                </span>

                {/* Live Simulation Indicator */}
                {isSimulationRunning ? (
                  <div className="flex items-center gap-2 font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>TRANSMITTING</span>
                    {countdown > 0 && (
                      <span className="text-emerald-600 font-normal">
                        ({countdown.toFixed(1)}s)
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="font-mono text-[10px] font-medium px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200">
                    IDLE_STANDBY
                  </span>
                )}
              </div>

              {/* Endpoint Preview */}
              <div className="flex items-center gap-2 mt-1 text-xs font-mono text-[#64748B]">
                <span className="text-[#0F172A] font-semibold">{currentProject.host}</span>
                {currentProject.port && <span>:{currentProject.port}</span>}
                {currentProject.endpoint && (
                  <span className="text-[#2563EB]">{currentProject.endpoint}</span>
                )}
                {currentProject.topic && (
                  <span className="text-emerald-700 font-semibold">
                    topic: {currentProject.topic}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Master Control Actions */}
          <div className="flex items-center gap-2 flex-wrap self-end lg:self-auto">
            {hasUnsavedChanges && (
              <button
                onClick={handleSavePayload}
                disabled={saving || isSimulationRunning}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[#2563EB] bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? "Saving..." : "Save Schema"}</span>
              </button>
            )}

            {!isSimulationRunning ? (
              <button
                onClick={handleStartSimulation}
                disabled={starting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] shadow-sm disabled:opacity-50 transition-all"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{starting ? "Starting..." : "Start Stream"}</span>
              </button>
            ) : (
              <button
                onClick={handleStopSimulation}
                disabled={stopping}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm disabled:opacity-50 transition-all"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>{stopping ? "Halting..." : "Halt Stream"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Split Cockpit Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Column: Workbench Tabs (7 cols) */}
        <div className="xl:col-span-7 space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden">
            {/* Workbench Navigation Header */}
            <div className="px-4 py-2 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab("builder")}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === "builder"
                      ? "bg-white text-[#0F172A] shadow-hairline border border-[#CBD5E1]"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <FileCode className="h-3.5 w-3.5" />
                  <span>SCHEMA_BUILDER</span>
                </button>
                <button
                  onClick={() => setActiveTab("simulation")}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === "simulation"
                      ? "bg-white text-[#0F172A] shadow-hairline border border-[#CBD5E1]"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>PROFILE_DYNAMICS</span>
                </button>
                <button
                  onClick={() => setActiveTab("config")}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === "config"
                      ? "bg-white text-[#0F172A] shadow-hairline border border-[#CBD5E1]"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <Cpu className="h-3.5 w-3.5" />
                  <span>NODE_CONFIG</span>
                </button>
              </div>

              {activeTab === "builder" && !useDataset && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setGenDatasetName(`${projectData.name || "Project"} - Dataset ${new Date().toISOString().slice(0, 10)}`);
                      setShowGenerateDatasetModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
                    title="Generate synthetic CSV dataset based on this schema"
                  >
                    <FileSpreadsheet className="h-3 w-3" />
                    <span>GENERATE_DATASET</span>
                  </button>
                  <button
                    onClick={() => setShowImportDialog(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-1 rounded border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                  >
                    <Upload className="h-3 w-3" />
                    <span>IMPORT_JSON</span>
                  </button>
                  <button
                    onClick={addPayloadField}
                    className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-1 rounded bg-[#0F172A] text-white hover:bg-[#1E293B]"
                  >
                    <Plus className="h-3 w-3" />
                    <span>ADD_FIELD</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tab 1: Schema Builder */}
            {activeTab === "builder" && (
              <div className="p-4 space-y-4">
                {/* Generation Mode Selector */}
                <div className="flex items-center justify-between p-2.5 rounded border border-[#E2E8F0] bg-[#F8FAFC]">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-[#2563EB]" />
                    <div>
                      <span className="text-xs font-semibold text-[#0F172A]">
                        Payload Generation Mode
                      </span>
                      <p className="text-[11px] text-[#64748B]">
                        Synthesize dynamic telemetry or replay recorded industrial datasets
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center bg-white border border-[#CBD5E1] rounded p-0.5">
                    <button
                      onClick={() => setUseDataset(false)}
                      className={`px-2.5 py-1 text-xs font-mono font-semibold rounded ${
                        !useDataset
                          ? "bg-[#0F172A] text-white"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      SYNTHETIC_BUILDER
                    </button>
                    <button
                      onClick={() => setUseDataset(true)}
                      className={`px-2.5 py-1 text-xs font-mono font-semibold rounded ${
                        useDataset
                          ? "bg-[#0F172A] text-white"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      DATASET_REPLAY
                    </button>
                  </div>
                </div>

                {useDataset ? (
                  /* Dataset Replay Selector */
                  <div className="space-y-3 p-4 rounded border border-blue-200 bg-blue-50/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-blue-900 uppercase">
                        DATASET_STREAM_SOURCE
                      </span>
                      <button
                        onClick={() => router.push("/datasets")}
                        className="text-[11px] font-mono text-[#2563EB] hover:underline flex items-center gap-1"
                      >
                        <span>Manage Datasets</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        className="flex-1 h-9 px-3 rounded border border-[#CBD5E1] bg-white text-xs font-mono focus:border-[#2563EB] outline-none"
                        value={selectedDatasetId}
                        onChange={(e) => setSelectedDatasetId(e.target.value)}
                      >
                        <option value="" disabled>
                          -- Select CSV Dataset --
                        </option>
                        {datasets.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.loadedRows} rows) — Module: {d.moduleName || "General"}
                          </option>
                        ))}
                      </select>
                      {selectedDatasetId && (
                        <button
                          type="button"
                          onClick={() => handleDownloadDataset(selectedDatasetId)}
                          className="h-9 px-3 rounded border border-blue-300 bg-white text-blue-700 hover:bg-blue-50 text-xs font-mono font-semibold flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
                          title="Download selected CSV dataset"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>DOWNLOAD</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-blue-800 font-sans">
                      The simulation engine will stream records sequentially from this CSV dataset, emitting one JSON object per interval tick.
                    </p>
                  </div>
                ) : (
                  /* Schema Fields Grid */
                  <div className="space-y-2.5">
                    {payloadFields.length === 0 ? (
                      <div className="p-8 text-center text-[#94A3B8] font-mono text-xs border border-dashed border-[#CBD5E1] rounded">
                        NO_FIELDS_DEFINED. Click &quot;ADD_FIELD&quot; above to synthesize a field.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {payloadFields.map((field, index) => (
                          <div
                            key={index}
                            className="p-3 rounded border border-[#E2E8F0] hover:border-[#CBD5E1] bg-white shadow-hairline space-y-2.5 transition-colors"
                          >
                            <div className="grid grid-cols-12 gap-2 items-center">
                              {/* Name */}
                              <div className="col-span-4">
                                <label className="text-[10px] font-mono text-[#64748B] uppercase block mb-1">
                                  KEY_NAME
                                </label>
                                <input
                                  type="text"
                                  value={field.name}
                                  onChange={(e) =>
                                    updatePayloadField(index, { name: e.target.value })
                                  }
                                  placeholder="metric_name"
                                  className="w-full h-8 px-2.5 text-xs font-mono font-semibold text-[#0F172A] border border-[#CBD5E1] rounded bg-white focus:border-[#2563EB] outline-none"
                                />
                              </div>

                              {/* Type */}
                              <div className="col-span-3">
                                <label className="text-[10px] font-mono text-[#64748B] uppercase block mb-1">
                                  DATA_TYPE
                                </label>
                                <select
                                  value={field.type}
                                  onChange={(e) =>
                                    updatePayloadField(index, {
                                      type: e.target.value as PayloadField["type"],
                                    })
                                  }
                                  className="w-full h-8 px-2 text-xs font-mono border border-[#CBD5E1] rounded bg-white focus:border-[#2563EB] outline-none"
                                >
                                  <option value="number">Number</option>
                                  <option value="string">String</option>
                                  <option value="boolean">Boolean</option>
                                </select>
                              </div>

                              {/* Mode */}
                              <div className="col-span-4">
                                <label className="text-[10px] font-mono text-[#64748B] uppercase block mb-1">
                                  GENERATOR_MODE
                                </label>
                                <select
                                  value={field.mode}
                                  onChange={(e) =>
                                    updatePayloadField(index, {
                                      mode: e.target.value as PayloadField["mode"],
                                    })
                                  }
                                  className="w-full h-8 px-2 text-xs font-mono border border-[#CBD5E1] rounded bg-white focus:border-[#2563EB] outline-none"
                                >
                                  <option value="random">Random Range</option>
                                  <option value="static">Static Value</option>
                                  <option value="incremental">Incremental Counter</option>
                                  <option value="timestamp">Unix Timestamp</option>
                                </select>
                              </div>

                              {/* Delete */}
                              <div className="col-span-1 text-right pt-4">
                                <button
                                  onClick={() => removePayloadField(index)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Remove Field"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Generator Parameters */}
                            <div className="pt-2 border-t border-[#F1F5F9] grid grid-cols-12 gap-2 items-center text-xs">
                              {field.mode === "random" && field.type === "number" && (
                                <>
                                  <div className="col-span-4 flex items-center gap-1.5">
                                    <span className="text-[10px] font-mono text-[#64748B]">MIN:</span>
                                    <input
                                      type="number"
                                      value={field.min ?? 0}
                                      onChange={(e) =>
                                        updatePayloadField(index, {
                                          min: parseFloat(e.target.value) || 0,
                                        })
                                      }
                                      className="w-full h-7 px-2 font-mono border border-[#CBD5E1] rounded text-xs"
                                    />
                                  </div>
                                  <div className="col-span-4 flex items-center gap-1.5">
                                    <span className="text-[10px] font-mono text-[#64748B]">MAX:</span>
                                    <input
                                      type="number"
                                      value={field.max ?? 100}
                                      onChange={(e) =>
                                        updatePayloadField(index, {
                                          max: parseFloat(e.target.value) || 0,
                                        })
                                      }
                                      className="w-full h-7 px-2 font-mono border border-[#CBD5E1] rounded text-xs"
                                    />
                                  </div>
                                  <div className="col-span-4 flex items-center gap-1.5">
                                    <span className="text-[10px] font-mono text-[#64748B]">UNIT:</span>
                                    <input
                                      type="text"
                                      value={field.unit || ""}
                                      onChange={(e) =>
                                        updatePayloadField(index, { unit: e.target.value })
                                      }
                                      placeholder="°C, %, bar"
                                      className="w-full h-7 px-2 font-mono border border-[#CBD5E1] rounded text-xs"
                                    />
                                  </div>
                                </>
                              )}

                              {field.mode === "static" && (
                                <div className="col-span-8 flex items-center gap-1.5">
                                  <span className="text-[10px] font-mono text-[#64748B]">LITERAL:</span>
                                  <input
                                    type="text"
                                    value={field.value || ""}
                                    onChange={(e) =>
                                      updatePayloadField(index, { value: e.target.value })
                                    }
                                    placeholder="constant_value"
                                    className="w-full h-7 px-2 font-mono border border-[#CBD5E1] rounded text-xs"
                                  />
                                </div>
                              )}

                              {field.mode === "incremental" && (
                                <div className="col-span-6 flex items-center gap-1.5">
                                  <span className="text-[10px] font-mono text-[#64748B]">SEED:</span>
                                  <input
                                    type="number"
                                    value={field.value || 0}
                                    onChange={(e) =>
                                      updatePayloadField(index, {
                                        value: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="w-full h-7 px-2 font-mono border border-[#CBD5E1] rounded text-xs"
                                  />
                                </div>
                              )}

                              {field.mode === "timestamp" && (
                                <div className="col-span-12 font-mono text-[11px] text-[#64748B]">
                                  Current Epoch timestamp (millisecond resolution) injected at transmission.
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Profile Dynamics (Interval, Swarm, Chaos) */}
            {activeTab === "simulation" && (
              <div className="p-4 space-y-5">
                {/* Basic Transmission Rate */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded border border-[#E2E8F0] bg-[#F8FAFC]">
                    <label className="text-[11px] font-mono font-semibold text-[#0F172A] uppercase block mb-1">
                      INTERVAL (SECONDS)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      disabled={isSimulationRunning}
                      value={simulationSettings.interval}
                      onChange={(e) =>
                        setSimulationSettings({
                          ...simulationSettings,
                          interval:
                            e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full h-8 px-2 font-mono font-bold text-sm bg-white border border-[#CBD5E1] rounded focus:border-[#2563EB] outline-none"
                    />
                    <span className="text-[10px] text-[#64748B] mt-1 block">
                      Transmission frequency
                    </span>
                  </div>

                  <div className="p-3 rounded border border-[#E2E8F0] bg-[#F8FAFC]">
                    <label className="text-[11px] font-mono font-semibold text-[#0F172A] uppercase block mb-1">
                      BATCH SIZE
                    </label>
                    <input
                      type="number"
                      min="1"
                      disabled={isSimulationRunning}
                      value={simulationSettings.batchSize}
                      onChange={(e) =>
                        setSimulationSettings({
                          ...simulationSettings,
                          batchSize:
                            e.target.value === "" ? "" : parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full h-8 px-2 font-mono font-bold text-sm bg-white border border-[#CBD5E1] rounded focus:border-[#2563EB] outline-none"
                    />
                    <span className="text-[10px] text-[#64748B] mt-1 block">
                      Payloads per tick
                    </span>
                  </div>

                  <div className="p-3 rounded border border-[#E2E8F0] bg-[#F8FAFC]">
                    <label className="text-[11px] font-mono font-semibold text-[#0F172A] uppercase block mb-1">
                      DURATION (SEC)
                    </label>
                    <input
                      type="number"
                      min="0"
                      disabled={isSimulationRunning}
                      value={simulationSettings.duration}
                      onChange={(e) =>
                        setSimulationSettings({
                          ...simulationSettings,
                          duration:
                            e.target.value === "" ? "" : parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full h-8 px-2 font-mono font-bold text-sm bg-white border border-[#CBD5E1] rounded focus:border-[#2563EB] outline-none"
                    />
                    <span className="text-[10px] text-[#64748B] mt-1 block">
                      0 = run indefinitely
                    </span>
                  </div>
                </div>

                {/* Swarm Mode (k6-style VUs) */}
                <div className="p-3.5 rounded border border-[#E2E8F0] bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-[#0F172A] uppercase tracking-wider">
                        SWARM_LOAD_PROFILE (VIRTUAL USERS)
                      </span>
                      <p className="text-[11px] text-[#64748B]">
                        Stress test MQTT brokers and HTTP endpoints with ramp-up stages
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isSimulationRunning}
                      onClick={() =>
                        setSimulationSettings({
                          ...simulationSettings,
                          swarmMode: !simulationSettings.swarmMode,
                        })
                      }
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-colors ${
                        simulationSettings.swarmMode
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {simulationSettings.swarmMode ? "SWARM_ACTIVE" : "DISABLED"}
                    </button>
                  </div>

                  {simulationSettings.swarmMode && (
                    <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-[#64748B]">
                          STAGES MATRIX (MAX 1000 VUs)
                        </span>
                        <button
                          type="button"
                          disabled={isSimulationRunning}
                          onClick={() =>
                            setSimulationSettings({
                              ...simulationSettings,
                              stages: [
                                ...simulationSettings.stages,
                                { duration: 30, target: 100 },
                              ],
                            })
                          }
                          className="text-[11px] font-mono font-semibold text-[#2563EB] hover:underline"
                        >
                          + Add Stage
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {simulationSettings.stages.map((stage: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-mono"
                          >
                            <span className="text-slate-400 text-[10px]">#{idx + 1}</span>
                            <span className="text-[#64748B]">DURATION:</span>
                            <input
                              type="number"
                              value={stage.duration}
                              disabled={isSimulationRunning}
                              onChange={(e) => {
                                const newStages = [...simulationSettings.stages];
                                newStages[idx].duration = parseInt(e.target.value) || 0;
                                setSimulationSettings({
                                  ...simulationSettings,
                                  stages: newStages,
                                });
                              }}
                              className="w-20 h-6 px-1.5 border border-[#CBD5E1] rounded bg-white text-xs"
                            />
                            <span className="text-[#64748B] ml-2">TARGET_VUS:</span>
                            <input
                              type="number"
                              max="1000"
                              value={stage.target}
                              disabled={isSimulationRunning}
                              onChange={(e) => {
                                const newStages = [...simulationSettings.stages];
                                newStages[idx].target = Math.min(
                                  1000,
                                  parseInt(e.target.value) || 0
                                );
                                setSimulationSettings({
                                  ...simulationSettings,
                                  stages: newStages,
                                });
                              }}
                              className="w-20 h-6 px-1.5 border border-[#CBD5E1] rounded bg-white text-xs"
                            />
                            {simulationSettings.stages.length > 1 && (
                              <button
                                type="button"
                                disabled={isSimulationRunning}
                                onClick={() => {
                                  const newStages = simulationSettings.stages.filter(
                                    (_: any, i: number) => i !== idx
                                  );
                                  setSimulationSettings({
                                    ...simulationSettings,
                                    stages: newStages,
                                  });
                                }}
                                className="ml-auto text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Chaos Injection Engine */}
                <div className="p-3.5 rounded border border-[#E2E8F0] bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        CHAOS_ANOMALY_INJECTOR
                      </span>
                      <p className="text-[11px] text-[#64748B]">
                        Simulate out-of-range sensor spikes and boolean reversals to test alarm rules
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isSimulationRunning}
                      onClick={() =>
                        setSimulationSettings({
                          ...simulationSettings,
                          chaosMode: !simulationSettings.chaosMode,
                        })
                      }
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-colors ${
                        simulationSettings.chaosMode
                          ? "bg-rose-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {simulationSettings.chaosMode ? "CHAOS_ACTIVE" : "DISABLED"}
                    </button>
                  </div>

                  {simulationSettings.chaosMode && (
                    <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-[#0F172A]">
                          SPIKE PROBABILITY:
                        </span>
                        <div className="flex items-center gap-1 font-mono font-bold text-rose-700">
                          <span>{simulationSettings.chaosProbability}%</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        disabled={isSimulationRunning}
                        value={simulationSettings.chaosProbability}
                        onChange={(e) =>
                          setSimulationSettings({
                            ...simulationSettings,
                            chaosProbability: parseInt(e.target.value) || 1,
                          })
                        }
                        className="w-full accent-rose-600"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Node Config */}
            {activeTab === "config" && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                      NODE_NAME
                    </label>
                    <input
                      type="text"
                      value={projectData.name}
                      onChange={(e) =>
                        setProjectData({ ...projectData, name: e.target.value })
                      }
                      className="w-full h-8 px-2.5 font-sans border border-[#CBD5E1] rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                      PROTOCOL
                    </label>
                    <select
                      value={projectData.protocol}
                      onChange={(e) => {
                        const proto = e.target.value;
                        let defaultPort = projectData.port;
                        if (proto === "HTTP" || proto === "WS") defaultPort = "80";
                        else if (proto === "HTTPS" || proto === "WSS") defaultPort = "443";
                        else if (proto === "MQTT") defaultPort = "1883";
                        else if (proto === "MQTTS") defaultPort = "8883";
                        setProjectData({
                          ...projectData,
                          protocol: proto,
                          port: defaultPort,
                        });
                      }}
                      className="w-full h-8 px-2 font-mono border border-[#CBD5E1] rounded bg-white"
                    >
                      <option value="HTTP">HTTP</option>
                      <option value="HTTPS">HTTPS</option>
                      <option value="MQTT">MQTT</option>
                      <option value="MQTTS">MQTTS</option>
                      <option value="WS">WebSocket</option>
                      <option value="WSS">WebSocket Secure</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                      HOST_ADDRESS / BROKER_URL
                    </label>
                    <input
                      type="text"
                      value={projectData.host}
                      onChange={(e) => {
                        const val = e.target.value;
                        const parsed = parseHostInput(val);
                        if (parsed) {
                          setProjectData({
                            ...projectData,
                            host: parsed.host,
                            protocol: parsed.protocol,
                            port: parsed.port,
                            endpoint:
                              parsed.protocol.includes("HTTP") ||
                              parsed.protocol.includes("WS")
                                ? parsed.path
                                : projectData.endpoint,
                            topic: parsed.protocol.includes("MQTT")
                              ? parsed.path.startsWith("/")
                                ? parsed.path.slice(1)
                                : parsed.path
                              : projectData.topic,
                          });
                        } else {
                          setProjectData({ ...projectData, host: val });
                        }
                      }}
                      className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                      PORT
                    </label>
                    <input
                      type="text"
                      value={projectData.port}
                      onChange={(e) =>
                        setProjectData({ ...projectData, port: e.target.value })
                      }
                      className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                      {projectData.protocol.includes("MQTT") ? "MQTT_TOPIC" : "ENDPOINT_PATH"}
                    </label>
                    <input
                      type="text"
                      value={
                        projectData.protocol.includes("MQTT")
                          ? projectData.topic
                          : projectData.endpoint
                      }
                      onChange={(e) =>
                        projectData.protocol.includes("MQTT")
                          ? setProjectData({ ...projectData, topic: e.target.value })
                          : setProjectData({ ...projectData, endpoint: e.target.value })
                      }
                      className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white"
                    />
                  </div>
                </div>

                {/* Headers Manager */}
                <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-[#64748B] uppercase">
                      HTTP_HEADERS / AUTH
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setHeaderItems([...headerItems, { key: "", value: "" }])
                      }
                      className="text-[11px] font-mono text-[#2563EB] hover:underline"
                    >
                      + Add Header
                    </button>
                  </div>

                  {headerItems.map((header, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        placeholder="Header Key (e.g. X-API-Key)"
                        value={header.key}
                        onChange={(e) => {
                          const newHeaders = [...headerItems];
                          newHeaders[idx].key = e.target.value;
                          setHeaderItems(newHeaders);
                        }}
                        className="flex-1 h-7 px-2 font-mono text-xs border border-[#CBD5E1] rounded bg-white"
                      />
                      <input
                        placeholder="Value"
                        value={header.value}
                        onChange={(e) => {
                          const newHeaders = [...headerItems];
                          newHeaders[idx].value = e.target.value;
                          setHeaderItems(newHeaders);
                        }}
                        className="flex-1 h-7 px-2 font-mono text-xs border border-[#CBD5E1] rounded bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newHeaders = [...headerItems];
                          newHeaders.splice(idx, 1);
                          setHeaderItems(newHeaders);
                        }}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] flex justify-end">
                  <button
                    onClick={saveProjectConfig}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B]"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{saving ? "Saving..." : "Update Node Configuration"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Telemetry & Live Teleprinter (5 cols) */}
        <div className="xl:col-span-5 space-y-4">
          {/* Live Telemetry Dial Cells */}
          {simulationStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white border border-[#E2E8F0] rounded-md p-3 shadow-hairline">
              <div>
                <span className="font-mono text-[10px] text-[#64748B] uppercase block">
                  REQ_TOTAL
                </span>
                <span className="font-mono text-lg font-bold text-[#0F172A]">
                  {simulationStats.http_reqs || simulationStats.totalSent || 0}
                </span>
              </div>
              <div>
                <span className="font-mono text-[10px] text-[#64748B] uppercase block">
                  ACTIVE_VUS
                </span>
                <span className="font-mono text-lg font-bold text-emerald-700">
                  {simulationStats.vus || 0}
                </span>
              </div>
              <div>
                <span className="font-mono text-[10px] text-[#64748B] uppercase block">
                  THROUGHPUT
                </span>
                <span className="font-mono text-lg font-bold text-[#2563EB]">
                  {simulationStats.rps || 0} <span className="text-[10px]">r/s</span>
                </span>
              </div>
              <div>
                <span className="font-mono text-[10px] text-[#64748B] uppercase block">
                  ERRORS
                </span>
                <span className="font-mono text-lg font-bold text-rose-700">
                  {simulationStats.errorCount || 0}
                </span>
              </div>
            </div>
          )}

          {/* Outgoing Payload Inspector */}
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden">
            <div className="px-3.5 py-2 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5 text-[#2563EB]" />
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  OUTGOING_PAYLOAD
                </span>
              </div>

              {lastSentPayload && (
                <button
                  onClick={() =>
                    copyToClipboard(JSON.stringify(lastSentPayload, null, 2))
                  }
                  className="text-[10px] font-mono text-[#64748B] hover:text-[#0F172A] flex items-center gap-1"
                >
                  {copiedPayload ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedPayload ? "COPIED" : "COPY"}</span>
                </button>
              )}
            </div>

            <div className="p-3">
              <pre className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded font-mono text-xs text-[#0F172A] max-h-56 overflow-y-auto overflow-x-auto leading-relaxed">
                {lastSentPayload
                  ? JSON.stringify(lastSentPayload, null, 2)
                  : JSON.stringify(
                      payloadFields.reduce((acc, f) => {
                        acc[f.name] =
                          f.mode === "static"
                            ? f.value
                            : f.mode === "random" && f.type === "number"
                            ? `<random ${f.min ?? 0}-${f.max ?? 100}>`
                            : `<${f.mode}>`;
                        return acc;
                      }, {} as Record<string, any>),
                      null,
                      2
                    )}
              </pre>
            </div>
          </div>

          {/* Server Response & ACK Monitor */}
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden">
            <div className="px-3.5 py-2 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  SERVER_ACK_STREAM
                </span>
              </div>

              {lastResponse && (
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  {lastResponse.statusCode && (
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold ${
                        lastResponse.type === "success"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-rose-50 text-rose-800 border border-rose-200"
                      }`}
                    >
                      HTTP {lastResponse.statusCode}
                    </span>
                  )}
                  {lastResponse.latency && (
                    <span className="text-[#64748B]">{lastResponse.latency}ms</span>
                  )}
                </div>
              )}
            </div>

            <div className="p-3">
              <pre className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded font-mono text-xs text-[#0F172A] max-h-56 overflow-y-auto overflow-x-auto leading-relaxed">
                {lastResponse ? (
                  typeof (lastResponse.error || lastResponse.data) === "object" ? (
                    JSON.stringify(lastResponse.error || lastResponse.data, null, 2)
                  ) : (
                    String(lastResponse.error || lastResponse.data)
                  )
                ) : (
                  <span className="text-[#94A3B8]">
                    {"// Waiting for transmission acknowledgement..."}
                  </span>
                )}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Import JSON Modal */}
      {showImportDialog && (
        <div
          style={{ margin: 0 }}
          className="fixed inset-0 m-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white border border-[#CBD5E1] rounded-md shadow-popover max-w-lg w-full overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <span className="font-mono text-xs font-bold text-[#0F172A] uppercase">
                IMPORT_JSON_SCHEMA
              </span>
              <button
                onClick={() => setShowImportDialog(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='{\n  "voltage": 220,\n  "current": 4.5,\n  "status": "active"\n}'
                className="w-full h-48 p-2.5 font-mono text-xs border border-[#CBD5E1] rounded focus:border-[#2563EB] outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowImportDialog(false)}
                  className="px-3 py-1.5 text-xs font-mono rounded border border-[#CBD5E1] hover:bg-[#F8FAFC]"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleImportPayload}
                  className="px-3.5 py-1.5 text-xs font-mono font-bold bg-[#0F172A] text-white rounded hover:bg-[#1E293B]"
                >
                  PARSE_AND_IMPORT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Synthetic Dataset Modal */}
      {showGenerateDatasetModal && (
        <div
          style={{ margin: 0 }}
          className="fixed inset-0 m-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
        >
          <div className="bg-white border border-[#CBD5E1] rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-100 text-blue-700">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0F172A] tracking-tight">
                    Generate Synthetic Telemetry Dataset
                  </h3>
                  <p className="font-mono text-[10px] text-[#64748B]">
                    Hasilkan data IoT realistis berformat CSV dengan batas maksimal 3MB
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGenerateDatasetModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="p-5 space-y-4 text-xs">
              {/* Active Schema Fields Preview */}
              <div>
                <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                  SKEMA KOLOM AKTIF ({payloadFields.length} FIELDS)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                  {payloadFields.map((f, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 shadow-xs"
                    >
                      <span className="font-semibold text-blue-600">{f.name}</span>
                      <span className="text-slate-400">({f.type}/{f.mode})</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Row Count */}
              <div>
                <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                  JUMLAH BARIS DATA (ROW COUNT)
                </label>
                <input
                  type="number"
                  min="10"
                  max="50000"
                  value={genRows}
                  onChange={(e) => setGenRows(parseInt(e.target.value) || 0)}
                  className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                />
                <span className="text-[10px] text-[#64748B] mt-1 block font-mono">
                  Estimasi ukuran file: ~{((genRows * (payloadFields.length * 14 + 10)) / 1024).toFixed(1)} KB (Maksimal: 3,072 KB / 3MB)
                </span>
              </div>

              {/* Pilihan Simpan ke Dataset Vault atau Tidak */}
              <div className="space-y-2">
                <label className="font-mono text-[10px] text-[#64748B] uppercase block">
                  PILIHAN PENYIMPANAN DATASET
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    onClick={() => setGenSaveToVault(true)}
                    className={`p-3 rounded border cursor-pointer transition-all ${
                      genSaveToVault
                        ? "bg-blue-50/50 border-blue-500 ring-1 ring-blue-500"
                        : "bg-white border-[#E2E8F0] hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        checked={genSaveToVault}
                        onChange={() => setGenSaveToVault(true)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-xs text-[#0F172A]">
                        Simpan ke Vault & Download
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] leading-relaxed pl-5">
                      Data disimpan permanen di database vault sehingga dapat di-replay dalam simulasi & diunduh kapan saja.
                    </p>
                  </div>

                  <div
                    onClick={() => setGenSaveToVault(false)}
                    className={`p-3 rounded border cursor-pointer transition-all ${
                      !genSaveToVault
                        ? "bg-blue-50/50 border-blue-500 ring-1 ring-blue-500"
                        : "bg-white border-[#E2E8F0] hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        checked={!genSaveToVault}
                        onChange={() => setGenSaveToVault(false)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-xs text-[#0F172A]">
                        Hanya Download CSV Langsung
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] leading-relaxed pl-5">
                      Data langsung diunduh ke komputer Anda tanpa disimpan ke database/vault untuk menghemat ruang penyimpanan.
                    </p>
                  </div>
                </div>
              </div>

              {/* Conditional Inputs if Save to Vault is Checked */}
              {genSaveToVault && (
                <div className="space-y-3 p-3 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div>
                    <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                      NAMA DATASET VAULT
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Turbine_Vibration_2026"
                      value={genDatasetName}
                      onChange={(e) => setGenDatasetName(e.target.value)}
                      className="w-full h-8 px-2.5 font-sans border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                      KATEGORI / MODUL
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. telemetry, industrial, iot"
                      value={genModuleName}
                      onChange={(e) => setGenModuleName(e.target.value)}
                      className="w-full h-8 px-2.5 font-sans border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              )}

              {/* 3MB Hard Cap Notice */}
              <div className="p-2.5 rounded bg-amber-50 border border-amber-200 flex items-start gap-2 text-amber-900 font-mono text-[11px]">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">BATASAN MAKSIMAL: 3 MB (3,145,728 BYTES)</span>
                  <p className="text-[10px] text-amber-700 font-sans mt-0.5">
                    Data yang di-generate dijaga agar tidak melebihi 3MB untuk menjamin integritas memori dan kestabilan transmisi data.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-5 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGenerateDatasetModal(false)}
                className="px-3 py-1.5 text-xs font-mono font-medium text-slate-600 hover:text-slate-800 bg-white border border-[#CBD5E1] rounded hover:bg-slate-50 transition-colors"
              >
                BATAL
              </button>
              <button
                type="button"
                onClick={handleGenerateDataset}
                disabled={generatingDataset}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs transition-colors disabled:opacity-50"
              >
                {generatingDataset ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>MEMPROSES_DATA...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>GENERATE & UNDUH CSV</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
