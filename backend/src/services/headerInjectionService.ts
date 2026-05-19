import { PrismaClient } from "@prisma/client";
import { decrypt } from "../utils/encryption";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

/**
 * Header Injection Service
 * Injects authentication headers and custom headers into requests
 */
export class HeaderInjectionService {
  /**
   * Get headers for a project with auth config
   */
  async getHeadersForProject(
    projectId: string,
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    try {
      // Get auth config
      const authConfig = await prisma.authConfig.findUnique({
        where: { projectId },
      });

      if (!authConfig) {
        return headers;
      }

      // Inject auth token
      if (authConfig.token && authConfig.authType !== "none") {
        const token = decrypt(authConfig.token);
        const headerKey = authConfig.headerKey || "Authorization";
        const headerPrefix = authConfig.headerPrefix || "Bearer";

        if (authConfig.authType === "bearer") {
          headers[headerKey] = `${headerPrefix} ${token}`;
        } else if (authConfig.authType === "apikey") {
          headers[headerKey] = token;
        } else if (authConfig.authType === "custom") {
          headers[headerKey] = token;
        }
      }

      // Inject custom headers
      if (authConfig.customHeaders) {
        const customHeaders = authConfig.customHeaders as any[];

        for (const header of customHeaders) {
          if (header.key && header.value) {
            // Process dynamic values
            const value = header.isDynamic
              ? this.processDynamicValue(header.value)
              : header.value;

            headers[header.key] = value;
          }
        }
      }

      return headers;
    } catch (error: any) {
      console.error("Error getting headers for project:", error);
      return headers;
    }
  }

  /**
   * Process dynamic values in headers
   * Supports template variables like {{timestamp}}, {{uuid}}, etc.
   */
  private processDynamicValue(value: string): string {
    let processed = value;

    // Replace {{timestamp}} with current Unix timestamp
    processed = processed.replace(/\{\{timestamp\}\}/g, Date.now().toString());

    // Replace {{timestamp_iso}} with ISO 8601 timestamp
    processed = processed.replace(
      /\{\{timestamp_iso\}\}/g,
      new Date().toISOString(),
    );

    // Replace {{uuid}} with random UUID
    processed = processed.replace(/\{\{uuid\}\}/g, uuidv4());

    // Replace {{random}} with random number
    processed = processed.replace(/\{\{random\}\}/g, Math.random().toString());

    // Replace {{random_int}} with random integer (0-999999)
    processed = processed.replace(
      /\{\{random_int\}\}/g,
      Math.floor(Math.random() * 1000000).toString(),
    );

    return processed;
  }

  /**
   * Merge project headers with auth headers
   * Auth headers take precedence
   */
  mergeHeaders(
    projectHeaders: Record<string, string> | string | null,
    authHeaders: Record<string, string>,
  ): Record<string, string> {
    const merged: Record<string, string> = {};

    // Parse project headers if string
    if (typeof projectHeaders === "string") {
      try {
        const parsed = JSON.parse(projectHeaders);
        if (Array.isArray(parsed)) {
          parsed.forEach((h: any) => {
            if (h.key && h.value) {
              merged[h.key] = h.value;
            }
          });
        }
      } catch (error) {
        console.error("Error parsing project headers:", error);
      }
    } else if (projectHeaders && typeof projectHeaders === "object") {
      Object.assign(merged, projectHeaders);
    }

    // Auth headers override project headers
    Object.assign(merged, authHeaders);

    return merged;
  }

  /**
   * Check if token is valid (not expired)
   */
  async isTokenValid(projectId: string): Promise<boolean> {
    try {
      const authConfig = await prisma.authConfig.findUnique({
        where: { projectId },
      });

      if (!authConfig || !authConfig.token) {
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
      console.error("Error checking token validity:", error);
      return false;
    }
  }
}

// Export singleton instance
export const headerInjectionService = new HeaderInjectionService();
