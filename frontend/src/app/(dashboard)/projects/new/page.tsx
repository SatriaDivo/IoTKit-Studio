"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import { ProtocolType } from "@/types";
import { parseHostInput } from "@/lib/utils";
import {
  FolderPlus,
  ArrowLeft,
  Plus,
  Trash2,
  Terminal,
  Cpu,
  Layers,
  Radio,
  ShieldCheck,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

export default function NewProjectPage() {
  const router = useRouter();
  const { createProject } = useProjectStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    protocol: "HTTP" as ProtocolType,
    host: "",
    port: "80",
    endpoint: "",
    topic: "",
    authToken: "",
    headers: "",
    username: "",
    password: "",
    sslEnabled: false,
    autoReconnect: true,
  });

  const [headerItems, setHeaderItems] = useState<{ key: string; value: string }[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.host.trim()) {
      toast.error("Please fill in mandatory node identifier and host");
      return;
    }

    setLoading(true);

    try {
      const data = {
        ...formData,
        port: formData.port ? parseInt(formData.port) : undefined,
        headers:
          headerItems.length > 0
            ? JSON.stringify(headerItems.filter((h) => h.key.trim() !== ""))
            : undefined,
        status: "inactive" as const,
      };
      const newProject = await createProject(data);
      toast.success("Simulation node successfully provisioned");
      router.push(`/projects/${newProject.id}`);
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error("Failed to provision simulation node");
    } finally {
      setLoading(false);
    }
  };

  const protocols: ProtocolType[] = [
    "HTTP",
    "HTTPS",
    "MQTT",
    "MQTTS",
    "WS",
    "WSS",
  ];

  const handleProtocolSelect = (protocol: ProtocolType) => {
    let defaultPort = formData.port;
    if (protocol === "HTTP" || protocol === "WS") defaultPort = "80";
    else if (protocol === "HTTPS" || protocol === "WSS") defaultPort = "443";
    else if (protocol === "MQTT") defaultPort = "1883";
    else if (protocol === "MQTTS") defaultPort = "8883";

    setFormData({
      ...formData,
      protocol,
      port: defaultPort,
    });
  };

  const constructPreviewUrl = () => {
    const proto = formData.protocol.toLowerCase();
    const host = formData.host || "localhost";
    const port = formData.port ? `:${formData.port}` : "";
    if (proto.includes("mqtt")) {
      const topic = formData.topic ? `/${formData.topic}` : "";
      return `${proto}://${host}${port}${topic}`;
    }
    const endpoint = formData.endpoint
      ? formData.endpoint.startsWith("/")
        ? formData.endpoint
        : `/${formData.endpoint}`
      : "";
    return `${proto}://${host}${port}${endpoint}`;
  };

  return (
    <div className="space-y-4">
      {/* Precision Instrument Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-md p-4 shadow-hairline">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/projects")}
              className="p-2 rounded bg-slate-100 text-[#0F172A] border border-slate-200 hover:bg-slate-200 transition-colors"
              title="Back to Nodes Matrix"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">
                  Provision Simulation Node
                </h1>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                  TOPOLOGY_BUILDER
                </span>
              </div>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                DISPATCH_CHANNEL: {formData.protocol}{" // "}PORT: {formData.port || "DEFAULT"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Split: 8 cols Form, 4 cols Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Form Container (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Station 1: Node Identification & Protocol */}
            <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  NODE_IDENTIFICATION_&amp;_PROTOCOL
                </span>
                <span className="font-mono text-[10px] text-[#64748B]">STEP 01</span>
              </div>

              <div className="p-4 space-y-3.5 text-xs">
                <div>
                  <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                    SIMULATION_NODE_NAME *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scada_Turbine_Cluster_01"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-8 px-2.5 font-sans border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                    NODE_DESCRIPTION / INTENT (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ingestion channel for high frequency vibration telemetry"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full h-8 px-2.5 font-sans border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1.5">
                    TRANSMISSION_PROTOCOL *
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {protocols.map((proto) => {
                      const isSelected = formData.protocol === proto;
                      return (
                        <button
                          key={proto}
                          type="button"
                          onClick={() => handleProtocolSelect(proto)}
                          className={`h-8 rounded text-xs font-mono font-bold transition-all border ${
                            isSelected
                              ? "bg-[#0F172A] text-white border-[#0F172A] shadow-xs"
                              : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          {proto}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Station 2: Connection & Target */}
            <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  CONNECTION_TARGET_PARAMETERS
                </span>
                <span className="font-mono text-[10px] text-[#64748B]">STEP 02</span>
              </div>

              <div className="p-4 space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                      TARGET_HOST / IP *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. localhost, broker.emqx.io, api.iotkit.io"
                      value={formData.host}
                      onChange={(e) => {
                        const val = e.target.value;
                        const parsed = parseHostInput(val);
                        if (parsed) {
                          setFormData({
                            ...formData,
                            host: parsed.host,
                            protocol: parsed.protocol as ProtocolType,
                            port: parsed.port,
                            endpoint:
                              parsed.protocol.includes("HTTP") ||
                              parsed.protocol.includes("WS")
                                ? parsed.path
                                : formData.endpoint,
                            topic: parsed.protocol.includes("MQTT")
                              ? parsed.path.startsWith("/")
                                ? parsed.path.slice(1)
                                : parsed.path
                              : formData.topic,
                          });
                        } else {
                          setFormData({ ...formData, host: val });
                        }
                      }}
                      className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                      Supports full URI input (e.g. http://192.168.1.100:8080/data)
                    </span>
                  </div>

                  <div>
                    <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                      PORT
                    </label>
                    <input
                      type="number"
                      placeholder="80"
                      value={formData.port}
                      onChange={(e) =>
                        setFormData({ ...formData, port: e.target.value })
                      }
                      className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                {(formData.protocol.includes("HTTP") ||
                  formData.protocol.includes("WS")) && (
                  <div>
                    <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                      ENDPOINT_ROUTE / PATH
                    </label>
                    <input
                      type="text"
                      placeholder="/api/v1/telemetry"
                      value={formData.endpoint}
                      onChange={(e) =>
                        setFormData({ ...formData, endpoint: e.target.value })
                      }
                      className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                    />
                  </div>
                )}

                {formData.protocol.includes("MQTT") && (
                  <div>
                    <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                      MQTT_TOPIC
                    </label>
                    <input
                      type="text"
                      placeholder="factory/line1/sensor/dht22"
                      value={formData.topic}
                      onChange={(e) =>
                        setFormData({ ...formData, topic: e.target.value })
                      }
                      className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Station 3: Ingestion Security & Headers */}
            <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  INGESTION_SECURITY_&amp;_HEADERS
                </span>
                <span className="font-mono text-[10px] text-[#64748B]">STEP 03</span>
              </div>

              <div className="p-4 space-y-3.5 text-xs">
                <div>
                  <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                    BEARER_AUTH_TOKEN (OPTIONAL)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter static Bearer token if required"
                    value={formData.authToken}
                    onChange={(e) =>
                      setFormData({ ...formData, authToken: e.target.value })
                    }
                    className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-[10px] text-[#64748B] uppercase">
                      CUSTOM_HTTP_HEADERS
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setHeaderItems([...headerItems, { key: "", value: "" }])
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-[#0F172A] hover:text-[#2563EB] transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      <span>ADD_HEADER</span>
                    </button>
                  </div>

                  {headerItems.length === 0 ? (
                    <div className="p-3 text-center rounded border border-dashed border-slate-200 text-slate-400 font-mono text-[11px]">
                      No custom headers specified. Standard Content-Type: application/json will be used.
                    </div>
                  ) : (
                    <div className="space-y-1.5 font-mono">
                      {headerItems.map((header, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            placeholder="Header Key (e.g. X-API-KEY)"
                            value={header.key}
                            onChange={(e) => {
                              const newHeaders = [...headerItems];
                              newHeaders[index].key = e.target.value;
                              setHeaderItems(newHeaders);
                            }}
                            className="flex-1 h-7 px-2 border border-[#CBD5E1] rounded text-xs bg-white outline-none focus:border-[#2563EB]"
                          />
                          <input
                            placeholder="Header Value"
                            value={header.value}
                            onChange={(e) => {
                              const newHeaders = [...headerItems];
                              newHeaders[index].value = e.target.value;
                              setHeaderItems(newHeaders);
                            }}
                            className="flex-1 h-7 px-2 border border-[#CBD5E1] rounded text-xs bg-white outline-none focus:border-[#2563EB]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newHeaders = [...headerItems];
                              newHeaders.splice(index, 1);
                              setHeaderItems(newHeaders);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => router.push("/projects")}
                className="px-4 py-2 rounded text-xs font-mono font-medium border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC] transition-colors"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded text-xs font-mono font-bold bg-[#0F172A] text-white hover:bg-[#1E293B] shadow-xs disabled:opacity-50 transition-all"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                <span>{loading ? "PROVISIONING..." : "PROVISION_NODE"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Rail: Live Preview & Inspection (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden sticky top-4">
            <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                LIVE_TARGET_SYNTHESIS
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="p-4 space-y-4 text-xs font-mono">
              <div>
                <span className="text-[10px] text-[#64748B] uppercase block mb-1">
                  CONSTRUCTED_TARGET_URI
                </span>
                <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] break-all font-bold text-[#0F172A]">
                  {constructPreviewUrl()}
                </div>
              </div>

              <div className="space-y-2 border-t border-[#F1F5F9] pt-3 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">PROTOCOL:</span>
                  <span className="px-1.5 py-0.2 rounded font-bold bg-slate-100 text-[#0F172A] border border-slate-200">
                    {formData.protocol}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">ASSIGNED_PORT:</span>
                  <span className="text-[#0F172A] font-bold">
                    {formData.port || "DEFAULT"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">AUTHENTICATION:</span>
                  <span
                    className={
                      formData.authToken ? "text-emerald-700 font-bold" : "text-slate-400"
                    }
                  >
                    {formData.authToken ? "BEARER_ENABLED" : "NONE"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">INJECTED_HEADERS:</span>
                  <span className="text-[#0F172A] font-bold">
                    {headerItems.filter((h) => h.key.trim() !== "").length}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded bg-blue-50/50 border border-blue-200/60 font-sans text-[11px] text-[#334155] leading-relaxed">
                After provisioning, you will be automatically redirected to the schema editor workbench to define payload structures and streaming frequencies.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
