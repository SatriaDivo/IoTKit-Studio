"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useProjectStore } from "@/store/projectStore";
import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { Copy, RefreshCw, Trash2, Webhook, Zap } from "lucide-react";

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

export default function WebhookListenerPage() {
  const { projects, fetchProjects } = useProjectStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [webhookInfo, setWebhookInfo] = useState<ProjectWebhook | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  const [shellTab, setShellTab] = useState<'powershell' | 'curl' | 'python'>('powershell');
  const socketRef = useRef<Socket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Socket.IO connection for real-time webhook events
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const socket = io(API_URL);
    socketRef.current = socket;

    socket.on("webhookReceived", (data) => {
      const newLog: WebhookLog = {
        ...data.log,
        parsedPayload: data.log.parsedPayload,
      };
      setLogs((prev) => [newLog, ...prev].slice(0, 100));
      setLiveCount((c) => c + 1);
      toast.success("📥 Incoming webhook request!", { duration: 2000 });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // When project changes, fetch info and subscribe to its webhook room
  const handleProjectChange = async (projectId: string) => {
    setSelectedProjectId(projectId);
    setLogs([]);
    setWebhookInfo(null);
    setLiveCount(0);
    if (!projectId) return;

    setLoading(true);
    try {
      const { data } = await api.get(`/webhook-manage/info/${projectId}`);
      setWebhookInfo(data);

      // Subscribe to webhook socket room
      if (data.webhookToken && socketRef.current) {
        socketRef.current.emit("subscribeWebhook", data.webhookToken);
      }

      // Load history
      const { data: historyData } = await api.get(`/webhook-manage/history/${projectId}`);
      setLogs(historyData.logs || []);
    } catch {
      toast.error("Failed to load webhook info");
    } finally {
      setLoading(false);
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
      // Subscribe to the new token room
      if (socketRef.current) {
        socketRef.current.emit("subscribeWebhook", data.token);
      }
      toast.success("Webhook endpoint generated!");
    } catch {
      toast.error("Failed to generate webhook");
    } finally {
      setGenerating(false);
    }
  };

  const handleClear = async () => {
    if (!selectedProjectId) return;
    try {
      await api.delete(`/webhook-manage/clear/${selectedProjectId}`);
      if (webhookInfo?.webhookToken && socketRef.current) {
        socketRef.current.emit("unsubscribeWebhook", webhookInfo.webhookToken);
      }
      setWebhookInfo((prev) => prev ? { ...prev, webhookToken: null, webhookEnabled: false, webhookUrl: null } : null);
      setLogs([]);
      toast.success("Webhook disabled");
    } catch {
      toast.error("Failed to disable webhook");
    }
  };

  const handleCopy = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => toast.success("Copied to clipboard!"))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (successful) {
        toast.success("Copied to clipboard!");
      } else {
        toast.error("Failed to copy");
      }
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const formatPayload = (payload: string | null, parsedPayload?: any) => {
    try {
      const obj = parsedPayload || (payload ? JSON.parse(payload) : null);
      return obj ? JSON.stringify(obj, null, 2) : "—";
    } catch (e) {
      return payload || "—";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2C3E50] flex items-center gap-3">
            <Webhook className="h-8 w-8 text-[#6A89A7]" />
            Webhook Listener
          </h1>
          <p className="text-[#5A6C7D] mt-1">
            Receive and inspect live HTTP requests from external devices or cloud services
          </p>
        </div>
        {liveCount > 0 && (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-4 py-2 rounded-lg">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-green-600 font-medium">{liveCount} received</span>
          </div>
        )}
      </div>

      {/* Project Selector & Endpoint Card */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-industrial">
          <CardHeader>
            <CardTitle>Endpoint Configuration</CardTitle>
            <CardDescription>Select a project and generate a unique webhook URL</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Project</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
              >
                <option value="">-- Choose a project --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {selectedProjectId && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {webhookInfo?.webhookEnabled && webhookInfo.webhookUrl ? (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Webhook URL (Public)</Label>
                      <div className="flex items-center gap-2 bg-muted rounded-md p-3 border">
                        <code className="text-xs flex-1 break-all text-[#6A89A7] font-mono">
                          {webhookInfo.webhookUrl}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => handleCopy(webhookInfo.webhookUrl!)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="bg-[#384959]/5 border border-[#384959]/20 rounded-md p-3 text-xs space-y-2">
                      <p className="font-semibold text-[#384959]">📡 How to use:</p>
                      <p className="text-muted-foreground">Send any HTTP request to the URL above. Body and headers will be captured.</p>

                      {/* Shell Tab Selector & Copy Button */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex gap-1">
                          {(['powershell', 'curl', 'python'] as const).map(tab => (
                            <button
                              key={tab}
                              onClick={() => setShellTab(tab)}
                              className={`px-2.5 py-1 text-[10px] font-mono rounded transition-colors ${
                                shellTab === tab
                                  ? 'bg-[#6A89A7] text-white'
                                  : 'bg-black/10 text-[#384959] hover:bg-black/20'
                              }`}
                            >
                              {tab === 'powershell' ? 'PowerShell' : tab === 'curl' ? 'cURL (bash)' : 'Python'}
                            </button>
                          ))}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-[#384959] hover:bg-black/10"
                          onClick={() => {
                            const cmd = shellTab === 'powershell' 
                              ? `Invoke-WebRequest -Uri "${webhookInfo.webhookUrl}" \`\n  -Method POST \`\n  -ContentType "application/json" \`\n  -Body '{"sensor":"temp","value":25}'`
                              : shellTab === 'curl'
                              ? `curl -X POST "${webhookInfo.webhookUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"sensor":"temp","value":25}'`
                              : `import requests\nrequests.post(\n  "${webhookInfo.webhookUrl}",\n  json={"sensor": "temp", "value": 25}\n)`;
                            handleCopy(cmd);
                          }}
                          title="Copy command"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>

                      <pre className="font-mono text-[10px] bg-black/5 rounded p-2 text-[#384959] whitespace-pre-wrap break-all relative">
                        {shellTab === 'powershell' &&
                          `Invoke-WebRequest -Uri "${webhookInfo.webhookUrl}" \`\n  -Method POST \`\n  -ContentType "application/json" \`\n  -Body '{"sensor":"temp","value":25}'`}
                        {shellTab === 'curl' &&
                          `curl -X POST "${webhookInfo.webhookUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"sensor":"temp","value":25}'`}
                        {shellTab === 'python' &&
                          `import requests\nrequests.post(\n  "${webhookInfo.webhookUrl}",\n  json={"sensor": "temp", "value": 25}\n)`}
                      </pre>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
                        <RefreshCw className="h-3.5 w-3.5 mr-2" />
                        Regenerate Token
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                        onClick={handleClear}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Disable
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 space-y-3">
                    <div className="h-12 w-12 rounded-full bg-[#6A89A7]/10 flex items-center justify-center mx-auto">
                      <Webhook className="h-6 w-6 text-[#6A89A7]" />
                    </div>
                    <p className="text-sm text-muted-foreground">No webhook endpoint configured for this project.</p>
                    <Button onClick={handleGenerate} disabled={generating} className="btn-primary">
                      <Zap className="h-4 w-4 mr-2" />
                      {generating ? "Generating..." : "Generate Endpoint"}
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Live Status Card */}
        <Card className="card-industrial">
          <CardHeader>
            <CardTitle>Live Status</CardTitle>
            <CardDescription>Real-time connection and request statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-4 text-center border">
                <p className="text-3xl font-bold font-mono text-[#6A89A7]">{logs.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Received</p>
              </div>
              <div className="bg-muted rounded-lg p-4 text-center border">
                <p className="text-3xl font-bold font-mono text-green-500">{liveCount}</p>
                <p className="text-xs text-muted-foreground mt-1">This Session</p>
              </div>
              <div className={`col-span-2 rounded-lg p-3 border text-center text-sm font-medium ${webhookInfo?.webhookEnabled ? 'bg-green-500/10 border-green-500/30 text-green-600' : 'bg-muted border-border text-muted-foreground'}`}>
                {webhookInfo?.webhookEnabled ? "🟢 Endpoint Active — Listening" : "⚫ No Active Endpoint"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incoming Requests Log */}
      <Card className="card-industrial">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Incoming Requests</CardTitle>
              <CardDescription>Live stream of all received webhook payloads</CardDescription>
            </div>
            {logs.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setLogs([])}>
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Webhook className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Waiting for incoming requests...</p>
              <p className="text-xs mt-1">Send a POST request to your webhook URL to see it here.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              <AnimatePresence>
                {logs.map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index === 0 ? 0 : 0 }}
                    className="border rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center justify-between bg-muted/60 px-4 py-2 border-b">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono bg-green-500/20 text-green-600 px-2 py-0.5 rounded">
                          200 OK
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(log.timestamp).toLocaleTimeString("id-ID", { hour12: false })}
                        </span>
                        <span className="text-xs text-muted-foreground">{log.message.split("[")[0].trim()}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleCopy(log.payload || "")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <pre className="text-xs font-mono p-4 bg-black/5 overflow-x-auto max-h-48 overflow-y-auto">
                      {formatPayload(log.payload, log.parsedPayload)}
                    </pre>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={logsEndRef} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
