/**
 * HERA Module - Water Quality Sensor Schema
 * Validation schemas using Zod
 */

import { z } from "zod";

/**
 * HERA Payload Schema
 */
export const HeraPayloadSchema = z.object({
  location: z.string(),
  tegangan: z.number().min(0).max(12),
  suhu_air: z.number().min(-50).max(100),
  suhu_lingkungan: z.number().min(-50).max(100),
  kelembapan: z.number().min(0).max(100),
  tds: z.number().min(0).max(10000),
  ec: z.number().min(0).max(10000),
  ph: z.number().min(0).max(14),
  status: z.enum(["normal", "warning", "danger"]),
  timestamp: z.string(),
});

export type HeraPayload = z.infer<typeof HeraPayloadSchema>;

/**
 * HERA Payload Options Schema
 */
export const HeraPayloadOptionsSchema = z
  .object({
    location: z.string().optional(),
    source_preference: z.enum(["dataset", "random"]).optional(),
    ranges: z
      .object({
        tegangan: z.tuple([z.number(), z.number()]).optional(),
        suhu_air: z.tuple([z.number(), z.number()]).optional(),
        suhu_lingkungan: z.tuple([z.number(), z.number()]).optional(),
        kelembapan: z.tuple([z.number(), z.number()]).optional(),
        tds: z.tuple([z.number(), z.number()]).optional(),
        ec: z.tuple([z.number(), z.number()]).optional(),
        ph: z.tuple([z.number(), z.number()]).optional(),
      })
      .optional(),
  })
  .optional();

export type HeraPayloadOptions = z.infer<typeof HeraPayloadOptionsSchema>;

/**
 * Default ranges for random generation
 */
export const DEFAULT_RANGES = {
  tegangan: [3.7, 4.2] as [number, number],
  suhu_air: [24.0, 31.0] as [number, number],
  suhu_lingkungan: [25.0, 34.0] as [number, number],
  kelembapan: [65.0, 90.0] as [number, number],
  tds: [200.0, 1000.0] as [number, number],
  ec: [300.0, 1500.0] as [number, number],
  ph: [6.0, 8.5] as [number, number],
};

/**
 * Valid ranges for data validation
 */
export const VALID_RANGES = {
  tegangan: [0, 12] as [number, number],
  suhu_air: [-50, 100] as [number, number],
  suhu_lingkungan: [-50, 100] as [number, number],
  kelembapan: [0, 100] as [number, number],
  tds: [0, 10000] as [number, number],
  ec: [0, 10000] as [number, number],
  ph: [0, 14] as [number, number],
};

/**
 * CSV header aliases for flexible parsing
 */
export const HEADER_ALIASES = {
  tegangan: ["tegangan", "tegangan_v", "voltage_v", "voltage"],
  suhu_air: ["suhu_air", "suhu_air_c", "water_temperature_c", "water_temp"],
  suhu_lingkungan: [
    "suhu_lingkungan",
    "ambient_temperature_c",
    "air_temperature_c",
    "ambient_temp",
  ],
  kelembapan: ["kelembapan", "humidity", "humidity_percent"],
  tds: ["tds"],
  ec: ["ec"],
  ph: ["ph"],
};

/**
 * Compute water quality status based on sensor readings
 */
export function computeStatus(
  ec: number,
  tds: number,
  ph: number,
): "normal" | "warning" | "danger" {
  // Danger conditions
  if (ec > 1200 || tds > 800 || ph < 6.0 || ph > 8.5) {
    return "danger";
  }

  // Warning conditions
  if (ec > 1000 || tds > 600 || ph < 6.5 || ph > 8.0) {
    return "warning";
  }

  // Normal
  return "normal";
}
