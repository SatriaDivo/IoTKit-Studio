import cron from "node-cron";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Schedule chat cleanup to run every day at 00:00
 * Deletes all chat sessions and messages from previous days
 */
export function startChatCleanupScheduler() {
  // Run every day at 00:00 (midnight)
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log(
        "[Chat Cleanup] Starting daily chat cleanup at",
        new Date().toISOString(),
      );

      // Get start of today (00:00:00)
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // Delete all chat sessions created before today
      const result = await prisma.chatSession.deleteMany({
        where: {
          createdAt: {
            lt: startOfToday,
          },
        },
      });

      console.log(
        `[Chat Cleanup] Deleted ${result.count} chat sessions from previous days`,
      );
    } catch (error) {
      console.error("[Chat Cleanup] Error during cleanup:", error);
    }
  });

  console.log("[Chat Cleanup] Scheduler started - will run daily at 00:00");
}

/**
 * Manually trigger cleanup (for testing)
 */
export async function manualCleanup() {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const result = await prisma.chatSession.deleteMany({
      where: {
        createdAt: {
          lt: startOfToday,
        },
      },
    });

    return {
      success: true,
      deletedCount: result.count,
      message: `Deleted ${result.count} chat sessions`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
