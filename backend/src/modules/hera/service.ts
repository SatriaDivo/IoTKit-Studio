/**
 * HERA Module - Service
 * Water Quality Sensor Emulator
 */

import { HeraGenerator } from "./generator";
import { HeraPayloadSchema, HeraPayloadOptions } from "./schema";
import { Logger } from "../../utils/logger";

export class HeraService {
  public readonly moduleName = "hera";
  public readonly defaultPayloadKind = "sensor";
  public readonly allowedPayloadKinds = new Set(["sensor"]);

  private generator: HeraGenerator;

  constructor() {
    this.generator = new HeraGenerator();
    Logger.info("HERA Service initialized");
  }

  /**
   * Generate payload
   */
  async generate(
    payloadKind?: string,
    options?: HeraPayloadOptions,
  ): Promise<any> {
    // HERA only has one payload kind
    const kind = payloadKind || this.defaultPayloadKind;

    if (!this.allowedPayloadKinds.has(kind)) {
      throw new Error(
        `Invalid payload kind: ${kind}. Allowed: ${Array.from(this.allowedPayloadKinds).join(", ")}`,
      );
    }

    return await this.generator.generate(options);
  }

  /**
   * Validate payload
   */
  validate(payload: any): boolean {
    try {
      HeraPayloadSchema.parse(payload);
      return true;
    } catch (error: any) {
      Logger.error(`HERA payload validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Reload dataset
   */
  async reloadDataset(): Promise<void> {
    await this.generator.reloadDataset();
    Logger.info("HERA dataset reloaded");
  }

  /**
   * Get module info
   */
  getInfo() {
    return {
      moduleName: this.moduleName,
      description: "Water Quality Sensor Emulator",
      defaultPayloadKind: this.defaultPayloadKind,
      allowedPayloadKinds: Array.from(this.allowedPayloadKinds),
      supportedProtocols: ["http", "https", "mqtt", "mqtts"],
      datasetSupport: true,
    };
  }
}

// Singleton instance
export const heraService = new HeraService();
