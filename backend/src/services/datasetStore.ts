/**
 * DatasetStore - Dataset metadata manager with PostgreSQL
 * Inspired by Hybrid Emulator's dataset_store
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import crypto from "crypto";
import path from "path";
import csvParser from "csv-parser";
import { createReadStream } from "fs";
import { Logger } from "../utils/logger";

const prisma = new PrismaClient();

export interface DatasetMetadata {
  id: string;
  name: string;
  moduleName: string;
  fileName: string;
  filePath: string;
  filePathRelative?: string;
  fileSizeBytes: bigint;
  checksumSha256: string;
  delimiter: string;
  loadedRows: number;
  skippedRows: number;
  isActive: boolean;
  lastLoadedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatasetInspection {
  filePath: string;
  filePathRelative: string;
  fileSizeBytes: number;
  checksumSha256: string;
  delimiter: string;
  rowCount: number;
  headers: string[];
}

export class DatasetStore {
  private dbEnabled: boolean = true;

  constructor() {
    // Check if database is available
    this.checkDatabase();
  }

  private async checkDatabase(): Promise<void> {
    try {
      await prisma.$connect();
      this.dbEnabled = true;
      Logger.info("Dataset store: Database connected");
    } catch (error) {
      this.dbEnabled = false;
      Logger.warn(
        "Dataset store: Database not available, metadata will not be persisted",
      );
    }
  }

  /**
   * Inspect a dataset file
   */
  async inspectDatasetFile(
    filePath: string,
  ): Promise<DatasetInspection | null> {
    try {
      // Check if file exists
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        throw new Error("Path is not a file");
      }

      // Calculate checksum
      const fileBuffer = await fs.readFile(filePath);
      const checksumSha256 = crypto
        .createHash("sha256")
        .update(fileBuffer)
        .digest("hex");

      // Detect delimiter
      const delimiter = await this.detectDelimiter(filePath);

      // Count rows and get headers
      const { rowCount, headers } = await this.parseCSV(filePath, delimiter);

      // Get relative path
      const filePathRelative = path.relative(process.cwd(), filePath);

      return {
        filePath,
        filePathRelative,
        fileSizeBytes: stats.size,
        checksumSha256,
        delimiter,
        rowCount,
        headers,
      };
    } catch (error: any) {
      Logger.error(`Failed to inspect dataset file: ${error.message}`);
      return null;
    }
  }

  /**
   * Detect CSV delimiter
   */
  private async detectDelimiter(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, "utf-8");
    const firstLine = content.split("\n")[0];

    const delimiters = [",", ";", "\t", "|"];
    let maxCount = 0;
    let detectedDelimiter = ",";

    for (const delimiter of delimiters) {
      const count = firstLine.split(delimiter).length;
      if (count > maxCount) {
        maxCount = count;
        detectedDelimiter = delimiter;
      }
    }

    return detectedDelimiter;
  }

  /**
   * Parse CSV and count rows
   */
  private parseCSV(
    filePath: string,
    delimiter: string,
  ): Promise<{ rowCount: number; headers: string[] }> {
    return new Promise((resolve, reject) => {
      let rowCount = 0;
      let headers: string[] = [];

      createReadStream(filePath)
        .pipe(csvParser({ separator: delimiter }))
        .on("headers", (h) => {
          headers = h;
        })
        .on("data", () => {
          rowCount++;
        })
        .on("end", () => {
          resolve({ rowCount, headers });
        })
        .on("error", (error) => {
          reject(error);
        });
    });
  }

  /**
   * Save dataset metadata to database
   */
  async saveMetadata(
    moduleName: string,
    fileName: string,
    inspection: DatasetInspection,
  ): Promise<DatasetMetadata | null> {
    if (!this.dbEnabled) {
      Logger.warn("Database not available, skipping metadata save");
      return null;
    }

    try {
      // Check if dataset already exists
      const existing = await prisma.dataset.findUnique({
        where: {
          moduleName_fileName: {
            moduleName,
            fileName,
          },
        },
      });

      let dataset;

      if (existing) {
        // Update existing
        dataset = await prisma.dataset.update({
          where: { id: existing.id },
          data: {
            filePath: inspection.filePath,
            filePathRelative: inspection.filePathRelative,
            fileSizeBytes: BigInt(inspection.fileSizeBytes),
            checksumSha256: inspection.checksumSha256,
            delimiter: inspection.delimiter,
            loadedRows: inspection.rowCount,
            skippedRows: 0,
            lastLoadedAt: new Date(),
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new
        dataset = await prisma.dataset.create({
          data: {
            name: fileName,
            moduleName,
            fileName,
            filePath: inspection.filePath,
            filePathRelative: inspection.filePathRelative,
            fileSizeBytes: BigInt(inspection.fileSizeBytes),
            checksumSha256: inspection.checksumSha256,
            delimiter: inspection.delimiter,
            loadedRows: inspection.rowCount,
            skippedRows: 0,
            isActive: false,
            lastLoadedAt: new Date(),
          },
        });
      }

      Logger.info(
        `Saved dataset metadata: ${moduleName}/${fileName} (${inspection.rowCount} rows)`,
      );

      return dataset as DatasetMetadata;
    } catch (error: any) {
      Logger.error(`Failed to save dataset metadata: ${error.message}`);
      return null;
    }
  }

  /**
   * Set active dataset for module
   */
  async setActiveDataset(
    moduleName: string,
    fileName: string,
  ): Promise<boolean> {
    if (!this.dbEnabled) {
      Logger.warn("Database not available, skipping set active");
      return false;
    }

    try {
      // Deactivate all datasets for this module
      await prisma.dataset.updateMany({
        where: { moduleName },
        data: { isActive: false },
      });

      // Activate the specified dataset
      await prisma.dataset.update({
        where: {
          moduleName_fileName: {
            moduleName,
            fileName,
          },
        },
        data: { isActive: true },
      });

      Logger.info(`Set active dataset: ${moduleName}/${fileName}`);
      return true;
    } catch (error: any) {
      Logger.error(`Failed to set active dataset: ${error.message}`);
      return false;
    }
  }

  /**
   * Get active dataset for module
   */
  async getActiveDataset(moduleName: string): Promise<DatasetMetadata | null> {
    if (!this.dbEnabled) return null;

    try {
      const dataset = await prisma.dataset.findFirst({
        where: {
          moduleName,
          isActive: true,
        },
      });

      return dataset as DatasetMetadata | null;
    } catch (error: any) {
      Logger.error(`Failed to get active dataset: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all datasets for module
   */
  async getDatasets(moduleName: string): Promise<DatasetMetadata[]> {
    if (!this.dbEnabled) return [];

    try {
      const datasets = await prisma.dataset.findMany({
        where: { moduleName },
        orderBy: { createdAt: "desc" },
      });

      return datasets as DatasetMetadata[];
    } catch (error: any) {
      Logger.error(`Failed to get datasets: ${error.message}`);
      return [];
    }
  }

  /**
   * Delete dataset
   */
  async deleteDataset(moduleName: string, fileName: string): Promise<boolean> {
    if (!this.dbEnabled) return false;

    try {
      await prisma.dataset.delete({
        where: {
          moduleName_fileName: {
            moduleName,
            fileName,
          },
        },
      });

      Logger.info(`Deleted dataset: ${moduleName}/${fileName}`);
      return true;
    } catch (error: any) {
      Logger.error(`Failed to delete dataset: ${error.message}`);
      return false;
    }
  }

  /**
   * Clear all datasets for module
   */
  async clearModule(moduleName: string): Promise<boolean> {
    if (!this.dbEnabled) return false;

    try {
      await prisma.dataset.deleteMany({
        where: { moduleName },
      });

      Logger.info(`Cleared all datasets for module: ${moduleName}`);
      return true;
    } catch (error: any) {
      Logger.error(`Failed to clear module datasets: ${error.message}`);
      return false;
    }
  }
}

// Singleton instance
export const datasetStore = new DatasetStore();
