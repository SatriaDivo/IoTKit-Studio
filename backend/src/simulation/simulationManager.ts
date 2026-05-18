import { EventEmitter } from "events";
import { SimulationConfig, PayloadField } from "../types";
import { PayloadGenerator } from "../utils/payloadGenerator";
import { HttpClient } from "../protocols/http/httpClient";
import { MqttClient } from "../protocols/mqtt/mqttClient";
import { WsClient } from "../protocols/websocket/wsClient";
import { Logger } from "../utils/logger";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class SimulationManager extends EventEmitter {
  private simulations: Map<string, NodeJS.Timeout> = new Map();
  private generators: Map<string, PayloadGenerator> = new Map();
  private clients: Map<string, any> = new Map();
  private stats: Map<string, SimulationStats> = new Map();

  async startSimulation(config: SimulationConfig, project: any): Promise<void> {
    const { projectId, payloadStructure, interval, batchSize } = config;

    if (this.simulations.has(projectId)) {
      throw new Error("Simulation already running for this project");
    }

    // Initialize payload generator
    const generator = new PayloadGenerator();
    this.generators.set(projectId, generator);

    // Initialize protocol client
    let client: any;
    const protocol = project.protocol.toUpperCase();

    if (protocol === "HTTP" || protocol === "HTTPS") {
      client = new HttpClient(project);
    } else if (protocol === "MQTT" || protocol === "MQTTS") {
      client = new MqttClient(project);
      await client.connect();
    } else if (protocol === "WS" || protocol === "WSS") {
      client = new WsClient(project);
      await client.connect();
    }

    this.clients.set(projectId, client);

    // Initialize stats
    this.stats.set(projectId, {
      totalSent: 0,
      successCount: 0,
      errorCount: 0,
      startTime: Date.now(),
    });

    // Update Project lastActivity
    await prisma.project.update({
      where: { id: projectId },
      data: { lastActivity: new Date() },
    }).catch(() => {});

    // Start simulation loop
    const timer = setInterval(async () => {
      await this.sendBatch(
        projectId,
        payloadStructure,
        batchSize,
        client,
        generator,
        project,
      );
    }, interval);

    this.simulations.set(projectId, timer);

    Logger.info(`Simulation started for project ${projectId}`);
    this.emit("simulationStarted", { projectId });
  }

  private async sendBatch(
    projectId: string,
    payloadStructure: PayloadField[],
    batchSize: number,
    client: any,
    generator: PayloadGenerator,
    project: any,
  ): Promise<void> {
    const stats = this.stats.get(projectId)!;

    for (let i = 0; i < batchSize; i++) {
      const payload = generator.generatePayload(payloadStructure);

      try {
        let result: any;

        if (client instanceof HttpClient) {
          result = await client.send(payload);
        } else if (client instanceof MqttClient) {
          result = await client.publish(payload);
        } else if (client instanceof WsClient) {
          result = await client.send(payload);
        }

        stats.totalSent++;

        if (result.success) {
          stats.successCount++;
        } else {
          stats.errorCount++;
        }

        // Save log to database - request
        await prisma.log.create({
          data: {
            type: "request",
            protocol: project.protocol,
            message: `→ POST ${project.endpoint || "/"} | ${result.latency}ms | ${result.statusCode}`,
            payload: JSON.stringify(payload),
            statusCode: result.statusCode || null,
            latency: result.latency || null,
            projectId,
          },
        });

        // For HTTP: also save the server response as a separate log entry
        if (
          (project.protocol === "HTTP" || project.protocol === "HTTPS") &&
          result.data !== undefined
        ) {
          await prisma.log.create({
            data: {
              type: result.success ? "response" : "error",
              protocol: project.protocol,
              message: result.success
                ? `← ${result.statusCode} OK`
                : `← ${result.statusCode} Error`,
              payload: JSON.stringify(result.data),
              statusCode: result.statusCode || null,
              latency: result.latency || null,
              projectId,
            },
          });
        }

        this.emit("payloadSent", {
          projectId,
          payload,
          result,
          stats: { ...stats },
        });
      } catch (error: any) {
        stats.totalSent++;
        stats.errorCount++;

        Logger.error(`Simulation error for project ${projectId}:`, error);

        // Save error log to database
        await prisma.log
          .create({
            data: {
              type: "error",
              protocol: project.protocol,
              message: error.message || "Unknown error",
              payload: JSON.stringify(payload),
              projectId,
            },
          })
          .catch(() => {}); // Don't throw if log save fails

        this.emit("payloadError", {
          projectId,
          payload,
          error: error.message,
          stats: { ...stats },
        });
      }
    }
  }

  stopSimulation(projectId: string): void {
    const timer = this.simulations.get(projectId);

    if (timer) {
      clearInterval(timer);
      this.simulations.delete(projectId);
    }

    const client = this.clients.get(projectId);
    if (client) {
      if (typeof client.disconnect === "function") {
        client.disconnect();
      }
      this.clients.delete(projectId);
    }

    this.generators.delete(projectId);

    Logger.info(`Simulation stopped for project ${projectId}`);
    this.emit("simulationStopped", { projectId });

    // Update Project lastActivity on stop
    prisma.project.update({
      where: { id: projectId },
      data: { lastActivity: new Date() },
    }).catch(() => {});
  }

  getStats(projectId: string): SimulationStats | undefined {
    return this.stats.get(projectId);
  }

  isRunning(projectId: string): boolean {
    return this.simulations.has(projectId);
  }

  stopAll(): void {
    for (const projectId of this.simulations.keys()) {
      this.stopSimulation(projectId);
    }
  }
}

interface SimulationStats {
  totalSent: number;
  successCount: number;
  errorCount: number;
  startTime: number;
}
