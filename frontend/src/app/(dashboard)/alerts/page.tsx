"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Plus,
  Trash2,
  Power,
  Settings,
  Terminal,
  RefreshCw,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sliders,
  Filter,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { api } from "@/lib/api";

interface AlertRule {
  id: string;
  name: string;
  projectId: string;
  field: string;
  operator: string;
  value: string;
  severity: "info" | "warning" | "critical" | "error";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AlertLog {
  id: string;
  ruleId?: string;
  projectId: string;
  message: string;
  value: string;
  severity: "info" | "warning" | "critical" | "error";
  timestamp: string;
  read: boolean;
}

export default function AlertsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [logs, setLogs] = useState<AlertLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"rules" | "logs">("rules");

  // Create Modal State
  const [showModal, setShowModal] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [ruleField, setRuleField] = useState("");
  const [ruleOperator, setRuleOperator] = useState(">");
  const [ruleValue, setRuleValue] = useState("");
  const [ruleSeverity, setRuleSeverity] = useState<"info" | "warning" | "critical">("warning");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get("/projects");
      const list = res.data.projects || [];
      setProjects(list);
      if (list.length > 0) {
        setSelectedProjectId(list[0].id);
      }
    } catch {
      toast.error("Failed to load nodes list");
    }
  };

  useEffect(() => {
    if (!selectedProjectId) return;
    loadData();

    let interval: NodeJS.Timeout | null = null;
    if (activeTab === "logs") {
      interval = setInterval(() => {
        api
          .get(`/alerts/logs/${selectedProjectId}`)
          .then((res) => setLogs(res.data || []))
          .catch(() => {});
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedProjectId, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesRes, logsRes] = await Promise.all([
        api.get(`/alerts/rules/${selectedProjectId}`),
        api.get(`/alerts/logs/${selectedProjectId}`),
      ]);
      setRules(rulesRes.data || []);
      setLogs(logsRes.data || []);
    } catch {
      toast.error("Failed to load alert rules");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName || !ruleField || !ruleValue) {
      toast.error("Please fill in all mandatory fields");
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post("/alerts/rules", {
        name: ruleName,
        projectId: selectedProjectId,
        field: ruleField,
        operator: ruleOperator,
        value: ruleValue,
        severity: ruleSeverity,
      });

      setRules([res.data, ...rules]);
      toast.success("Alert rule deployed");
      setShowModal(false);

      setRuleName("");
      setRuleField("");
      setRuleOperator(">");
      setRuleValue("");
      setRuleSeverity("warning");
    } catch {
      toast.error("Failed to create alert rule");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      const res = await api.put(`/alerts/rules/${ruleId}`, {
        isActive: !currentStatus,
      });
      setRules(rules.map((r) => (r.id === ruleId ? res.data : r)));
      toast.success(`Rule ${!currentStatus ? "activated" : "deactivated"}`);
    } catch {
      toast.error("Failed to update rule status");
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Confirm deletion of this alert threshold rule?")) return;
    try {
      await api.delete(`/alerts/rules/${ruleId}`);
      setRules(rules.filter((r) => r.id !== ruleId));
      toast.success("Rule purged from engine");
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Purge all anomaly logs for this node?")) return;
    try {
      await api.delete(`/alerts/logs/${selectedProjectId}`);
      setLogs([]);
      toast.success("Anomaly log history purged");
    } catch {
      toast.error("Failed to purge anomaly logs");
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
      case "error":
        return "bg-rose-50 text-rose-800 border border-rose-200 font-bold";
      case "warning":
        return "bg-amber-50 text-amber-800 border border-amber-200 font-bold";
      default:
        return "bg-blue-50 text-blue-800 border border-blue-200 font-bold";
    }
  };

  return (
    <div className="space-y-4">
      {/* Precision Instrument Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-md p-4 shadow-hairline">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-rose-50 text-rose-800 border border-rose-200">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">
                  Threshold &amp; Anomaly Engine
                </h1>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  DAEMON_MONITORING
                </span>
              </div>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                ACTIVE_RULES: {rules.filter((r) => r.isActive).length}/{rules.length}{" // "}ANOMALIES:{" "}
                {logs.length} EVENTS
              </p>
            </div>
          </div>

          {/* Node Selector & Action */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <div className="flex items-center gap-1.5">
              <FolderKanban className="h-3.5 w-3.5 text-[#64748B]" />
              <select
                className="h-8 px-2.5 border border-[#CBD5E1] rounded text-xs font-mono bg-white focus:border-[#2563EB] outline-none"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.protocol})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] shadow-sm transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Rule</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-1">
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === "rules"
              ? "bg-[#0F172A] text-white"
              : "text-[#64748B] hover:text-[#0F172A] bg-white border border-[#CBD5E1]"
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>RULES_MATRIX ({rules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === "logs"
              ? "bg-[#0F172A] text-white"
              : "text-[#64748B] hover:text-[#0F172A] bg-white border border-[#CBD5E1]"
          }`}
        >
          <Terminal className="h-3.5 w-3.5" />
          <span>ANOMALY_TELEPRINTER ({logs.length})</span>
          {logs.length > 0 && activeTab !== "logs" && (
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Tab: Rules Matrix */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
              <div className="h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">
                FETCHING_RULES...
              </span>
            </div>
          ) : rules.length === 0 ? (
            <div className="p-12 text-center bg-white border border-[#E2E8F0] rounded-md shadow-hairline space-y-3">
              <ShieldAlert className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="font-mono text-sm font-bold text-[#0F172A] uppercase">
                NO_ALERT_RULES_DEFINED
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans">
                Deploy threshold evaluation rules (e.g. temperature &gt; 80, tank_level &lt; 15) to intercept out-of-spec sensor conditions.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>DEPLOY_FIRST_RULE</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`bg-white border rounded-md shadow-hairline p-4 flex flex-col justify-between transition-colors ${
                    rule.isActive
                      ? "border-[#CBD5E1] hover:border-slate-400"
                      : "border-[#E2E8F0] opacity-60 bg-slate-50/50"
                  }`}
                >
                  <div>
                    {/* Severity & Action Controls */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider ${getSeverityBadge(
                          rule.severity
                        )}`}
                      >
                        {rule.severity}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleRule(rule.id, rule.isActive)}
                          className={`p-1 rounded text-xs transition-colors ${
                            rule.isActive
                              ? "text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                              : "text-slate-500 bg-slate-100 border border-slate-200 hover:bg-slate-200"
                          }`}
                          title={rule.isActive ? "Deactivate rule" : "Activate rule"}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Purge rule"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-sm text-[#0F172A] tracking-tight">
                      {rule.name}
                    </h3>

                    {/* Condition Box */}
                    <div className="mt-3 p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[#64748B]">TARGET_FIELD:</span>
                        <span className="font-semibold text-[#0F172A]">{rule.field}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#64748B]">EVALUATION:</span>
                        <span className="font-bold text-[#2563EB]">
                          {rule.operator} {rule.value}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-4 border-t border-[#F1F5F9] flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>DEPLOYED</span>
                    <span>{new Date(rule.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Anomaly Log Terminal */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden flex flex-col h-[640px]">
            {/* Terminal Header */}
            <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#0F172A]" />
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  anomaly_engine_teleprinter.stdout
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  2000MS_POLL
                </span>
              </div>

              {logs.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>PURGE_ANOMALIES</span>
                </button>
              )}
            </div>

            {/* Terminal Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs bg-[#F8FAFC]">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 opacity-60" />
                  <p className="uppercase text-xs tracking-wider font-bold text-[#0F172A]">
                    ALL_SYSTEMS_NOMINAL
                  </p>
                  <p className="text-[11px] font-sans text-slate-400 max-w-sm">
                    No parameter violations detected. Sensor streams are currently within safe limits.
                  </p>
                </div>
              ) : (
                logs.map((log) => {
                  const isCritical = log.severity === "critical" || log.severity === "error";
                  return (
                    <div
                      key={log.id}
                      className="p-2.5 rounded border border-[#E2E8F0] bg-white shadow-hairline flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-slate-400 text-[11px] tabular-nums shrink-0">
                          [{new Date(log.timestamp).toLocaleTimeString()}]
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase shrink-0 ${getSeverityBadge(
                            log.severity
                          )}`}
                        >
                          {log.severity}
                        </span>
                        <span
                          className={`truncate font-sans ${
                            isCritical ? "text-rose-700 font-semibold" : "text-[#0F172A]"
                          }`}
                        >
                          {log.message}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-[11px] text-[#64748B]">
                        <span className="font-mono text-slate-400">MEASURED:</span>
                        <span className="font-mono font-bold text-[#0F172A] bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                          {log.value}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deploy Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-md shadow-popover max-w-md w-full overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <span className="font-mono text-xs font-bold text-[#0F172A] uppercase">
                DEPLOY_ALERT_RULE
              </span>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                  RULE IDENTIFIER / NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tank Overheat Protection"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full h-8 px-2.5 font-sans border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                    FIELD PATH
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="temperature"
                    value={ruleField}
                    onChange={(e) => setRuleField(e.target.value)}
                    className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                    OPERATOR
                  </label>
                  <select
                    value={ruleOperator}
                    onChange={(e) => setRuleOperator(e.target.value)}
                    className="w-full h-8 px-2 font-mono border border-[#CBD5E1] rounded bg-white outline-none"
                  >
                    <option value=">">&gt; Greater Than</option>
                    <option value="<">&lt; Less Than</option>
                    <option value=">=">&gt;= Greater or Equal</option>
                    <option value="<=">&lt;= Less or Equal</option>
                    <option value="==">== Equals</option>
                    <option value="!=">!= Not Equal</option>
                    <option value="contains">Contains</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                  THRESHOLD VALUE
                </label>
                <input
                  type="text"
                  required
                  placeholder="85"
                  value={ruleValue}
                  onChange={(e) => setRuleValue(e.target.value)}
                  className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                  SEVERITY LEVEL
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["info", "warning", "critical"] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setRuleSeverity(sev)}
                      className={`h-7 rounded text-xs font-mono font-bold uppercase border transition-colors ${
                        ruleSeverity === sev
                          ? "bg-[#0F172A] text-white border-[#0F172A]"
                          : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs font-mono rounded border border-[#CBD5E1] hover:bg-[#F8FAFC]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 text-xs font-mono font-bold bg-[#0F172A] text-white rounded hover:bg-[#1E293B]"
                >
                  {actionLoading ? "DEPLOYING..." : "DEPLOY_RULE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
