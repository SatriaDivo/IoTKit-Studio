"use client";

import { useEffect, useState, useRef } from "react";
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
  Terminal,
  Activity,
  Layers,
  FileCode,
} from "lucide-react";
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
    label: "REQ",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
    icon: Info,
  },
  response: {
    label: "RES",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    icon: CheckCircle,
  },
  error: {
    label: "ERR",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
    icon: AlertCircle,
  },
  event: {
    label: "EVT",
    badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
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
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    fetchProjects();
    fetchLogs();
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
  }, [autoRefresh, typeFilter, projectFilter]);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({ limit: "300" });
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
  }, [typeFilter, projectFilter]);

  const handleClearLogs = async (projectId?: string) => {
    if (!projectId || projectId === "all") return;
    if (!confirm("Purge all logs for this project node?")) return;
    try {
      await api.delete(`/logs/project/${projectId}/clear`);
      setLogs((prev) => prev.filter((l) => l.projectId !== projectId));
      toast.success("Node logs cleared");
    } catch {
      toast.error("Failed to clear logs");
    }
  };

  const filtered = logs.filter((log) => {
    const matchSearch =
      search === "" ||
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      log.project?.name.toLowerCase().includes(search.toLowerCase()) ||
      log.protocol.toLowerCase().includes(search.toLowerCase()) ||
      (log.payload && log.payload.toLowerCase().includes(search.toLowerCase()));
    return matchSearch;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, projectFilter, itemsPerPage]);

  const stats = {
    total: logs.length,
    requests: logs.filter((l) => l.type === "request").length,
    responses: logs.filter((l) => l.type === "response").length,
    errors: logs.filter((l) => l.type === "error").length,
  };

  return (
    <div className="space-y-4">
      {/* Precision Instrument Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-md p-4 shadow-hairline">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-slate-100 text-[#0F172A] border border-slate-200">
              <ScrollText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">
                  Telemetry Audit &amp; Event Logs
                </h1>
                {autoRefresh ? (
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE_STREAMING (3S)
                  </span>
                ) : (
                  <span className="font-mono text-[10px] font-medium px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200">
                    PAUSED
                  </span>
                )}
              </div>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                BUFFER: {logs.length} RECORDS{" // "}ACTIVE_FILTERS: TYPE [{typeFilter.toUpperCase()}
                ] NODE [{projectFilter}]
              </p>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium border flex items-center gap-1.5 transition-colors ${
                autoRefresh
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F8FAFC]"
              }`}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${autoRefresh ? "animate-spin" : ""}`}
              />
              <span>{autoRefresh ? "STREAM_ACTIVE" : "RESUME_STREAM"}</span>
            </button>

            <button
              onClick={fetchLogs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium text-[#0F172A] bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>SYNC_NOW</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Cells Hairline Metrics Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-[#E2E8F0] rounded-md divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8F0] shadow-hairline overflow-hidden">
        <div className="p-3.5">
          <span className="font-mono text-[10px] font-bold text-[#64748B] uppercase block mb-1">
            TOTAL_BUFFERED_LOGS
          </span>
          <span className="font-mono text-xl font-bold text-[#0F172A] tabular-nums">
            {stats.total.toLocaleString()}
          </span>
        </div>

        <div className="p-3.5">
          <span className="font-mono text-[10px] font-bold text-[#64748B] uppercase block mb-1">
            HTTP / WS / MQTT REQUESTS
          </span>
          <span className="font-mono text-xl font-bold text-[#2563EB] tabular-nums">
            {stats.requests.toLocaleString()}
          </span>
        </div>

        <div className="p-3.5">
          <span className="font-mono text-[10px] font-bold text-[#64748B] uppercase block mb-1">
            SUCCESSFUL_ACKS
          </span>
          <span className="font-mono text-xl font-bold text-emerald-700 tabular-nums">
            {stats.responses.toLocaleString()}
          </span>
        </div>

        <div className="p-3.5 bg-rose-50/20">
          <span className="font-mono text-[10px] font-bold text-[#64748B] uppercase block mb-1">
            TRANSMISSION_ERRORS
          </span>
          <span className="font-mono text-xl font-bold text-rose-700 tabular-nums">
            {stats.errors.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Filters Station */}
      <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            placeholder="Search log messages, payload keys, endpoints..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-2.5 font-mono text-xs border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1 font-mono text-[11px]">
          {["all", "request", "response", "error", "event"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 rounded font-semibold uppercase transition-colors ${
                typeFilter === t
                  ? "bg-[#0F172A] text-white"
                  : "bg-white text-[#64748B] border border-[#CBD5E1] hover:bg-[#F8FAFC]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Project Select & Clear */}
        <div className="flex items-center gap-2">
          <select
            className="h-8 px-2.5 border border-[#CBD5E1] rounded text-xs font-mono bg-white focus:border-[#2563EB] outline-none"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="all">ALL NODES</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {projectFilter !== "all" && (
            <button
              onClick={() => handleClearLogs(projectFilter)}
              className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100"
              title="Purge logs for this node"
            >
              <Trash2 className="h-3 w-3" />
              <span>PURGE</span>
            </button>
          )}
        </div>
      </div>

      {/* Logs Teleprinter Stream Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden flex flex-col">
        <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-[#0F172A]" />
            <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              TELEPRINTER_STREAM
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-bold">
              {filtered.length} MATCHING
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px] text-[#64748B]">
            <span>ROWS_PER_PAGE:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="h-6 px-1 border border-[#CBD5E1] rounded bg-white text-xs"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">
              BUFFERING_STREAM...
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs space-y-2">
            <ScrollText className="h-10 w-10 mx-auto opacity-25" />
            <p className="uppercase text-xs font-bold tracking-wider">NO_LOG_RECORDS_FOUND</p>
            <p className="text-[11px] font-sans text-slate-400 max-w-sm mx-auto">
              No activity logs match the current query filter. Run a simulation or clear filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9] font-mono text-xs">
            {currentLogs.map((log) => {
              const cfg = TYPE_CONFIG[log.type] || TYPE_CONFIG.event;
              const isExpanded = expandedLog === log.id;

              return (
                <div key={log.id} className="transition-colors hover:bg-[#F8FAFC]">
                  <div
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    className="p-3 flex items-start justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 mt-0.5 ${cfg.badgeClass}`}
                      >
                        {cfg.label}
                      </span>

                      <span className="text-[11px] text-slate-400 tabular-nums shrink-0 mt-0.5">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>

                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 shrink-0 mt-0.5">
                        {log.protocol}
                      </span>

                      {log.project && (
                        <span className="text-[11px] font-semibold text-[#0F172A] truncate max-w-[140px] shrink-0 mt-0.5">
                          {log.project.name}
                        </span>
                      )}

                      <span className="text-xs font-sans text-[#334155] truncate max-w-xl mt-0.5">
                        {log.message}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {log.statusCode && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${
                            log.statusCode >= 400
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {log.statusCode}
                        </span>
                      )}

                      {log.latency && (
                        <span className="text-[10px] text-[#64748B]">
                          {log.latency}ms
                        </span>
                      )}

                      <ChevronDown
                        className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {/* Expanded Payload Viewer */}
                  {isExpanded && log.payload && (
                    <div className="px-4 pb-3 pt-1 border-t border-[#F1F5F9] bg-[#F8FAFC]">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#64748B] mb-1">
                        <FileCode className="h-3 w-3" />
                        <span>PAYLOAD_DETAILS</span>
                      </div>
                      <pre className="p-3 bg-white border border-[#E2E8F0] rounded text-xs font-mono text-[#0F172A] max-h-56 overflow-auto leading-relaxed">
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(log.payload!), null, 2);
                          } catch {
                            return log.payload;
                          }
                        })()}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Industrial Pagination Bar */}
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between font-mono text-xs">
            <span className="text-[#64748B] text-[11px]">
              SHOWING {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filtered.length)} OF{" "}
              {filtered.length} RECORDS
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded border border-[#CBD5E1] bg-white text-xs disabled:opacity-40 hover:bg-[#F8FAFC]"
              >
                PREV
              </button>

              <span className="px-2 text-[11px] font-bold text-[#0F172A]">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded border border-[#CBD5E1] bg-white text-xs disabled:opacity-40 hover:bg-[#F8FAFC]"
              >
                NEXT
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
