/**
 * RetryManager - Retry logic with exponential backoff
 * Inspired by Hybrid Emulator's retry mechanism
 */

import { Logger } from "../utils/logger";

export interface RetryOptions {
  maxAttempts?: number;
  backoffSeconds?: number;
  maxBackoffSeconds?: number;
  onRetry?: (attempt: number, error: any) => void;
}

export class RetryManager {
  private maxAttempts: number;
  private backoffSeconds: number;
  private maxBackoffSeconds: number;

  constructor(options: RetryOptions = {}) {
    this.maxAttempts = options.maxAttempts || 3;
    this.backoffSeconds = options.backoffSeconds || 0.5;
    this.maxBackoffSeconds = options.maxBackoffSeconds || 30;
  }

  /**
   * Execute function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const maxAttempts = options.maxAttempts || this.maxAttempts;
    const backoffSeconds = options.backoffSeconds || this.backoffSeconds;
    const maxBackoffSeconds =
      options.maxBackoffSeconds || this.maxBackoffSeconds;

    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        if (attempt < maxAttempts) {
          // Calculate backoff with exponential increase
          const backoffMs = Math.min(
            backoffSeconds * Math.pow(2, attempt - 1) * 1000,
            maxBackoffSeconds * 1000,
          );

          Logger.warn(
            `Attempt ${attempt}/${maxAttempts} failed. Retrying in ${backoffMs}ms...`,
          );

          if (options.onRetry) {
            options.onRetry(attempt, error);
          }

          await this.sleep(backoffMs);
        }
      }
    }

    Logger.error(`All ${maxAttempts} attempts failed`);
    throw lastError;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate backoff time for attempt
   */
  calculateBackoff(attempt: number): number {
    return Math.min(
      this.backoffSeconds * Math.pow(2, attempt - 1),
      this.maxBackoffSeconds,
    );
  }
}

// Default instance
export const retryManager = new RetryManager({
  maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || "3"),
  backoffSeconds: parseFloat(process.env.RETRY_BACKOFF_SECONDS || "0.5"),
  maxBackoffSeconds: 30,
});
