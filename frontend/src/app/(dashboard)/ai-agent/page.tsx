"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send,
  Cpu,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Code,
  Loader2,
  Check,
  X,
  Trash2,
  Plus,
  Clock,
  Terminal,
  Zap,
  Radio,
  Sliders,
  ChevronRight,
  Database,
} from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { usePopupStore } from "@/store/popupStore";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  metadata?: any;
  tasks?: Task[];
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  lastMessageRole?: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

interface ActionPlan {
  type: string;
  tasks: ActionTask[];
  summary: string;
}

interface ActionTask {
  action: string;
  params: any;
}

interface Task {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
  error?: string;
}

export default function AIAgentPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [usage, setUsage] = useState<{
    limit: number;
    used: number;
    remaining: number;
    unlimited?: boolean;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isExhausted =
    usage !== null && !usage.unlimited && usage.limit > 0 && usage.remaining <= 0;
  const confirm = usePopupStore((state) => state.confirm);

  useEffect(() => {
    localStorage.setItem("ai-agent-loading", JSON.stringify(loading));
  }, [loading]);

  useEffect(() => {
    const savedLoading = localStorage.getItem("ai-agent-loading");
    if (savedLoading) {
      try {
        setLoading(JSON.parse(savedLoading));
      } catch (e) {}
    }

    const pendingData = localStorage.getItem("ai-agent-pending");
    if (pendingData) {
      try {
        const { message, timestamp } = JSON.parse(pendingData);
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setMessages((prev) => [
            ...prev,
            {
              ...message,
              createdAt: new Date(message.createdAt),
            },
          ]);
          setLoading(true);
        } else {
          localStorage.removeItem("ai-agent-pending");
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    loadSessions();
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const response = await api.get("/ai-agent/usage");
      setUsage(response.data);
    } catch {}
  };

  useEffect(() => {
    if (currentSessionId) {
      loadSessionMessages(currentSessionId);
    }
  }, [currentSessionId]);

  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      const response = await api.get("/ai-agent/sessions");
      setSessions(response.data.sessions);
      if (response.data.sessions.length > 0 && !currentSessionId) {
        setCurrentSessionId(response.data.sessions[0].id);
      }
    } catch {
      console.error("Failed to load sessions");
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const response = await api.get(`/ai-agent/sessions/current`);
      if (response.data.session && response.data.session.messages) {
        const msgs = response.data.session.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: new Date(m.createdAt),
          metadata: m.metadata,
        }));
        setMessages(msgs);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await api.post("/ai-agent/sessions", {
        title: `Session ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      });
      const newSession = response.data.session;
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
      toast.success("New prompt session initialized");
    } catch {
      toast.error("Failed to create new session");
    }
  };

  const deleteSession = async (sessionId: string) => {
    const isConfirmed = await confirm(
      "Confirm permanent removal of this agent session log?",
      "Purge Session"
    );
    if (!isConfirmed) return;

    try {
      await api.delete(`/ai-agent/sessions/${sessionId}`);
      setSessions(sessions.filter((s) => s.id !== sessionId));

      if (currentSessionId === sessionId) {
        if (sessions.length > 1) {
          const nextSession = sessions.find((s) => s.id !== sessionId);
          setCurrentSessionId(nextSession?.id || null);
        } else {
          setCurrentSessionId(null);
          setMessages([]);
        }
      }

      toast.success("Session purged");
    } catch {
      toast.error("Failed to delete session");
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessageContent = input;
    setInput("");
    setLoading(true);

    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessageContent,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    localStorage.setItem(
      "ai-agent-pending",
      JSON.stringify({
        message: tempUserMessage,
        timestamp: Date.now(),
      })
    );

    try {
      const response = await api.post("/ai-agent/chat", {
        message: userMessageContent,
        sessionId: currentSessionId,
        conversationHistory: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));

      if (response.data.sessionId) {
        setCurrentSessionId(response.data.sessionId);
        await loadSessionMessages(response.data.sessionId);
        await loadSessions();
      }

      if (response.data.actionPlan) {
        await executeActionPlan(response.data.messageId, response.data.actionPlan);
      }

      await loadUsage();
      localStorage.removeItem("ai-agent-pending");
    } catch (error: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));

      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content:
          error.response?.data?.message ||
          "Synthesis error encountered. Please check connectivity or parameters.",
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast.error("Execution failure");
      localStorage.removeItem("ai-agent-pending");
    } finally {
      setLoading(false);
    }
  };

  const executeActionPlan = async (messageId: string, actionPlan: ActionPlan) => {
    const tasks: Task[] = actionPlan.tasks.map((task, index) => ({
      id: `task-${index}`,
      title: getTaskTitle(task.action, task.params),
      status: "pending",
    }));

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, tasks } : m))
    );

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const actionTask = actionPlan.tasks[i];

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                tasks: m.tasks?.map((t) =>
                  t.id === task.id ? { ...t, status: "running" } : t
                ),
              }
            : m
        )
      );

      try {
        const result = await api.post("/ai-agent/execute", {
          action: actionTask.action,
          params: actionTask.params,
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  tasks: m.tasks?.map((t) =>
                    t.id === task.id
                      ? {
                          ...t,
                          status: "completed",
                          result: result.data.result,
                        }
                      : t
                  ),
                }
              : m
          )
        );

        await new Promise((resolve) => setTimeout(resolve, 400));
      } catch (error: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  tasks: m.tasks?.map((t) =>
                    t.id === task.id
                      ? {
                          ...t,
                          status: "failed",
                          error: error.response?.data?.error || error.message,
                        }
                      : t
                  ),
                }
              : m
          )
        );

        toast.error(`Execution failed: ${task.title}`);
        break;
      }
    }
  };

  const getTaskTitle = (action: string, params: any): string => {
    switch (action) {
      case "CREATE_PROJECT":
        return `PROVISION_NODE: ${params.name} (${params.protocol || "HTTP"})`;
      case "CREATE_PAYLOAD":
        return `SYNTHESIZE_SCHEMA: ${params.name}`;
      case "START_SIMULATION":
        return `INITIATE_STREAMING_DAEMON`;
      case "ANALYZE_DATA":
        return `RUN_TELEMETRY_INSPECTION`;
      default:
        return `EXECUTE_${action}`;
    }
  };

  const suggestions = [
    {
      title: "FACTORY_DHT22_MQTT",
      desc: "Industrial greenhouse monitoring with DHT22 temperature and humidity telemetry over MQTT topic.",
      prompt: "Buatkan project monitoring suhu dan kelembaban ruangan dengan sensor DHT22 menggunakan protocol MQTT topic factory/sensor/dht22",
    },
    {
      title: "FLEET_GPS_HTTP",
      desc: "Fleet vehicle tracking with latitude, longitude, velocity, and battery voltage over HTTP POST.",
      prompt: "Create a GPS fleet tracking simulation project sending lat, lng, speed, and battery over HTTP endpoint /api/telemetry/gps",
    },
    {
      title: "HVAC_SMART_BUILDING_WS",
      desc: "Building climate control with setpoint, chiller status, and compressor power over WebSocket.",
      prompt: "Buat project HVAC smart building untuk monitor suhu chiller, status fan, dan daya listrik menggunakan WebSocket",
    },
    {
      title: "TURBINE_VIBRATION_MQTT",
      desc: "High-frequency industrial turbine bearing vibration and RPM telemetry with anomaly thresholds.",
      prompt: "Create industrial vibration sensor project with MQTT for turbine bearing acceleration and RPM monitoring",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Precision Instrument Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-md p-4 shadow-hairline">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-slate-100 text-[#0F172A] border border-slate-200">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">
                  Autonomous IoT Synthesis Agent
                </h1>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  AUTO_DISPATCH_ACTIVE
                </span>
              </div>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                NATURAL_LANGUAGE_ORCHESTRATOR{" // "}DIRECT_CLUSTER_PROVISIONING
              </p>
            </div>
          </div>

          {/* Usage Quota Cells */}
          {usage && (
            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 rounded font-mono text-xs">
              <span className="text-[#64748B] text-[10px] uppercase">
                DAILY_BUDGET:
              </span>
              {usage.unlimited || usage.limit < 0 ? (
                <span className="font-bold text-emerald-600 flex items-center gap-1.5">
                  <span>UNLIMITED</span>
                  <span className="text-[#64748B] font-normal text-[11px]">
                    ({usage.used} USED)
                  </span>
                </span>
              ) : (
                <>
                  <span className="font-bold text-[#0F172A]">
                    {usage.remaining}/{usage.limit} REMAINING
                  </span>
                  <div className="flex gap-1 ml-1">
                    {Array.from({ length: usage.limit }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 w-3 rounded-xs ${
                          i < usage.used ? "bg-slate-200" : "bg-emerald-600"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main 3-Column Split Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[660px]">
        {/* Left Column: Sessions Archive (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden flex flex-col h-[640px]">
            <div className="p-3 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                SESSIONS_LOG
              </span>
              <button
                onClick={createNewSession}
                className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-1 rounded bg-[#0F172A] text-white hover:bg-[#1E293B]"
              >
                <Plus className="h-3 w-3" />
                <span>NEW</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 font-mono text-xs">
              {loadingSessions ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin mb-1" />
                  <span className="text-[10px] uppercase">FETCHING_SESSIONS...</span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs space-y-1">
                  <MessageSquare className="h-6 w-6 mx-auto opacity-30" />
                  <p className="uppercase text-[10px]">NO_STORED_SESSIONS</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => setCurrentSessionId(session.id)}
                    className={`group p-2.5 rounded border cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                      currentSessionId === session.id
                        ? "bg-slate-100 border-[#CBD5E1] text-[#0F172A]"
                        : "border-transparent hover:bg-[#F8FAFC] text-[#475569]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-sans font-semibold truncate text-[#0F172A]">
                        {session.lastMessage || session.title}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        {new Date(session.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity"
                      title="Purge session"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-2.5 border-t border-[#E2E8F0] bg-[#F8FAFC] text-center font-mono text-[10px] text-[#64748B]">
              <Database className="h-3 w-3 inline mr-1 text-[#64748B]" />
              <span>PERSISTENT_POSTGRES_STORE</span>
            </div>
          </div>
        </div>

        {/* Center Column: Interactive Prompt & Execution Stream (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden flex flex-col h-[640px]">
            {/* Terminal Header */}
            <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#0F172A]" />
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  SYNTHESIS_STDOUT
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#64748B]">
                FIBER_ORCHESTRATOR
              </span>
            </div>

            {/* Messages & Execution Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
              {messages.length === 0 && !loading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center space-y-2 p-8">
                  <Cpu className="h-10 w-10 opacity-20" />
                  <p className="uppercase text-xs font-bold tracking-wider text-[#0F172A]">
                    PROMPT_SYNTHESIZER_READY
                  </p>
                  <p className="text-[11px] font-sans text-slate-500 max-w-sm">
                    Enter natural language requirements below or choose a template preset from the panel on the right to synthesize nodes, payloads, and streaming daemons.
                  </p>
                </div>
              ) : (
                messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <div
                      key={message.id}
                      className={`p-3 rounded border ${
                        isUser
                          ? "bg-[#F8FAFC] border-[#CBD5E1]"
                          : "bg-white border-[#E2E8F0] shadow-hairline"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-[#F1F5F9] text-[10px]">
                        <span className="font-bold text-[#0F172A]">
                          {isUser ? "OPERATOR_PROMPT" : "AI_AGENT_RESPONSE"}
                        </span>
                        <span className="text-slate-400">
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </span>
                      </div>

                      <p className="text-xs font-sans text-[#0F172A] whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>

                      {/* Action Plan Tasks Matrix */}
                      {message.tasks && message.tasks.length > 0 && (
                        <div className="mt-3 p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                          <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase block">
                            ORCHESTRATED_TASKS_PIPELINE:
                          </span>

                          <div className="space-y-1.5">
                            {message.tasks.map((task) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-2 p-1.5 rounded bg-white border border-[#E2E8F0] text-xs"
                              >
                                {task.status === "pending" && (
                                  <span className="h-3 w-3 rounded-full border border-slate-300 shrink-0" />
                                )}
                                {task.status === "running" && (
                                  <Loader2 className="h-3 w-3 text-[#2563EB] animate-spin shrink-0" />
                                )}
                                {task.status === "completed" && (
                                  <div className="h-3.5 w-3.5 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                    <Check className="h-2.5 w-2.5" />
                                  </div>
                                )}
                                {task.status === "failed" && (
                                  <div className="h-3.5 w-3.5 rounded bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                                    <X className="h-2.5 w-2.5" />
                                  </div>
                                )}

                                <span
                                  className={`flex-1 font-mono text-[11px] truncate ${
                                    task.status === "completed"
                                      ? "text-emerald-700 font-semibold"
                                      : task.status === "failed"
                                      ? "text-rose-700"
                                      : task.status === "running"
                                      ? "text-[#2563EB] font-bold"
                                      : "text-slate-600"
                                  }`}
                                >
                                  {task.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {loading && (
                <div className="p-3 rounded border border-blue-200 bg-blue-50/40 flex items-center gap-2 text-xs font-mono text-[#2563EB]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>SYNTHESIZING_TOPOLOGY_AND_SCHEMAS...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Station */}
            <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !loading && !isExhausted && handleSend()
                  }
                  placeholder={
                    isExhausted
                      ? "Daily limit reached."
                      : "Describe IoT system requirements (e.g. Buat project sensor getaran MQTT...)"
                  }
                  disabled={loading || isExhausted}
                  className="flex-1 h-9 px-3 text-xs font-mono bg-white border border-[#CBD5E1] rounded outline-none focus:border-[#2563EB]"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim() || isExhausted}
                  className="h-9 px-4 inline-flex items-center gap-1.5 bg-[#0F172A] text-white rounded text-xs font-semibold hover:bg-[#1E293B] disabled:opacity-50 shadow-xs"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>SYNTHESIZE</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Industrial Presets Station (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden flex flex-col h-[640px]">
            <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                DIRECTIVE_PRESETS
              </span>
            </div>

            <div className="p-3 space-y-2.5 overflow-y-auto">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(sug.prompt)}
                  className="w-full text-left p-3 rounded border border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] transition-colors group"
                >
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-[#0F172A] group-hover:text-[#2563EB]">
                    <span>{sug.title}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#2563EB]" />
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1 font-sans line-clamp-2 leading-relaxed">
                    {sug.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
