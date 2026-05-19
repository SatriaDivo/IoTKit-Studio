/**
 * JobManager - Central job lifecycle manager
 * Inspired by Hybrid Emulator's JobManager
 */

import { v4 as uuidv4 } from "uuid";
import { jobStore, JobState } from "./jobStore";
import { schedulerManager } from "./scheduler";
import { transportRouter } from "./transportRouter";
import { Logger } from "../utils/logger";
import { PrismaClient } from "@prisma/client";
import { AlertEngine } from "./alertEngine";

const prisma = new PrismaClient();

export interface StartJobRequest {
  module_name: string;
  endpoint: string;
  mode?: "interval" | "manual" | "scenario";
  interval?: number; // seconds
  target_count?: number;
  payload_kind?: string;
  payload_options?: Record<string, any>;
  scenario?: Array<{ payload_kind: string; options?: Record<string, any> }>;
  project_id?: string;
}

export interface UpdateJobRequest {
  job_id: string;
  interval?: number;
  target_count?: number;
  payload_options?: Record<string, any>;
}

export interface PreviewRequest {
  module_name: string;
  payload_kind?: string;
  payload_options?: Record<string, any>;
}

export class JobManager {
  private moduleServices: Map<string, any> = new Map();

  constructor() {
    // Module services will be registered later
    Logger.info("JobManager initialized");
  }

  /**
   * Register a module service
   */
  registerModule(moduleName: string, service: any): void {
    this.moduleServices.set(moduleName, service);
    Logger.info(`Registered module: ${moduleName}`);
  }

