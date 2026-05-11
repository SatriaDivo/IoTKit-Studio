/**
 * DRONE Module - Service
 * Drone Telemetry, Navigation, Camera, Tree Detection Emulator
 */

import { DroneGenerator, DronePayloadOptions } from "./generator";
import {
  DroneNavigationPayloadSchema,
  DroneTelemetryPayloadSchema,
  DroneCameraPayloadSchema,
  DroneTreeDetectionPayloadSchema,
} from "./schema";
import { Logger } from "../../utils/logger";

export class DroneService {
  public readonly moduleName = "drone";
  public readonly defaultPayloadKind = "navigation";
  public readonly allowedPayloadKinds = new Set([
    "navigation",
    "telemetry",
    "camera",
    "tree_detection",
  ]);

  private generator: DroneGenerator;

  constructor() {
    this.generator = new DroneGenerator();
    Logger.info("DRONE Service initialized");
  }

  /**
   * Generate payload
   */
  async generate(
    payloadKind?: string,
    options?: DronePayloadOptions,
  ): Promise<any> {
    const kind = payloadKind || this.defaultPayloadKind;

    if (!this.allowedPayloadKinds.has(kind)) {
      throw new Error(
        `Invalid payload kind: ${kind}. Allowed: ${Array.from(this.allowedPayloadKinds).join(", ")}`,
      );
    }

    switch (kind) {
      case "navigation":
        return this.generator.generateNavigation(options);

      case "telemetry":
        return this.generator.generateTelemetry(options);

      case "camera":
        return this.generator.generateCamera(options);

      case "tree_detection":
        return this.generator.generateTreeDetection(options);

      default:
        throw new Error(`Unknown payload kind: ${kind}`);
    }
  }

  /**
   * Validate payload
   */
  validate(payload: any, payloadKind?: string): boolean {
    try {
      const kind = payloadKind || this.defaultPayloadKind;

      switch (kind) {
        case "navigation":
          DroneNavigationPayloadSchema.parse(payload);
          break;

        case "telemetry":
          DroneTelemetryPayloadSchema.parse(payload);
          break;

        case "camera":
          DroneCameraPayloadSchema.parse(payload);
          break;

        case "tree_detection":
          DroneTreeDetectionPayloadSchema.parse(payload);
          break;

        default:
          return false;
      }

      return true;
    } catch (error: any) {
      Logger.error(`DRONE payload validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get module info
   */
  getInfo() {
    return {
      moduleName: this.moduleName,
      description: "Drone Telemetry & Navigation Emulator",
      defaultPayloadKind: this.defaultPayloadKind,
      allowedPayloadKinds: Array.from(this.allowedPayloadKinds),
      supportedProtocols: ["http", "https", "ws", "wss"],
      datasetSupport: false,
    };
  }
}

// Singleton instance
export const droneService = new DroneService();
