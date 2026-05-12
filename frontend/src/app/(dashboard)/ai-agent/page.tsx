"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  Sparkles,
  MessageSquare,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Code,
  FileText,
  Loader2,
  Check,
  X,
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
  timestamp: Date;
  actionPlan?: ActionPlan;
  tasks?: Task[];
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        'Hello! 👋 I&apos;m your autonomous IoT AI Assistant. I can help you CREATE projects, not just suggest them!\n\nTry saying:\n• "Buatkan project monitoring suhu ruangan dengan MQTT"\n• "Create a temperature sensor project"\n• "Buat project untuk tracking GPS dengan HTTP"\n\nI&apos;ll automatically create the project and payload for you!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Call AI API
      const response = await api.post("/ai-agent/chat", {
        message: input,
        conversationHistory: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.data.message,
        timestamp: new Date(),
        actionPlan: response.data.actionPlan,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // If there's an action plan, execute it
      if (response.data.actionPlan) {
        await executeActionPlan(aiMessage.id, response.data.actionPlan);
      }
    } catch (error: any) {
      console.error("AI Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          error.response?.data?.message ||
          "Sorry, I encountered an error. Please make sure the OpenRouter API key is configured.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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

        // Small delay for UX
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error: any) {
        console.error("Task execution error:", error);

        // Update task to failed
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
        break; // Stop on first error
      }
    }

    // Check if all completed
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Bot className="h-6 w-6 text-white" />
            </div>
            Autonomous AI Agent
            <span className="px-2 py-1 text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded">
              Auto-Execute
            </span>
          </h1>
          <p className="text-slate-600 mt-1">
            Just tell me what you want, I&apos;ll build it for you
            automatically!
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="bg-white border-blue-100 shadow-md h-[700px] flex flex-col">
            <CardHeader className="border-b border-blue-50">
              <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                Chat & Execute
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
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
                          <Bot className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </p>

                          {/* Task List */}
                          {message.tasks && message.tasks.length > 0 && (
                            <div className="mt-3 space-y-2 bg-white/50 rounded-lg p-3 border border-blue-200">
                              <p className="text-xs font-semibold text-slate-700 mb-2">
                                Executing Tasks:
                              </p>
                              {message.tasks.map((task) => (
                                <div
                                  key={task.id}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  {/* Status Icon */}
                                  {task.status === "pending" && (
                                    <div className="h-5 w-5 rounded-full border-2 border-slate-300 shrink-0" />
                                  )}
                                  {task.status === "running" && (
                                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin shrink-0" />
                                  )}
                                  {task.status === "completed" && (
                                    <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                      <Check className="h-3 w-3 text-white" />
                                    </div>
                                  )}
                                  {task.status === "failed" && (
                                    <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                                      <X className="h-3 w-3 text-white" />
                                    </div>
                                  )}

                                  {/* Task Title */}
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
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-blue-500" />
                        <div className="flex gap-1">
                          <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" />
                          <div
                            className="h-2 w-2 bg-blue-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <div
                            className="h-2 w-2 bg-blue-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-blue-50 p-4">
                <div className="flex items-center gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && !loading && handleSend()
                    }
                    placeholder="Tell me what project you want to create..."
                    className="flex-1 border-blue-200 focus:border-blue-400"
                    disabled={loading}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Press Enter to send • I&apos;ll automatically execute your
                  request
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Suggestions */}
        <div className="space-y-4">
          <Card className="bg-white border-blue-100 shadow-md">
            <CardHeader className="border-b border-blue-50">
              <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                Quick Start
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={suggestion.title}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setInput(suggestion.prompt)}
                  className="w-full text-left p-3 rounded-lg border border-blue-100 hover:bg-blue-50 hover:border-blue-300 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg bg-gradient-to-br ${suggestion.color} shrink-0`}
                    >
                      <suggestion.icon className="h-4 w-4 text-white" />
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

          <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white border-0 shadow-md">
            <CardContent className="pt-6">
              <Zap className="h-8 w-8 mb-3" />
              <h3 className="text-lg font-bold mb-2">Autonomous AI</h3>
              <p className="text-sm text-purple-100 mb-4">
                I don&apos;t just suggest - I execute! Watch as I create
                projects, configure payloads, and set everything up
                automatically.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>Auto-create projects</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>Configure payloads</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>Real-time progress</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
