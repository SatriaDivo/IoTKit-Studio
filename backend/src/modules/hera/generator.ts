/**
 * HERA Module - Payload Generator
 * Generates water quality sensor payloads
 */

import { createReadStream } from "fs";
import csvParser from "csv-parser";
import { Logger } from "../../utils/logger";
import {
  HeraPayload,
  HeraPayloadOptions,
  DEFAULT_RANGES,
  VALID_RANGES,
  HEADER_ALIASES,
  computeStatus,
} from "./schema";
import { datasetStore } from "../../services/datasetStore";

interface DatasetRow {
  tegangan: number;
  suhu_air: number;
  suhu_lingkungan: number;
  kelembapan: number;
  tds: number;
  ec: number;
  ph: number;
}

export class HeraGenerator {
  private datasetRows: DatasetRow[] = [];
  private datasetLoaded: boolean = false;
  private currentIndex: number = 0;

  /**
   * Generate HERA payload
   */
  async generate(options?: HeraPayloadOptions): Promise<HeraPayload> {
    const location = options?.location || "citarum_node_alpha";
    const sourcePreference = options?.source_preference || "random";

    let sensorData: Omit<DatasetRow, "location">;

    // Try to use dataset if preference is dataset
    if (sourcePreference === "dataset") {
      const datasetData = await this.getDatasetData();
      if (datasetData) {
        sensorData = datasetData;
      } else {
        Logger.warn("Dataset not available, falling back to random");
        sensorData = this.generateRandom(options?.ranges);
      }
    } else {
      // Use random generation
      sensorData = this.generateRandom(options?.ranges);
    }

    // Compute status
    const status = computeStatus(sensorData.ec, sensorData.tds, sensorData.ph);

    // Create payload
    const payload: HeraPayload = {
      location,
      ...sensorData,
      status,
      timestamp: new Date().toISOString(),
    };

    return payload;
  }

  /**
   * Get data from dataset
   */
  private async getDatasetData(): Promise<DatasetRow | null> {
    // Load dataset if not loaded
    if (!this.datasetLoaded) {
      const loaded = await this.loadDataset();
      if (!loaded) return null;
    }

    // Check if dataset has rows
    if (this.datasetRows.length === 0) {
      return null;
    }

    // Get current row (circular)
    const row = this.datasetRows[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.datasetRows.length;

    return row;
  }

  /**
   * Load dataset from active dataset file
   */
  private async loadDataset(): Promise<boolean> {
    try {
      // Get active dataset
      const dataset = await datasetStore.getActiveDataset("hera");
      if (!dataset) {
        Logger.warn("No active HERA dataset found");
        return false;
      }

      Logger.info(`Loading HERA dataset: ${dataset.fileName}`);

      // Parse CSV
      const rows = await this.parseCSV(dataset.filePath, dataset.delimiter);

      if (rows.length === 0) {
        Logger.warn("Dataset has no valid rows");
        return false;
      }

      this.datasetRows = rows;
      this.datasetLoaded = true;
      this.currentIndex = 0;

      Logger.info(`Loaded ${rows.length} rows from HERA dataset`);
      return true;
    } catch (error: any) {
      Logger.error(`Failed to load HERA dataset: ${error.message}`);
      return false;
    }
  }

  /**
   * Parse CSV file
   */
  private parseCSV(filePath: string, delimiter: string): Promise<DatasetRow[]> {
    return new Promise((resolve, reject) => {
      const rows: DatasetRow[] = [];

      createReadStream(filePath)
        .pipe(csvParser({ separator: delimiter }))
        .on("data", (row) => {
          const parsed = this.parseRow(row);
          if (parsed) {
            rows.push(parsed);
          }
        })
        .on("end", () => {
          resolve(rows);
        })
        .on("error", (error) => {
          reject(error);
        });
    });
  }

  /**
   * Parse CSV row with flexible header matching
   */
  private parseRow(row: any): DatasetRow | null {
    try {
      const data: any = {};

      // Map headers using aliases
      for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
        let value: number | undefined;

        // Try each alias
        for (const alias of aliases) {
          if (row[alias] !== undefined && row[alias] !== "") {
            value = parseFloat(row[alias]);
            break;
          }
        }

        // Validate value
        if (value === undefined || isNaN(value)) {
          return null; // Skip invalid rows
        }

        // Check if value is within valid range
        const [min, max] = VALID_RANGES[field as keyof typeof VALID_RANGES];
        if (value < min || value > max) {
          return null; // Skip out-of-range rows
        }

        data[field] = value;
      }

      return data as DatasetRow;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate random sensor data
   */
  private generateRandom(customRanges?: {
    tegangan?: [number, number];
    suhu_air?: [number, number];
    suhu_lingkungan?: [number, number];
    kelembapan?: [number, number];
    tds?: [number, number];
    ec?: [number, number];
    ph?: [number, number];
  }): DatasetRow {
    const ranges = { ...DEFAULT_RANGES, ...customRanges };

    return {
      tegangan: this.randomInRange(ranges.tegangan[0], ranges.tegangan[1]),
      suhu_air: this.randomInRange(ranges.suhu_air[0], ranges.suhu_air[1]),
      suhu_lingkungan: this.randomInRange(
        ranges.suhu_lingkungan[0],
        ranges.suhu_lingkungan[1],
      ),
      kelembapan: this.randomInRange(
        ranges.kelembapan[0],
        ranges.kelembapan[1],
      ),
      tds: this.randomInRange(ranges.tds[0], ranges.tds[1]),
      ec: this.randomInRange(ranges.ec[0], ranges.ec[1]),
      ph: this.randomInRange(ranges.ph[0], ranges.ph[1]),
    };
  }

  /**
   * Generate random number in range
   */
  private randomInRange(min: number, max: number): number {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
  }

  /**
   * Reload dataset (call when dataset changes)
   */
  async reloadDataset(): Promise<void> {
    this.datasetLoaded = false;
    this.datasetRows = [];
    this.currentIndex = 0;
    await this.loadDataset();
  }
}
