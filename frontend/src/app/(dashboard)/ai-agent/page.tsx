"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send,
  Cpu,
  MessageSquare,
  Loader2,
  Check,
  X,
  Trash2,
  Plus,
  Terminal,
  ChevronRight,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  User,
  Copy,
  Sparkles,
  Bot,
  RotateCcw,
} from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { usePopupStore } from "@/store/popupStore";
import { useProjectStore } from "@/store/projectStore";
import MarkdownRenderer from "@/components/ui/markdown-renderer";

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

function formatTime(dateInput: Date | string | undefined) {
  if (!dateInput) return "--:--";
  try {
    const d = new Date(dateInput);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}

export default function AIAgentPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [usage, setUsage] = useState<{
    limit: number;
    used: number;
    remaining: number;
    unlimited?: boolean;
    currentModel?: string;
  } | null>(null);

  // Toggle state for collapsible sidebars (Left: Sessions, Right: Presets)
  const [showLeftSidebar, setShowLeftSidebar] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ai-agent-left-open");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ai-agent-right-open");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  const toggleLeftSidebar = () => {
    setShowLeftSidebar((prev) => {
      const next = !prev;
      localStorage.setItem("ai-agent-left-open", String(next));
      return next;
    });
  };

  const toggleRightSidebar = () => {
    setShowRightSidebar((prev) => {
      const next = !prev;
      localStorage.setItem("ai-agent-right-open", String(next));
      return next;
    });
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isExhausted =
    usage !== null && !usage.unlimited && usage.limit > 0 && usage.remaining <= 0;
  const confirm = usePopupStore((state) => state.confirm);

  // Auto-resize textarea: grows up to 5 lines (~125px), then scrolls internally
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 125; // 5 lines limit
    textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
  }, [input]);

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
  }, [messages, loading]);

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
    } else {
      setMessages([]);
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
      const response = await api.get(`/ai-agent/sessions/${sessionId}`);
      const rawMessages = response.data?.session?.messages || response.data?.session?.Messages || [];
      if (Array.isArray(rawMessages) && rawMessages.length > 0) {
        const msgs = rawMessages.map((m: any) => ({
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
      toast.success("Sesi baru siap dimulai");
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch {
      toast.error("Gagal membuat sesi baru");
    }
  };

  const deleteSession = async (sessionId: string) => {
    const isConfirmed = await confirm(
      "Hapus riwayat sesi chat ini secara permanen?",
      "Hapus Sesi"
    );
    if (!isConfirmed) return;

    try {
      await api.delete(`/ai-agent/sessions/${sessionId}`);
      const remainingSessions = sessions.filter((s) => s.id !== sessionId);
      setSessions(remainingSessions);

      if (currentSessionId === sessionId) {
        if (remainingSessions.length > 0) {
          setCurrentSessionId(remainingSessions[0].id);
        } else {
          setCurrentSessionId(null);
          setMessages([]);
        }
      }

      toast.success("Sesi berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus sesi");
    }
  };

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success("Teks berhasil disalin");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Shift + Enter: biarkan default textarea membuat baris baru
        return;
      }
      // Enter tanpa Shift: submit chat
      e.preventDefault();
      if (!loading && !isExhausted && input.trim()) {
        handleSend();
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading || isExhausted) return;

    const userMessageContent = input.trim();
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "38px";
    }
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
          "Terjadi kesalahan saat memproses permintaan. Periksa koneksi backend atau coba kembali.",
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast.error("Gagal memproses pesan");
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

        if (actionTask.action === "CREATE_PROJECT") {
          try {
            useProjectStore.getState().fetchProjects();
            localStorage.setItem("iotkit_projects_updated_at", Date.now().toString());
            window.dispatchEvent(new CustomEvent("iotkit:project-created", { detail: result.data.result }));
          } catch {}
        }

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

        toast.error(`Eksekusi gagal: ${task.title}`);
        break;
      }
    }

    try {
      useProjectStore.getState().fetchProjects();
      localStorage.setItem("iotkit_projects_updated_at", Date.now().toString());
      window.dispatchEvent(new CustomEvent("iotkit:project-created"));
    } catch {}
  };

  const getTaskTitle = (action: string, params: any): string => {
    switch (action) {
      case "CREATE_PROJECT":
        return `BUAT_NODE_PROYEK: ${params.name} (${params.protocol || "HTTP"})`;
      case "CREATE_PAYLOAD":
        return `RANCANG_SKEMA_PAYLOAD: ${params.name}`;
      case "START_SIMULATION":
        return `MULAI_SIMULASI_DAEMON`;
      case "ANALYZE_DATA":
        return `INSPEKSI_TELEMETRI_DATA`;
      default:
        return `EKSEKUSI_${action}`;
    }
  };

  const applyPreset = (promptText: string) => {
    setInput(promptText);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const suggestions = [
    {
      title: "MONITORING_DHT22_MQTT",
      desc: "Pemantauan suhu & kelembaban greenhouse industri dengan sensor DHT22 melalui topik MQTT.",
      prompt:
        "Buatkan project monitoring suhu dan kelembaban ruangan dengan sensor DHT22 menggunakan protocol MQTT topic factory/sensor/dht22",
    },
    {
      title: "PELACAKAN_GPS_HTTP",
      desc: "Pelacakan armada logistik kendaraan: koordinat latitude, longitude, kecepatan, dan voltase baterai via HTTP POST.",
      prompt:
        "Buatkan proyek simulasi pelacakan GPS armada kendaraan yang mengirimkan koordinat latitude, longitude, kecepatan kendaraan, dan level baterai ke endpoint HTTP /api/telemetry/gps",
    },
    {
      title: "HVAC_SMART_BUILDING_WS",
      desc: "Sistem iklim gedung cerdas: temperatur chiller, status blower, dan daya listrik via WebSocket stream.",
      prompt:
        "Buat project HVAC smart building untuk monitor suhu chiller, status fan, dan daya listrik menggunakan WebSocket",
    },
    {
      title: "GETARAN_TURBIN_MQTT",
      desc: "Telemetri getaran bearing turbin frekuensi tinggi dan RPM dengan ambang batas anomali industri.",
      prompt:
        "Buatkan proyek monitoring getaran turbin industri menggunakan protokol MQTT untuk memantau akselerasi getaran bearing dan kecepatan putaran RPM",
    },
  ];

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2.5">
      {/* Compact Top Navigation Bar (Fixed Height, No Page Overflow) */}
      <div className="bg-white border border-[#E2E8F0] rounded-md px-3.5 py-2 shadow-hairline shrink-0 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Left Sidebar Toggle Button */}
          <button
            onClick={toggleLeftSidebar}
            className={`p-1.5 rounded transition-all flex items-center gap-1.5 text-xs font-mono border ${
              showLeftSidebar
                ? "bg-slate-100 text-[#0F172A] border-slate-300"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
            title={showLeftSidebar ? "Tutup Sesi (Panel Kiri)" : "Buka Sesi (Panel Kiri)"}
          >
            {showLeftSidebar ? (
              <PanelLeftClose className="h-3.5 w-3.5 text-[#0F172A]" />
            ) : (
              <PanelLeftOpen className="h-3.5 w-3.5 text-[#2563EB]" />
            )}
            <span className="hidden sm:inline font-semibold text-[11px]">
              {showLeftSidebar ? "TUTUP_SESI" : "BUKA_SESI"}
            </span>
          </button>

          <div className="h-4 w-px bg-slate-200" />

          {/* Title & Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded bg-[#0F172A] text-sky-400 shrink-0">
              <Cpu className="h-3.5 w-3.5" />
            </div>
            <div className="truncate">
              <span className="text-xs font-bold text-[#0F172A] tracking-tight">
                Autonomous IoT Synthesis Agent
              </span>
              <span className="hidden md:inline font-mono text-[10px] text-[#64748B] ml-2">
                {"// GO_FIBER_ORCHESTRATOR"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Badges & Presets Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Right Sidebar Toggle Button */}
          <button
            onClick={toggleRightSidebar}
            className={`p-1.5 rounded transition-all flex items-center gap-1.5 text-xs font-mono border ${
              showRightSidebar
                ? "bg-slate-100 text-[#0F172A] border-slate-300"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
            title={
              showRightSidebar
                ? "Tutup Presets (Panel Kanan)"
                : "Buka Presets (Panel Kanan)"
            }
          >
            <span className="hidden sm:inline font-semibold text-[11px]">
              {showRightSidebar ? "TUTUP_PRESETS" : "BUKA_PRESETS"}
            </span>
            {showRightSidebar ? (
              <PanelRightClose className="h-3.5 w-3.5 text-[#0F172A]" />
            ) : (
              <PanelRightOpen className="h-3.5 w-3.5 text-[#2563EB]" />
            )}
          </button>
        </div>
      </div>

      {/* Main 3-Column Split Cockpit (Fits 100% Remaining Height, Internal Scroll Only) */}
      <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">
        {/* Left Column: SESSIONS ARCHIVE (Collapsible) */}
        {showLeftSidebar && (
          <div className="w-64 xl:w-72 shrink-0 bg-white border border-[#E2E8F0] rounded-lg shadow-hairline flex flex-col h-full overflow-hidden transition-all duration-200">
            {/* Header */}
            <div className="p-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-[#0F172A]" />
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  SESSIONS
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                  {sessions.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={createNewSession}
                  className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-1 rounded bg-[#0F172A] text-white hover:bg-[#1E293B] transition-colors"
                  title="Mulai sesi baru"
                >
                  <Plus className="h-3 w-3" />
                  <span>NEW</span>
                </button>
                <button
                  onClick={toggleLeftSidebar}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                  title="Sembunyikan panel sesi"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Scrollable Sessions List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1 font-mono text-xs">
              {loadingSessions ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin mb-1 text-slate-500" />
                  <span className="text-[10px] uppercase">MEMUAT_SESI...</span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs space-y-1">
                  <MessageSquare className="h-6 w-6 mx-auto opacity-30" />
                  <p className="uppercase text-[10px] font-bold">BELUM_ADA_SESI</p>
                  <p className="text-[10px] font-sans text-slate-500">
                    Klik + NEW untuk memulai sesi percakapan baru.
                  </p>
                </div>
              ) : (
                sessions.map((session) => {
                  const isActive = currentSessionId === session.id;
                  return (
                    <div
                      key={session.id}
                      onClick={() => setCurrentSessionId(session.id)}
                      className={`group p-2.5 rounded-md border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        isActive
                          ? "bg-slate-100 border-[#CBD5E1] text-[#0F172A] shadow-2xs"
                          : "border-transparent hover:bg-[#F8FAFC] text-[#475569]"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs font-sans truncate ${
                            isActive ? "font-bold text-[#0F172A]" : "font-medium text-slate-700"
                          }`}
                        >
                          {session.lastMessage || session.title}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>{formatTime(session.createdAt)}</span>
                          {isActive && (
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-1 rounded text-[9px] border border-emerald-200">
                              ACTIVE
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-opacity"
                        title="Hapus sesi ini"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-[#E2E8F0] bg-[#F8FAFC] text-center font-mono text-[10px] text-[#64748B]">
              <Database className="h-3 w-3 inline mr-1 text-[#64748B]" />
              <span>PERSISTENT_POSTGRES_STORE</span>
            </div>
          </div>
        )}

        {/* Center Column: MODERN CHATBOT COCKPIT (Expands smoothly when sidebars are closed!) */}
        <div className="flex-1 min-w-0 bg-white border border-[#E2E8F0] rounded-lg shadow-hairline flex flex-col h-full overflow-hidden transition-all duration-200">
          {/* Chat Header */}
          <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {!showLeftSidebar && (
                <button
                  onClick={toggleLeftSidebar}
                  className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors mr-1"
                  title="Buka panel riwayat sesi"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
              )}
              <Terminal className="h-3.5 w-3.5 text-[#0F172A] shrink-0" />
              <div className="min-w-0 flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider truncate">
                  {currentSession?.title || "SYNTHESIS_STDOUT"}
                </span>
                <span className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ENGINE_READY
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={createNewSession}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
                title="Buka percakapan baru"
              >
                <Plus className="h-3 w-3" />
                <span>Percakapan Baru</span>
              </button>

              {!showRightSidebar && (
                <button
                  onClick={toggleRightSidebar}
                  className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors ml-1"
                  title="Buka panel presets direktif"
                >
                  <PanelRightOpen className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Chat Messages Stream (Internal Scroll Only!) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.length === 0 && !loading ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-slate-700 flex items-center justify-center text-sky-400 shadow-md">
                    <Bot className="h-7 w-7" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
                  </span>
                </div>

                <div className="max-w-md space-y-1.5">
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Asisten Autonomous IoT Studio
                  </h3>
                  <p className="text-xs text-[#64748B] font-sans leading-relaxed">
                    Sebutkan kebutuhan sistem IoT Anda dalam Bahasa Indonesia. AI akan
                    merancang arsitektur proyek, protokol komunikasi, skema payload, dan
                    menjalankan simulasi sensor otomatis.
                  </p>
                </div>

                {/* Quick Start Directive Chips */}
                <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-left">
                  {suggestions.slice(0, 4).map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => applyPreset(sug.prompt)}
                      className="p-2.5 rounded-lg border border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] transition-all group text-left"
                    >
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-[#0F172A] group-hover:text-[#2563EB]">
                        <span className="truncate">{sug.title}</span>
                        <ChevronRight className="h-3 w-3 text-slate-400 group-hover:text-[#2563EB] shrink-0" />
                      </div>
                      <p className="text-[11px] text-[#64748B] font-sans line-clamp-1 mt-0.5">
                        {sug.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => {
                const isUser = message.role === "user";

                if (isUser) {
                  return (
                    /* User Chat Bubble (Aligned to Right) */
                    <div
                      key={message.id}
                      className="flex justify-end items-start gap-2.5 pl-8 sm:pl-20"
                    >
                      <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%]">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mb-1">
                          <span className="font-semibold text-slate-600">OPERATOR</span>
                          <span>•</span>
                          <span>{formatTime(message.createdAt)}</span>
                        </div>
                        <div className="bg-[#0F172A] text-white rounded-2xl rounded-tr-xs px-4 py-2.5 shadow-xs text-xs font-sans whitespace-pre-wrap leading-relaxed select-text border border-slate-800">
                          {message.content}
                        </div>
                      </div>
                      <div className="h-7 w-7 rounded-full bg-[#1E293B] border border-slate-700 flex items-center justify-center text-slate-200 shrink-0 shadow-xs mt-4">
                        <User className="h-4 w-4" />
                      </div>
                    </div>
                  );
                }

                /* Assistant Chat Card (Aligned to Left) */
                return (
                  <div
                    key={message.id}
                    className="flex justify-start items-start gap-2.5 pr-4 sm:pr-12"
                  >
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-slate-700 flex items-center justify-center text-sky-400 shrink-0 shadow-xs mt-1">
                      <Cpu className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col items-start max-w-[95%] sm:max-w-[90%] flex-1 min-w-0">
                      <div className="flex items-center justify-between w-full text-[10px] text-slate-400 font-mono mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#0F172A]">AI_AGENT</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[9px]">
                            SYNTHESIZER
                          </span>
                          <span>•</span>
                          <span>{formatTime(message.createdAt)}</span>
                        </div>
                        <button
                          onClick={() => copyMessage(message.content, message.id)}
                          className="flex items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors p-0.5 rounded"
                          title="Salin respon"
                        >
                          {copiedId === message.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span className="text-[10px] text-emerald-600">Disalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span className="text-[10px]">Salin</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl rounded-tl-xs p-4 shadow-hairline w-full text-xs text-[#0F172A]">
                        <MarkdownRenderer content={message.content} />

                        {/* Orchestrated Tasks Pipeline */}
                        {message.tasks && message.tasks.length > 0 && (
                          <div className="mt-3.5 p-3 rounded-lg bg-white border border-[#E2E8F0] shadow-2xs space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#64748B] uppercase">
                              <span>ORCHESTRATED_TASKS_PIPELINE:</span>
                              <span className="text-slate-500">
                                {message.tasks.filter((t) => t.status === "completed").length}/
                                {message.tasks.length} SELESAI
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {message.tasks.map((task) => (
                                <div
                                  key={task.id}
                                  className="flex items-center gap-2 p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-mono"
                                >
                                  {task.status === "pending" && (
                                    <span className="h-3 w-3 rounded-full border border-slate-300 shrink-0" />
                                  )}
                                  {task.status === "running" && (
                                    <Loader2 className="h-3.5 w-3.5 text-[#2563EB] animate-spin shrink-0" />
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
                                    className={`flex-1 text-[11px] truncate ${
                                      task.status === "completed"
                                        ? "text-emerald-700 font-semibold"
                                        : task.status === "failed"
                                        ? "text-rose-700 font-medium"
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
                    </div>
                  </div>
                );
              })
            )}

            {/* Thinking / Synthesizing Loader */}
            {loading && (
              <div className="flex justify-start items-start gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-slate-700 flex items-center justify-center text-sky-400 shrink-0 shadow-xs animate-pulse">
                  <Cpu className="h-4 w-4" />
                </div>
                <div className="bg-[#F8FAFC] border border-blue-200 rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-2.5 text-xs font-mono text-[#2563EB] shadow-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2563EB]" />
                  <span className="animate-pulse">
                    Memproses arsitektur IoT & menyusun rencana eksekusi...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Station (Multi-line Textarea, Shift+Enter to newline, max 5 lines scroll) */}
          <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC]/80 shrink-0">
            <div className="bg-white border border-[#CBD5E1] rounded-xl focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-blue-500/15 shadow-sm transition-all p-2 flex flex-col">
              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={
                  isExhausted
                    ? "Batas penggunaan harian tercapai."
                    : "Ketik pesan atau kebutuhan IoT Anda... (Shift + Enter untuk baris baru, Enter untuk kirim)"
                }
                disabled={loading || isExhausted}
                className="w-full bg-transparent border-0 outline-none focus:ring-0 text-xs font-sans leading-relaxed text-[#0F172A] placeholder:text-slate-400 resize-none py-1 px-1.5 max-h-[125px] overflow-y-auto"
                style={{ minHeight: "38px" }}
              />

              {/* Input Action Bar */}
              <div className="flex items-center justify-between pt-1.5 px-1 border-t border-slate-100 mt-1">
                <div className="flex items-center gap-2 text-[10px] text-[#64748B] font-mono">
                  <span className="hidden sm:inline">
                    <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9px] font-sans">
                      Shift
                    </kbd>{" "}
                    +{" "}
                    <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9px] font-sans">
                      Enter
                    </kbd>{" "}
                    baris baru
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span>
                    <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9px] font-sans">
                      Enter
                    </kbd>{" "}
                    kirim
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {input.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setInput("");
                        if (textareaRef.current) textareaRef.current.style.height = "38px";
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded text-[11px] transition-colors"
                      title="Bersihkan input"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <button
                    onClick={handleSend}
                    disabled={loading || !input.trim() || isExhausted}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0F172A] text-white rounded-lg text-xs font-semibold hover:bg-[#1E293B] active:translate-y-[1px] disabled:opacity-40 disabled:pointer-events-none transition-all shadow-xs"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    <span>Kirim</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: DIRECTIVE PRESETS (Collapsible) */}
        {showRightSidebar && (
          <div className="w-64 xl:w-72 shrink-0 bg-white border border-[#E2E8F0] rounded-lg shadow-hairline flex flex-col h-full overflow-hidden transition-all duration-200">
            {/* Header */}
            <div className="p-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#0F172A]" />
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  DIRECTIVE_PRESETS
                </span>
              </div>
              <button
                onClick={toggleRightSidebar}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                title="Sembunyikan panel presets"
              >
                <PanelRightClose className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Scrollable Presets List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => applyPreset(sug.prompt)}
                  className="w-full text-left p-2.5 rounded-lg border border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] transition-all group shadow-2xs"
                >
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-[#0F172A] group-hover:text-[#2563EB]">
                    <span className="truncate">{sug.title}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#2563EB] shrink-0" />
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1 font-sans line-clamp-2 leading-relaxed">
                    {sug.desc}
                  </p>
                </button>
              ))}
            </div>

            {/* Quick Tip Footer */}
            <div className="p-2 border-t border-[#E2E8F0] bg-[#F8FAFC] text-[10px] font-mono text-[#64748B] text-center">
              Klik preset untuk memasukkan ke chat
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
