import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt, hash } from "../utils/encryption";
import axios from "axios";

const prisma = new PrismaClient();

/**
 * Create or update auth config for a project
 */
export const upsertAuthConfig = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const {
      authType,
      token,
      tokenExpiry,
      refreshEnabled,
      refreshUrl,
      refreshMethod,
      refreshBody,
      refreshHeaders,
      refreshTokenPath,
      refreshExpiryPath,
      customHeaders,
      headerKey,
      headerPrefix,
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

    // Encrypt token if provided
    const encryptedToken = token ? encrypt(token) : null;

    // Upsert auth config
    const authConfig = await prisma.authConfig.upsert({
      where: { projectId },
      create: {
        projectId,
        authType,
        token: encryptedToken,
        tokenExpiry: tokenExpiry ? new Date(tokenExpiry) : null,
        refreshEnabled,
        refreshUrl,
        refreshMethod: refreshMethod || "POST",
        refreshBody,
        refreshHeaders,
        refreshTokenPath,
        refreshExpiryPath,
        customHeaders,
        headerKey: headerKey || "Authorization",
        headerPrefix: headerPrefix || "Bearer",
      },
      update: {
        authType,
        token: encryptedToken,
        tokenExpiry: tokenExpiry ? new Date(tokenExpiry) : null,
        refreshEnabled,
        refreshUrl,
        refreshMethod: refreshMethod || "POST",
        refreshBody,
        refreshHeaders,
        refreshTokenPath,
        refreshExpiryPath,
        customHeaders,
        headerKey: headerKey || "Authorization",
        headerPrefix: headerPrefix || "Bearer",
        updatedAt: new Date(),
      },
    });

    res.json({
      ...authConfig,
      token: token ? "***ENCRYPTED***" : null, // Don't send token back
    });
  } catch (error: any) {
    console.error("Error upserting auth config:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get auth config for a project
 */
export const getAuthConfig = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const authConfig = await prisma.authConfig.findUnique({
      where: { projectId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
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

    // Don't send encrypted token
    res.json({
      ...authConfig,
      token: authConfig.token ? "***ENCRYPTED***" : null,
      tokenStatus: getTokenStatus(authConfig.tokenExpiry),
    });
  } catch (error: any) {
    console.error("Error getting auth config:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete auth config
 */
export const deleteAuthConfig = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const authConfig = await prisma.authConfig.findUnique({
      where: { projectId },
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
      where: { projectId },
    });

    res.json({ message: "Auth config deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting auth config:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Test auth config by making a test request
 */
export const testAuthConfig = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { testUrl, testMethod = "GET" } = req.body;

    const authConfig = await prisma.authConfig.findUnique({
      where: { projectId },
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

    // Decrypt token
    const token = authConfig.token ? decrypt(authConfig.token) : null;

    if (!token) {
      return res.status(400).json({ error: "No token configured" });
    }

    // Build headers
    const headers: any = {};
    if (authConfig.authType === "bearer") {
      headers[authConfig.headerKey || "Authorization"] =
        `${authConfig.headerPrefix || "Bearer"} ${token}`;
    } else if (authConfig.authType === "apikey") {
      headers[authConfig.headerKey || "X-API-Key"] = token;
    }

    // Add custom headers
    if (authConfig.customHeaders) {
      const customHeaders = authConfig.customHeaders as any[];
      customHeaders.forEach((header: any) => {
        headers[header.key] = header.value;
      });
    }

    // Make test request
    const startTime = Date.now();
    const response = await axios({
      method: testMethod,
      url: testUrl,
      headers,
      timeout: 10000,
      validateStatus: () => true, // Don't throw on any status
    });
    const responseTime = Date.now() - startTime;

    res.json({
      success: response.status >= 200 && response.status < 300,
      statusCode: response.status,
      responseTime,
      headers: response.headers,
      data: response.data,
    });
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
    const { projectId } = req.params;

    const authConfig = await prisma.authConfig.findUnique({
      where: { projectId },
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

    if (!authConfig.refreshEnabled || !authConfig.refreshUrl) {
      return res.status(400).json({ error: "Token refresh not configured" });
    }

    // Perform refresh
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
    const { projectId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const authConfig = await prisma.authConfig.findUnique({
      where: { projectId },
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
      where: { authConfigId: authConfig.id },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.refreshLog.count({
      where: { authConfigId: authConfig.id },
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
    // Get old token hash
    const oldTokenHash = authConfig.token
      ? hash(decrypt(authConfig.token))
      : null;

    // Build refresh request
    const headers = authConfig.refreshHeaders || {};
    const body = authConfig.refreshBody || {};

    // Make refresh request
    const response = await axios({
      method: authConfig.refreshMethod || "POST",
      url: authConfig.refreshUrl,
      headers,
      data: body,
      timeout: 10000,
    });

    // Extract new token from response
    const newToken = extractValueFromPath(
      response.data,
      authConfig.refreshTokenPath || "token",
    );

    if (!newToken) {
      throw new Error("Failed to extract token from refresh response");
    }

    // Extract expiry if configured
    let tokenExpiry = null;
    if (authConfig.refreshExpiryPath) {
      const expiryValue = extractValueFromPath(
        response.data,
        authConfig.refreshExpiryPath,
      );
      if (expiryValue) {
        tokenExpiry = new Date(expiryValue);
      }
    }

    // Encrypt and save new token
    const encryptedToken = encrypt(newToken);
    const newTokenHash = hash(newToken);

    await prisma.authConfig.update({
      where: { id: authConfig.id },
      data: {
        token: encryptedToken,
        tokenExpiry,
        updatedAt: new Date(),
      },
    });

    // Log success
    await prisma.refreshLog.create({
      data: {
        authConfigId: authConfig.id,
        status: "success",
        oldTokenHash,
        newTokenHash,
        responseTime: Date.now() - startTime,
      },
    });

    return {
      success: true,
      message: "Token refreshed successfully",
      tokenExpiry,
      responseTime: Date.now() - startTime,
    };
  } catch (error: any) {
    // Log failure
    await prisma.refreshLog.create({
      data: {
        authConfigId: authConfig.id,
        status: "failed",
        errorMessage: error.message,
        responseTime: Date.now() - startTime,
      },
    });

    throw error;
  }
};

/**
 * Helper: Extract value from nested object using path
 */
const extractValueFromPath = (obj: any, path: string): any => {
  const keys = path.split(".");
  let value = obj;

  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = value[key];
    } else {
      return null;
    }
  }

  return value;
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
