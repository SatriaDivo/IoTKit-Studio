/**
 * Carbon Module - IoT Agrisense Schema
 * CO2, TVOC, Soil 7-in-1, Power, Communication, Status
 */

import { z } from "zod";

/**
 * Carbon Payload Schema
 */
export const CarbonPayloadSchema = z.object({
  device_id: z.string(),
  message_id: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    altitude_m: z.number(),
  }),
  carbon_data: z.object({
    co2_ppm: z.number(),
    tvoc_ppb: z.number(),
  }),
  environment: z.object({
    air_temperature_c: z.number(),
    air_humidity_percent: z.number(),
    air_pressure_hpa: z.number(),
    light_lux: z.number(),
  }),
  soil_7in1: z.object({
    soil_moisture_percent: z.number(),
    soil_temperature_c: z.number(),
    soil_ec_ms_cm: z.number(),
    soil_ph: z.number(),
    soil_n_mg_kg: z.number(),
    soil_p_mg_kg: z.number(),
    soil_k_mg_kg: z.number(),
  }),
  power: z.object({
    battery_voltage: z.number(),
    battery_percent: z.number(),
  }),
  communication: z.object({
    network_type: z.string(),
    rssi_dbm: z.number(),
  }),
  status: z.object({
    node_status: z.string(),
    sensor_status: z.string(),
    firmware_version: z.string(),
  }),
  timestamp: z.string(),
});

export type CarbonPayload = z.infer<typeof CarbonPayloadSchema>;

/**
 * Carbon Payload Options
 */
export interface CarbonPayloadOptions {
  device_id?: string;
  location?: {
    latitude: number;
    longitude: number;
    altitude_m: number;
  };
  ranges?: {
    co2_ppm?: [number, number];
    tvoc_ppb?: [number, number];
    soil_moisture_percent?: [number, number];
    soil_temperature_c?: [number, number];
    soil_ec_ms_cm?: [number, number];
    soil_ph?: [number, number];
    soil_n_mg_kg?: [number, number];
    soil_p_mg_kg?: [number, number];
    soil_k_mg_kg?: [number, number];
    battery_voltage?: [number, number];
    battery_percent?: [number, number];
    rssi_dbm?: [number, number];
  };
}

/**
 * Default location (Bandung)
 */
export const DEFAULT_CARBON_LOCATION = {
  latitude: -6.914744,
  longitude: 107.60981,
  altitude_m: 768.5,
};

/**
 * Default ranges
 */
export const DEFAULT_CARBON_RANGES = {
  co2_ppm: [350, 1400] as [number, number],
  tvoc_ppb: [50, 300] as [number, number],
  soil_moisture_percent: [20, 70] as [number, number],
  soil_temperature_c: [22, 31] as [number, number],
  soil_ec_ms_cm: [0.8, 2.2] as [number, number],
  soil_ph: [5.0, 8.5] as [number, number],
  soil_n_mg_kg: [40, 130] as [number, number],
  soil_p_mg_kg: [15, 70] as [number, number],
  soil_k_mg_kg: [70, 200] as [number, number],
  battery_voltage: [3.6, 4.2] as [number, number],
  battery_percent: [35, 100] as [number, number],
  rssi_dbm: [-95, -45] as [number, number],
};

/**
 * Default environment values
 */
export const DEFAULT_ENVIRONMENT = {
  air_temperature_c: 27.5,
  air_humidity_percent: 78.0,
  air_pressure_hpa: 1008.0,
  light_lux: 320.0,
};
