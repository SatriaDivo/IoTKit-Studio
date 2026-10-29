"use client";

import { useEffect, useState, useRef } from "react";
import {
  Webhook,
  Zap,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Plus,
  Terminal,
  Layers,
  ArrowRight,
  Code2,
  CheckCircle2,
  Globe,
  Activity,
} from "lucide-react";
import { api } from "@/lib/api";
import { useProjectStore } from "@/store/projectStore";
import toast from "react-hot-toast";

interface WebhookLog {
  id: string;
  message: string;
  payload: string | null;
  timestamp: string;
  parsedPayload?: any;
}

interface ProjectWebhook {
  id: string;
  name: string;
  webhookToken: string | null;
  webhookEnabled: boolean;
  webhookUrl: string | null;
}

interface MappingRule {
  id: string;
  externalPath: string;
  internalKey: string;
  dataType: "number" | "string" | "boolean";
}

export default function WebhookListenerPage() {
  const { projects, fetchProjects } = useProjectStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [webhookInfo, setWebhookInfo] = useState<ProjectWebhook | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  const [shellTab, setShellTab] = useState<"curl" | "powershell" | "python">("curl");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastLogIdRef = useRef<string>("");
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Schema Mapping State
  const [mappingActive, setMappingActive] = useState<boolean>(true);
  const [mappings, setMappings] = useState<MappingRule[]>([]);
  const [savingMapping, setSavingMapping] = useState<boolean>(false);

  useEffect(() => {
    fetchProjects();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startPolling = (projectId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/webhook-manage/history/${projectId}`);
        const newLogs: WebhookLog[] = data.logs || [];

        if (newLogs.length > 0 && newLogs[0].id !== lastLogIdRef.current) {
          const prevId = lastLogIdRef.current;
          let newCount = 0;
          if (prevId) {
            for (const log of newLogs) {
              if (log.id === prevId) break;
              newCount++;
            }
          }

          lastLogIdRef.current = newLogs[0].id;
          setLogs(newLogs);

          if (newCount > 0) {
            setLiveCount((c) => c + newCount);
            toast.success(`📥 Ingested ${newCount} incoming webhook(s)`);
          }
        }
      } catch {}
    }, 1200);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleProjectChange = async (projectId: string) => {
    setSelectedProjectId(projectId);
    setLogs([]);
    setWebhookInfo(null);
    setLiveCount(0);
    lastLogIdRef.current = "";
    stopPolling();
    if (!projectId) return;

    setLoading(true);
    try {
      const { data } = await api.get(`/webhook-manage/info/${projectId}`);
      setWebhookInfo(data);

      const { data: historyData } = await api.get(`/webhook-manage/history/${projectId}`);
      const initialLogs = historyData.logs || [];
      setLogs(initialLogs);
      if (initialLogs.length > 0) {
        lastLogIdRef.current = initialLogs[0].id;
      }

      if (data.webhookEnabled) {
        startPolling(projectId);
      }

      try {
        const { data: mapData } = await api.get(`/webhook-manage/mapping/${projectId}`);
        setMappingActive(mapData.active);
        if (mapData.mappings) {
          try {
            const parsedRules =
              typeof mapData.mappings === "string"
                ? JSON.parse(mapData.mappings)
                : mapData.mappings;
            setMappings(
              parsedRules.map((m: any, idx: number) => ({ id: String(idx), ...m }))
            );
          } catch {
            setMappings([]);
          }
        } else {
          setMappings([]);
        }
      } catch {
        setMappings([]);
        setMappingActive(false);
      }
    } catch {
      toast.error("Failed to load webhook configuration");
    } finally {
      setLoading(false);
    }
  };

  const addMappingRow = () => {
    setMappings((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        externalPath: "",
        internalKey: "",
        dataType: "number",
      },
    ]);
  };

  const removeMappingRow = (id: string) => {
    setMappings((prev) => prev.filter((m) => m.id !== id));
  };

  const updateMappingRow = (id: string, field: keyof MappingRule, value: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleSaveMapping = async () => {
    if (!selectedProjectId) return;
    try {
      setSavingMapping(true);
      const cleanMappings = mappings
        .filter((m) => m.externalPath.trim() !== "" && m.internalKey.trim() !== "")
        .map(({ externalPath, internalKey, dataType }) => ({
          externalPath: externalPath.trim(),
          internalKey: internalKey.trim(),
          dataType,
        }));

      await api.post(`/webhook-manage/mapping/${selectedProjectId}`, {
        mappings: cleanMappings,
        active: mappingActive,
      });

      toast.success("Webhook schema mappings saved");
    } catch {
      toast.error("Failed to save schema mappings");
    } finally {
      setSavingMapping(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedProjectId) return;
    setGenerating(true);
    try {
      const { data } = await api.post(`/webhook-manage/generate/${selectedProjectId}`);
      setWebhookInfo((prev) => ({
        ...prev!,
        webhookToken: data.token,
        webhookEnabled: true,
        webhookUrl: data.webhookUrl,
      }));
      startPolling(selectedProjectId);
      toast.success("Webhook endpoint generated");
    } catch {
      toast.error("Failed to generate webhook token");
    } finally {
      setGenerating(false);
    }
  };

  const handleClear = async () => {
    if (!selectedProjectId) return;
    try {
      await api.delete(`/webhook-manage/clear/${selectedProjectId}`);
      stopPolling();
      setWebhookInfo((prev) =>
        prev
          ? {
              ...prev,
              webhookToken: null,
              webhookEnabled: false,
              webhookUrl: null,
            }
          : null
      );
      toast.success("Webhook endpoint deactivated");
    } catch {
      toast.error("Failed to deactivate webhook");
    }
  };

  const handleClearLogs = async () => {
    if (!selectedProjectId) return;
    try {
      await api.delete(`/logs/project/${selectedProjectId}/clear`);
      setLogs([]);
      setLiveCount(0);
      toast.success("Logs purged");
    } catch {
      toast.error("Failed to clear logs");
    }
  };

  const copyToClipboard = (text: string, type: "url" | "cmd") => {
    navigator.clipboard.writeText(text);
    if (type === "url") {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    }
    toast.success("Copied to clipboard");
  };

  const getShellCommand = () => {
    if (!webhookInfo?.webhookUrl) return "";
    if (shellTab === "curl") {
      return `curl -X POST "${webhookInfo.webhookUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"device_id": "SN-902", "telemetry": {"temp": 28.4, "status": "active"}}'`;
    }
    if (shellTab === "powershell") {
      return `Invoke-RestMethod -Uri "${webhookInfo.webhookUrl}" \`\n  -Method POST \`\n  -ContentType "application/json" \`\n  -Body '{"device_id": "SN-902", "telemetry": {"temp": 28.4, "status": "active"}}'`;
    }
    return `import requests\n\nurl = "${webhookInfo.webhookUrl}"\npayload = {\n    "device_id": "SN-902",\n    "telemetry": {"temp": 28.4, "status": "active"}\n}\nresponse = requests.post(url, json=payload)\nprint(response.status_code, response.text)`;
  };

  return (
    <div className="space-y-4">
      {/* Precision Instrument Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-md p-4 shadow-hairline">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-blue-50 text-blue-800 border border-blue-200">
              <Webhook className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">
                  Webhook Ingestion Listener
                </h1>
                {webhookInfo?.webhookEnabled ? (
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LISTENING_HTTP_POST
                  </span>
                ) : (
                  <span className="font-mono text-[10px] font-medium px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200">
                    NO_ACTIVE_ENDPOINT
                  </span>
                )}
              </div>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                PUBLIC_GATEWAY // INGESTION_BUS // REALTIME_PAYLOAD_MAPPER
              </p>
            </div>
          </div>

          {liveCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-50 border border-emerald-200 font-mono text-xs text-emerald-800 font-semibold self-start sm:self-auto">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>+{liveCount} INGESTED THIS SESSION</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Config Station (5 cols) & Live Teleprinter (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Endpoint Config & Schema Mapper (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Node Selector & URL Card */}
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                ENDPOINT_CONFIGURATION
              </span>
              <span className="font-mono text-[10px] text-[#64748B]">PORT 4000</span>
            </div>

            <div className="p-4 space-y-3.5">
              <div>
                <label className="text-[10px] font-mono text-[#64748B] uppercase block mb-1">
                  TARGET_SIMULATION_NODE
                </label>
                <select
                  className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded text-xs font-mono bg-white focus:border-[#2563EB] outline-none"
                  value={selectedProjectId}
                  onChange={(e) => handleProjectChange(e.target.value)}
                >
                  <option value="">-- Select Project Node --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.protocol})
                    </option>
                  ))}
                </select>
              </div>

              {selectedProjectId && (
                <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
                  {webhookInfo?.webhookEnabled && webhookInfo.webhookUrl ? (
                    <>
                      <div>
                        <label className="text-[10px] font-mono text-[#64748B] uppercase block mb-1">
                          PUBLIC_INGESTION_URL
                        </label>
                        <div className="flex items-center gap-1.5 p-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded">
                          <code className="text-xs font-mono text-[#0F172A] flex-1 break-all select-all">
                            {webhookInfo.webhookUrl}
                          </code>
                          <button
                            onClick={() => copyToClipboard(webhookInfo.webhookUrl!, "url")}
                            className="p-1.5 rounded hover:bg-slate-200 text-[#475569] transition-colors"
                            title="Copy URL"
                          >
                            {copiedUrl ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Code Generator Snippets */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 font-mono text-[10px]">
                            {(["curl", "powershell", "python"] as const).map((tab) => (
                              <button
                                key={tab}
                                onClick={() => setShellTab(tab)}
                                className={`px-2 py-0.5 rounded uppercase font-semibold transition-colors ${
                                  shellTab === tab
                                    ? "bg-[#0F172A] text-white"
                                    : "text-[#64748B] hover:bg-slate-100"
                                }`}
                              >
                                {tab}
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() => copyToClipboard(getShellCommand(), "cmd")}
                            className="text-[10px] font-mono text-[#2563EB] hover:underline flex items-center gap-1"
                          >
                            {copiedCmd ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            <span>{copiedCmd ? "COPIED" : "COPY_CMD"}</span>
                          </button>
                        </div>

                        <pre className="font-mono text-xs bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 rounded text-[#0F172A] overflow-x-auto leading-relaxed max-h-36">
                          {getShellCommand()}
                        </pre>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={handleGenerate}
                          disabled={generating}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-mono font-medium px-3 py-1.5 rounded border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC]"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>ROTATE_TOKEN</span>
                        </button>
                        <button
                          onClick={handleClear}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-mono font-medium px-3 py-1.5 rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>DEACTIVATE</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-6 text-center text-slate-500 font-mono text-xs space-y-3">
                      <p>No active public endpoint generated for this node.</p>
                      <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B]"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        <span>{generating ? "Generating..." : "Generate Public Webhook"}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Webhook Schema Mapper Card */}
          {selectedProjectId && (
            <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                    SCHEMA_MAPPER
                  </span>
                  <span className="text-[10px] font-mono text-[#64748B]">
                    JSON_TRANSFORM
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-[10px] text-[#64748B]">STATUS:</span>
                  <button
                    onClick={() => setMappingActive(!mappingActive)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      mappingActive
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {mappingActive ? "ACTIVE" : "BYPASS"}
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <p className="text-[11px] text-[#64748B] font-sans">
                  Extract deep variables from external payloads (e.g.{" "}
                  <code className="text-[#2563EB] font-mono">telemetry.temp</code> &rarr;{" "}
                  <code className="text-[#0F172A] font-mono">temperature</code>) for uniform telemetry ingestion.
                </p>

                {mappings.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 font-mono text-xs border border-dashed rounded bg-[#F8FAFC]">
                    NO_MAPPING_RULES_DEFINED. Raw payloads will pass unaltered.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {mappings.map((mapping) => (
                      <div
                        key={mapping.id}
                        className="grid grid-cols-12 gap-2 items-center text-xs font-mono"
                      >
                        <div className="col-span-5">
                          <input
                            type="text"
                            value={mapping.externalPath}
                            placeholder="payload.temp"
                            onChange={(e) =>
                              updateMappingRow(mapping.id, "externalPath", e.target.value)
                            }
                            className="w-full h-7 px-2 border border-[#CBD5E1] rounded bg-white"
                          />
                        </div>
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={mapping.internalKey}
                            placeholder="temperature"
                            onChange={(e) =>
                              updateMappingRow(mapping.id, "internalKey", e.target.value)
                            }
                            className="w-full h-7 px-2 border border-[#CBD5E1] rounded bg-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <select
                            value={mapping.dataType}
                            onChange={(e) =>
                              updateMappingRow(mapping.id, "dataType", e.target.value as any)
                            }
                            className="w-full h-7 px-1 border border-[#CBD5E1] rounded bg-white text-[10px]"
                          >
                            <option value="number">Number</option>
                            <option value="string">String</option>
                            <option value="boolean">Boolean</option>
                          </select>
                        </div>
                        <div className="col-span-1 text-right">
                          <button
                            onClick={() => removeMappingRow(mapping.id)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
                  <button
                    onClick={addMappingRow}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-[#2563EB] hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Transform Rule</span>
                  </button>
                  <button
                    onClick={handleSaveMapping}
                    disabled={savingMapping}
                    className="px-3 py-1.5 text-xs font-mono font-bold bg-[#0F172A] text-white rounded hover:bg-[#1E293B]"
                  >
                    {savingMapping ? "SAVING..." : "SAVE_MAPPINGS"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Webhook Requests Teleprinter (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden flex flex-col h-[680px]">
            {/* Teleprinter Header */}
            <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#0F172A]" />
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  INGESTED_REQUESTS_LOG
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-bold">
                  {logs.length} EVENTS
                </span>
              </div>

              {logs.length > 0 && (
                <button
                  onClick={handleClearLogs}
                  className="text-[11px] font-mono text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>CLEAR_LOGS</span>
                </button>
              )}
            </div>

            {/* Ingestion Stream */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-xs">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center space-y-2 p-8">
                  <Webhook className="h-10 w-10 opacity-20" />
                  <p className="uppercase text-xs tracking-wider">
                    NO_INGESTED_WEBHOOKS_YET
                  </p>
                  <p className="text-[11px] font-sans text-slate-400 max-w-sm">
                    Select a project node, copy the endpoint URL, and send HTTP POST requests from your external devices or cloud gateways.
                  </p>
                </div>
              ) : (
                logs.map((log) => {
                  let formatted = log.payload || "{}";
                  try {
                    const parsed = JSON.parse(log.payload || "{}");
                    formatted = JSON.stringify(parsed, null, 2);
                  } catch {}

                  return (
                    <div
                      key={log.id}
                      className="border border-[#E2E8F0] rounded bg-white shadow-hairline overflow-hidden"
                    >
                      <div className="px-3 py-1.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            HTTP 200 OK
                          </span>
                          <span className="text-slate-400">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="text-[#64748B] font-sans truncate max-w-[220px]">
                            {log.message.split("[")[0].trim()}
                          </span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(formatted, "cmd")}
                          className="text-slate-400 hover:text-[#0F172A]"
                          title="Copy JSON Payload"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                      <pre className="p-3 bg-white text-[#0F172A] font-mono text-xs overflow-x-auto max-h-48 leading-relaxed">
                        {formatted}
                      </pre>
                    </div>
                  );
                })
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
