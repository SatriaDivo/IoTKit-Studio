"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2, Eye, EyeOff, Shield, Key, Terminal } from "lucide-react";
import {
  AuthConfig,
  CreateAuthConfigRequest,
  UpdateAuthConfigRequest,
} from "@/lib/authConfigApi";
import toast from "react-hot-toast";

interface AuthConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    data: CreateAuthConfigRequest | UpdateAuthConfigRequest
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
  { value: "oauth2", label: "OAuth 2.0 (Generic)" },
  { value: "custom", label: "Custom Provider" },
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
        toast.error("Invalid JSON syntax in Custom Headers");
        setLoading(false);
        return;
      }

      try {
        customBody = JSON.parse(formData.customBody);
      } catch (e) {
        toast.error("Invalid JSON syntax in Custom Body");
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
      toast.success(
        authConfig ? "Auth configuration updated" : "Auth configuration created"
      );
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to commit auth config");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{ margin: 0 }}
      className="fixed inset-0 m-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white border border-[#CBD5E1] rounded-md shadow-popover max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#0F172A]" />
            <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              {authConfig ? "EDIT_AUTH_CONFIGURATION" : "DEPLOY_AUTH_CONFIGURATION"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xs font-mono"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                IDENTITY_PROVIDER *
              </label>
              <select
                value={formData.provider}
                onChange={(e) =>
                  setFormData({ ...formData, provider: e.target.value })
                }
                className="w-full h-8 px-2 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                required
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                GRANT_TYPE *
              </label>
              <select
                value={formData.grantType}
                onChange={(e) =>
                  setFormData({ ...formData, grantType: e.target.value })
                }
                className="w-full h-8 px-2 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                required
              >
                {GRANT_TYPES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
              TOKEN_ENDPOINT_URL *
            </label>
            <input
              type="url"
              value={formData.tokenEndpoint}
              onChange={(e) =>
                setFormData({ ...formData, tokenEndpoint: e.target.value })
              }
              className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
              placeholder="https://auth.example.com/oauth/token"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                CLIENT_ID *
              </label>
              <input
                type="text"
                value={formData.clientId}
                onChange={(e) =>
                  setFormData({ ...formData, clientId: e.target.value })
                }
                className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                placeholder="your-client-id"
                required
              />
            </div>

            <div>
              <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                CLIENT_SECRET {authConfig && "(LEAVE EMPTY TO KEEP)"}
              </label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={formData.clientSecret}
                  onChange={(e) =>
                    setFormData({ ...formData, clientSecret: e.target.value })
                  }
                  className="w-full h-8 px-2.5 pr-8 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                  placeholder="your-client-secret"
                  required={!authConfig}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  {showSecret ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                OAUTH_SCOPE (OPTIONAL)
              </label>
              <input
                type="text"
                value={formData.scope}
                onChange={(e) =>
                  setFormData({ ...formData, scope: e.target.value })
                }
                className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                placeholder="read write offline_access"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                REFRESH_BEFORE_EXPIRY (SECONDS)
              </label>
              <input
                type="number"
                value={formData.refreshBeforeExpiry}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    refreshBeforeExpiry: parseInt(e.target.value) || 300,
                  })
                }
                className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          {/* Toggle Auto Refresh */}
          <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
            <div>
              <span className="font-mono text-xs font-bold text-[#0F172A] block">
                ENABLE_AUTOMATIC_REFRESH
              </span>
              <span className="text-[11px] text-[#64748B] font-sans">
                Automatically request new token before expiration tick
              </span>
            </div>
            <input
              type="checkbox"
              checked={formData.refreshEnabled}
              onChange={(e) =>
                setFormData({ ...formData, refreshEnabled: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 text-[#0F172A] focus:ring-0"
            />
          </div>

          {/* Custom Headers JSON */}
          <div>
            <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
              CUSTOM_REQUEST_HEADERS (JSON)
            </label>
            <textarea
              value={formData.customHeaders}
              onChange={(e) =>
                setFormData({ ...formData, customHeaders: e.target.value })
              }
              rows={2}
              className="w-full p-2 font-mono text-xs border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
            />
          </div>

          {/* Custom Body JSON */}
          <div>
            <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
              CUSTOM_REQUEST_BODY (JSON)
            </label>
            <textarea
              value={formData.customBody}
              onChange={(e) =>
                setFormData({ ...formData, customBody: e.target.value })
              }
              rows={2}
              className="w-full p-2 font-mono text-xs border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-mono rounded border border-[#CBD5E1] hover:bg-[#F8FAFC]"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-mono font-bold bg-[#0F172A] text-white rounded hover:bg-[#1E293B] shadow-xs disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{loading ? "SAVING..." : "COMMIT_CONFIGURATION"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
