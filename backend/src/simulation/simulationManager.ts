import { EventEmitter } from "events";
import { SimulationConfig, PayloadField } from "../types";
import { PayloadGenerator } from "../utils/payloadGenerator";
import { HttpClient } from "../protocols/http/httpClient";
import { MqttClient } from "../protocols/mqtt/mqttClient";
import { WsClient } from "../protocols/websocket/wsClient";
import { Logger } from "../utils/logger";

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

    // Start simulation loop
    const timer = setInterval(async () => {
      await this.sendBatch(
        projectId,
        payloadStructure,
        batchSize,
        client,
        generator,
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
