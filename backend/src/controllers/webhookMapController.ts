import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class WebhookMapController {
  public static async getMapping(req: Request, res: Response): Promise<void> {
    const { projectId } = req.params;
    try {
      const mapping = await prisma.webhookMap.findUnique({
        where: { projectId },
      });
      res.json(mapping || { projectId, mappings: "[]", active: false });
    } catch (error: any) {
      console.error("[WebhookMap] Error getting mapping:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve webhook mapping" });
    }
  }

  public static async saveMapping(req: Request, res: Response): Promise<void> {
    const { projectId } = req.params;
    const { mappings, active } = req.body;
    try {
      // Validate project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      // Check mappings is valid JSON array string
      let mappingsStr = "[]";
      if (typeof mappings === "string") {
        mappingsStr = mappings;
      } else if (typeof mappings === "object") {
        mappingsStr = JSON.stringify(mappings);
      }

      // Upsert
      const savedMap = await prisma.webhookMap.upsert({
        where: { projectId },
        create: {
          projectId,
          mappings: mappingsStr,
          active: active !== undefined ? active : true,
        },
        update: {
          mappings: mappingsStr,
          active: active !== undefined ? active : true,
        },
      });

      res.json({ message: "Webhook schema mapping saved successfully", data: savedMap });
    } catch (error: any) {
      console.error("[WebhookMap] Error saving mapping:", error);
      res.status(500).json({ error: error.message || "Failed to save webhook mapping" });
    }
  }

  public static async deleteMapping(req: Request, res: Response): Promise<void> {
    const { projectId } = req.params;
    try {
      await prisma.webhookMap.delete({
        where: { projectId },
      });
      res.json({ message: "Webhook schema mapping deleted successfully" });
    } catch (error: any) {
      if (error.code === "P2025") {
        // Not found, treat as success
        res.json({ message: "No mapping existed to delete" });
        return;
      }
      console.error("[WebhookMap] Error deleting mapping:", error);
      res.status(500).json({ error: error.message || "Failed to delete webhook mapping" });
    }
  }
}
