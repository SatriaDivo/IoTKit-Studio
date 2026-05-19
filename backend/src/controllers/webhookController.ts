import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import { randomUUID } from "crypto";
import { io } from "../index";
import { Logger } from "../utils/logger";
import { AlertEngine } from "../services/alertEngine";

const prisma = new PrismaClient();

export class WebhookController {
  // Generate or retrieve webhook token for a project (auth required)
  async generate(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;

      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: req.user!.userId },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Generate a new token if none exists
      const token = project.webhookToken || randomUUID();

      const updated = await prisma.project.update({
        where: { id: projectId },
        data: { webhookToken: token, webhookEnabled: true },
      });

      const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`;
      const webhookUrl = `${baseUrl}/api/webhook/${token}`;

      res.json({
        token,
        webhookUrl,
        webhookEnabled: updated.webhookEnabled,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Disable and clear webhook token (auth required)
  async clear(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;

      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: req.user!.userId },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      await prisma.project.update({
        where: { id: projectId },
        data: { webhookToken: null, webhookEnabled: false },
      });

      res.json({ message: "Webhook disabled successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get webhook request history for a project (auth required)
  async getHistory(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const { limit = "50" } = req.query;

      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: req.user!.userId },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const logs = await prisma.log.findMany({
        where: { projectId, type: "webhook" },
        orderBy: { timestamp: "desc" },
        take: parseInt(limit as string),
      });

      res.json({ token: project.webhookToken, webhookEnabled: project.webhookEnabled, logs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // PUBLIC endpoint — receives external webhook data (no auth)
  async receive(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const body = req.body;
      const method = req.method;
      const contentType = req.headers["content-type"] || "unknown";
      const ip = req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "unknown";

      // Find project by token
      const project = await prisma.project.findUnique({
        where: { webhookToken: token },
      });

      if (!project || !project.webhookEnabled) {
        return res.status(404).json({ error: "Webhook endpoint not found or disabled" });
      }

      const payloadStr = JSON.stringify(body);
      const byteSize = Buffer.byteLength(payloadStr, "utf8");

      // Save to Log
      const log = await prisma.log.create({
        data: {
          type: "webhook",
          protocol: "HTTP",
          message: `Incoming webhook from ${ip} [${method}] ${byteSize}B`,
          payload: payloadStr,
          statusCode: 200,
          latency: 0,
          projectId: project.id,
        },
      });

      // Evaluate alert rules for incoming webhook payload
      await AlertEngine.evaluatePayloadRules(project.id, body);

      // Emit real-time event to dashboard
      io.to(`project:${project.id}`).emit("webhookReceived", {
        projectId: project.id,
        log: {
          ...log,
          parsedPayload: body,
        },
      });

      // Also emit to a webhook-specific room
      io.to(`webhook:${token}`).emit("webhookReceived", {
        projectId: project.id,
        log: {
          ...log,
          parsedPayload: body,
        },
      });

      Logger.info(`Webhook received for project ${project.id} from ${ip}`);
      res.status(200).json({ received: true, timestamp: log.timestamp });
    } catch (error: any) {
      Logger.error("Webhook receive error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get webhook info for a project (auth required)
  async getInfo(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;

      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: req.user!.userId },
        select: { webhookToken: true, webhookEnabled: true, name: true, id: true },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`;
      const webhookUrl = project.webhookToken ? `${baseUrl}/api/webhook/${project.webhookToken}` : null;

      res.json({ ...project, webhookUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
