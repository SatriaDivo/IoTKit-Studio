/**
 * Carbon Module - Service
 * IoT Agrisense Carbon Capture Emulator
 */

import { CarbonGenerator } from "./generator";
import { CarbonPayloadSchema, CarbonPayloadOptions } from "./schema";
import { Logger } from "../../utils/logger";

export class CarbonService {
  public readonly moduleName = "carbon";
  public readonly defaultPayloadKind = "agrisense";
  public readonly allowedPayloadKinds = new Set(["agrisense"]);

  private generator: CarbonGenerator;

  constructor() {
    this.generator = new CarbonGenerator();
    Logger.info("Carbon Service initialized");
  }

  /**
   * Generate payload
   */
  async generate(
    payloadKind?: string,
    options?: CarbonPayloadOptions,
  ): Promise<any> {
    // Carbon only has one payload kind
    const kind = payloadKind || this.defaultPayloadKind;

    if (!this.allowedPayloadKinds.has(kind)) {
      throw new Error(
        `Invalid payload kind: ${kind}. Allowed: ${Array.from(this.allowedPayloadKinds).join(", ")}`,
      );
    }

    return this.generator.generate(options);
  }

  /**
   * Validate payload
   */
  validate(payload: any): boolean {
    try {
      CarbonPayloadSchema.parse(payload);
      return true;
    } catch (error: any) {
      Logger.error(`Carbon payload validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get module info
   */
  getInfo() {
    return {
      moduleName: this.moduleName,
      description: "IoT Agrisense Carbon Capture Emulator",
      defaultPayloadKind: this.defaultPayloadKind,
      allowedPayloadKinds: Array.from(this.allowedPayloadKinds),
      supportedProtocols: ["http", "https"],
      datasetSupport: false,
    };
  }
}

// Singleton instance
export const carbonService = new CarbonService();
