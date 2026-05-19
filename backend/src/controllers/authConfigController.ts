import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "../utils/encryption";
import axios from "axios";

const prisma = new PrismaClient();

/**
 * Create auth config for a project
 */
export const createAuthConfig = async (req: Request, res: Response) => {
  try {
    const {
      projectId,
      provider,
      tokenEndpoint,
      clientId,
      clientSecret,
      scope,
      grantType,
      refreshEnabled,
      refreshBeforeExpiry,
      customHeaders,
      customBody,
    } = req.body;

    // Verify project exists and belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: (req as any).user.id,
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Encrypt clientSecret if provided
    const encryptedSecret = clientSecret ? encrypt(clientSecret) : "";

    // Create auth config
    const authConfig = await prisma.authConfig.create({
      data: {
        projectId,
        provider: provider || "oauth2",
        tokenEndpoint,
        clientId,
        clientSecret: encryptedSecret,
        scope: scope || null,
        grantType: grantType || "client_credentials",
        refreshEnabled: refreshEnabled !== undefined ? refreshEnabled : true,
        refreshBeforeExpiry: refreshBeforeExpiry !== undefined ? Number(refreshBeforeExpiry) : 300,
        customHeaders: customHeaders || {},
        customBody: customBody || {},
        active: true,
      },
    });

    res.json({
      ...authConfig,
      clientSecret: "***ENCRYPTED***",
      currentToken: authConfig.currentToken ? "***ENCRYPTED***" : null,
    });
  } catch (error: any) {
    console.error("Error creating auth config:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all auth configs for a project
 */
export const getAuthConfigsByProject = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: (req as any).user.id,
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const authConfig = await prisma.authConfig.findUnique({
      where: { projectId },
    });

    // Return as array to match frontend expectations
    if (!authConfig) {
      return res.json([]);
    }

    res.json([
      {
        ...authConfig,
        clientSecret: "***ENCRYPTED***",
        currentToken: authConfig.currentToken ? "***ENCRYPTED***" : null,
        tokenStatus: getTokenStatus(authConfig.tokenExpiry),
      },
    ]);
  } catch (error: any) {
    console.error("Error getting auth configs by project:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get single auth config
 */
export const getAuthConfigById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const authConfig = await prisma.authConfig.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!authConfig) {
      return res.status(404).json({ error: "Auth config not found" });
    }

    // Verify ownership
    if (authConfig.project.userId !== (req as any).user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json({
      ...authConfig,
      clientSecret: "***ENCRYPTED***",
      currentToken: authConfig.currentToken ? "***ENCRYPTED***" : null,
      tokenStatus: getTokenStatus(authConfig.tokenExpiry),
    });
  } catch (error: any) {
    console.error("Error getting auth config:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update auth config
 */
export const updateAuthConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      provider,
      tokenEndpoint,
      clientId,
      clientSecret,
      scope,
      grantType,
      refreshEnabled,
      refreshBeforeExpiry,
      customHeaders,
      customBody,
      active,
    } = req.body;

    const existing = await prisma.authConfig.findUnique({
      where: { id },
      include: {
        project: {
          select: { userId: true },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Auth config not found" });
    }

    if (existing.project.userId !== (req as any).user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updateData: any = {
      provider,
      tokenEndpoint,
      clientId,
      scope,
      grantType,
      refreshEnabled,
      refreshBeforeExpiry: refreshBeforeExpiry !== undefined ? Number(refreshBeforeExpiry) : undefined,
      customHeaders,
      customBody,
      active,
      updatedAt: new Date(),
    };

    if (clientSecret) {
      updateData.clientSecret = encrypt(clientSecret);
    }

    const updated = await prisma.authConfig.update({
      where: { id },
      data: updateData,
    });

    res.json({
      ...updated,
      clientSecret: "***ENCRYPTED***",
      currentToken: updated.currentToken ? "***ENCRYPTED***" : null,
    });
  } catch (error: any) {
    console.error("Error updating auth config:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete auth config
 */
export const deleteAuthConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const authConfig = await prisma.authConfig.findUnique({
      where: { id },
      include: {
        project: {
          select: { userId: true },
        },
      },
    });

    if (!authConfig) {
      return res.status(404).json({ error: "Auth config not found" });
    }

    if (authConfig.project.userId !== (req as any).user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.authConfig.delete({
      where: { id },
    });

    res.json({ message: "Auth config deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting auth config:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Test auth config by calling token endpoint and saving results
 */
export const testAuthConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const authConfig = await prisma.authConfig.findUnique({
      where: { id },
      include: {
        project: {
          select: { userId: true },
        },
      },
    });

    if (!authConfig) {
      return res.status(404).json({ error: "Auth config not found" });
    }

    if (authConfig.project.userId !== (req as any).user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const result = await performTokenRefresh(authConfig);
    res.json(result);
  } catch (error: any) {
    console.error("Error testing auth config:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Manually refresh token
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const authConfig = await prisma.authConfig.findUnique({
      where: { id },
      include: {
        project: {
          select: { userId: true },
        },
      },
    });

    if (!authConfig) {
      return res.status(404).json({ error: "Auth config not found" });
    }

    if (authConfig.project.userId !== (req as any).user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const result = await performTokenRefresh(authConfig);
    res.json(result);
  } catch (error: any) {
    console.error("Error refreshing token:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get refresh logs
 */
export const getRefreshLogs = async (req: Request, res: Response) => {
  try {
    const { authConfigId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const authConfig = await prisma.authConfig.findUnique({
      where: { id: authConfigId },
      include: {
        project: {
          select: { userId: true },
        },
      },
    });

    if (!authConfig) {
      return res.status(404).json({ error: "Auth config not found" });
    }

    if (authConfig.project.userId !== (req as any).user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const logs = await prisma.refreshLog.findMany({
      where: { authConfigId },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.refreshLog.count({
      where: { authConfigId },
    });

    res.json({
      logs,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error: any) {
    console.error("Error getting refresh logs:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Helper: Perform token refresh
 */
export const performTokenRefresh = async (authConfig: any) => {
  const startTime = Date.now();

  try {
    // Decrypt credentials
    const decryptedSecret = authConfig.clientSecret ? decrypt(authConfig.clientSecret) : "";

    // Build standard OAuth 2.0 payload
    const body: Record<string, string> = {
      grant_type: authConfig.grantType || "client_credentials",
      client_id: authConfig.clientId,
      client_secret: decryptedSecret,
    };

    if (authConfig.scope) {
      body.scope = authConfig.scope;
    }

    // Load custom body params
    if (authConfig.customBody) {
      const parsedBody =
        typeof authConfig.customBody === "string"
          ? JSON.parse(authConfig.customBody)
          : authConfig.customBody;
      if (parsedBody && typeof parsedBody === "object") {
        Object.assign(body, parsedBody);
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    if (authConfig.customHeaders) {
      const parsedHeaders =
        typeof authConfig.customHeaders === "string"
          ? JSON.parse(authConfig.customHeaders)
          : authConfig.customHeaders;
      if (parsedHeaders && typeof parsedHeaders === "object") {
        Object.assign(headers, parsedHeaders);
      }
    }

    let requestData: any = body;
    if (headers["Content-Type"] === "application/x-www-form-urlencoded") {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(body)) {
        params.append(k, String(v));
      }
      requestData = params.toString();
    }

    // Call token endpoint
    const response = await axios({
      method: "POST",
      url: authConfig.tokenEndpoint,
      headers,
      data: requestData,
      timeout: 15000,
    });

    // Extract access token & expiry
    const newToken =
      response.data.access_token ||
      response.data.token ||
      (response.data.data && response.data.data.token);

    if (!newToken) {
      throw new Error("Failed to extract access_token from response: " + JSON.stringify(response.data));
    }

    const expiresIn = response.data.expires_in || response.data.expiresIn;
    let tokenExpiry: Date | null = null;
    if (expiresIn) {
      tokenExpiry = new Date(Date.now() + Number(expiresIn) * 1000);
    } else {
      // Default to 1 hour
      tokenExpiry = new Date(Date.now() + 3600 * 1000);
    }

    // Encrypt token
    const encryptedToken = encrypt(newToken);

    // Save token
    await prisma.authConfig.update({
      where: { id: authConfig.id },
      data: {
        currentToken: encryptedToken,
        tokenExpiry,
        updatedAt: new Date(),
      },
    });

    // Log success
    await prisma.refreshLog.create({
      data: {
        authConfigId: authConfig.id,
        success: true,
        oldTokenExpiry: authConfig.tokenExpiry,
        newTokenExpiry: tokenExpiry,
      },
    });

    return {
      success: true,
      token: newToken,
      expiresIn: expiresIn || 3600,
    };
  } catch (error: any) {
    console.error("Token refresh helper error:", error.message);

    // Log failure
    await prisma.refreshLog.create({
      data: {
        authConfigId: authConfig.id,
        success: false,
        errorMessage: error.message || "Unknown error during refresh",
        oldTokenExpiry: authConfig.tokenExpiry,
      },
    });

    return {
      success: false,
      error: error.message || "Failed to call token endpoint",
    };
  }
};

/**
 * Helper: Get token status
 */
const getTokenStatus = (tokenExpiry: Date | null): string => {
  if (!tokenExpiry) return "unknown";

  const now = new Date();
  const expiryTime = new Date(tokenExpiry);

  if (expiryTime <= now) return "expired";

  const timeUntilExpiry = expiryTime.getTime() - now.getTime();
  const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);

  if (hoursUntilExpiry < 1) return "expiring_soon";

  return "valid";
};
