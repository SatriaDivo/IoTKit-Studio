import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";

const prisma = new PrismaClient();

export class LogController {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { type, limit = 100, projectId } = req.query;

      // Get all projects belonging to this user
      const userProjects = await prisma.project.findMany({
        where: { userId: req.user!.userId },
        select: { id: true },
      });

      const projectIds = userProjects.map((p) => p.id);

      const logs = await prisma.log.findMany({
        where: {
          projectId: { in: projectIds },
          ...(type && { type: type as string }),
          ...(projectId && { projectId: projectId as string }),
        },
        orderBy: { timestamp: "desc" },
        take: parseInt(limit as string),
        include: {
          project: { select: { name: true, protocol: true } },
        },
      });

      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getByProject(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const { type, limit = 100 } = req.query;

      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: req.user!.userId,
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const logs = await prisma.log.findMany({
        where: {
          projectId,
          ...(type && { type: type as string }),
        },
        orderBy: { timestamp: "desc" },
        take: parseInt(limit as string),
      });

      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const log = await prisma.log.findUnique({
        where: { id },
        include: { project: true },
      });

      if (!log) {
        return res.status(404).json({ error: "Log not found" });
      }

      if (log.project.userId !== req.user!.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      res.json(log);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const log = await prisma.log.findUnique({
        where: { id },
        include: { project: true },
      });

      if (!log) {
        return res.status(404).json({ error: "Log not found" });
      }

      if (log.project.userId !== req.user!.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await prisma.log.delete({ where: { id } });

      res.json({ message: "Log deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async clearByProject(req: AuthRequest, res: Response) {
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

      await prisma.log.deleteMany({
        where: { projectId },
      });

      res.json({ message: "Logs cleared successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
