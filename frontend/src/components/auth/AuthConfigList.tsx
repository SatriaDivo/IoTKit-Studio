"use client";

import { useState } from "react";
import {
  Edit2,
  Trash2,
  RefreshCw,
  TestTube,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Shield,
  Key,
  Globe,
  Terminal,
} from "lucide-react";
import { AuthConfig, RefreshLog } from "@/lib/authConfigApi";
import { formatDistanceToNow } from "date-fns";

interface AuthConfigListProps {
  authConfigs: AuthConfig[];
  onEdit: (config: AuthConfig) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  onRefresh: (id: string) => void;
  onViewLogs: (config: AuthConfig) => void;
}

export default function AuthConfigList({
  authConfigs,
  onEdit,
  onDelete,
  onTest,
  onRefresh,
  onViewLogs,
}: AuthConfigListProps) {
  const [testingId, setTestingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const handleTest = async (id: string) => {
    setTestingId(id);
    await onTest(id);
    setTestingId(null);
  };

  const handleRefresh = async (id: string) => {
    setRefreshingId(id);
    await onRefresh(id);
    setRefreshingId(null);
  };

  if (authConfigs.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono text-xs space-y-2">
        <Shield className="h-10 w-10 mx-auto opacity-25" />
        <p className="uppercase font-bold tracking-wider text-[#0F172A]">
          NO_AUTH_CONFIGS_FOR_NODE
        </p>
        <p className="text-[11px] font-sans text-slate-400 max-w-sm mx-auto">
          No OAuth 2.0 or Token profiles linked to this simulation node. Deploy an authentication configuration to enable automatic token retrieval.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {authConfigs.map((config) => (
        <div
          key={config.id}
          className="bg-white border border-[#E2E8F0] rounded-md p-4 shadow-hairline hover:border-[#CBD5E1] transition-colors"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
                <span className="font-bold text-sm text-[#0F172A]">
                  {config.provider.toUpperCase()}
                </span>
                {config.active ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-bold">
                    ACTIVE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-mono">
                    DISABLED
                  </span>
                )}
                {config.refreshEnabled && (
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-mono font-bold flex items-center gap-1">
                    <RefreshCw className="h-2.5 w-2.5" />
                    AUTO_REFRESH ({config.refreshBeforeExpiry}S)
                  </span>
                )}
              </div>

              {/* Details Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 font-mono text-xs">
                <div className="p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#64748B] uppercase block">
                    TOKEN_ENDPOINT:
                  </span>
                  <p className="text-[#0F172A] font-bold truncate mt-0.5">
                    {config.tokenEndpoint}
                  </p>
                </div>

                <div className="p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#64748B] uppercase block">
                    CLIENT_ID:
                  </span>
                  <p className="text-[#0F172A] font-bold truncate mt-0.5">
                    {config.clientId}
                  </p>
                </div>

                <div className="p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-[10px] text-[#64748B] uppercase">GRANT_TYPE:</span>
                  <span className="font-bold text-[#0F172A]">{config.grantType}</span>
                </div>

                {config.scope && (
                  <div className="p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                    <span className="text-[10px] text-[#64748B] uppercase">SCOPE:</span>
                    <span className="font-bold text-[#0F172A] truncate max-w-[180px]">
                      {config.scope}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-2 text-[10px] font-mono text-slate-400">
                LAST_UPDATED:{" "}
                {formatDistanceToNow(new Date(config.updatedAt), { addSuffix: true })}
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="flex items-center gap-1.5 self-start shrink-0 pt-1">
              <button
                onClick={() => onViewLogs(config)}
                className="p-1.5 text-slate-500 hover:text-[#0F172A] hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded transition-colors"
                title="View Refresh Logs"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => handleTest(config.id)}
                disabled={testingId === config.id}
                className="p-1.5 text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 border border-[#CBD5E1] rounded transition-colors disabled:opacity-50"
                title="Test Token Fetch"
              >
                <TestTube
                  className={`h-3.5 w-3.5 ${testingId === config.id ? "animate-spin" : ""}`}
                />
              </button>

              {config.refreshEnabled && (
                <button
                  onClick={() => handleRefresh(config.id)}
                  disabled={refreshingId === config.id}
                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-[#CBD5E1] rounded transition-colors disabled:opacity-50"
                  title="Force Refresh Token"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${refreshingId === config.id ? "animate-spin" : ""}`}
                  />
                </button>
              )}

              <button
                onClick={() => onEdit(config)}
                className="p-1.5 text-slate-500 hover:text-[#0F172A] hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded transition-colors"
                title="Edit Configuration"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => {
                  if (confirm("Confirm permanent removal of this authentication configuration?")) {
                    onDelete(config.id);
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded transition-colors"
                title="Delete Configuration"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface RefreshLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: RefreshLog[];
  authConfig: AuthConfig | null;
}

export function RefreshLogsModal({
  isOpen,
  onClose,
  logs,
  authConfig,
}: RefreshLogsModalProps) {
  if (!isOpen || !authConfig) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#CBD5E1] rounded-md shadow-popover max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-[#0F172A]" />
            <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              TOKEN_REFRESH_AUDIT_LOGS{" // "}{authConfig.provider.toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xs font-mono"
          >
            ✕
          </button>
        </div>

        {/* Logs Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 font-mono text-xs bg-[#F8FAFC]">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="uppercase text-xs font-bold">NO_REFRESH_LOGS_RECORDED</p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded border border-[#E2E8F0] bg-white shadow-hairline space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {log.success ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                        SUCCESS
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
                        FAILED
                      </span>
                    )}
                    <span className="text-slate-400 text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {log.newTokenExpiry && (
                    <span className="text-[11px] text-[#64748B]">
                      EXPIRES_AT: <b className="text-[#0F172A]">{new Date(log.newTokenExpiry).toLocaleTimeString()}</b>
                    </span>
                  )}
                </div>

                {log.errorMessage && (
                  <p className="text-rose-700 text-[11px] font-mono break-all bg-rose-50/50 p-2 rounded border border-rose-200">
                    {log.errorMessage}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-[#E2E8F0] bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-xs font-mono font-medium text-[#475569]"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
