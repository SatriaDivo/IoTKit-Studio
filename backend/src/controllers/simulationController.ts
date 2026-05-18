import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import { SimulationManager } from "../simulation/simulationManager";
import { io } from "../index";

const prisma = new PrismaClient();
const simulationManager = new SimulationManager();

// Listen to simulation events and emit to clients
simulationManager.on("payloadSent", (data) => {
  io.to(`project:${data.projectId}`).emit("payloadSent", data);
});

simulationManager.on("payloadError", (data) => {
  io.to(`project:${data.projectId}`).emit("payloadError", data);
});

export class SimulationController {
  async start(req: AuthRequest, res: Response) {
    try {
      const { projectId, payloadStructure, interval, batchSize, swarmMode, swarmCount, stages, chaosMode, chaosProbability, chaosFields } = req.body;

      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: req.user!.userId,
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (simulationManager.isRunning(projectId)) {
        return res.status(400).json({ error: "Simulation already running" });
      }

      await simulationManager.startSimulation(
        {
          projectId,
          payloadStructure,
          interval: interval || 1000,
          batchSize: batchSize || 1,
          swarmMode: !!swarmMode,
          swarmCount: Number(swarmCount) || 1,
          stages: stages || [],
          chaosMode: !!chaosMode,
          chaosProbability: Number(chaosProbability) || 5,
          chaosFields: chaosFields || [],
        },
        project,
      );

      // Update project status to active
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "active" },
      });

      await prisma.simulation.create({
        data: {
          projectId,
          status: "running",
          interval: interval || 1000,
          batchSize: batchSize || 1,
          swarmMode: !!swarmMode,
          swarmCount: Number(swarmCount) || 1,
          stages: stages ? JSON.stringify(stages) : null,
          payloadOptions: JSON.stringify({ chaosMode: !!chaosMode, chaosProbability: Number(chaosProbability) || 5, chaosFields: chaosFields || [] }),
          startedAt: new Date(),
        },
      });

      res.json({ message: "Simulation started successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async stop(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.body;

      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: req.user!.userId,
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      simulationManager.stopSimulation(projectId);

      // Update project status to inactive
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "inactive" },
      });

      const simulation = await prisma.simulation.findFirst({
        where: {
          projectId,
          status: "running",
        },
        orderBy: { createdAt: "desc" },
      });

      if (simulation) {
        const stats = simulationManager.getStats(projectId);

        await prisma.simulation.update({
          where: { id: simulation.id },
          data: {
            status: "stopped",
            stoppedAt: new Date(),
            ...(stats && {
              totalSent: stats.totalSent,
              successCount: stats.successCount,
              errorCount: stats.errorCount,
            }),
          },
        });
      }

      res.json({ message: "Simulation stopped successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getStatus(req: AuthRequest, res: Response) {
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

      const isRunning = simulationManager.isRunning(projectId);
      const stats = simulationManager.getStats(projectId);

      res.json({
        isRunning,
        stats: stats || null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getStats(req: AuthRequest, res: Response) {
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

      const simulations = await prisma.simulation.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      res.json(simulations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
