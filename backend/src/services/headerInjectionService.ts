import { PrismaClient } from "@prisma/client";
import { decrypt } from "../utils/encryption";
import { Logger } from "../utils/logger";

const prisma = new PrismaClient();

/**
 * Header Injection Service
 * Injects OAuth 2.0 tokens and custom headers into client requests
 */
export class HeaderInjectionService {
  /**
   * Get auth headers for a project (static method for easy access)
   */
  static async getAuthHeaders(
    projectId: string,
  ): Promise<Record<string, string>> {
    const service = new HeaderInjectionService();
    return service.getHeadersForProject(projectId);
  }

  /**
   * Get headers for a project with auth config
   */
  async getHeadersForProject(
    projectId: string,
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    try {
      // Get active auth config for project
      let authConfig = await prisma.authConfig.findFirst({
        where: {
          projectId,
          active: true,
        },
      });

      if (!authConfig) {
        return headers;
      }

      // Check if token is missing or expired, and refresh if enabled
      const now = Date.now();
      const expiryTime = authConfig.tokenExpiry ? new Date(authConfig.tokenExpiry).getTime() : 0;
      const bufferMs = (authConfig.refreshBeforeExpiry || 300) * 1000;
      const isExpired = !authConfig.currentToken || !expiryTime || (expiryTime - now <= bufferMs);

      if (isExpired && authConfig.refreshEnabled) {
        Logger.info(`Token for project ${projectId} is expired or expiring soon. Refreshing synchronously...`);
        try {
          const { performTokenRefresh } = require("../controllers/authConfigController");
          const result = await performTokenRefresh(authConfig);
          if (result.success && result.token) {
            // Load the updated config
            const updatedConfig = await prisma.authConfig.findUnique({
              where: { id: authConfig.id },
            });
            if (updatedConfig) {
              authConfig = updatedConfig;
            }
          }
        } catch (refreshErr: any) {
          Logger.error(`Failed to auto-refresh token synchronously for project ${projectId}:`, refreshErr.message);
        }
      }

      // If we still don't have a token, warn and return empty headers
      if (!authConfig.currentToken) {
        Logger.warn(`No token available for project ${projectId}.`);
        return headers;
      }

      // Decrypt and inject token
      try {
        const token = decrypt(authConfig.currentToken);
        headers["Authorization"] = `Bearer ${token}`;
      } catch (error) {
        Logger.error(
          `Failed to decrypt token for project ${projectId}:`,
          error,
        );
        return headers;
      }

      // Inject custom headers if configured
      if (authConfig.customHeaders) {
        const customHeaders =
          typeof authConfig.customHeaders === "string"
            ? JSON.parse(authConfig.customHeaders)
            : authConfig.customHeaders;

        if (customHeaders && typeof customHeaders === "object") {
          Object.assign(headers, customHeaders);
        }
      }

      return headers;
    } catch (error: any) {
      Logger.error("Error getting headers for project:", error);
      return headers;
    }
  }

  /**
   * Check if token is valid (not expired)
   */
  async isTokenValid(projectId: string): Promise<boolean> {
    try {
      const authConfig = await prisma.authConfig.findFirst({
        where: {
          projectId,
          active: true,
        },
      });

      if (!authConfig || !authConfig.currentToken) {
        return false;
      }

      // If no expiry, assume valid
      if (!authConfig.tokenExpiry) {
        return true;
      }

      // Check if expired
      const now = new Date();
      const expiryTime = new Date(authConfig.tokenExpiry);

      return expiryTime > now;
    } catch (error) {
      Logger.error("Error checking token validity:", error);
      return false;
    }
  }

  /**
   * Get token expiry time for a project
   */
  async getTokenExpiry(projectId: string): Promise<Date | null> {
    try {
      const authConfig = await prisma.authConfig.findFirst({
        where: {
          projectId,
          active: true,
        },
      });

      return authConfig?.tokenExpiry || null;
    } catch (error) {
      Logger.error("Error getting token expiry:", error);
      return null;
    }
  }
}

// Export singleton instance
export const headerInjectionService = new HeaderInjectionService();
