"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  ScrollText,
  RefreshCw,
  Trash2,
  Search,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useProjectStore } from "@/store/projectStore";
import toast from "react-hot-toast";

interface Log {
  id: string;
  type: "request" | "response" | "error" | "event";
  protocol: string;
  message: string;
  payload?: string;
  statusCode?: number;
  latency?: number;
  timestamp: string;
  projectId: string;
  project?: { name: string; protocol: string };
}

const TYPE_CONFIG = {
  request: {
    label: "Request",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    icon: Info,
  },
  response: {
    label: "Response",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    icon: CheckCircle,
  },
  error: {
    label: "Error",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    icon: AlertCircle,
  },
  event: {
    label: "Event",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    icon: Zap,
  },
};

export default function LogsPage() {
  const { projects, fetchProjects } = useProjectStore();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchProjects();
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(fetchLogs, 3000);
    } else {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [autoRefresh]);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (projectFilter !== "all") params.append("projectId", projectFilter);

      const res = await api.get(`/logs?${params}`);
      setLogs(res.data);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, projectFilter]);

  const handleClearLogs = async (projectId?: string) => {
    if (!projectId) return;
    try {
      await api.delete(`/logs/project/${projectId}/clear`);
      setLogs((prev) => prev.filter((l) => l.projectId !== projectId));
      toast.success("Logs cleared!");
    } catch {
      toast.error("Failed to clear logs");
    }
  };

  const filtered = logs.filter((log) => {
    const matchSearch =
      search === "" ||
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      log.project?.name.toLowerCase().includes(search.toLowerCase()) ||
      log.protocol.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const stats = {
    total: logs.length,
    errors: logs.filter((l) => l.type === "error").length,
    requests: logs.filter((l) => l.type === "request").length,
    events: logs.filter((l) => l.type === "event").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logs & Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time activity logs for all your IoT simulations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`}
            />
            {autoRefresh ? "Live" : "Auto Refresh"}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Logs", value: stats.total, color: "text-foreground" },
          { label: "Requests", value: stats.requests, color: "text-blue-400" },
          { label: "Events", value: stats.events, color: "text-purple-400" },
          { label: "Errors", value: stats.errors, color: "text-red-400" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="glass">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card className="glass">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {["all", "request", "response", "error", "event"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    typeFilter === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Project Filter */}
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Clear logs for selected project */}
            {projectFilter !== "all" && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => handleClearLogs(projectFilter)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {filtered.length} log{filtered.length !== 1 ? "s" : ""}
              {search && ` matching "${search}"`}
            </CardTitle>
            {autoRefresh && (
              <div className="flex items-center gap-1.5 text-xs text-green-400">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                Live updating
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ScrollText className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {logs.length === 0
                  ? "No logs yet. Start a simulation to see logs here."
                  : "No logs match your filters."}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {filtered.map((log) => {
                const cfg = TYPE_CONFIG[log.type] || TYPE_CONFIG.event;
                const Icon = cfg.icon;
                const isExpanded = expandedLog === log.id;

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`border rounded-lg overflow-hidden ${cfg.border} bg-card/50`}
                  >
                    <button
                      className="w-full text-left p-3 flex items-start gap-3 hover:bg-muted/20 transition-colors"
                      onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    >
                      <div
                        className={`p-1.5 rounded-md ${cfg.bg} mt-0.5 shrink-0`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-medium px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}
                          >
                            {cfg.label}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                            {log.protocol}
                          </span>
                          {log.project && (
                            <span className="text-xs text-muted-foreground">
                              {log.project.name}
                            </span>
                          )}
                          {log.statusCode && (
                            <span
                              className={`text-xs font-mono ${log.statusCode >= 400 ? "text-red-400" : "text-green-400"}`}
                            >
                              {log.statusCode}
                            </span>
                          )}
                          {log.latency && (
                            <span className="text-xs text-muted-foreground">
                              {log.latency}ms
                            </span>
                          )}
                        </div>
                        <p className="text-sm mt-1 truncate">{log.message}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground font-mono">
                          {formatTime(log.timestamp)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(log.timestamp)}
                        </p>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-muted-foreground ml-auto mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>
                    </button>

                    {/* Expanded payload */}
                    {isExpanded && log.payload && (
                      <div className="border-t border-border px-3 pb-3 pt-2">
                        <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                          Payload:
                        </p>
                        <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto max-h-[200px] overflow-y-auto">
                          {(() => {
                            try {
                              return JSON.stringify(
                                JSON.parse(log.payload!),
                                null,
                                2,
                              );
                            } catch {
                              return log.payload;
                            }
                          })()}
                        </pre>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
