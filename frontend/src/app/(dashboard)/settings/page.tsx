"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
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
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      // Load user profile
      const profileRes = await api.get("/auth/profile");
      setProfile({
        name: profileRes.data.name || "",
        email: profileRes.data.email || "",
      });

      // Load notification settings
      const notifRes = await api.get("/settings/notifications");
      if (notifRes.data) {
        setNotifications(notifRes.data);
      }

      // Load API keys
      const keysRes = await api.get("/settings/api-keys");
      if (keysRes.data) {
        setApiKeys(keysRes.data);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await api.put("/auth/profile", profile);
      toast.success("Profile updated successfully!");
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
      toast.success("Password changed successfully!");
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
      toast.success("Notification settings saved!");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }

    try {
      const res = await api.post("/settings/api-keys", { name: newKeyName });
      setApiKeys([...apiKeys, res.data]);
      setNewKeyName("");
      setShowKey(res.data.id);
      toast.success("API key generated successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to generate API key");
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    const isConfirmed = await confirm("Are you sure you want to delete this API key?", "Delete API Key");
    if (!isConfirmed) return;

    try {
      await api.delete(`/settings/api-keys/${id}`);
      setApiKeys(apiKeys.filter((k) => k.id !== id));
      toast.success("API key deleted");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete API key");
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard!");
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
    toast.success("Settings exported!");
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
        toast.success("Settings imported successfully!");
      } catch (error) {
        toast.error("Invalid settings file");
      }
    };
    reader.readAsText(file);
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "api-keys", label: "API Keys", icon: Key },
    { id: "preferences", label: "Preferences", icon: Palette },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
          <p className="text-slate-600 mt-1">
            Manage your account and application preferences
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportSettings}
            className="border-blue-200 text-slate-700 hover:bg-blue-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <label>
            <Button
              variant="outline"
              size="sm"
              className="border-blue-200 text-slate-700 hover:bg-blue-50"
              onClick={() => document.getElementById("import-file")?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
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

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <Card className="bg-white border-blue-100 shadow-md w-64 h-fit">
          <CardContent className="pt-4 pb-4">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-600 shadow-sm"
                        : "text-slate-600 hover:bg-blue-50/50 hover:text-blue-600"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="bg-white border-blue-100 shadow-md">
                <CardHeader className="border-b border-blue-50">
                  <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-500" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label className="text-sm text-slate-700">Full Name</Label>
                    <Input
                      value={profile.name}
                      onChange={(e) =>
                        setProfile({ ...profile, name: e.target.value })
                      }
                      placeholder="Enter your name"
                      className="mt-1 border-blue-200 focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-slate-700">
                      Email Address
                    </Label>
                    <Input
                      value={profile.email}
                      onChange={(e) =>
                        setProfile({ ...profile, email: e.target.value })
                      }
                      type="email"
                      placeholder="your@email.com"
                      className="mt-1 border-blue-200 focus:border-blue-400"
                    />
                  </div>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="bg-white border-blue-100 shadow-md">
                <CardHeader className="border-b border-blue-50">
                  <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                    <Lock className="h-5 w-5 text-blue-500" />
                    Change Password
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label className="text-sm text-slate-700">
                      Current Password
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        type={showPasswords.current ? "text" : "password"}
                        value={password.currentPassword}
                        onChange={(e) =>
                          setPassword({
                            ...password,
                            currentPassword: e.target.value,
                          })
                        }
                        placeholder="Enter current password"
                        className="border-blue-200 focus:border-blue-400 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({
                            ...showPasswords,
                            current: !showPasswords.current,
                          })
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords.current ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-700">
                      New Password
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        type={showPasswords.new ? "text" : "password"}
                        value={password.newPassword}
                        onChange={(e) =>
                          setPassword({
                            ...password,
                            newPassword: e.target.value,
                          })
                        }
                        placeholder="Enter new password"
                        className="border-blue-200 focus:border-blue-400 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({
                            ...showPasswords,
                            new: !showPasswords.new,
                          })
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-700">
                      Confirm New Password
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        type={showPasswords.confirm ? "text" : "password"}
                        value={password.confirmPassword}
                        onChange={(e) =>
                          setPassword({
                            ...password,
                            confirmPassword: e.target.value,
                          })
                        }
                        placeholder="Confirm new password"
                        className="border-blue-200 focus:border-blue-400 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({
                            ...showPasswords,
                            confirm: !showPasswords.confirm,
                          })
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  {password.newPassword && password.confirmPassword && (
                    <div
                      className={`flex items-center gap-2 text-sm ${
                        password.newPassword === password.confirmPassword
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {password.newPassword === password.confirmPassword ? (
                        <>
                          <Check className="h-4 w-4" />
                          Passwords match
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4" />
                          Passwords do not match
                        </>
                      )}
                    </div>
                  )}
                  <Button
                    onClick={handleChangePassword}
                    disabled={
                      saving ||
                      !password.currentPassword ||
                      !password.newPassword ||
                      password.newPassword !== password.confirmPassword
                    }
                    className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    {saving ? "Changing..." : "Change Password"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="bg-white border-blue-100 shadow-md">
                <CardHeader className="border-b border-blue-50">
                  <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                    <Bell className="h-5 w-5 text-blue-500" />
                    Notification Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {[
                    {
                      key: "emailNotifications",
                      label: "Email Notifications",
                      description:
                        "Receive email notifications for important events",
                    },
                    {
                      key: "simulationAlerts",
                      label: "Simulation Alerts",
                      description:
                        "Get notified when simulations start or stop",
                    },
                    {
                      key: "errorAlerts",
                      label: "Error Alerts",
                      description: "Receive alerts when errors occur",
                    },
                    {
                      key: "weeklyReport",
                      label: "Weekly Report",
                      description: "Get a weekly summary of your activity",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 rounded-lg border border-blue-100 hover:bg-blue-50/30 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {item.label}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            notifications[
                              item.key as keyof NotificationSettings
                            ]
                          }
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              [item.key]: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                  <Button
                    onClick={handleSaveNotifications}
                    disabled={saving}
                    className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save Preferences"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* API Keys Tab */}
          {activeTab === "api-keys" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="bg-white border-blue-100 shadow-md">
                <CardHeader className="border-b border-blue-50">
                  <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                    <Key className="h-5 w-5 text-blue-500" />
                    API Keys
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="Enter key name (e.g., Production API)"
                      className="border-blue-200 focus:border-blue-400"
                    />
                    <Button
                      onClick={handleGenerateApiKey}
                      className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white whitespace-nowrap"
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Generate Key
                    </Button>
                  </div>

                  {apiKeys.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Key className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm">No API keys yet</p>
                      <p className="text-xs mt-1">
                        Generate your first API key to get started
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {apiKeys.map((key) => (
                        <div
                          key={key.id}
                          className="p-4 rounded-lg border border-blue-100 hover:bg-blue-50/30 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-800">
                                {key.name}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                                  {showKey === key.id
                                    ? key.key
                                    : "••••••••••••••••"}
                                </code>
                                <button
                                  onClick={() =>
                                    setShowKey(
                                      showKey === key.id ? null : key.id,
                                    )
                                  }
                                  className="text-slate-400 hover:text-slate-600"
                                >
                                  {showKey === key.id ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleCopyKey(key.key)}
                                  className="text-slate-400 hover:text-slate-600"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                              </div>
                              <p className="text-xs text-slate-500 mt-2">
                                Created:{" "}
                                {new Date(key.createdAt).toLocaleDateString()}
                                {key.lastUsed &&
                                  ` • Last used: ${new Date(key.lastUsed).toLocaleDateString()}`}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteApiKey(key.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Preferences Tab */}
          {activeTab === "preferences" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="bg-white border-blue-100 shadow-md">
                <CardHeader className="border-b border-blue-50">
                  <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                    <Palette className="h-5 w-5 text-blue-500" />
                    Application Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="p-4 rounded-lg border border-blue-100 bg-blue-50/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          Theme
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Currently using Light Theme
                        </p>
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-sm text-slate-700">
                        Light Mode
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-blue-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          Language
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Choose your preferred language
                        </p>
                      </div>
                      <select className="px-3 py-1.5 text-sm border border-blue-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400">
                        <option value="en">English</option>
                        <option value="id">Bahasa Indonesia</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-blue-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          Auto-refresh Interval
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Dashboard data refresh rate
                        </p>
                      </div>
                      <select className="px-3 py-1.5 text-sm border border-blue-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400">
                        <option value="3">3 seconds</option>
                        <option value="5">5 seconds</option>
                        <option value="10">10 seconds</option>
                        <option value="30">30 seconds</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-blue-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          Date Format
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          How dates are displayed
                        </p>
                      </div>
                      <select className="px-3 py-1.5 text-sm border border-blue-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400">
                        <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                        <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                        <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>

                  <Button
                    disabled
                    className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white opacity-50 cursor-not-allowed"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Preferences (Coming Soon)
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
