"use client";

import { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Power, 
  Settings, 
  Bell, 
  ShieldAlert, 
  Terminal, 
  RefreshCw, 
  FolderKanban,
  CheckCircle,
  FileSpreadsheet
} from "lucide-react";
import { toast } from "react-hot-toast";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePopupStore } from "@/store/popupStore";

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
  const [activeTab, setActiveTab] = useState<"rules" | "logs">("rules");
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [logs, setLogs] = useState<AlertLog[]>([]);
  const confirm = usePopupStore((state) => state.confirm);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // New Rule Form State
  const [ruleName, setRuleName] = useState("");
  const [ruleField, setRuleField] = useState("");
  const [ruleOperator, setRuleOperator] = useState(">");
  const [ruleValue, setRuleValue] = useState("");
  const [ruleSeverity, setRuleSeverity] = useState<"info" | "warning" | "critical">("warning");

  // Fetch Projects on Load
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get("/projects");
        setProjects(res.data);
        if (res.data.length > 0) {
          setSelectedProjectId(res.data[0].id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        toast.error("Failed to load projects");
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Fetch Rules and Logs when project or active tab changes
  useEffect(() => {
    if (!selectedProjectId) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === "rules") {
          const res = await api.get(`/alerts/rules/project/${selectedProjectId}`);
          setRules(res.data);
        } else {
          const res = await api.get(`/alerts/history/project/${selectedProjectId}`);
          setLogs(res.data);
        }
      } catch (err) {
        toast.error("Failed to load alert data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Setup periodic polling for logs if active tab is logs
    let interval: any;
    if (activeTab === "logs") {
      interval = setInterval(async () => {
        try {
          const res = await api.get(`/alerts/history/project/${selectedProjectId}`);
          setLogs(res.data);
        } catch (e) {}
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedProjectId, activeTab]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName || !ruleField || !ruleValue) {
      toast.error("Please fill in all fields");
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
      toast.success("Alert rule created successfully!");
      setShowModal(false);
      
      // Reset form
      setRuleName("");
      setRuleField("");
      setRuleOperator(">");
      setRuleValue("");
      setRuleSeverity("warning");
    } catch (err) {
      toast.error("Failed to create alert rule");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleRule = async (ruleId: string, currentActive: boolean) => {
    try {
      const res = await api.put(`/alerts/rules/${ruleId}`, {
        isActive: !currentActive,
      });
      setRules(rules.map(r => r.id === ruleId ? res.data : r));
      toast.success(`Rule ${!currentActive ? 'activated' : 'deactivated'} successfully!`);
    } catch (err) {
      toast.error("Failed to toggle rule state");
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    const isConfirmed = await confirm("Are you sure you want to delete this alert rule?", "Delete Alert Rule");
    if (!isConfirmed) return;
    try {
      await api.delete(`/alerts/rules/${ruleId}`);
      setRules(rules.filter(r => r.id !== ruleId));
      toast.success("Alert rule deleted");
    } catch (err) {
      toast.error("Failed to delete alert rule");
    }
  };

  const handleClearHistory = async () => {
    const isConfirmed = await confirm("Are you sure you want to clear all alert logs for this project?", "Clear Alert Logs");
    if (!isConfirmed) return;
    try {
      await api.post(`/alerts/history/clear/${selectedProjectId}`);
      setLogs([]);
      toast.success("Alert logs cleared");
    } catch (err) {
      toast.error("Failed to clear alert logs");
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-[#F44336] bg-[#F44336]/10 border-[#F44336]/30";
      case "warning":
        return "text-[#FF9800] bg-[#FF9800]/10 border-[#FF9800]/30";
      default:
        return "text-[#6A89A7] bg-[#6A89A7]/10 border-[#6A89A7]/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#2C3E50] flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-[#6A89A7] animate-pulse" />
            Alert & Rule Engine
          </h1>
          <p className="text-[#5A6C7D] mt-1">
            Detect anomalies, configure threshold rules, and receive autonomous real-time notifications.
          </p>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-3 bg-[#E8EDF2] p-2.5 rounded-lg border border-[#D1DBE5]">
          <FolderKanban className="h-5 w-5 text-[#5A6C7D]" />
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-transparent text-sm font-semibold text-[#2C3E50] border-none outline-none cursor-pointer pr-4"
          >
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-[#D1DBE5] gap-4">
        <button
          onClick={() => setActiveTab("rules")}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 px-1 flex items-center gap-2 ${
            activeTab === "rules"
              ? "border-[#6A89A7] text-[#2C3E50]"
              : "border-transparent text-[#5A6C7D] hover:text-[#2C3E50]"
          }`}
        >
          <Settings className="h-4 w-4" />
          Configured Alert Rules
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 px-1 flex items-center gap-2 ${
            activeTab === "logs"
              ? "border-[#6A89A7] text-[#2C3E50]"
              : "border-transparent text-[#5A6C7D] hover:text-[#2C3E50]"
          }`}
        >
          <Terminal className="h-4 w-4" />
          Anomaly Log Terminal
          {logs.length > 0 && activeTab !== "logs" && (
            <span className="h-2 w-2 rounded-full bg-[#F44336] animate-ping" />
          )}
        </button>
      </div>

      {/* Tab: Rules */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#2C3E50]">Threshold Rules ({rules.length})</h2>
            <Button
              onClick={() => setShowModal(true)}
              className="bg-[#6A89A7] hover:bg-[#5a7997] text-white flex items-center gap-2 rounded-lg"
            >
              <Plus className="h-4 w-4" /> New Alert Rule
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 text-[#6A89A7] animate-spin" />
            </div>
          ) : rules.length === 0 ? (
            <Card className="card-industrial p-12 text-center flex flex-col items-center">
              <ShieldAlert className="h-16 w-16 text-[#8B9AA8] mb-4" />
              <h3 className="text-xl font-bold text-[#2C3E50]">No Active Alert Rules</h3>
              <p className="text-[#5A6C7D] mt-2 max-w-md">
                Configure threshold rules to monitor telemetry values (e.g. temperature, boolean state) and trigger real-time alerts.
              </p>
              <Button
                onClick={() => setShowModal(true)}
                className="mt-6 bg-[#6A89A7] hover:bg-[#5a7997] text-white flex items-center gap-2 rounded-lg"
              >
                <Plus className="h-4 w-4" /> Create First Rule
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rules.map((rule) => (
                <Card 
                  key={rule.id} 
                  className={`card-industrial p-5 flex flex-col justify-between border-t-4 transition-all ${
                    rule.isActive ? "border-t-[#6A89A7] shadow-sm" : "border-t-[#A5B5C5] opacity-75"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded border uppercase tracking-wider ${getSeverityStyle(rule.severity)}`}>
                        {rule.severity}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleRule(rule.id, rule.isActive)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            rule.isActive
                              ? "text-[#4CAF50] bg-[#4CAF50]/10 border-[#4CAF50]/30 hover:bg-[#4CAF50]/20"
                              : "text-[#5A6C7D] bg-gray-100 border-gray-300 hover:bg-gray-200"
                          }`}
                          title={rule.isActive ? "Deactivate Rule" : "Activate Rule"}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 text-[#F44336] bg-[#F44336]/10 border-[#F44336]/30 rounded-lg hover:bg-[#F44336]/20 transition-all"
                          title="Delete Rule"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-md font-bold text-[#2C3E50]">{rule.name}</h3>
                    <div className="mt-4 space-y-2 bg-[#F5F8FA] p-3 rounded-lg border border-[#D1DBE5] font-mono text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#5A6C7D]">Field Path:</span>
                        <span className="font-semibold text-[#2C3E50]">{rule.field}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#5A6C7D]">Condition:</span>
                        <span className="font-semibold text-[#2C3E50]">
                          {rule.operator} {rule.value}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-[#8B9AA8] mt-4 pt-3 border-t border-[#D1DBE5] flex justify-between">
                    <span>Configured</span>
                    <span>{new Date(rule.createdAt).toLocaleString()}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Logs */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#2C3E50]">Triggered Anomalies ({logs.length})</h2>
            {logs.length > 0 && (
              <Button
                onClick={handleClearHistory}
                className="bg-[#F44336] hover:bg-[#D32F2F] text-white flex items-center gap-2 rounded-lg"
              >
                <Trash2 className="h-4 w-4" /> Clear Logs Terminal
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 text-[#6A89A7] animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <Card className="card-industrial p-12 text-center flex flex-col items-center">
              <CheckCircle className="h-16 w-16 text-[#4CAF50] mb-4 animate-bounce" />
              <h3 className="text-xl font-bold text-[#2C3E50]">No Anomalies Detected</h3>
              <p className="text-[#5A6C7D] mt-2 max-w-md">
                Systems are running smoothly. No parameters have violated the configured thresholds.
              </p>
            </Card>
          ) : (
            <Card className="card-industrial overflow-hidden border border-[#D1DBE5]">
              <div className="bg-[#2C3E50] p-3 text-white flex items-center gap-2 border-b border-[#384959] font-mono text-xs">
                <Terminal className="h-4 w-4 text-[#88BDF2]" />
                <span>anomaly_engine_stdout.log</span>
                <span className="ml-auto flex items-center gap-2 text-[#8B9AA8]">
                  <span className="h-2 w-2 rounded-full bg-[#4CAF50] animate-pulse" />
                  <span>Real-time Stream Connected</span>
                </span>
              </div>
              
              <div className="max-h-[500px] overflow-y-auto p-4 bg-[#1E293B] font-mono text-xs text-gray-200 divide-y divide-gray-800">
                {logs.map((log) => {
                  const dateStr = new Date(log.timestamp).toLocaleString();
                  const isCritical = log.severity === "critical" || log.severity === "error";
                  
                  return (
                    <div key={log.id} className="py-2.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                      <span className="text-gray-500 shrink-0 select-none">[{dateStr}]</span>
                      <span className={`px-2 py-0.5 rounded font-bold uppercase select-none shrink-0 ${
                        isCritical 
                          ? "text-[#F44336] bg-[#F44336]/10 border border-[#F44336]/20" 
                          : log.severity === "warning"
                          ? "text-[#FF9800] bg-[#FF9800]/10 border border-[#FF9800]/20"
                          : "text-[#6A89A7] bg-[#6A89A7]/10 border border-[#6A89A7]/20"
                      }`}>
                        {log.severity}
                      </span>
                      <span className={`flex-1 ${isCritical ? "text-[#FF8A80] font-semibold" : "text-gray-300"}`}>
                        {log.message}
                      </span>
                      <span className="text-gray-500 font-mono text-[10px] shrink-0">val: {log.value}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Create Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <Card className="card-industrial max-w-md w-full p-6 space-y-4 shadow-2xl relative border border-[#D1DBE5]">
            <div className="flex justify-between items-center border-b border-[#D1DBE5] pb-3">
              <h3 className="text-lg font-bold text-[#2C3E50] flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-[#6A89A7]" />
                Configure New Alert Rule
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-[#5A6C7D] hover:text-[#2C3E50]"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#5A6C7D] uppercase tracking-wider mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tank Overheating Alert"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#D1DBE5] text-sm focus:outline-none focus:ring-1 focus:ring-[#6A89A7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#5A6C7D] uppercase tracking-wider mb-1">
                    Payload Field Path
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. temperature"
                    value={ruleField}
                    onChange={(e) => setRuleField(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#D1DBE5] text-sm focus:outline-none focus:ring-1 focus:ring-[#6A89A7] font-mono"
                  />
                  <p className="text-[9px] text-[#8B9AA8] mt-0.5">Supports nested paths like: sensor.value</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5A6C7D] uppercase tracking-wider mb-1">
                    Operator
                  </label>
                  <select
                    value={ruleOperator}
                    onChange={(e) => setRuleOperator(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#D1DBE5] text-sm focus:outline-none focus:ring-1 focus:ring-[#6A89A7] bg-white cursor-pointer"
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
                <label className="block text-xs font-bold text-[#5A6C7D] uppercase tracking-wider mb-1">
                  Threshold Value
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 80"
                  value={ruleValue}
                  onChange={(e) => setRuleValue(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#D1DBE5] text-sm focus:outline-none focus:ring-1 focus:ring-[#6A89A7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5A6C7D] uppercase tracking-wider mb-1">
                  Alert Severity
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["info", "warning", "critical"] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setRuleSeverity(sev)}
                      className={`p-2 rounded-lg text-xs font-bold border transition-all capitalize ${
                        ruleSeverity === sev
                          ? sev === "critical"
                            ? "bg-[#F44336] text-white border-[#F44336]"
                            : sev === "warning"
                            ? "bg-[#FF9800] text-white border-[#FF9800]"
                            : "bg-[#6A89A7] text-white border-[#6A89A7]"
                          : "bg-white text-[#5A6C7D] border-[#D1DBE5] hover:bg-gray-50"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#D1DBE5]">
                <Button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-transparent border border-[#D1DBE5] text-[#5A6C7D] hover:bg-gray-100 rounded-lg text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-[#6A89A7] hover:bg-[#5a7997] text-white rounded-lg text-sm flex items-center gap-2"
                >
                  {actionLoading ? "Creating..." : "Save Config"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
