/**
 * DRONE Module - Payload Generator
 * Generates drone telemetry, navigation, camera, and tree detection payloads
 */

import { v4 as uuidv4 } from "uuid";
import {
  DroneNavigationPayload,
  DroneTelemetryPayload,
  DroneCameraPayload,
  DroneTreeDetectionPayload,
  DRONE_COMMANDS,
  DEFAULT_DRONE_LOCATION,
  DUMMY_JPEG_BASE64,
} from "./schema";

export interface DronePayloadOptions {
  drone_id?: string;
  mission_id?: string;
  location?: {
    lat: number;
    lon: number;
    alt: number;
  };
  endpoints?: {
    camera?: string;
  };
}

export class DroneGenerator {
  /**
   * Generate navigation payload
   */
  generateNavigation(options?: DronePayloadOptions): DroneNavigationPayload {
    const location = options?.location || DEFAULT_DRONE_LOCATION;

    // Random command
    const command =
      DRONE_COMMANDS[Math.floor(Math.random() * DRONE_COMMANDS.length)];

    const payload: DroneNavigationPayload = {
      kondisi: {
        command_code: command.code,
        command_label: command.label,
        heading: this.random(0, 360),
        gps: {
          lat: location.lat + this.random(-0.001, 0.001),
          lon: location.lon + this.random(-0.001, 0.001),
          alt: location.alt + this.random(-5, 5),
        },
        imu: {
          ax: this.random(-2, 2),
          ay: this.random(-2, 2),
          az: this.random(8, 12),
          gx: this.random(-0.5, 0.5),
          gy: this.random(-0.5, 0.5),
          gz: this.random(-0.5, 0.5),
        },
        velocity: {
          vx: this.random(-5, 5),
          vy: this.random(-5, 5),
          vz: this.random(-2, 2),
        },
        obstacle: {
          distance_front: this.random(50, 500),
          distance_left: this.random(50, 500),
          distance_right: this.random(50, 500),
          distance_back: this.random(50, 500),
          status: "clear",
        },
        mission_status: "in_progress",
        timestamp: new Date().toISOString(),
      },
    };

    return payload;
  }

  /**
   * Generate telemetry payload
   */
  generateTelemetry(options?: DronePayloadOptions): DroneTelemetryPayload {
    const location = options?.location || DEFAULT_DRONE_LOCATION;
    const droneId = options?.drone_id || "DRONE-001";
    const missionId = options?.mission_id || `MISSION-${Date.now()}`;

    const payload: DroneTelemetryPayload = {
      drone_id: droneId,
      mission_id: missionId,
      latitude: location.lat + this.random(-0.001, 0.001),
      longitude: location.lon + this.random(-0.001, 0.001),
      altitude: location.alt + this.random(-5, 5),
      speed: this.random(0, 15),
      battery: this.random(20, 100),
      yaw: this.random(0, 360),
      timestamp: new Date().toISOString(),
    };

    return payload;
  }

  /**
   * Generate camera payload
   */
  generateCamera(options?: DronePayloadOptions): DroneCameraPayload {
    const droneId = options?.drone_id || "DRONE-001";
    const missionId = options?.mission_id || `MISSION-${Date.now()}`;
    const cameraEndpoint =
      options?.endpoints?.camera || "ws://127.0.0.1:9002/drone/camera";

    const payload: DroneCameraPayload = {
      drone_id: droneId,
      mission_id: missionId,
      camera_right_image: `${cameraEndpoint}/right/${Date.now()}`,
      camera_left_image: `${cameraEndpoint}/left/${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    return payload;
  }

  /**
   * Generate tree detection payload
   */
  generateTreeDetection(
    options?: DronePayloadOptions,
  ): DroneTreeDetectionPayload {
    const location = options?.location || DEFAULT_DRONE_LOCATION;
    const droneId = options?.drone_id || "DRONE-001";
    const missionId = options?.mission_id || `MISSION-${Date.now()}`;

    const treeId = `TREE-${uuidv4().substring(0, 8)}`;

    const payload: DroneTreeDetectionPayload = {
      drone_id: droneId,
      mission_id: missionId,
      tree_id: treeId,
      detected_from: "camera_right",
      latitude: location.lat + this.random(-0.001, 0.001),
      longitude: location.lon + this.random(-0.001, 0.001),
      confidence: this.random(0.7, 0.99),
      timestamp: new Date().toISOString(),
      __file_name__: `${treeId}.jpg`,
      __file_content_type__: "image/jpeg",
      __file_base64__: DUMMY_JPEG_BASE64,
    };

    return payload;
  }

  /**
   * Generate random number in range
   */
  private random(min: number, max: number): number {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
  }
}
