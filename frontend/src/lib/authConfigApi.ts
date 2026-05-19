import { api } from "./api";

export interface AuthConfig {
  id: string;
  projectId: string;
  provider: string;
  tokenEndpoint: string;
  clientId: string;
  clientSecret?: string;
  scope?: string;
  grantType: string;
  refreshEnabled: boolean;
  refreshBeforeExpiry: number;
  customHeaders?: Record<string, string>;
  customBody?: Record<string, string>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RefreshLog {
  id: string;
  authConfigId: string;
  success: boolean;
  errorMessage?: string;
  oldTokenExpiry?: string;
  newTokenExpiry?: string;
  createdAt: string;
}

export interface CreateAuthConfigRequest {
  projectId: string;
  provider: string;
  tokenEndpoint: string;
  clientId: string;
  clientSecret?: string;
  scope?: string;
  grantType?: string;
  refreshEnabled?: boolean;
  refreshBeforeExpiry?: number;
  customHeaders?: Record<string, string>;
  customBody?: Record<string, string>;
}

export interface UpdateAuthConfigRequest {
  provider?: string;
  tokenEndpoint?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  grantType?: string;
  refreshEnabled?: boolean;
  refreshBeforeExpiry?: number;
  customHeaders?: Record<string, string>;
  customBody?: Record<string, string>;
  active?: boolean;
}

export const authConfigApi = {
  // Get all auth configs for a project
  getByProject: async (projectId: string): Promise<AuthConfig[]> => {
    const response = await api.get(`/auth-config/project/${projectId}`);
    return response.data;
  },

  // Get single auth config
  getById: async (id: string): Promise<AuthConfig> => {
    const response = await api.get(`/auth-config/${id}`);
    return response.data;
  },

  // Create auth config
  create: async (data: CreateAuthConfigRequest): Promise<AuthConfig> => {
    const response = await api.post("/auth-config", data);
    return response.data;
  },

  // Update auth config
  update: async (
    id: string,
    data: UpdateAuthConfigRequest,
  ): Promise<AuthConfig> => {
    const response = await api.put(`/auth-config/${id}`, data);
    return response.data;
  },

  // Delete auth config
  delete: async (id: string): Promise<void> => {
    await api.delete(`/auth-config/${id}`);
  },

  // Test auth config (get token)
  test: async (
    id: string,
  ): Promise<{
    success: boolean;
    token?: string;
    expiresIn?: number;
    error?: string;
  }> => {
    const response = await api.post(`/auth-config/${id}/test`);
    return response.data;
  },

  // Manually refresh token
  refresh: async (
    id: string,
  ): Promise<{
    success: boolean;
    token?: string;
    expiresIn?: number;
    error?: string;
  }> => {
    const response = await api.post(`/auth-config/${id}/refresh`);
    return response.data;
  },

  // Get refresh logs
  getLogs: async (authConfigId: string): Promise<RefreshLog[]> => {
    const response = await api.get(`/auth-config/${authConfigId}/logs`);
    return response.data;
  },
};
