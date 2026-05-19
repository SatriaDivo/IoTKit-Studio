import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { performTokenRefresh } from "../controllers/authConfigController";
import { Logger } from "../utils/logger";

const prisma = new PrismaClient();

/**
 * Token Refresh Service
 * Checks for expiring tokens and refreshes them automatically
 */
class TokenRefreshService {
  private cronJob: any | null = null;
  private isRunning = false;

  /**
   * Start the token refresh service
   * Runs every 5 minutes
   */
  start() {
    if (this.isRunning) {
      Logger.warn("Token refresh service is already running");
      return;
    }

    Logger.info("Starting token refresh service...");

    // Run every 5 minutes
    this.cronJob = cron.schedule("*/5 * * * *", async () => {
      await this.checkAndRefreshTokens();
    });

    this.isRunning = true;
    Logger.info("Token refresh service started successfully");

    // Run immediately on start
    this.checkAndRefreshTokens();
  }

  /**
   * Stop the token refresh service
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    Logger.info("Token refresh service stopped");
  }

  /**
   * Check all auth configs and refresh tokens that are expiring soon
   */
  private async checkAndRefreshTokens() {
    try {
      Logger.info("Checking for tokens that need refresh...");

      // Get all auth configs with refresh enabled
      const authConfigs = await prisma.authConfig.findMany({
        where: {
          refreshEnabled: true,
          refreshUrl: { not: null },
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      });

      Logger.info(
        `Found ${authConfigs.length} auth configs with refresh enabled`,
      );

      for (const authConfig of authConfigs) {
        try {
          // Skip if project is not active
          if (authConfig.project.status !== "active") {
            continue;
          }

          // Check if token needs refresh
          if (this.shouldRefreshToken(authConfig)) {
            Logger.info(
              `Refreshing token for project: ${authConfig.project.name} (${authConfig.projectId})`,
            );

            await performTokenRefresh(authConfig);

            Logger.info(
              `Token refreshed successfully for project: ${authConfig.project.name}`,
            );
          }
        } catch (error: any) {
          Logger.error(
            `Failed to refresh token for project ${authConfig.project.name}:`,
            error.message,
          );
        }
      }

      Logger.info("Token refresh check completed");
    } catch (error: any) {
      Logger.error("Error in token refresh service:", error);
    }
  }

  /**
   * Determine if a token should be refreshed
   * Refresh if:
   * - Token is expired
   * - Token expires within 1 hour
   * - No token expiry set (refresh anyway to be safe)
   */
  private shouldRefreshToken(authConfig: any): boolean {
    // If no token, don't refresh
    if (!authConfig.token) {
      return false;
    }

    // If no expiry set, refresh every 24 hours based on last update
    if (!authConfig.tokenExpiry) {
      const lastUpdate = new Date(authConfig.updatedAt);
      const hoursSinceUpdate =
        (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
      return hoursSinceUpdate >= 24;
    }

    // Check if token is expired or expiring soon (within 1 hour)
    const now = new Date();
    const expiryTime = new Date(authConfig.tokenExpiry);
    const timeUntilExpiry = expiryTime.getTime() - now.getTime();
    const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);

    // Refresh if expired or expiring within 1 hour
    return hoursUntilExpiry <= 1;
  }

  /**
   * Manually trigger refresh check (for testing)
   */
  async triggerRefreshCheck() {
    await this.checkAndRefreshTokens();
  }
}

// Export singleton instance
export const tokenRefreshService = new TokenRefreshService();
