/**
 * Carbon Module - Payload Generator
 * Generates IoT Agrisense payloads
 */

import { v4 as uuidv4 } from "uuid";
import {
  CarbonPayload,
  CarbonPayloadOptions,
  DEFAULT_CARBON_LOCATION,
  DEFAULT_CARBON_RANGES,
  DEFAULT_ENVIRONMENT,
} from "./schema";

export class CarbonGenerator {
  /**
   * Generate carbon payload
   */
  generate(options?: CarbonPayloadOptions): CarbonPayload {
    const deviceId = options?.device_id || "AGRISENSE-CC-001";
    const location = options?.location || DEFAULT_CARBON_LOCATION;
    const ranges = { ...DEFAULT_CARBON_RANGES, ...options?.ranges };

    const payload: CarbonPayload = {
      device_id: deviceId,
      message_id: uuidv4(),
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        altitude_m: location.altitude_m,
      },
      carbon_data: {
        co2_ppm: this.random(...ranges.co2_ppm),
        tvoc_ppb: this.random(...ranges.tvoc_ppb),
      },
      environment: {
        air_temperature_c:
          DEFAULT_ENVIRONMENT.air_temperature_c + this.random(-2, 2),
        air_humidity_percent:
          DEFAULT_ENVIRONMENT.air_humidity_percent + this.random(-5, 5),
        air_pressure_hpa:
          DEFAULT_ENVIRONMENT.air_pressure_hpa + this.random(-10, 10),
        light_lux: DEFAULT_ENVIRONMENT.light_lux + this.random(-50, 50),
      },
      soil_7in1: {
        soil_moisture_percent: this.random(...ranges.soil_moisture_percent),
        soil_temperature_c: this.random(...ranges.soil_temperature_c),
        soil_ec_ms_cm: this.random(...ranges.soil_ec_ms_cm),
        soil_ph: this.random(...ranges.soil_ph),
        soil_n_mg_kg: this.random(...ranges.soil_n_mg_kg),
        soil_p_mg_kg: this.random(...ranges.soil_p_mg_kg),
        soil_k_mg_kg: this.random(...ranges.soil_k_mg_kg),
      },
      power: {
        battery_voltage: this.random(...ranges.battery_voltage),
        battery_percent: this.random(...ranges.battery_percent),
      },
      communication: {
        network_type: "WiFi",
        rssi_dbm: this.random(...ranges.rssi_dbm),
      },
      status: {
        node_status: "online",
        sensor_status: "normal",
        firmware_version: "1.0.1",
      },
      timestamp: new Date().toISOString(),
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
