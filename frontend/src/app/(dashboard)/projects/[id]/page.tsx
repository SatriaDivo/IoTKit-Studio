"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Play, Plus, X, Upload, Square, Trash2 } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const [lastSentPayload, setLastSentPayload] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [editingProject, setEditingProject] = useState(false);
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

  const [headerItems, setHeaderItems] = useState<{key: string, value: string}[]>([]);

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
      stages: [{ duration: 30, target: 100 }], // default k6-like stage
      chaosMode: false,
      chaosProbability: 5,
      chaosFields: [] as string[],
    };

    if (typeof window !== "undefined") {
      // params.id is available from useParams() synchronously
      const saved = localStorage.getItem(`simSettings_${params?.id}`);
      if (saved) {
        try {
          return { ...defaultSettings, ...JSON.parse(saved) };
        } catch (e) {}
      }
    }
    return defaultSettings;
  });

  // Ref-based interval — immune to stale closures
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const projectIdRef = useRef<string>("");

  // ─── Polling helpers ────────────────────────────────────────────────────────

  const clearPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startPolling = (projectId: string) => {
    clearPolling(); // ensure no duplicate
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
    }, 5000);
  };

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  // Save simulation settings to localStorage

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
    fetchProject(id).finally(() => setLoading(false));

    // Load project data for editing
    fetchProject(id).then(() => {
      if (currentProject) {
        setProjectData({
          name: currentProject.name || "",
          description: currentProject.description || "",
          protocol: currentProject.protocol || "",
          host: currentProject.host || "",
          port: currentProject.port?.toString() || "",
          endpoint: currentProject.endpoint || "",
          topic: currentProject.topic || "",
          username: currentProject.username || "",
          password: currentProject.password || "",
          authToken: currentProject.authToken || "",
        });
        
        if (currentProject.headers) {
          try {
            const parsed = JSON.parse(currentProject.headers);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setHeaderItems(parsed);
            }
          } catch(e) {
            // ignore
          }
        }
      }
    });

    // Load saved payload configuration
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
      .catch(() => {}); // No payload yet, use default

    // Load available datasets
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

    // Check if simulation is already running when entering the page
    api
      .get(`/simulations/status/${id}`)
      .then(({ data }) => {
        setIsSimulationRunning(data.isRunning);
        if (data.stats) setSimulationStats(data.stats);
        if (data.isRunning) startPolling(id);
      })
      .catch(() => {
        // 404 = no simulation yet, that's fine
        setIsSimulationRunning(false);
      });

    // Cleanup on unmount — guaranteed via ref
    return () => clearPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // ─── Socket Connection ───────────────────────────────────────────────────────
  useEffect(() => {
    const id = params.id as string;
    if (!id) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const socket = io(API_URL);

    socket.on("connect", () => {
      socket.emit("subscribe", id);
    });

    socket.on("payloadSent", (data) => {
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

    socket.on("payloadError", (data) => {
      setLastResponse({
        type: "error",
        error: data.error,
        timestamp: new Date().toISOString(),
      });
    });

    return () => {
      socket.emit("unsubscribe", id);
      socket.disconnect();
    };
  }, [params.id]);

  // ─── Payload helpers ─────────────────────────────────────────────────────────

  const addPayloadField = () => {
    setPayloadFields([
      ...payloadFields,
      {
        name: `field_${payloadFields.length + 1}`,
        type: "string",
        mode: "static",
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

  const updatePayloadField = (
    index: number,
    updates: Partial<PayloadField>,
  ) => {
    setPayloadFields(
      payloadFields.map((f, i) => (i === index ? { ...f, ...updates } : f)),
    );
    setHasUnsavedChanges(true);
  };

  // ─── Save ────────────────────────────────────────────────────────────────────

  const saveProject = async () => {
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
        headers: headerItems.length > 0 ? JSON.stringify(headerItems.filter(h => h.key.trim() !== "")) : null,
        username: projectData.username || null,
        password: projectData.password || null,
      });
      await fetchProject(params.id as string);
      setEditingProject(false);
      toast.success("Project updated successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update project");
      throw err;
    }
  };

  const savePayload = async () => {
    // Check if payload already exists for this project → update, else create
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
      // If GET fails (404), just create new
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

  const handleSave = async () => {
    if (payloadFields.length === 0) {
      toast.error("Add at least one payload field");
      return;
    }
    setSaving(true);
    try {
      await savePayload();
      toast.success("Configuration saved!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ─── Simulation ──────────────────────────────────────────────────────────────

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
      toast("Saving payload first...", { icon: "💾" });
      setSaving(true);
      try {
        await savePayload();
      } catch {
        toast.error("Failed to save payload");
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    setStarting(true);
    try {
      const structure = useDataset
        ? [
            ...(Array.isArray(payloadFields) ? payloadFields.filter(f => f.mode === "static") : []),
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
        stages: simulationSettings.stages.map((stage) => ({
          duration: parseInt(stage.duration as any) || 0,
          target: parseInt(stage.target as any) || 0,
        })),
        chaosMode: simulationSettings.chaosMode,
        chaosProbability: parseInt(simulationSettings.chaosProbability as any) || 5,
        chaosFields: simulationSettings.chaosFields,
      });
      setIsSimulationRunning(true);
      toast.success("Simulation started!");
      startPolling(params.id as string);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to start simulation");
    } finally {
      setStarting(false);
    }
  };

  const handleStopSimulation = async () => {
    setStopping(true);
    try {
      await api.post("/simulations/stop", { projectId: params.id });
      setIsSimulationRunning(false);
      clearPolling();
      toast.success("Simulation stopped!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to stop simulation");
    } finally {
      setStopping(false);
    }
  };

  // ─── Import JSON ─────────────────────────────────────────────────────────────

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
      toast.success(`Imported ${fields.length} fields!`);
    } catch {
      toast.error("Invalid JSON format.");
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Project not found</h2>
          <Button onClick={() => router.push("/projects")}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/projects")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{currentProject.name}</h1>
            <p className="text-muted-foreground">
              {currentProject.description || "No description"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              if (editingProject) {
                setSaving(true);
                try {
                  await saveProject();
                } catch (err) {
                  // Error already handled in saveProject
                } finally {
                  setSaving(false);
                }
              }
            }}
            disabled={saving || isSimulationRunning || !editingProject}
          >
            <Save className="h-4 w-4 mr-2" />
            Update
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={saving || isSimulationRunning || !hasUnsavedChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button
            onClick={handleStartSimulation}
            disabled={
              starting || payloadFields.length === 0 || isSimulationRunning
            }
          >
            <Play className="h-4 w-4 mr-2" />
            Start
          </Button>
          <Button
            variant="destructive"
            onClick={handleStopSimulation}
            disabled={stopping || !isSimulationRunning}
          >
            <Square className="h-4 w-4 mr-2" />
            Stop
          </Button>
        </div>
      </div>

      {/* Project Info + Payload Config */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Left: Project Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1"
        >
          <Card className="glass h-[500px] flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Project Information</CardTitle>
                  <CardDescription>Basic project configuration</CardDescription>
                </div>
                {!editingProject ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setProjectData({
                        name: currentProject.name || "",
                        description: currentProject.description || "",
                        protocol: currentProject.protocol || "",
                        host: currentProject.host || "",
                        port: currentProject.port?.toString() || "",
                        endpoint: currentProject.endpoint || "",
                        topic: currentProject.topic || "",
                        username: currentProject.username || "",
                        password: currentProject.password || "",
                      });
                      setEditingProject(true);
                    }}
                    disabled={isSimulationRunning}
                  >
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingProject(false)}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveProject} disabled={saving}>
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4">
              {!editingProject ? (
                <>
                  <div className="space-y-2">
                    <Label>Protocol</Label>
                    <div className="text-lg font-semibold text-primary">
                      {currentProject.protocol}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Host</Label>
                    <div className="font-mono text-sm">
                      {currentProject.host}
                    </div>
                  </div>
                  {currentProject.port && (
                    <div className="space-y-2">
                      <Label>Port</Label>
                      <div className="font-mono text-sm">
                        {currentProject.port}
                      </div>
                    </div>
                  )}
                  {currentProject.endpoint && (
                    <div className="space-y-2">
                      <Label>Endpoint</Label>
                      <div className="font-mono text-sm">
                        {currentProject.endpoint}
                      </div>
                    </div>
                  )}
                  {currentProject.topic && (
                    <div className="space-y-2">
                      <Label>Topic</Label>
                      <div className="font-mono text-sm">
                        {currentProject.topic}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      value={projectData.name}
                      onChange={(e) =>
                        setProjectData({ ...projectData, name: e.target.value })
                      }
                      placeholder="My IoT Project"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={projectData.description}
                      onChange={(e) =>
                        setProjectData({
                          ...projectData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Project description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="protocol">Protocol</Label>
                    <select
                      id="protocol"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={projectData.protocol}
                      onChange={(e) => {
                        const protocol = e.target.value;
                        let defaultPort = projectData.port;
                        
                        if (protocol === "HTTP" || protocol === "WS") defaultPort = "80";
                        else if (protocol === "HTTPS" || protocol === "WSS") defaultPort = "443";
                        else if (protocol === "MQTT") defaultPort = "1883";
                        else if (protocol === "MQTTS") defaultPort = "8883";

                        setProjectData({
                          ...projectData,
                          protocol,
                          port: defaultPort,
                        });
                      }}
                    >
                      <option value="HTTP">HTTP</option>
                      <option value="HTTPS">HTTPS</option>
                      <option value="MQTT">MQTT</option>
                      <option value="MQTTS">MQTTS</option>
                      <option value="WS">WebSocket</option>
                      <option value="WSS">WebSocket Secure</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="host">Host</Label>
                    <Input
                      id="host"
                      value={projectData.host}
                      onChange={(e) => {
                        const value = e.target.value;
                        const parsed = parseHostInput(value);
                        if (parsed) {
                          setProjectData({
                            ...projectData,
                            host: parsed.host,
                            protocol: parsed.protocol,
                            port: parsed.port,
                            endpoint: parsed.protocol.includes("HTTP") || parsed.protocol.includes("WS") ? parsed.path : projectData.endpoint,
                            topic: parsed.protocol.includes("MQTT") ? (parsed.path.startsWith("/") ? parsed.path.slice(1) : parsed.path) : projectData.topic,
                          });
                        } else {
                          setProjectData({ ...projectData, host: value });
                        }
                      }}
                      placeholder="broker.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      value={projectData.port}
                      onChange={(e) =>
                        setProjectData({ ...projectData, port: e.target.value })
                      }
                      placeholder="1883"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endpoint">Endpoint</Label>
                    <Input
                      id="endpoint"
                      value={projectData.endpoint}
                      onChange={(e) =>
                        setProjectData({
                          ...projectData,
                          endpoint: e.target.value,
                        })
                      }
                      placeholder="/api/data"
                    />
                  </div>
                  {(projectData.protocol === "MQTT" ||
                    projectData.protocol === "MQTTS") && (
                    <div className="space-y-2">
                      <Label htmlFor="topic">Topic</Label>
                      <Input
                        id="topic"
                        value={projectData.topic}
                        onChange={(e) =>
                          setProjectData({
                            ...projectData,
                            topic: e.target.value,
                          })
                        }
                        placeholder="sensors/temperature"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="username">Username (Optional)</Label>
                    <Input
                      id="username"
                      value={projectData.username}
                      onChange={(e) =>
                        setProjectData({
                          ...projectData,
                          username: e.target.value,
                        })
                      }
                      placeholder="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password (Optional)</Label>
                    <Input
                      id="password"
                      type="password"
                      value={projectData.password}
                      onChange={(e) =>
                        setProjectData({
                          ...projectData,
                          password: e.target.value,
                        })
                      }
                      placeholder="password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="authToken">Authentication Token (Bearer)</Label>
                    <Input
                      id="authToken"
                      type="password"
                      value={projectData.authToken}
                      onChange={(e) =>
                        setProjectData({
                          ...projectData,
                          authToken: e.target.value,
                        })
                      }
                      placeholder="Optional"
                    />
                  </div>
                  
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <Label>Custom Headers</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setHeaderItems([...headerItems, { key: "", value: "" }])}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Header
                      </Button>
                    </div>
                    {headerItems.map((header, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          placeholder="Key (e.g. X-API-Key)"
                          value={header.key}
                          onChange={(e) => {
                            const newHeaders = [...headerItems];
                            newHeaders[index].key = e.target.value;
                            setHeaderItems(newHeaders);
                          }}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Value"
                          value={header.value}
                          onChange={(e) => {
                            const newHeaders = [...headerItems];
                            newHeaders[index].value = e.target.value;
                            setHeaderItems(newHeaders);
                          }}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newHeaders = [...headerItems];
                            newHeaders.splice(index, 1);
                            setHeaderItems(newHeaders);
                          }}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: Payload Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="glass h-[500px] flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payload Configuration</CardTitle>
                  <CardDescription>
                    Configure your IoT payload structure or replay a dataset
                  </CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  {!useDataset && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowImportDialog(true)}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Import JSON
                      </Button>
                      <Button size="sm" onClick={addPayloadField}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Field
                      </Button>
                    </>
                  )}
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg ml-2">
                    <Button 
                      size="sm" 
                      variant={!useDataset ? "default" : "ghost"}
                      className={!useDataset ? "bg-blue-600 shadow-sm" : ""}
                      onClick={() => setUseDataset(false)}
                    >
                      Builder
                    </Button>
                    <Button 
                      size="sm" 
                      variant={useDataset ? "default" : "ghost"}
                      className={useDataset ? "bg-blue-600 shadow-sm" : ""}
                      onClick={() => setUseDataset(true)}
                    >
                      Dataset Replay
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              {useDataset ? (
                <div className="flex flex-col h-full space-y-4">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-1">Dataset Playback Mode</h3>
                    <p className="text-sm text-blue-700">
                      In this mode, the simulation will read your selected CSV dataset row by row, sending each row as a JSON object.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Select Dataset</Label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm outline-none focus:ring-1 focus:ring-blue-500"
                      value={selectedDatasetId}
                      onChange={(e) => setSelectedDatasetId(e.target.value)}
                    >
                      <option value="" disabled>-- Select a dataset --</option>
                      {datasets.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.loadedRows} rows) - Category: {d.moduleName}</option>
                      ))}
                    </select>
                    {datasets.length === 0 && (
                      <p className="text-xs text-red-500">No datasets found. Please upload one in the Datasets menu.</p>
                    )}
                  </div>
                </div>
              ) : payloadFields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm mb-4">No fields added yet</p>
                  <Button variant="outline" onClick={addPayloadField}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Field
                  </Button>
                </div>
              ) : (
                <div className="h-full flex flex-col space-y-4">
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {payloadFields.map((field, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-3 space-y-2 relative bg-card"
                      >
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => removePayloadField(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <div className="grid grid-cols-4 gap-2 pr-6">
                          <div className="space-y-1">
                            <Label className="text-xs">Name</Label>
                            <Input
                              value={field.name}
                              onChange={(e) =>
                                updatePayloadField(index, {
                                  name: e.target.value,
                                })
                              }
                              placeholder="field_name"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Type</Label>
                            <select
                              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                              value={field.type}
                              onChange={(e) =>
                                updatePayloadField(index, {
                                  type: e.target.value as PayloadField["type"],
                                })
                              }
                            >
                              <option value="string">String</option>
                              <option value="number">Number</option>
                              <option value="boolean">Boolean</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Mode</Label>
                            <select
                              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                              value={field.mode}
                              onChange={(e) =>
                                updatePayloadField(index, {
                                  mode: e.target.value as PayloadField["mode"],
                                })
                              }
                            >
                              <option value="static">Static</option>
                              <option value="random">Random</option>
                              <option value="incremental">Incr.</option>
                              <option value="timestamp">Time</option>
                            </select>
                          </div>
                          {field.type === "number" && (
                            <div className="space-y-1">
                              <Label className="text-xs">Unit</Label>
                              <Input
                                value={field.unit || ""}
                                onChange={(e) =>
                                  updatePayloadField(index, {
                                    unit: e.target.value,
                                  })
                                }
                                placeholder="°C, %, ppm"
                                className="h-8 text-xs"
                              />
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-2 pr-6">
                          {field.mode === "static" && (
                            <div className="space-y-1 col-span-2">
                              <Label className="text-xs">Value</Label>
                              <Input
                                value={field.value || ""}
                                onChange={(e) =>
                                  updatePayloadField(index, {
                                    value: e.target.value,
                                  })
                                }
                                placeholder="Enter value"
                                className="h-8 text-xs"
                              />
                            </div>
                          )}
                          {field.mode === "random" &&
                            field.type === "number" && (
                              <div className="space-y-1 col-span-4">
                                <Label className="text-xs">Range</Label>
                                <div className="flex gap-2 items-center">
                                  <Input
                                    type="number"
                                    value={field.min || 0}
                                    onChange={(e) =>
                                      updatePayloadField(index, {
                                        min: parseFloat(e.target.value),
                                      })
                                    }
                                    placeholder="Min"
                                    className="h-8 text-xs"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    to
                                  </span>
                                  <Input
                                    type="number"
                                    value={field.max || 100}
                                    onChange={(e) =>
                                      updatePayloadField(index, {
                                        max: parseFloat(e.target.value),
                                      })
                                    }
                                    placeholder="Max"
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>
                            )}
                          {field.mode === "incremental" &&
                            field.type === "number" && (
                              <div className="space-y-1 col-span-2">
                                <Label className="text-xs">Start Value</Label>
                                <Input
                                  type="number"
                                  value={field.value || 0}
                                  onChange={(e) =>
                                    updatePayloadField(index, {
                                      value: parseFloat(e.target.value),
                                    })
                                  }
                                  placeholder="0"
                                  className="h-8 text-xs"
                                />
                              </div>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {!useDataset && (
                    <div className="border-t pt-3">
                      <h4 className="text-xs font-semibold mb-2">
                        JSON Preview:
                      </h4>
                      <pre className="bg-muted p-2 rounded-md text-xs overflow-x-auto max-h-[120px] overflow-y-auto">
                        {JSON.stringify(
                          payloadFields.reduce(
                            (acc, f) => {
                              acc[f.name] =
                                f.mode === "static"
                                  ? f.value
                                  : f.mode === "random" && f.type === "number"
                                    ? `<random ${f.min}-${f.max}>`
                                    : f.mode === "incremental"
                                      ? "<incremental>"
                                      : f.mode === "timestamp"
                                        ? "<timestamp>"
                                        : `<${f.mode}>`;
                              return acc;
                            },
                            {} as Record<string, any>,
                          ),
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Simulation Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle>Simulation Settings</CardTitle>
            <CardDescription>Configure simulation parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="interval">Interval (s)</Label>
                <Input
                  id="interval"
                  type="number"
                  step="0.1"
                  value={simulationSettings.interval}
                  onChange={(e) =>
                    setSimulationSettings({
                      ...simulationSettings,
                      interval: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0),
                    })
                  }
                  onBlur={() => {
                    if (simulationSettings.interval === "" || parseFloat(simulationSettings.interval as any) < 0.1) {
                      setSimulationSettings({
                        ...simulationSettings,
                        interval: 1,
                      });
                    }
                  }}
                  min={0.1}
                  disabled={isSimulationRunning}
                />
                <p className="text-xs text-muted-foreground">
                  Time between each payload send (seconds)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch">Batch Size</Label>
                <Input
                  id="batch"
                  type="number"
                  value={simulationSettings.batchSize}
                  onChange={(e) =>
                    setSimulationSettings({
                      ...simulationSettings,
                      batchSize: e.target.value === "" ? "" : (parseInt(e.target.value) || 0),
                    })
                  }
                  onBlur={() => {
                    if (simulationSettings.batchSize === "" || parseInt(simulationSettings.batchSize as any) < 1) {
                      setSimulationSettings({
                        ...simulationSettings,
                        batchSize: 1,
                      });
                    }
                  }}
                  min={1}
                  disabled={isSimulationRunning}
                />
                <p className="text-xs text-muted-foreground">
                  Number of payloads per batch
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={simulationSettings.duration}
                  onChange={(e) =>
                    setSimulationSettings({
                      ...simulationSettings,
                      duration: e.target.value === "" ? "" : (parseInt(e.target.value) || 0),
                    })
                  }
                  onBlur={() => {
                    if (simulationSettings.duration === "" || parseInt(simulationSettings.duration as any) < 0) {
                      setSimulationSettings({
                        ...simulationSettings,
                        duration: 0,
                      });
                    }
                  }}
                  min={0}
                  disabled={isSimulationRunning}
                />
                <p className="text-xs text-muted-foreground">
                  0 = run until stopped manually
                </p>
              </div>
            </div>

            {/* Swarm Mode Settings */}
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Label className="text-base flex items-center gap-2 font-semibold">
                    🐝 Swarm Mode <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-2">Load Testing</span>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Simulate multiple devices concurrently. Ideal for stress testing your broker.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{simulationSettings.swarmMode ? "Enabled" : "Disabled"}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={simulationSettings.swarmMode}
                    onClick={() => setSimulationSettings({ ...simulationSettings, swarmMode: !simulationSettings.swarmMode })}
                    disabled={isSimulationRunning}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${simulationSettings.swarmMode ? 'bg-primary' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${simulationSettings.swarmMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
              
              {simulationSettings.swarmMode && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <Label>Virtual Users (VUs) Stages</Label>
                    <button
                      type="button"
                      onClick={() => setSimulationSettings({
                        ...simulationSettings,
                        stages: [...simulationSettings.stages, { duration: 30, target: 100 }]
                      })}
                      disabled={isSimulationRunning || simulationSettings.stages.length >= 10}
                      className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-md font-medium hover:bg-primary/20 transition-colors"
                    >
                      + Add Stage
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {simulationSettings.stages.map((stage, index) => (
                      <div key={index} className="flex items-center gap-3 bg-muted/50 p-3 rounded-md">
                        <div className="flex-1 space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Duration (sec)</Label>
                          <Input 
                            type="number" 
                            value={stage.duration}
                            min={0}
                            disabled={isSimulationRunning}
                            onChange={(e) => {
                              const newStages = [...simulationSettings.stages];
                              const val = e.target.value;
                              newStages[index].duration = val === "" ? "" : (parseInt(val) || 0) as any;
                              setSimulationSettings({...simulationSettings, stages: newStages});
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Target VUs</Label>
                          <Input 
                            type="number" 
                            value={stage.target}
                            min={0}
                            max={1000}
                            disabled={isSimulationRunning}
                            onChange={(e) => {
                              const newStages = [...simulationSettings.stages];
                              const val = e.target.value;
                              let numVal = val === "" ? "" : (parseInt(val) || 0);
                              if (typeof numVal === "number" && numVal > 1000) numVal = 1000;
                              newStages[index].target = numVal as any;
                              setSimulationSettings({...simulationSettings, stages: newStages});
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                        {simulationSettings.stages.length > 1 && (
                          <button
                            type="button"
                            disabled={isSimulationRunning}
                            onClick={() => {
                              const newStages = simulationSettings.stages.filter((_, i) => i !== index);
                              setSimulationSettings({...simulationSettings, stages: newStages});
                            }}
                            className="mt-5 text-red-500 hover:text-red-700 hover:bg-red-500/10 p-1.5 rounded-md transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    * k6-like stages. Example: ramp-up to 100 VUs in 30s, hold for 60s, then ramp-down to 0 in 10s. Max 1000 VUs.
                  </p>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chaos & Anomaly Engine */}
        <Card className="glass mt-6 border-red-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-red-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h5l3-9 5 18 3-9h4"/></svg>
                  Chaos / Anomaly Injector
                </CardTitle>
                <CardDescription>
                  Inject random spikes and anomalies to test system alerts
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="chaosMode" className="text-sm cursor-pointer">
                  {simulationSettings.chaosMode ? "Enabled" : "Disabled"}
                </Label>
                <div 
                  className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors ${simulationSettings.chaosMode ? 'bg-red-500' : 'bg-muted-foreground/30'}`}
                  onClick={() => !isSimulationRunning && setSimulationSettings({...simulationSettings, chaosMode: !simulationSettings.chaosMode})}
                >
                  <motion.div 
                    className="bg-white w-3 h-3 rounded-full"
                    animate={{ x: simulationSettings.chaosMode ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {simulationSettings.chaosMode && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-4 pt-2"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Anomaly Probability</Label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={simulationSettings.chaosProbability}
                        disabled={isSimulationRunning}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSimulationSettings({
                            ...simulationSettings,
                            chaosProbability: val === "" ? "" : Math.min(100, Math.max(1, parseInt(val) || 1)) as any
                          });
                        }}
                        className="w-14 h-7 text-center text-sm font-mono font-bold text-red-500 bg-red-500/10 border border-red-500/30 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-sm font-mono font-bold text-red-500">%</span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={parseInt(simulationSettings.chaosProbability as any) || 1}
                    disabled={isSimulationRunning}
                    onChange={(e) => setSimulationSettings({...simulationSettings, chaosProbability: parseInt(e.target.value)})}
                    className="w-full accent-red-500"
                  />
                  <p className="text-xs text-muted-foreground">
                    Chance of injecting a massive spike (10x) or inverted boolean into the generated payload.
                  </p>
                </div>
                
                <div className="pt-2 border-t border-red-500/10">
                  <Label className="text-xs mb-3 block text-muted-foreground uppercase tracking-wider">Target Fields</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {payloadFields.filter(f => f.mode === 'random' && (f.type === 'number' || f.type === 'boolean')).map(field => {
                      const isSelected = simulationSettings.chaosFields.includes(field.name);
                      return (
                        <div 
                          key={field.name}
                          onClick={() => {
                            if (isSimulationRunning) return;
                            const newFields = isSelected 
                              ? simulationSettings.chaosFields.filter(f => f !== field.name)
                              : [...simulationSettings.chaosFields, field.name];
                            setSimulationSettings({...simulationSettings, chaosFields: newFields});
                          }}
                          className={`flex items-center gap-2 p-2 rounded-md border text-sm cursor-pointer transition-colors ${isSelected ? 'border-red-500 bg-red-500/10 text-red-500' : 'border-border hover:bg-muted'}`}
                        >
                          <div className={`w-3 h-3 rounded-full border ${isSelected ? 'bg-red-500 border-red-500' : 'border-muted-foreground'}`} />
                          <span className="truncate">{field.name}</span>
                        </div>
                      )
                    })}
                    {payloadFields.filter(f => f.mode === 'random' && (f.type === 'number' || f.type === 'boolean')).length === 0 && (
                      <p className="text-sm text-muted-foreground italic col-span-full">No random numeric or boolean fields available.</p>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 italic">
                    {simulationSettings.chaosFields.length === 0 
                      ? "* If none selected, all numeric & boolean fields will be affected." 
                      : "* Only selected fields will be affected by anomalies."}
                  </p>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Sent Payload (New) */}
      {lastSentPayload && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                Sent Payload
              </CardTitle>
              <CardDescription>
                The exact JSON data that was sent to the endpoint
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto max-h-[200px] overflow-y-auto font-mono border">
                {JSON.stringify(lastSentPayload, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Server Response (New) */}
      {lastResponse && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="glass border-primary/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Server Response
                    {lastResponse.statusCode && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${lastResponse.type === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                        {lastResponse.statusCode}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Last response received from endpoint
                  </CardDescription>
                </div>
                {lastResponse.latency && (
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md border">
                      {lastResponse.latency}ms latency
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(lastResponse.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto max-h-[200px] overflow-y-auto font-mono border">
                {lastResponse.type === "error" ? (
                  <span className="text-red-400">
                    {typeof (lastResponse.error || lastResponse.data) === "object"
                      ? JSON.stringify(lastResponse.error || lastResponse.data, null, 2)
                      : String(lastResponse.error || lastResponse.data)}
                  </span>
                ) : (
                  typeof lastResponse.data === "object" 
                    ? JSON.stringify(lastResponse.data, null, 2)
                    : String(lastResponse.data)
                )}
              </pre>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Live Stats */}
      {isSimulationRunning && simulationStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass border-green-500/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-green-500">
                    Simulation Running
                  </CardTitle>
                  <CardDescription>Real-time statistics</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm text-green-500">Live</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 mb-4">
                <div className="space-y-1 bg-muted p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>Total Requests</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                  </p>
                  <p className="text-2xl font-bold font-mono">
                    {simulationStats.http_reqs || simulationStats.totalSent || 0}
                  </p>
                </div>
                <div className="space-y-1 bg-muted p-3 rounded-lg border border-green-500/20">
                  <p className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>Active VUs</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  </p>
                  <p className="text-2xl font-bold text-green-500 font-mono">
                    {simulationStats.vus || 0}
                  </p>
                </div>
                <div className="space-y-1 bg-muted p-3 rounded-lg border border-blue-500/20">
                  <p className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>Req / Second</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                  </p>
                  <p className="text-2xl font-bold text-blue-500 font-mono">
                    {simulationStats.rps || 0} <span className="text-xs font-normal">req/s</span>
                  </p>
                </div>
                <div className="space-y-1 bg-muted p-3 rounded-lg border border-red-500/20">
                  <p className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>Errors</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  </p>
                  <p className="text-2xl font-bold text-red-500 font-mono">
                    {simulationStats.errorCount || 0}
                  </p>
                </div>
              </div>
              
              {simulationStats.http_req_duration && (
                <div className="bg-background rounded-lg border p-4 space-y-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    Latency Metrics (k6-style)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase">Average</p>
                      <p className="text-sm font-mono">{Math.round(simulationStats.http_req_duration.avg || 0)}ms</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase">Min</p>
                      <p className="text-sm font-mono">{Math.round(simulationStats.http_req_duration.min || 0)}ms</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase">Med</p>
                      <p className="text-sm font-mono">{Math.round(simulationStats.http_req_duration.med || 0)}ms</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase">Max</p>
                      <p className="text-sm font-mono">{Math.round(simulationStats.http_req_duration.max || 0)}ms</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase text-orange-500">P(90)</p>
                      <p className="text-sm font-mono text-orange-500 font-medium">{Math.round(simulationStats.http_req_duration.p90 || 0)}ms</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase text-red-500">P(95)</p>
                      <p className="text-sm font-mono text-red-500 font-bold">{Math.round(simulationStats.http_req_duration.p95 || 0)}ms</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Import JSON Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background border rounded-lg shadow-lg max-w-2xl w-full mx-4"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Import Payload from JSON</CardTitle>
                    <CardDescription>
                      Paste your JSON payload structure below
                    </CardDescription>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setShowImportDialog(false);
                      setImportJson("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="json-input">JSON Payload</Label>
                  <textarea
                    id="json-input"
                    className="w-full h-64 p-3 rounded-md border border-input bg-background font-mono text-sm"
                    placeholder={`{\n  "temperature": 25.5,\n  "humidity": 60\n}`}
                    value={importJson}
                    onChange={(e) => setImportJson(e.target.value)}
                  />
                </div>
                <div className="bg-muted p-3 rounded-md text-xs space-y-1">
                  <p className="font-semibold">Import Notes:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Number → Random mode (0–100 range)</li>
                    <li>String → Static mode</li>
                    <li>Boolean → Static mode</li>
                    <li>
                      Nested objects will be flattened (e.g., sensor.temp)
                    </li>
                  </ul>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowImportDialog(false);
                      setImportJson("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleImportPayload}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}
