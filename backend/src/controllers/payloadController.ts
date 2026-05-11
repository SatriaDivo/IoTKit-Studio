import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import { PayloadGenerator } from "../utils/payloadGenerator";

const prisma = new PrismaClient();

export class PayloadController {
  async getByProject(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;

      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: req.user!.userId,
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const payloads = await prisma.payload.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      });

      res.json(payloads);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const payload = await prisma.payload.findUnique({
        where: { id },
        include: { project: true },
      });

      if (!payload) {
        return res.status(404).json({ error: "Payload not found" });
      }

      if (payload.project.userId !== req.user!.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      res.json(payload);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const { name, structure, template, projectId } = req.body;

      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: req.user!.userId,
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const payload = await prisma.payload.create({
        data: {
          name,
          structure: JSON.stringify(structure),
          template: template || false,
          projectId,
        },
      });

      res.status(201).json(payload);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, structure, template } = req.body;

      const payload = await prisma.payload.findUnique({
        where: { id },
        include: { project: true },
      });

      if (!payload) {
        return res.status(404).json({ error: "Payload not found" });
      }

      if (payload.project.userId !== req.user!.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const updated = await prisma.payload.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(structure && { structure: JSON.stringify(structure) }),
          ...(template !== undefined && { template }),
        },
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const payload = await prisma.payload.findUnique({
        where: { id },
        include: { project: true },
      });

      if (!payload) {
        return res.status(404).json({ error: "Payload not found" });
      }

      if (payload.project.userId !== req.user!.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await prisma.payload.delete({ where: { id } });

      res.json({ message: "Payload deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async generatePayload(req: AuthRequest, res: Response) {
    try {
      const { structure } = req.body;

      const generator = new PayloadGenerator();
      const payload = generator.generatePayload(structure);

      res.json({ payload });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
