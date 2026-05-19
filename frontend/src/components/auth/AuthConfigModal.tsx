"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2, Eye, EyeOff } from "lucide-react";
import {
  AuthConfig,
  CreateAuthConfigRequest,
  UpdateAuthConfigRequest,
} from "@/lib/authConfigApi";

interface AuthConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    data: CreateAuthConfigRequest | UpdateAuthConfigRequest,
  ) => Promise<void>;
  authConfig?: AuthConfig | null;
  projectId: string;
}

const GRANT_TYPES = [
  { value: "client_credentials", label: "Client Credentials" },
  { value: "password", label: "Password" },
  { value: "authorization_code", label: "Authorization Code" },
  { value: "refresh_token", label: "Refresh Token" },
];

const PROVIDERS = [
  { value: "oauth2", label: "OAuth 2.0" },
  { value: "custom", label: "Custom" },
  { value: "keycloak", label: "Keycloak" },
  { value: "auth0", label: "Auth0" },
  { value: "okta", label: "Okta" },
];

export default function AuthConfigModal({
  isOpen,
  onClose,
  onSave,
  authConfig,
  projectId,
}: AuthConfigModalProps) {
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [formData, setFormData] = useState({
    provider: "oauth2",
    tokenEndpoint: "",
    clientId: "",
    clientSecret: "",
    scope: "",
    grantType: "client_credentials",
    refreshEnabled: true,
    refreshBeforeExpiry: 300,
    customHeaders: "{}",
    customBody: "{}",
  });

  useEffect(() => {
    if (authConfig) {
      setFormData({
        provider: authConfig.provider,
        tokenEndpoint: authConfig.tokenEndpoint,
        clientId: authConfig.clientId,
        clientSecret: "",
        scope: authConfig.scope || "",
        grantType: authConfig.grantType,
        refreshEnabled: authConfig.refreshEnabled,
        refreshBeforeExpiry: authConfig.refreshBeforeExpiry,
        customHeaders: JSON.stringify(authConfig.customHeaders || {}, null, 2),
        customBody: JSON.stringify(authConfig.customBody || {}, null, 2),
      });
    } else {
      setFormData({
        provider: "oauth2",
        tokenEndpoint: "",
        clientId: "",
        clientSecret: "",
        scope: "",
        grantType: "client_credentials",
        refreshEnabled: true,
        refreshBeforeExpiry: 300,
        customHeaders: "{}",
        customBody: "{}",
      });
    }
  }, [authConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let customHeaders = {};
      let customBody = {};

      try {
        customHeaders = JSON.parse(formData.customHeaders);
      } catch (e) {
        alert("Invalid JSON in Custom Headers");
        setLoading(false);
        return;
      }

      try {
        customBody = JSON.parse(formData.customBody);
      } catch (e) {
        alert("Invalid JSON in Custom Body");
        setLoading(false);
        return;
      }

      const data: any = {
        provider: formData.provider,
        tokenEndpoint: formData.tokenEndpoint,
        clientId: formData.clientId,
        scope: formData.scope || undefined,
        grantType: formData.grantType,
        refreshEnabled: formData.refreshEnabled,
        refreshBeforeExpiry: formData.refreshBeforeExpiry,
        customHeaders:
          Object.keys(customHeaders).length > 0 ? customHeaders : undefined,
        customBody: Object.keys(customBody).length > 0 ? customBody : undefined,
      };

      if (!authConfig) {
        data.projectId = projectId;
      }

      if (formData.clientSecret) {
        data.clientSecret = formData.clientSecret;
      }

      await onSave(data);
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to save auth config");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E8EDF2]">
          <h2 className="text-xl font-bold text-[#2C3E50]">
            {authConfig ? "Edit Auth Config" : "Create Auth Config"}
          </h2>
          <button
            onClick={onClose}
            className="text-[#5A6C7D] hover:text-[#2C3E50] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-2">
              Provider
            </label>
            <select
              value={formData.provider}
              onChange={(e) =>
                setFormData({ ...formData, provider: e.target.value })
              }
              className="w-full px-4 py-2 border border-[#D1DBE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A89A7]"
              required
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Token Endpoint */}
          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-2">
              Token Endpoint URL
            </label>
            <input
              type="url"
              value={formData.tokenEndpoint}
              onChange={(e) =>
                setFormData({ ...formData, tokenEndpoint: e.target.value })
              }
              className="w-full px-4 py-2 border border-[#D1DBE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A89A7]"
              placeholder="https://auth.example.com/oauth/token"
              required
            />
          </div>

          {/* Client ID */}
          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-2">
              Client ID
            </label>
            <input
              type="text"
              value={formData.clientId}
              onChange={(e) =>
                setFormData({ ...formData, clientId: e.target.value })
              }
              className="w-full px-4 py-2 border border-[#D1DBE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A89A7]"
              placeholder="your-client-id"
              required
            />
          </div>

          {/* Client Secret */}
          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-2">
              Client Secret {authConfig && "(leave empty to keep current)"}
            </label>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                value={formData.clientSecret}
                onChange={(e) =>
                  setFormData({ ...formData, clientSecret: e.target.value })
                }
                className="w-full px-4 py-2 pr-10 border border-[#D1DBE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A89A7]"
                placeholder="your-client-secret"
                required={!authConfig}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A6C7D] hover:text-[#2C3E50]"
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Grant Type */}
          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-2">
              Grant Type
            </label>
            <select
              value={formData.grantType}
              onChange={(e) =>
                setFormData({ ...formData, grantType: e.target.value })
              }
              className="w-full px-4 py-2 border border-[#D1DBE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A89A7]"
              required
            >
              {GRANT_TYPES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* Scope */}
          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-2">
              Scope (optional)
            </label>
            <input
              type="text"
              value={formData.scope}
              onChange={(e) =>
                setFormData({ ...formData, scope: e.target.value })
              }
              className="w-full px-4 py-2 border border-[#D1DBE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A89A7]"
              placeholder="read write"
            />
          </div>

          {/* Refresh Settings */}
          <div className="space-y-3 p-4 bg-[#F8FAFB] rounded-lg border border-[#E8EDF2]">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="refreshEnabled"
                checked={formData.refreshEnabled}
                onChange={(e) =>
                  setFormData({ ...formData, refreshEnabled: e.target.checked })
                }
                className="w-4 h-4 text-[#6A89A7] border-[#D1DBE5] rounded focus:ring-[#6A89A7]"
              />
              <label
                htmlFor="refreshEnabled"
                className="text-sm font-medium text-[#2C3E50]"
              >
                Enable Auto Token Refresh
              </label>
            </div>

            {formData.refreshEnabled && (
              <div>
                <label className="block text-sm font-medium text-[#2C3E50] mb-2">
                  Refresh Before Expiry (seconds)
                </label>
                <input
                  type="number"
                  value={formData.refreshBeforeExpiry}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      refreshBeforeExpiry: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border border-[#D1DBE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A89A7]"
                  min="60"
                  max="3600"
                />
                <p className="text-xs text-[#5A6C7D] mt-1">
                  Token will be refreshed {formData.refreshBeforeExpiry} seconds
                  before expiry
                </p>
              </div>
            )}
          </div>

          {/* Custom Headers */}
          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-2">
              Custom Headers (JSON)
            </label>
            <textarea
              value={formData.customHeaders}
              onChange={(e) =>
                setFormData({ ...formData, customHeaders: e.target.value })
              }
              className="w-full px-4 py-2 border border-[#D1DBE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A89A7] font-mono text-sm"
              rows={3}
              placeholder='{"X-Custom-Header": "value"}'
            />
          </div>

          {/* Custom Body */}
          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-2">
              Custom Body Parameters (JSON)
            </label>
            <textarea
              value={formData.customBody}
              onChange={(e) =>
                setFormData({ ...formData, customBody: e.target.value })
              }
              className="w-full px-4 py-2 border border-[#D1DBE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A89A7] font-mono text-sm"
              rows={3}
              placeholder='{"custom_param": "value"}'
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8EDF2]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#5A6C7D] hover:text-[#2C3E50] transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
