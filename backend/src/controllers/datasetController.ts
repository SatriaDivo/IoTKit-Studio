import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// Ensure upload directory exists
const UPLOADS_DIR = path.join(process.cwd(), "uploads", "datasets");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export class DatasetController {
  async upload(req: AuthRequest, res: Response) {
    try {
      const { fileName, moduleName, content, name } = req.body;

      if (!fileName || !moduleName || !content) {
        return res.status(400).json({ error: "fileName, moduleName, and content are required" });
      }

      const finalName = name && name.trim() !== "" ? name.trim() : fileName;

      // Check if dataset with same moduleName and fileName exists
      const existing = await prisma.dataset.findUnique({
        where: {
          moduleName_fileName: {
            moduleName,
            fileName,
          },
        },
      });

      if (existing) {
        return res.status(400).json({ error: "Dataset with this name and module already exists" });
      }

      // Calculate SHA256
      const hash = crypto.createHash("sha256");
      hash.update(content);
      const checksumSha256 = hash.digest("hex");

      // Calculate stats (super basic CSV parsing for row count)
      const lines = content.split(/\r?\n/).filter((line: string) => line.trim().length > 0);
      const loadedRows = lines.length > 1 ? lines.length - 1 : 0; // subtract header

      const fileSizeBytes = Buffer.byteLength(content, "utf8");
      
      const fileId = crypto.randomUUID();
      const filePath = path.join(UPLOADS_DIR, `${fileId}.csv`);
      
      // Write file to disk
      fs.writeFileSync(filePath, content, "utf8");

      // Save to database
      const dataset = await prisma.dataset.create({
        data: {
          name: finalName,
          moduleName,
          fileName,
          filePath,
          filePathRelative: `uploads/datasets/${fileId}.csv`,
          fileSizeBytes: BigInt(fileSizeBytes),
          checksumSha256,
          delimiter: ",",
          loadedRows,
          isActive: true,
        },
      });

      res.status(201).json({
        dataset: {
          ...dataset,
          fileSizeBytes: dataset.fileSizeBytes.toString(), // Convert BigInt to string for JSON
        },
        message: "Dataset uploaded successfully",
      });
    } catch (error: any) {
      console.error("Upload Dataset Error:", error);
      res.status(500).json({ error: "Failed to upload dataset", message: error.message });
    }
  }

  async getAll(req: AuthRequest, res: Response) {
    try {
      const datasets = await prisma.dataset.findMany({
        orderBy: { createdAt: "desc" },
      });

      // Convert BigInt to string
      const serialized = datasets.map(d => ({
        ...d,
        fileSizeBytes: d.fileSizeBytes.toString()
      }));

      res.json({ datasets: serialized });
    } catch (error: any) {
      console.error("Get Datasets Error:", error);
      res.status(500).json({ error: "Failed to fetch datasets" });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const dataset = await prisma.dataset.findUnique({
        where: { id },
      });

      if (!dataset) {
        return res.status(404).json({ error: "Dataset not found" });
      }

      res.json({
        dataset: {
          ...dataset,
          fileSizeBytes: dataset.fileSizeBytes.toString()
        }
      });
    } catch (error: any) {
      console.error("Get Dataset Error:", error);
      res.status(500).json({ error: "Failed to fetch dataset" });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const dataset = await prisma.dataset.findUnique({
        where: { id },
      });

      if (!dataset) {
        return res.status(404).json({ error: "Dataset not found" });
      }

      // Delete file from disk
      if (fs.existsSync(dataset.filePath)) {
        fs.unlinkSync(dataset.filePath);
      }

      // Delete from database
      await prisma.dataset.delete({
        where: { id },
      });

      res.json({ message: "Dataset deleted successfully" });
    } catch (error: any) {
      console.error("Delete Dataset Error:", error);
      res.status(500).json({ error: "Failed to delete dataset" });
    }
  }

  async updateName(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Name is required" });
      }

      const dataset = await prisma.dataset.findUnique({
        where: { id },
      });

      if (!dataset) {
        return res.status(404).json({ error: "Dataset not found" });
      }

      const updated = await prisma.dataset.update({
        where: { id },
        data: { name: name.trim() },
      });

      res.json({
        dataset: {
          ...updated,
          fileSizeBytes: updated.fileSizeBytes.toString()
        },
        message: "Dataset renamed successfully"
      });
    } catch (error: any) {
      console.error("Rename Dataset Error:", error);
      res.status(500).json({ error: "Failed to rename dataset" });
    }
  }
}
