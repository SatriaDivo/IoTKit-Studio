"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Send,
  Sparkles,
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save loading state to localStorage
  useEffect(() => {
    localStorage.setItem("ai-agent-loading", JSON.stringify(loading));
  }, [loading]);

  // Load loading state on mount
  useEffect(() => {
    const savedLoading = localStorage.getItem("ai-agent-loading");
    if (savedLoading) {
      try {
        const isLoading = JSON.parse(savedLoading);
        setLoading(isLoading);
      } catch (error) {
        console.error("Failed to load loading state:", error);
      }
    }
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Load current session messages
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

      // Auto-select first session or load current
      if (response.data.sessions.length > 0 && !currentSessionId) {
        setCurrentSessionId(response.data.sessions[0].id);
      }
    } catch (error: any) {
      console.error("Failed to load sessions:", error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const response = await api.get(`/ai-agent/sessions/current`);
      if (response.data.session && response.data.session.messages) {
        const msgs = response.data.session.messages.map((m: any) => {
          const msg: Message = {
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: new Date(m.createdAt),
            metadata: m.metadata,
          };

          // If message has actionPlan in metadata, extract it
          if (m.metadata && m.metadata.actionPlan) {
            // Don't add tasks here, they will be added during execution
          }

          return msg;
        });
        setMessages(msgs);
      } else {
        setMessages([]);
      }
    } catch (error: any) {
      console.error("Failed to load messages:", error);
      toast.error("Failed to load chat history");
      setMessages([]);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await api.post("/ai-agent/sessions", {
        title: `Chat ${new Date().toLocaleString()}`,
      });
      const newSession = response.data.session;
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
      toast.success("New chat created");
    } catch (error: any) {
      console.error("Failed to create session:", error);
      toast.error("Failed to create new chat");
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this chat?")) return;

    try {
      await api.delete(`/ai-agent/sessions/${sessionId}`);
      setSessions(sessions.filter((s) => s.id !== sessionId));

      if (currentSessionId === sessionId) {
        // Select another session or create new
        if (sessions.length > 1) {
          const nextSession = sessions.find((s) => s.id !== sessionId);
          setCurrentSessionId(nextSession?.id || null);
        } else {
          setCurrentSessionId(null);
          setMessages([]);
        }
      }

      toast.success("Chat deleted");
    } catch (error: any) {
      console.error("Failed to delete session:", error);
      toast.error("Failed to delete chat");
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessageContent = input;
    setInput("");
    setLoading(true);

    // Optimistically add user message
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessageContent,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      // Call AI API - message will be saved to database by backend
      const response = await api.post("/ai-agent/chat", {
        message: userMessageContent,
        sessionId: currentSessionId,
        conversationHistory: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      // Remove temp message and add real messages from server
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));

      // Reload messages from server to get the saved ones
      if (response.data.sessionId) {
        setCurrentSessionId(response.data.sessionId);
        await loadSessionMessages(response.data.sessionId);
        await loadSessions(); // Refresh session list
      }

      // If there's an action plan, execute it
      if (response.data.actionPlan) {
        await executeActionPlan(
          response.data.messageId,
          response.data.actionPlan,
        );
      }
    } catch (error: any) {
      console.error("AI Error:", error);
      // Remove temp message
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));

      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content:
          error.response?.data?.message ||
          "Sorry, I encountered an error. Please make sure the OpenRouter API key is configured.",
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast.error("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const executeActionPlan = async (
    messageId: string,
    actionPlan: ActionPlan,
  ) => {
    const tasks: Task[] = actionPlan.tasks.map((task, index) => ({
      id: `task-${index}`,
      title: getTaskTitle(task.action, task.params),
      status: "pending",
    }));

    // Update message with tasks
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, tasks } : m)),
    );

    // Execute tasks sequentially
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const actionTask = actionPlan.tasks[i];

      // Update task to running
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                tasks: m.tasks?.map((t) =>
                  t.id === task.id ? { ...t, status: "running" } : t,
                ),
              }
            : m,
        ),
      );

      try {
        // Execute action
        const result = await api.post("/ai-agent/execute", {
          action: actionTask.action,
          params: actionTask.params,
        });

        // Update task to completed
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
                      : t,
                  ),
                }
              : m,
          ),
        );

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error: any) {
        console.error("Task execution error:", error);

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
                      : t,
                  ),
                }
              : m,
          ),
        );

        toast.error(`Failed: ${task.title}`);
        break;
      }
    }

    const allCompleted = tasks.every((t) => {
      const currentTask = messages
        .find((m) => m.id === messageId)
        ?.tasks?.find((mt) => mt.id === t.id);
      return currentTask?.status === "completed";
    });

    if (allCompleted) {
      toast.success("All tasks completed successfully! 🎉");
    }
  };

  const getTaskTitle = (action: string, params: any): string => {
    switch (action) {
      case "CREATE_PROJECT":
        return `Creating project: ${params.name}`;
      case "CREATE_PAYLOAD":
        return `Creating payload: ${params.name}`;
      case "START_SIMULATION":
        return `Starting simulation`;
      case "ANALYZE_DATA":
        return `Analyzing data`;
      default:
        return `Executing ${action}`;
    }
  };

  const suggestions = [
    {
      icon: TrendingUp,
      title: "Temperature Monitoring",
      prompt:
        "Buatkan project monitoring suhu ruangan dengan sensor DHT22 menggunakan MQTT",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Code,
      title: "GPS Tracking",
      prompt: "Create a GPS tracking project with HTTP protocol",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: AlertCircle,
      title: "Smart Home",
      prompt:
        "Buat project smart home untuk kontrol lampu dan AC dengan WebSocket",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: CheckCircle,
      title: "Industrial Sensor",
      prompt:
        "Create industrial sensor monitoring project with MQTT for pressure and vibration",
      color: "from-green-500 to-emerald-500",
    },
  ];

  return (
    <div className="h-full flex gap-4">
      {/* Sidebar - Chat History */}
      <div className="w-64 flex flex-col bg-white border border-blue-100 rounded-lg shadow-sm">
        <div className="p-3 border-b border-blue-100">
          <Button
            onClick={createNewSession}
            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loadingSessions ? (
            <div className="text-center text-slate-500 text-sm py-4">
              Loading...
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-4">
              No chat history
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`group p-2 rounded-lg mb-1 cursor-pointer transition-colors ${
                  currentSessionId === session.id
                    ? "bg-blue-50 border border-blue-200"
                    : "hover:bg-slate-50"
                }`}
                onClick={() => setCurrentSessionId(session.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {session.lastMessage || "New Chat"}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-2 border-t border-blue-100 text-xs text-slate-500 text-center">
          Chat auto-deletes at 00:00
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              Autonomous AI Agent
              <span className="px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded">
                Auto-Execute
              </span>
            </h1>
            <p className="text-sm text-slate-600">
              Just tell me what you want, I&apos;ll build it for you
              automatically!
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3 flex-1 min-h-0">
          {/* Chat Interface */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            <Card className="bg-white border-blue-100 shadow-sm flex flex-col flex-1 min-h-0">
              <CardHeader className="border-b border-blue-50 py-3 flex-shrink-0">
                <CardTitle className="text-base text-slate-800 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  Chat & Execute
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-500">
                      <div className="text-center">
                        <Bot className="h-12 w-12 mx-auto mb-3 text-blue-300" />
                        <p className="text-sm">Start a conversation!</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg p-3 ${
                            message.role === "user"
                              ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white"
                              : "bg-blue-50 text-slate-800 border border-blue-100"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {message.role === "assistant" && (
                              <Bot className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                {message.content}
                              </p>

                              {/* Task List */}
                              {message.tasks && message.tasks.length > 0 && (
                                <div className="mt-2 space-y-1.5 bg-white/50 rounded-lg p-2 border border-blue-200">
                                  <p className="text-xs font-semibold text-slate-700 mb-1">
                                    Executing Tasks:
                                  </p>
                                  {message.tasks.map((task) => (
                                    <div
                                      key={task.id}
                                      className="flex items-center gap-2 text-xs"
                                    >
                                      {task.status === "pending" && (
                                        <div className="h-4 w-4 rounded-full border-2 border-slate-300 shrink-0" />
                                      )}
                                      {task.status === "running" && (
                                        <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
                                      )}
                                      {task.status === "completed" && (
                                        <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                          <Check className="h-2.5 w-2.5 text-white" />
                                        </div>
                                      )}
                                      {task.status === "failed" && (
                                        <div className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                                          <X className="h-2.5 w-2.5 text-white" />
                                        </div>
                                      )}
                                      <span
                                        className={`flex-1 ${
                                          task.status === "completed"
                                            ? "text-green-700 font-medium"
                                            : task.status === "failed"
                                              ? "text-red-700"
                                              : task.status === "running"
                                                ? "text-blue-700 font-medium"
                                                : "text-slate-600"
                                        }`}
                                      >
                                        {task.title}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <p
                                className={`text-xs mt-1 ${
                                  message.role === "user"
                                    ? "text-blue-100"
                                    : "text-slate-500"
                                }`}
                              >
                                {new Date(
                                  message.createdAt,
                                ).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}

                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-blue-500" />
                          <div className="flex gap-1">
                            <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" />
                            <div
                              className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            />
                            <div
                              className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-blue-50 p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && !loading && handleSend()
                      }
                      placeholder="Tell me what project you want to create..."
                      className="flex-1 border-blue-200 focus:border-blue-400 text-sm"
                      disabled={loading}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={loading || !input.trim()}
                      className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white px-4"
                      size="sm"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">
                    Press Enter to send • Chat saves automatically to database
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Suggestions */}
          <div className="h-full overflow-y-auto">
            <Card className="bg-white border-blue-100 shadow-sm">
              <CardHeader className="border-b border-blue-50 py-3">
                <CardTitle className="text-base text-slate-800 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  Quick Start
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2">
                {suggestions.map((suggestion, index) => (
                  <motion.button
                    key={suggestion.title}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setInput(suggestion.prompt)}
                    className="w-full text-left p-2.5 rounded-lg border border-blue-100 hover:bg-blue-50 hover:border-blue-300 transition-all group"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg bg-gradient-to-br ${suggestion.color} shrink-0`}
                      >
                        <suggestion.icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600">
                          {suggestion.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {suggestion.prompt}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