  /**
   * Start a job
   */
  async startJob(request: StartJobRequest): Promise<JobState> {
    const {
      module_name,
      endpoint,
      mode = "interval",
      interval = 5,
      target_count,
      payload_kind,
      payload_options,
      scenario,
      project_id,
    } = request;

    // Validate endpoint
    const validation = transportRouter.validateEndpoint(endpoint);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Generate job ID
    const job_id = `${module_name}-${uuidv4()}`;

    // Create job state
    jobStore.set(job_id, {
      job_id,
      module_name,
      mode,
      status: "running",
      interval,
      endpoint,
      payload_kind,
      payload_options,
      target_count,
      scenario,
      project_id,
      total_sent: 0,
      success_count: 0,
      failure_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Schedule job
    schedulerManager.scheduleInterval(job_id, interval, async () => {
      await this.executeJob(job_id);
    });

    // Execute immediately once
    setImmediate(async () => {
      await this.executeJob(job_id);
    });

    // Save to database if project_id provided
    if (project_id) {
      await this.saveJobToDatabase(job_id);
    }

    Logger.info(`Started job: ${job_id}`);

    return jobStore.get(job_id)!;
  }

  /**
   * Stop a job
   */
  async stopJob(job_id: string): Promise<JobState> {
    const job = jobStore.get(job_id);
    if (!job) {
      throw new Error(`Job ${job_id} not found`);
    }

    // Remove from scheduler
    schedulerManager.remove(job_id);

    // Update status
    jobStore.updateStatus(job_id, "stopped");

    // Update database
    if (job.project_id) {
      await this.updateJobInDatabase(job_id);
    }

    Logger.info(`Stopped job: ${job_id}`);

    return jobStore.get(job_id)!;
  }

  /**
   * Update a job
   */
  async updateJob(request: UpdateJobRequest): Promise<JobState> {
    const { job_id, interval, target_count, payload_options } = request;

    const job = jobStore.get(job_id);
    if (!job) {
      throw new Error(`Job ${job_id} not found`);
    }

    // Update job state
    jobStore.set(job_id, {
      ...job,
      ...(interval !== undefined && { interval }),
      ...(target_count !== undefined && { target_count }),
      ...(payload_options !== undefined && { payload_options }),
    });

    // Reschedule if interval changed and job is running
    if (interval !== undefined && job.status === "running") {
      schedulerManager.scheduleInterval(job_id, interval, async () => {
        await this.executeJob(job_id);
      });
    }

    // Update database
    if (job.project_id) {
      await this.updateJobInDatabase(job_id);
    }

    Logger.info(`Updated job: ${job_id}`);

    return jobStore.get(job_id)!;
  }

  /**
   * Preview payload without sending
   */
  async previewPayload(request: PreviewRequest): Promise<any> {
    const { module_name, payload_kind, payload_options } = request;

    const service = this.moduleServices.get(module_name);
    if (!service) {
      throw new Error(`Module ${module_name} not found`);
    }

    // Generate payload
    const payload = await service.generate(payload_kind, payload_options);

    return payload;
  }

  /**
   * Execute a job (called by scheduler)
   */
  private async executeJob(job_id: string): Promise<void> {
    const job = jobStore.get(job_id);
    if (!job) {
      Logger.warn(`Job ${job_id} not found, skipping execution`);
      return;
    }

    // Check if job is still running
    if (job.status !== "running") {
      Logger.info(`Job ${job_id} is not running, skipping execution`);
      return;
    }

    // Check if target count reached
    if (job.target_count && job.total_sent >= job.target_count) {
      Logger.info(`Job ${job_id} reached target count, stopping`);
      await this.stopJob(job_id);
      return;
    }

    try {
      // Get module service
      const service = this.moduleServices.get(job.module_name);
      if (!service) {
        throw new Error(`Module ${job.module_name} not found`);
      }

      // Determine payload kind for scenario mode
      let currentPayloadKind = job.payload_kind;
      let currentPayloadOptions = job.payload_options;

      if (job.mode === "scenario" && job.scenario && job.scenario.length > 0) {
        const scenarioItem = job.scenario[job.scenario_index || 0];
        currentPayloadKind = scenarioItem.payload_kind;
        currentPayloadOptions = scenarioItem.options;

        // Advance scenario index
        jobStore.advanceScenario(job_id);
      }

      // Generate payload
      const payload = await service.generate(
        currentPayloadKind,
        currentPayloadOptions,
      );

      // Send payload
      const result = await transportRouter.send(job.endpoint, payload);

      // Run rule evaluation on simulated payload
      if (job.project_id) {
        await AlertEngine.evaluatePayloadRules(job.project_id, payload);
      }

      // Record result
      jobStore.recordResult(
        job_id,
        result.success,
        payload,
        result.response,
        result.error,
      );

      // Log to database
      if (job.project_id) {
        await this.logToDatabase(job.project_id, job, result, payload);
      }

      Logger.info(
        `Job ${job_id} executed: ${result.success ? "success" : "failed"}`,
      );
    } catch (error: any) {
      Logger.error(`Job ${job_id} execution error:`, error);

      // Record error
      jobStore.recordResult(job_id, false, null, null, error.message);

      // Update status to error if too many failures
      const updatedJob = jobStore.get(job_id);
      if (
        updatedJob &&
        updatedJob.failure_count > 5 &&
        updatedJob.success_count === 0
      ) {
        jobStore.updateStatus(job_id, "error");
        schedulerManager.remove(job_id);
        Logger.error(`Job ${job_id} stopped due to repeated failures`);
      }
    }
  }

  /**
   * Get all jobs
   */
  getAllJobs(): JobState[] {
    return jobStore.getAll();
  }

  /**
   * Get job by ID
   */
  getJob(job_id: string): JobState | undefined {
    return jobStore.get(job_id);
  }

  /**
   * Get jobs by module
   */
  getJobsByModule(module_name: string): JobState[] {
    return jobStore.getByModule(module_name);
  }

  /**
   * Get jobs by project
   */
  getJobsByProject(project_id: string): JobState[] {
    return jobStore.getByProject(project_id);
  }

  /**
   * Save job to database
   */
  private async saveJobToDatabase(job_id: string): Promise<void> {
    const job = jobStore.get(job_id);
    if (!job || !job.project_id) return;

    try {
      await prisma.simulation.create({
        data: {
          jobId: job_id,
          moduleName: job.module_name,
          mode: job.mode,
          status: job.status,
          interval: job.interval * 1000, // Convert to ms
          targetCount: job.target_count,
          payloadKind: job.payload_kind,
          payloadOptions: job.payload_options
            ? JSON.stringify(job.payload_options)
            : null,
          projectId: job.project_id,
          startedAt: new Date(),
        },
      });
    } catch (error: any) {
      Logger.error(`Failed to save job to database: ${error.message}`);
    }
  }

  /**
   * Update job in database
   */
  private async updateJobInDatabase(job_id: string): Promise<void> {
    const job = jobStore.get(job_id);
    if (!job || !job.project_id) return;

    try {
      await prisma.simulation.updateMany({
        where: { jobId: job_id },
        data: {
          status: job.status,
          interval: job.interval * 1000,
          targetCount: job.target_count,
          totalSent: job.total_sent,
          successCount: job.success_count,
          errorCount: job.failure_count,
          lastRunAt: job.last_run_at,
          lastPayload: job.last_payload
            ? JSON.stringify(job.last_payload)
            : null,
          lastResponse: job.last_response
            ? JSON.stringify(job.last_response)
            : null,
          lastError: job.last_error,
          stoppedAt: job.status === "stopped" ? new Date() : null,
          updatedAt: new Date(),
        },
      });
    } catch (error: any) {
      Logger.error(`Failed to update job in database: ${error.message}`);
    }
  }

  /**
   * Log to database
   */
  private async logToDatabase(
    project_id: string,
    job: JobState,
    result: any,
    payload: any,
  ): Promise<void> {
    try {
      const url = new URL(job.endpoint);
      const protocol = url.protocol.replace(":", "").toUpperCase();

      await prisma.log.create({
        data: {
          type: result.success ? "response" : "error",
          protocol,
          message: result.success
            ? `Payload sent successfully`
            : result.error || "Unknown error",
          payload: JSON.stringify(payload),
          statusCode: result.statusCode,
          latency: result.latency,
          projectId: project_id,
        },
      });
    } catch (error: any) {
      Logger.error(`Failed to log to database: ${error.message}`);
    }
  }

  /**
   * Shutdown job manager
   */
  async shutdown(): Promise<void> {
    Logger.info("Shutting down JobManager...");

    // Stop all running jobs
    const runningJobs = jobStore.getRunning();
    for (const job of runningJobs) {
      await this.stopJob(job.job_id);
    }

    Logger.info("JobManager shutdown complete");
  }
}

// Singleton instance
export const jobManager = new JobManager();
