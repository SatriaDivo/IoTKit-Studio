"use client";

import { useState, useEffect } from "react";
import {
  User,
  Lock,
  Bell,
  Palette,
  Key,
  Download,
  Upload,
  Save,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Trash2,
  Copy,
  Shield,
  Sliders,
  Terminal,
  Settings2,
  Cpu,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { usePopupStore } from "@/store/popupStore";

interface UserProfile {
  name: string;
  email: string;
}

interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  simulationAlerts: boolean;
  errorAlerts: boolean;
  weeklyReport: boolean;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const confirm = usePopupStore((state) => state.confirm);

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: user?.email || "",
  });

  // Password state
  const [password, setPassword] = useState<PasswordChange>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Notification state
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    simulationAlerts: true,
    errorAlerts: true,
    weeklyReport: false,
  });

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [showKey, setShowKey] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const profileRes = await api.get("/auth/profile");
      setProfile({
        name: profileRes.data.name || "",
        email: profileRes.data.email || "",
      });

      const notifRes = await api.get("/settings/notifications");
      if (notifRes.data) {
        setNotifications(notifRes.data);
      }

      const keysRes = await api.get("/settings/api-keys");
      if (keysRes.data) {
        setApiKeys(keysRes.data);
      }
    } catch {}
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await api.put("/auth/profile", profile);
      toast.success("Profile updated");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (password.newPassword !== password.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (password.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setSaving(true);
      await api.post("/auth/change-password", {
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      toast.success("Password changed successfully");
      setPassword({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setSaving(true);
      await api.put("/settings/notifications", notifications);
      toast.success("Notification preferences saved");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a key identifier");
      return;
    }

    try {
      const res = await api.post("/settings/api-keys", { name: newKeyName });
      setApiKeys([...apiKeys, res.data]);
      setNewKeyName("");
      setShowKey(res.data.id);
      toast.success("API key generated");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to generate API key");
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    const isConfirmed = await confirm(
      "Confirm revocation of this API key?",
      "Revoke API Key"
    );
    if (!isConfirmed) return;

    try {
      await api.delete(`/settings/api-keys/${id}`);
      setApiKeys(apiKeys.filter((k) => k.id !== id));
      toast.success("API key revoked");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete API key");
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  };

  const handleExportSettings = () => {
    const settings = {
      profile,
      notifications,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iotkit-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Settings exported");
  };

  const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const settings = JSON.parse(event.target?.result as string);
        if (settings.profile) setProfile(settings.profile);
        if (settings.notifications) setNotifications(settings.notifications);
        toast.success("Settings imported successfully");
      } catch {
        toast.error("Invalid settings JSON schema");
      }
    };
    reader.readAsText(file);
  };

  const tabs = [
    { id: "profile", label: "PROFILE_IDENTITY", icon: User },
    { id: "security", label: "ACCESS_CREDENTIALS", icon: Lock },
    { id: "authentication", label: "OAUTH2_FEDERATION", icon: Shield },
    { id: "notifications", label: "DISPATCH_ALERTS", icon: Bell },
    { id: "api-keys", label: "API_KEY_VAULT", icon: Key },
    { id: "preferences", label: "SYSTEM_PREFERENCES", icon: Palette },
  ];

  return (
    <div className="space-y-4">
      {/* Precision Instrument Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-md p-4 shadow-hairline">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-slate-100 text-[#0F172A] border border-slate-200">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">
                  Cluster &amp; Operator Settings
                </h1>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  SECURITY_ENFORCED
                </span>
              </div>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                OPERATOR: {user?.email || "admin@iotkit.local"}{" // "}LOCAL_NODE: HOST_PORT_4000
              </p>
            </div>
          </div>

          {/* Export / Import Actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleExportSettings}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium text-[#475569] bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>EXPORT_CONFIG</span>
            </button>

            <label className="cursor-pointer">
              <button
                type="button"
                onClick={() => document.getElementById("import-file")?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium text-[#475569] bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC]"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>IMPORT_CONFIG</span>
              </button>
              <input
                id="import-file"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportSettings}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Main Grid: Sidebar Tabs (3 cols) & Tab Content (9 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Tabs Rail (3 cols) */}
        <div className="lg:col-span-3 space-y-1 bg-white border border-[#E2E8F0] rounded-md p-2 shadow-hairline h-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-mono font-semibold transition-colors ${
                  isActive
                    ? "bg-[#0F172A] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content Area (9 cols) */}
        <div className="lg:col-span-9 space-y-4">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  OPERATOR_IDENTITY_PROFILE
                </span>
                <span className="font-mono text-[10px] text-[#64748B]">ROLE: ROOT_ADMIN</span>
              </div>

              <div className="p-4 space-y-4 text-xs">
                <div>
                  <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                    OPERATOR_NAME
                  </label>
                  <input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Operator Full Name"
                    className="w-full h-8 px-2.5 font-sans border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                    SYSTEM_EMAIL_ADDRESS
                  </label>
                  <input
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    type="email"
                    placeholder="operator@iotkit.local"
                    className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] flex justify-end">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-mono font-bold bg-[#0F172A] text-white hover:bg-[#1E293B] shadow-xs"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{saving ? "SAVING..." : "COMMIT_PROFILE_CHANGES"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  UPDATE_ACCESS_KEY_PASSWORD
                </span>
              </div>

              <div className="p-4 space-y-3.5 text-xs">
                <div>
                  <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                    CURRENT_PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? "text" : "password"}
                      value={password.currentPassword}
                      onChange={(e) =>
                        setPassword({ ...password, currentPassword: e.target.value })
                      }
                      className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          current: !showPasswords.current,
                        })
                      }
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showPasswords.current ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                      NEW_PASSWORD (MIN 6 CHARS)
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        value={password.newPassword}
                        onChange={(e) =>
                          setPassword({ ...password, newPassword: e.target.value })
                        }
                        className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({
                            ...showPasswords,
                            new: !showPasswords.new,
                          })
                        }
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                      CONFIRM_NEW_PASSWORD
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        value={password.confirmPassword}
                        onChange={(e) =>
                          setPassword({ ...password, confirmPassword: e.target.value })
                        }
                        className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({
                            ...showPasswords,
                            confirm: !showPasswords.confirm,
                          })
                        }
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {password.newPassword && password.confirmPassword && (
                  <div className="font-mono text-[11px] pt-1">
                    {password.newPassword === password.confirmPassword ? (
                      <span className="text-emerald-700 flex items-center gap-1 font-bold">
                        <Check className="h-3.5 w-3.5" /> PASSWORDS_MATCH
                      </span>
                    ) : (
                      <span className="text-rose-700 flex items-center gap-1 font-bold">
                        <AlertCircle className="h-3.5 w-3.5" /> PASSWORDS_MISMATCH
                      </span>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-[#E2E8F0] flex justify-end">
                  <button
                    onClick={handleChangePassword}
                    disabled={
                      saving ||
                      !password.currentPassword ||
                      !password.newPassword ||
                      password.newPassword !== password.confirmPassword
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-mono font-bold bg-[#0F172A] text-white hover:bg-[#1E293B] shadow-xs disabled:opacity-40"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>{saving ? "CHANGING..." : "COMMIT_PASSWORD_UPDATE"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Authentication Tab */}
          {activeTab === "authentication" && (
            <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  OAUTH_2.0_FEDERATION_DAEMON
                </span>
              </div>

              <div className="p-4 space-y-4 text-xs">
                <div className="p-3.5 rounded border border-[#E2E8F0] bg-[#F8FAFC] space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[#2563EB]" />
                    <span className="font-mono font-bold text-xs text-[#0F172A]">
                      AUTOMATED_TOKEN_EXPIRY_ENGINE
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] font-sans leading-relaxed">
                    Tokens are automatically evaluated and refreshed before expiration ticks, injecting bearer authorization into outgoing HTTP simulation workers.
                  </p>
                </div>

                <div className="p-8 text-center border border-dashed rounded bg-[#F8FAFC] space-y-3">
                  <Shield className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-mono font-bold text-[#0F172A]">
                    ENTERPRISE_AUTHENTICATION_MANAGEMENT
                  </p>
                  <button
                    onClick={() => (window.location.href = "/settings/auth")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-bold bg-[#0F172A] text-white rounded hover:bg-[#1E293B] shadow-xs"
                  >
                    <span>OPEN_AUTH_CONSOLE</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  EVENT_ALERT_DISPATCH_SETTINGS
                </span>
              </div>

              <div className="p-4 space-y-3">
                {[
                  {
                    key: "emailNotifications",
                    label: "OPERATOR_EMAIL_NOTIFICATIONS",
                    desc: "Receive urgent event logs on designated administrative email address",
                  },
                  {
                    key: "simulationAlerts",
                    label: "SIMULATION_LIFECYCLE_DISPATCH",
                    desc: "Emit notifications when virtual user swarms start, pause, or finish stages",
                  },
                  {
                    key: "errorAlerts",
                    label: "ANOMALY_SPIKE_INTERRUPTS",
                    desc: "Trigger high-priority alerts when threshold violations occur",
                  },
                  {
                    key: "weeklyReport",
                    label: "PERIODIC_SUMMARY_AUDIT",
                    desc: "Compile telemetry metrics into recurring summary reports",
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3 rounded border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div>
                      <span className="font-mono text-xs font-bold text-[#0F172A] block">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-[#64748B] font-sans">
                        {item.desc}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setNotifications({
                          ...notifications,
                          [item.key]: !notifications[
                            item.key as keyof NotificationSettings
                          ],
                        })
                      }
                      className={`h-6 px-2.5 rounded font-mono text-xs font-bold transition-colors ${
                        notifications[item.key as keyof NotificationSettings]
                          ? "bg-[#0F172A] text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {notifications[item.key as keyof NotificationSettings]
                        ? "ACTIVE"
                        : "MUTED"}
                    </button>
                  </div>
                ))}

                <div className="pt-3 border-t border-[#E2E8F0] flex justify-end">
                  <button
                    onClick={handleSaveNotifications}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-mono font-bold bg-[#0F172A] text-white hover:bg-[#1E293B] shadow-xs"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{saving ? "SAVING..." : "COMMIT_NOTIFICATION_PREFERENCES"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === "api-keys" && (
            <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  INGESTION_API_KEY_VAULT
                </span>
                <span className="font-mono text-[10px] text-[#64748B]">
                  {apiKeys.length} KEYS ISSUED
                </span>
              </div>

              <div className="p-4 space-y-4 text-xs">
                {/* Issue Key Input */}
                <div className="flex gap-2">
                  <input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Enter key identifier (e.g. Scada_Gateway_Key)"
                    className="flex-1 h-8 px-2.5 font-mono text-xs border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                  />
                  <button
                    onClick={handleGenerateApiKey}
                    className="px-3.5 h-8 bg-[#0F172A] text-white rounded font-mono font-semibold text-xs hover:bg-[#1E293B] flex items-center gap-1.5 shadow-xs"
                  >
                    <Key className="h-3.5 w-3.5" />
                    <span>ISSUE_KEY</span>
                  </button>
                </div>

                {/* Keys list */}
                {apiKeys.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-mono text-xs space-y-1">
                    <Key className="h-8 w-8 mx-auto opacity-25" />
                    <p className="uppercase font-bold">NO_API_KEYS_CONFIGURED</p>
                    <p className="text-[11px] font-sans text-slate-500">
                      Issue an API key to authenticate external IoT gateways pushing data to IoTKit.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {apiKeys.map((key) => (
                      <div
                        key={key.id}
                        className="p-3 rounded border border-[#E2E8F0] bg-white flex items-center justify-between gap-3 font-mono text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-[#0F172A] block">
                            {key.name}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs bg-[#F8FAFC] border border-[#CBD5E1] px-2 py-0.5 rounded text-[#0F172A]">
                              {showKey === key.id ? key.key : "••••••••••••••••••••••••"}
                            </code>
                            <button
                              onClick={() =>
                                setShowKey(showKey === key.id ? null : key.id)
                              }
                              className="text-slate-400 hover:text-slate-700"
                            >
                              {showKey === key.id ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleCopyKey(key.key)}
                              className="text-slate-400 hover:text-slate-700"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-1">
                            ISSUED: {new Date(key.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <button
                          onClick={() => handleDeleteApiKey(key.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Revoke key"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === "preferences" && (
            <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  CLIENT_OPERATING_PREFERENCES
                </span>
              </div>

              <div className="p-4 space-y-3 font-mono text-xs">
                <div className="p-3 rounded border border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#0F172A] block">THEME_PROFILE</span>
                    <span className="text-[11px] font-sans text-[#64748B]">
                      Precision Light Engineering Mode (Active)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-[10px]">
                    LIGHT_PRECISION
                  </span>
                </div>

                <div className="p-3 rounded border border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#0F172A] block">TELEMETRY_REFRESH_RATE</span>
                    <span className="text-[11px] font-sans text-[#64748B]">
                      Live teleprinter polling cadence
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-[10px]">
                    3 SECONDS
                  </span>
                </div>

                <div className="p-3 rounded border border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#0F172A] block">SYSTEM_LOCALE</span>
                    <span className="text-[11px] font-sans text-[#64748B]">
                      Standard ISO English / UTC Timestamp Display
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-[10px]">
                    EN_US
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
