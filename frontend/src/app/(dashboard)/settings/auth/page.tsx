"use client";

import { useState, useEffect } from "react";
import { Plus, Shield, AlertCircle } from "lucide-react";
import { authConfigApi, AuthConfig, RefreshLog } from "@/lib/authConfigApi";
import { api } from "@/lib/api";
import AuthConfigModal from "@/components/auth/AuthConfigModal";
import AuthConfigList, {
  RefreshLogsModal,
} from "@/components/auth/AuthConfigList";

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
      const data = response.data;
      setProjects(data);
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAuthConfigs = async () => {
    try {
      setLoading(true);
      const data = await authConfigApi.getByProject(selectedProjectId);
      setAuthConfigs(data);
    } catch (error) {
      console.error("Failed to load auth configs:", error);
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
      await loadAuthConfigs();
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to delete auth config");
    }
  };

  const handleTest = async (id: string) => {
    try {
      const result = await authConfigApi.test(id);
      if (result.success) {
        alert(
          `✅ Token obtained successfully!\n\nExpires in: ${result.expiresIn}s`,
        );
      } else {
        alert(`❌ Test failed:\n\n${result.error}`);
      }
    } catch (error: any) {
      alert(
        `❌ Test failed:\n\n${error.response?.data?.error || error.message}`,
      );
    }
  };

  const handleRefresh = async (id: string) => {
    try {
      const result = await authConfigApi.refresh(id);
      if (result.success) {
        alert(
          `✅ Token refreshed successfully!\n\nExpires in: ${result.expiresIn}s`,
        );
        await loadAuthConfigs();
      } else {
        alert(`❌ Refresh failed:\n\n${result.error}`);
      }
    } catch (error: any) {
      alert(
        `❌ Refresh failed:\n\n${error.response?.data?.error || error.message}`,
      );
    }
  };

  const handleViewLogs = async (config: AuthConfig) => {
    try {
      const logs = await authConfigApi.getLogs(config.id);
      setRefreshLogs(logs);
      setSelectedConfigForLogs(config);
      setIsLogsModalOpen(true);
    } catch (error: any) {
      alert(
        `Failed to load logs:\n\n${error.response?.data?.error || error.message}`,
      );
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6A89A7] mx-auto mb-4"></div>
          <p className="text-[#5A6C7D]">Loading...</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#2C3E50]">
            Authentication Settings
          </h1>
          <p className="text-[#5A6C7D] mt-1">
            Manage OAuth 2.0 and token authentication
          </p>
        </div>

        <div className="card-industrial p-12 text-center">
          <AlertCircle className="h-12 w-12 text-[#5A6C7D] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#2C3E50] mb-2">
            No Projects Found
          </h3>
          <p className="text-[#5A6C7D]">
            Create a project first to configure authentication
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2C3E50]">
            Authentication Settings
          </h1>
          <p className="text-[#5A6C7D] mt-1">
            Manage OAuth 2.0 and token authentication
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
          disabled={!selectedProjectId}
        >
          <Plus className="h-4 w-4" />
          Add Auth Config
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-[#88BDF2]/10 border border-[#88BDF2]/30 rounded-lg p-4 flex items-start gap-3">
        <Shield className="h-5 w-5 text-[#6A89A7] mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-[#2C3E50] mb-1">
            Automatic Token Management
          </h3>
          <p className="text-sm text-[#5A6C7D]">
            Configure OAuth 2.0 authentication for your projects. Tokens will be
            automatically refreshed before expiry and injected into your
            requests. All credentials are encrypted at rest.
          </p>
        </div>
      </div>

      {/* Project Selector */}
      <div className="card-industrial p-6">
        <label className="block text-sm font-medium text-[#2C3E50] mb-2">
          Select Project
        </label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full px-4 py-2 border border-[#D1DBE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A89A7]"
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name} ({project.protocol.toUpperCase()})
            </option>
          ))}
        </select>
      </div>

      {/* Auth Configs List */}
      <div className="card-industrial p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#2C3E50]">
            Authentication Configurations
          </h2>
          {authConfigs.length > 0 && (
            <span className="text-sm text-[#5A6C7D]">
              {authConfigs.length} config(s)
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6A89A7] mx-auto mb-4"></div>
            <p className="text-[#5A6C7D]">Loading configurations...</p>
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
