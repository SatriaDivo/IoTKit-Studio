import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";

const prisma = new PrismaClient();

export class AlertController {
  async getRulesByProject(req: AuthRequest, res: Response) {
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

      const rules = await prisma.alertRule.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      });

      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async createRule(req: AuthRequest, res: Response) {
    try {
      const { name, projectId, field, operator, value, severity } = req.body;

      if (!name || !projectId || !field || !operator || !value) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: req.user!.userId,
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const rule = await prisma.alertRule.create({
        data: {
          name,
          projectId,
          field,
          operator,
          value,
          severity: severity || "warning",
          isActive: true,
        },
      });

      res.status(201).json(rule);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateRule(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, field, operator, value, severity, isActive } = req.body;

      const rule = await prisma.alertRule.findUnique({
        where: { id },
        include: { project: true },
      });

      if (!rule) {
        return res.status(404).json({ error: "Alert rule not found" });
      }

      if (rule.project.userId !== req.user!.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const updatedRule = await prisma.alertRule.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(field !== undefined && { field }),
          ...(operator !== undefined && { operator }),
          ...(value !== undefined && { value }),
          ...(severity !== undefined && { severity }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      res.json(updatedRule);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async deleteRule(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const rule = await prisma.alertRule.findUnique({
        where: { id },
        include: { project: true },
      });

      if (!rule) {
        return res.status(404).json({ error: "Alert rule not found" });
      }

      if (rule.project.userId !== req.user!.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await prisma.alertRule.delete({ where: { id } });

      res.json({ message: "Alert rule deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getHistoryByProject(req: AuthRequest, res: Response) {
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

      const history = await prisma.alertLog.findMany({
        where: { projectId },
        orderBy: { timestamp: "desc" },
      });

      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async clearHistoryByProject(req: AuthRequest, res: Response) {
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

      await prisma.alertLog.deleteMany({
        where: { projectId },
      });

      res.json({ message: "Alert history cleared successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
