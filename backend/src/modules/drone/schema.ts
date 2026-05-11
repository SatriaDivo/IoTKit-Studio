/**
 * DRONE Module - Schema
 * Telemetry, Navigation, Camera, Tree Detection
 */

import { z } from "zod";

/**
 * Navigation Payload Schema
 */
export const DroneNavigationPayloadSchema = z.object({
  kondisi: z.object({
    command_code: z.string(),
    command_label: z.string(),
    heading: z.number(),
    gps: z.object({
      lat: z.number(),
      lon: z.number(),
      alt: z.number(),
    }),
    imu: z.object({
      ax: z.number(),
      ay: z.number(),
      az: z.number(),
      gx: z.number(),
      gy: z.number(),
      gz: z.number(),
    }),
    velocity: z.object({
      vx: z.number(),
      vy: z.number(),
      vz: z.number(),
    }),
    obstacle: z.object({
      distance_front: z.number(),
      distance_left: z.number(),
      distance_right: z.number(),
      distance_back: z.number(),
      status: z.string(),
    }),
    mission_status: z.string(),
    timestamp: z.string(),
  }),
});

/**
 * Telemetry Payload Schema
 */
export const DroneTelemetryPayloadSchema = z.object({
  drone_id: z.string(),
  mission_id: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  altitude: z.number(),
  speed: z.number(),
  battery: z.number(),
  yaw: z.number(),
  timestamp: z.string(),
});

/**
 * Camera Payload Schema
 */
export const DroneCameraPayloadSchema = z.object({
  drone_id: z.string(),
  mission_id: z.string(),
  camera_right_image: z.string(),
  camera_left_image: z.string(),
  timestamp: z.string(),
});

/**
 * Tree Detection Payload Schema
 */
export const DroneTreeDetectionPayloadSchema = z.object({
  drone_id: z.string(),
  mission_id: z.string(),
  tree_id: z.string(),
  detected_from: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  confidence: z.number(),
  timestamp: z.string(),
  __file_name__: z.string(),
  __file_content_type__: z.string(),
  __file_base64__: z.string(),
});

export type DroneNavigationPayload = z.infer<
  typeof DroneNavigationPayloadSchema
>;
export type DroneTelemetryPayload = z.infer<typeof DroneTelemetryPayloadSchema>;
export type DroneCameraPayload = z.infer<typeof DroneCameraPayloadSchema>;
export type DroneTreeDetectionPayload = z.infer<
  typeof DroneTreeDetectionPayloadSchema
>;

/**
 * Drone commands
 */
export const DRONE_COMMANDS = [
  { code: "DRN005", label: "maju" },
  { code: "DRN006", label: "mundur" },
  { code: "DRN007", label: "kiri" },
  { code: "DRN008", label: "kanan" },
  { code: "DRN011", label: "naik" },
  { code: "DRN012", label: "turun" },
  { code: "DRN010", label: "hover" },
  { code: "DRN009", label: "berhenti" },
];

/**
 * Default drone location (Bandung)
 */
export const DEFAULT_DRONE_LOCATION = {
  lat: -6.914744,
  lon: 107.60981,
  alt: 100.0,
};

/**
 * Dummy JPEG base64 (1x1 pixel)
 */
export const DUMMY_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=";
