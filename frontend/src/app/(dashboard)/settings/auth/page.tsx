"use client";

import { useState, useEffect } from "react";
import { Plus, Shield, AlertCircle, FolderKanban, Terminal, RefreshCw, Key } from "lucide-react";
import { authConfigApi, AuthConfig, RefreshLog } from "@/lib/authConfigApi";
import { api } from "@/lib/api";
import AuthConfigModal from "@/components/auth/AuthConfigModal";
import AuthConfigList, {
  RefreshLogsModal,
} from "@/components/auth/AuthConfigList";
import toast from "react-hot-toast";

export default function AuthSettingsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [authConfigs, setAuthConfigs] = useState<AuthConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AuthConfig | null>(null);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [selectedConfigForLogs, setSelectedConfigForLogs] =
    useState<AuthConfig | null>(null);
  const [refreshLogs, setRefreshLogs] = useState<RefreshLog[]>([]);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadAuthConfigs();
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    try {
      const response = await api.get("/projects");
      const list = Array.isArray(response.data)
        ? response.data
        : response.data?.projects || [];
      setProjects(list);
      if (list.length > 0 && !selectedProjectId) {
        setSelectedProjectId(list[0].id);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
      toast.error("Failed to load simulation nodes");
    } finally {
      setLoading(false);
    }
  };

  const loadAuthConfigs = async () => {
    try {
      setLoading(true);
      const data = await authConfigApi.getByProject(selectedProjectId);
      setAuthConfigs(data || []);
    } catch (error) {
      console.error("Failed to load auth configs:", error);
      toast.error("Failed to load auth configurations");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: any) => {
    try {
      await authConfigApi.create(data);
      await loadAuthConfigs();
    } catch (error) {
      throw error;
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingConfig) return;
    try {
      await authConfigApi.update(editingConfig.id, data);
      await loadAuthConfigs();
      setEditingConfig(null);
    } catch (error) {
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await authConfigApi.delete(id);
      toast.success("Auth configuration deleted");
      await loadAuthConfigs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete auth config");
    }
  };

  const handleTest = async (id: string) => {
    try {
      const result = await authConfigApi.test(id);
      if (result.success) {
        toast.success(`Token obtained successfully. Expires in ${result.expiresIn}s`);
      } else {
        toast.error(`Test failed: ${result.error}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || "Test failed");
    }
  };

  const handleRefresh = async (id: string) => {
    try {
      const result = await authConfigApi.refresh(id);
      if (result.success) {
        toast.success(`Token refreshed. Expires in ${result.expiresIn}s`);
        await loadAuthConfigs();
      } else {
        toast.error(`Refresh failed: ${result.error}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || "Refresh failed");
    }
  };

  const handleViewLogs = async (config: AuthConfig) => {
    try {
      const logs = await authConfigApi.getLogs(config.id);
      setRefreshLogs(logs || []);
      setSelectedConfigForLogs(config);
      setIsLogsModalOpen(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || "Failed to load logs");
    }
  };

  const handleEdit = (config: AuthConfig) => {
    setEditingConfig(config);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingConfig(null);
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <div className="h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">
          INITIALIZING_AUTH_ENGINE...
        </span>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white border border-[#E2E8F0] rounded-md p-4 shadow-hairline">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-slate-100 text-[#0F172A] border border-slate-200">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">
                OAuth 2.0 &amp; Token Federation Engine
              </h1>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                NO_PROJECT_NODES_FOUND
              </p>
            </div>
          </div>
        </div>

        <div className="p-12 text-center bg-white border border-[#E2E8F0] rounded-md shadow-hairline space-y-3">
          <AlertCircle className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="font-mono text-sm font-bold text-[#0F172A] uppercase">
            NO_PROJECTS_REGISTERED
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans">
            Provision an IoT simulation node first before configuring automated OAuth 2.0 token management.
          </p>
          <button
            onClick={() => (window.location.href = "/projects/new")}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>PROVISION_FIRST_NODE</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Precision Instrument Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-md p-4 shadow-hairline">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-slate-100 text-[#0F172A] border border-slate-200">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">
                  OAuth 2.0 &amp; Token Federation Engine
                </h1>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  TOKEN_DAEMON_ACTIVE
                </span>
              </div>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                AUTOMATED_TOKEN_REFRESH{" // "}BEARER_INJECTION_DAEMON
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={!selectedProjectId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] shadow-sm transition-all disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Auth Config</span>
            </button>
          </div>
        </div>
      </div>

      {/* Target Node Selector Ribbon */}
      <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-[#64748B]" />
          <span className="font-mono font-bold text-[#0F172A] text-xs">
            SELECT_SIMULATION_NODE:
          </span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="h-8 px-2.5 border border-[#CBD5E1] rounded text-xs font-mono bg-white focus:border-[#2563EB] outline-none"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.protocol})
              </option>
            ))}
          </select>
        </div>

        <div className="font-mono text-[11px] text-[#64748B]">
          CONFIGS_LINKED: <b className="text-[#0F172A]">{authConfigs.length}</b>
        </div>
      </div>

      {/* Auth Configurations Matrix */}
      <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden p-4">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-[#0F172A]" />
            <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              AUTHENTICATION_PROFILES_MATRIX
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#64748B]">
            AES_256_ENCRYPTED_SECRETS
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">
              QUERYING_CONFIGURATIONS...
            </span>
          </div>
        ) : (
          <AuthConfigList
            authConfigs={authConfigs}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onTest={handleTest}
            onRefresh={handleRefresh}
            onViewLogs={handleViewLogs}
          />
        )}
      </div>

      {/* Modals */}
      <AuthConfigModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={editingConfig ? handleUpdate : handleCreate}
        authConfig={editingConfig}
        projectId={selectedProjectId}
      />

      <RefreshLogsModal
        isOpen={isLogsModalOpen}
        onClose={() => {
          setIsLogsModalOpen(false);
          setSelectedConfigForLogs(null);
          setRefreshLogs([]);
        }}
        logs={refreshLogs}
        authConfig={selectedConfigForLogs}
      />
    </div>
  );
}
