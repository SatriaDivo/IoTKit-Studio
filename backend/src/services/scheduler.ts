/**
 * SchedulerManager - Job scheduler using node-cron
 * Inspired by Hybrid Emulator's APScheduler
 */

import cron, { ScheduledTask } from "node-cron";
import { Logger } from "../utils/logger";

export type SchedulerCallback = () => void | Promise<void>;

interface ScheduledJob {
  job_id: string;
  interval: number; // seconds
  task: ScheduledTask;
  callback: SchedulerCallback;
}

export class SchedulerManager {
  private jobs: Map<string, ScheduledJob> = new Map();
  private isRunning: boolean = false;

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      Logger.warn("Scheduler already running");
      return;
    }

    this.isRunning = true;
    Logger.info("Scheduler started");
  }

  /**
   * Stop the scheduler and all jobs
   */
  shutdown(): void {
    if (!this.isRunning) return;

    Logger.info("Shutting down scheduler...");

    // Stop all jobs
    for (const [job_id, job] of this.jobs.entries()) {
      job.task.stop();
      Logger.info(`Stopped scheduled job: ${job_id}`);
    }

    this.jobs.clear();
    this.isRunning = false;
    Logger.info("Scheduler shutdown complete");
  }

  /**
   * Schedule a job with interval
   * @param job_id Unique job identifier
   * @param interval Interval in seconds
   * @param callback Function to execute
   */
  scheduleInterval(
    job_id: string,
    interval: number,
    callback: SchedulerCallback,
  ): void {
    if (!this.isRunning) {
      throw new Error("Scheduler not running. Call start() first.");
    }

    // Remove existing job if any
    this.remove(job_id);

    // Convert seconds to cron expression
    // For intervals < 60s, use seconds pattern
    // For intervals >= 60s, use minutes pattern
    let cronExpression: string;

    if (interval < 60) {
      // Every N seconds: */N * * * * *
      cronExpression = `*/${interval} * * * * *`;
    } else {
      // Every N minutes: */N * * * *
      const minutes = Math.floor(interval / 60);
      cronExpression = `*/${minutes} * * * *`;
    }

    try {
      const task = cron.schedule(
        cronExpression,
        async () => {
          try {
            await callback();
          } catch (error: any) {
            Logger.error(`Error in scheduled job ${job_id}:`, error);
          }
        },
        {
          timezone: process.env.SCHEDULER_TIMEZONE || "UTC",
        },
      );

      task.start();

      this.jobs.set(job_id, {
        job_id,
        interval,
        task,
        callback,
      });

      Logger.info(
        `Scheduled job ${job_id} with interval ${interval}s (${cronExpression})`,
      );
    } catch (error: any) {
      Logger.error(`Failed to schedule job ${job_id}:`, error);
      throw error;
    }
  }

  /**
   * Remove a scheduled job
   */
  remove(job_id: string): boolean {
    const job = this.jobs.get(job_id);
    if (!job) return false;

    job.task.stop();
    this.jobs.delete(job_id);
    Logger.info(`Removed scheduled job: ${job_id}`);
    return true;
  }

  /**
   * Check if a job is scheduled
   */
  has(job_id: string): boolean {
    return this.jobs.has(job_id);
  }

  /**
   * Get all scheduled job IDs
   */
  getJobIds(): string[] {
    return Array.from(this.jobs.keys());
  }

  /**
   * Get job count
   */
  count(): number {
    return this.jobs.size;
  }

  /**
   * Execute a job immediately (one-time)
   */
  async executeOnce(job_id: string): Promise<void> {
    const job = this.jobs.get(job_id);
    if (!job) {
      throw new Error(`Job ${job_id} not found`);
    }

    try {
      await job.callback();
      Logger.info(`Executed job ${job_id} once`);
    } catch (error: any) {
      Logger.error(`Error executing job ${job_id}:`, error);
      throw error;
    }
  }
}

// Singleton instance
export const schedulerManager = new SchedulerManager();
