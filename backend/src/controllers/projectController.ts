import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import { HttpClient } from "../protocols/http/httpClient";
import { MqttClient } from "../protocols/mqtt/mqttClient";
import { WsClient } from "../protocols/websocket/wsClient";

const prisma = new PrismaClient();

export class ProjectController {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const projects = await prisma.project.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: "desc" },
      });

      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const project = await prisma.project.findFirst({
        where: {
          id,
          userId: req.user!.userId,
        },
        include: {
          payloads: true,
          simulations: true,
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const projectData = req.body;

      const project = await prisma.project.create({
        data: {
          ...projectData,
          userId: req.user!.userId,
        },
      });

      res.status(201).json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const projectData = req.body;

      const project = await prisma.project.findFirst({
        where: {
          id,
          userId: req.user!.userId,
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const updated = await prisma.project.update({
        where: { id },
        data: projectData,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const project = await prisma.project.findFirst({
        where: {
          id,
          userId: req.user!.userId,
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      await prisma.project.delete({ where: { id } });

      res.json({ message: "Project deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async testConnection(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const project = await prisma.project.findFirst({
        where: {
          id,
          userId: req.user!.userId,
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      let connected = false;
      let error = null;

      try {
        const protocol = project.protocol.toUpperCase();

        if (protocol === "HTTP" || protocol === "HTTPS") {
          const client = new HttpClient(project as any);
          connected = await client.testConnection();
        } else if (protocol === "MQTT" || protocol === "MQTTS") {
          const client = new MqttClient(project as any);
          await client.connect();
          connected = client.isConnected();
          client.disconnect();
        } else if (protocol === "WS" || protocol === "WSS") {
          const client = new WsClient(project as any);
          await client.connect();
          connected = client.isConnected();
          client.disconnect();
        }
      } catch (err: any) {
        error = err.message;
      }

      res.json({ connected, error });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
