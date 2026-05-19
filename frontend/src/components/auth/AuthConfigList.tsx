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
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F8FAFB] mb-4">
          <Clock className="h-8 w-8 text-[#5A6C7D]" />
        </div>
        <h3 className="text-lg font-semibold text-[#2C3E50] mb-2">
          No Auth Configs
        </h3>
        <p className="text-[#5A6C7D]">
          Create your first authentication configuration
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {authConfigs.map((config) => (
        <div
          key={config.id}
          className="card-industrial p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-lg font-semibold text-[#2C3E50]">
                  {config.provider}
                </h3>
                {config.active ? (
                  <span className="badge-active">Active</span>
                ) : (
                  <span className="badge-error">Inactive</span>
                )}
                {config.refreshEnabled && (
                  <span className="px-2 py-1 bg-[#88BDF2]/10 text-[#6A89A7] text-xs font-medium rounded">
                    Auto-Refresh
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[#5A6C7D]">Endpoint:</span>
                  <p className="text-[#2C3E50] font-mono text-xs mt-1 truncate">
                    {config.tokenEndpoint}
                  </p>
                </div>
                <div>
                  <span className="text-[#5A6C7D]">Client ID:</span>
                  <p className="text-[#2C3E50] font-mono text-xs mt-1 truncate">
                    {config.clientId}
                  </p>
                </div>
                <div>
                  <span className="text-[#5A6C7D]">Grant Type:</span>
                  <p className="text-[#2C3E50] mt-1">{config.grantType}</p>
                </div>
                {config.scope && (
                  <div>
                    <span className="text-[#5A6C7D]">Scope:</span>
                    <p className="text-[#2C3E50] mt-1">{config.scope}</p>
                  </div>
                )}
                {config.refreshEnabled && (
                  <div>
                    <span className="text-[#5A6C7D]">Refresh Before:</span>
                    <p className="text-[#2C3E50] mt-1">
                      {config.refreshBeforeExpiry}s
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-[#5A6C7D]">Updated:</span>
                  <p className="text-[#2C3E50] mt-1">
                    {formatDistanceToNow(new Date(config.updatedAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => onViewLogs(config)}
                className="p-2 text-[#6A89A7] hover:bg-[#F8FAFB] rounded-lg transition-colors"
                title="View Logs"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleTest(config.id)}
                disabled={testingId === config.id}
                className="p-2 text-[#6A89A7] hover:bg-[#F8FAFB] rounded-lg transition-colors disabled:opacity-50"
                title="Test Connection"
              >
                <TestTube
                  className={`h-4 w-4 ${testingId === config.id ? "animate-pulse" : ""}`}
                />
              </button>
              {config.refreshEnabled && (
                <button
                  onClick={() => handleRefresh(config.id)}
                  disabled={refreshingId === config.id}
                  className="p-2 text-[#6A89A7] hover:bg-[#F8FAFB] rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh Token"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshingId === config.id ? "animate-spin" : ""}`}
                  />
                </button>
              )}
              <button
                onClick={() => onEdit(config)}
                className="p-2 text-[#6A89A7] hover:bg-[#F8FAFB] rounded-lg transition-colors"
                title="Edit"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (
                    confirm("Are you sure you want to delete this auth config?")
                  ) {
                    onDelete(config.id);
                  }
                }}
                className="p-2 text-[#F44336] hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E8EDF2]">
          <div>
            <h2 className="text-xl font-bold text-[#2C3E50]">Refresh Logs</h2>
            <p className="text-sm text-[#5A6C7D] mt-1">{authConfig.provider}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#5A6C7D] hover:text-[#2C3E50] transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-y-auto p-6">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-[#5A6C7D] mx-auto mb-4" />
              <p className="text-[#5A6C7D]">No refresh logs yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-4 rounded-lg border ${
                    log.success
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {log.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-[#2C3E50]">
                          {log.success
                            ? "Token Refreshed Successfully"
                            : "Refresh Failed"}
                        </p>
                        {log.errorMessage && (
                          <p className="text-sm text-red-700 mt-1">
                            {log.errorMessage}
                          </p>
                        )}
                        {log.success && log.newTokenExpiry && (
                          <p className="text-sm text-[#5A6C7D] mt-1">
                            New token expires:{" "}
                            {formatDistanceToNow(new Date(log.newTokenExpiry), {
                              addSuffix: true,
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-[#5A6C7D]">
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
