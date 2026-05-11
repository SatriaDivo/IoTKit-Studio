/**
 * JobStore - In-memory storage for job states
 * Inspired by Hybrid Emulator's JobStore
 */

export interface JobState {
  job_id: string;
  module_name: string;
  mode: "interval" | "manual" | "scenario";
  status: "idle" | "running" | "stopped" | "error";
  interval: number; // seconds
  endpoint: string;
  payload_kind?: string;
  payload_options?: Record<string, any>;
  target_count?: number;
  scenario?: Array<{ payload_kind: string; options?: Record<string, any> }>;
  scenario_index?: number;

  // Stats
  total_sent: number;
  success_count: number;
  failure_count: number;

  // Tracking
  last_run_at?: Date;
  last_payload?: any;
  last_response?: any;
  last_error?: string;

  // Metadata
  created_at: Date;
  updated_at: Date;
  project_id?: string;
}

export class JobStore {
  private jobs: Map<string, JobState> = new Map();
  private lock: Map<string, boolean> = new Map();

  /**
   * Create or update a job
   */
  set(job_id: string, state: Partial<JobState>): void {
    const existing = this.jobs.get(job_id);
    const now = new Date();

    const jobState: JobState = {
      job_id,
      module_name: state.module_name || existing?.module_name || "custom",
      mode: state.mode || existing?.mode || "interval",
      status: state.status || existing?.status || "idle",
      interval: state.interval ?? existing?.interval ?? 5,
      endpoint: state.endpoint || existing?.endpoint || "",
      payload_kind: state.payload_kind || existing?.payload_kind,
      payload_options: state.payload_options || existing?.payload_options,
      target_count: state.target_count ?? existing?.target_count,
      scenario: state.scenario || existing?.scenario,
      scenario_index: state.scenario_index ?? existing?.scenario_index ?? 0,

      total_sent: state.total_sent ?? existing?.total_sent ?? 0,
      success_count: state.success_count ?? existing?.success_count ?? 0,
      failure_count: state.failure_count ?? existing?.failure_count ?? 0,

      last_run_at: state.last_run_at || existing?.last_run_at,
      last_payload: state.last_payload || existing?.last_payload,
      last_response: state.last_response || existing?.last_response,
      last_error: state.last_error || existing?.last_error,

      created_at: existing?.created_at || now,
      updated_at: now,
      project_id: state.project_id || existing?.project_id,
    };

    this.jobs.set(job_id, jobState);
  }

  /**
   * Get a job by ID
   */
  get(job_id: string): JobState | undefined {
    return this.jobs.get(job_id);
  }

  /**
   * Get all jobs
   */
  getAll(): JobState[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get jobs by module name
   */
  getByModule(module_name: string): JobState[] {
    return Array.from(this.jobs.values()).filter(
      (job) => job.module_name === module_name,
    );
  }

  /**
   * Get jobs by project ID
   */
  getByProject(project_id: string): JobState[] {
    return Array.from(this.jobs.values()).filter(
      (job) => job.project_id === project_id,
    );
  }

  /**
   * Get running jobs
   */
  getRunning(): JobState[] {
    return Array.from(this.jobs.values()).filter(
      (job) => job.status === "running",
    );
  }

  /**
   * Delete a job
   */
  delete(job_id: string): boolean {
    return this.jobs.delete(job_id);
  }

  /**
   * Check if job exists
   */
  has(job_id: string): boolean {
    return this.jobs.has(job_id);
  }

  /**
   * Record execution result
   */
  recordResult(
    job_id: string,
    success: boolean,
    payload?: any,
    response?: any,
    error?: string,
  ): void {
    const job = this.jobs.get(job_id);
    if (!job) return;

    job.total_sent += 1;
    job.last_run_at = new Date();
    job.last_payload = payload;
    job.last_response = response;
    job.updated_at = new Date();

    if (success) {
      job.success_count += 1;
      job.last_error = undefined;
    } else {
      job.failure_count += 1;
      job.last_error = error || "Unknown error";
    }

    // Auto-stop if target count reached
    if (job.target_count && job.total_sent >= job.target_count) {
      job.status = "stopped";
    }

    this.jobs.set(job_id, job);
  }

  /**
   * Update job status
   */
  updateStatus(job_id: string, status: JobState["status"]): void {
    const job = this.jobs.get(job_id);
    if (!job) return;

    job.status = status;
    job.updated_at = new Date();
    this.jobs.set(job_id, job);
  }

  /**
   * Update scenario index (for scenario mode)
   */
  advanceScenario(job_id: string): void {
    const job = this.jobs.get(job_id);
    if (!job || !job.scenario) return;

    job.scenario_index = ((job.scenario_index || 0) + 1) % job.scenario.length;
    job.updated_at = new Date();
    this.jobs.set(job_id, job);
  }

  /**
   * Clear all jobs
   */
  clear(): void {
    this.jobs.clear();
    this.lock.clear();
  }

  /**
   * Get job count
   */
  count(): number {
    return this.jobs.size;
  }
}

// Singleton instance
export const jobStore = new JobStore();
