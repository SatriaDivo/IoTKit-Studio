import { EventEmitter } from "events";
import { SimulationConfig, PayloadField, SimulationStats, LoadTestStage } from "../types";
import { PayloadGenerator } from "../utils/payloadGenerator";
import { HttpClient } from "../protocols/http/httpClient";
import { MqttClient } from "../protocols/mqtt/mqttClient";
import { WsClient } from "../protocols/websocket/wsClient";
import { Logger } from "../utils/logger";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import csvParser from "csv-parser";

const prisma = new PrismaClient();

class VirtualUser {
  public active = false;
  
  constructor(
    public id: number,
    private projectId: string,
    private config: SimulationConfig,
    private project: any,
    private client: any,
    private generator: PayloadGenerator,
    private datasetState: any,
    private manager: SimulationManager
  ) {}

  async start() {
    this.active = true;
    while(this.active) {
      const startTime = performance.now();
      
      // Execute 1 iteration (1 payload generation + send)
      await this.manager.executeVU(this.id, this.projectId, this.config, this.project, this.client, this.generator, this.datasetState);
      
      const executionTime = performance.now() - startTime;
      
      // Sleep for interval, minus execution time if possible to maintain RPS
      if (this.active) {
        const sleepTime = Math.max(0, this.config.interval - executionTime);
        await new Promise(r => setTimeout(r, sleepTime || this.config.interval));
      }
    }
  }

  stop() {
    this.active = false;
  }
}

interface SimulationJob {
  config: SimulationConfig;
  project: any;
  vus: VirtualUser[];
  stageTimer?: NodeJS.Timeout;
  rpsTimer?: NodeJS.Timeout;
  startTime: number;
  stageIndex: number;
  stageStartTime: number;
  client: any;
  generator: PayloadGenerator;
  datasetState: any;
  requestsThisSecond: number;
}

export class SimulationManager extends EventEmitter {
  private jobs: Map<string, SimulationJob> = new Map();
  private stats: Map<string, SimulationStats> = new Map();
  private latencyBuffers: Map<string, number[]> = new Map();

  async startSimulation(config: SimulationConfig, project: any): Promise<void> {
    const { projectId } = config;

    if (this.jobs.has(projectId)) {
      throw new Error("Simulation already running for this project");
    }

    const generator = new PayloadGenerator(config.chaosMode, config.chaosProbability, config.chaosFields);
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

    let datasetState = undefined;
    const datasetModeField = config.payloadStructure?.find(f => f.name === "__dataset_mode__");
    
    if (datasetModeField) {
      const datasetId = datasetModeField.value;
      const dataset = await prisma.dataset.findUnique({ where: { id: datasetId } });
      
      if (!dataset || !fs.existsSync(dataset.filePath)) {
        throw new Error("Dataset not found or file missing");
      }

      let rows: any[] = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(dataset.filePath)
          .pipe(csvParser())
          .on("data", (data) => rows.push(data))
          .on("end", resolve)
          .on("error", reject);
      });

      // Filter dataset by device_id if explicitly set to Static in the configuration
      const deviceIdField = config.payloadStructure?.find(f => (f.name === 'device_id' || f.name === 'deviceId') && f.mode === 'static');
      if (deviceIdField && deviceIdField.value) {
        const filteredRows = rows.filter(r => r.device_id === deviceIdField.value || r.deviceId === deviceIdField.value);
        if (filteredRows.length > 0) {
          rows = filteredRows;
        }
      }

      datasetState = { rows, currentIndex: 0 };
    }

    this.stats.set(projectId, {
      totalSent: 0,
      successCount: 0,
      errorCount: 0,
      startTime: Date.now(),
      vus: 0,
      iterations: 0,
      http_req_duration: { avg: 0, min: 0, med: 0, max: 0, p90: 0, p95: 0 },
      http_reqs: 0,
      rps: 0,
    });
    this.latencyBuffers.set(projectId, []);

    const job: SimulationJob = {
      config,
      project,
      vus: [],
      startTime: Date.now(),
      stageIndex: 0,
      stageStartTime: Date.now(),
      client,
      generator,
      datasetState,
      requestsThisSecond: 0,
    };

    this.jobs.set(projectId, job);

    if (!config.swarmMode) {
      this.scaleVUs(projectId, 1);
    } else {
      const stages = config.stages && config.stages.length > 0 ? config.stages : [{ duration: 0, target: config.swarmCount || 1 }];
      this.runStages(projectId, stages);
    }

    // RPS Calculator
    job.rpsTimer = setInterval(() => {
      const stats = this.stats.get(projectId);
      if (stats && job) {
        stats.rps = job.requestsThisSecond;
        job.requestsThisSecond = 0;
        this.emit("statsUpdate", { projectId, stats: { ...stats } });
      }
    }, 1000);

    Logger.info(`Simulation started for project ${projectId}`);
    this.emit("simulationStarted", { projectId });
    
    await prisma.project.update({
      where: { id: projectId },
      data: { lastActivity: new Date() },
    }).catch(() => {});
  }

  private runStages(projectId: string, stages: LoadTestStage[]) {
    const job = this.jobs.get(projectId);
    if (!job) return;

    job.stageTimer = setInterval(() => {
      const now = Date.now();
      const currentStage = stages[job.stageIndex];
      
      if (!currentStage) {
        this.stopSimulation(projectId);
        return;
      }

      const elapsedInStage = (now - job.stageStartTime) / 1000;
      
      if (currentStage.duration === 0) {
        this.scaleVUs(projectId, currentStage.target);
      } else {
        const previousTarget = job.stageIndex === 0 ? 0 : stages[job.stageIndex - 1].target;
        const progress = Math.min(elapsedInStage / currentStage.duration, 1);
        const currentTarget = Math.round(previousTarget + (currentStage.target - previousTarget) * progress);
        
        this.scaleVUs(projectId, currentTarget);

        if (progress >= 1) {
          job.stageIndex++;
          job.stageStartTime = now;
        }
      }
    }, 1000);
  }

  private scaleVUs(projectId: string, targetCount: number) {
    const job = this.jobs.get(projectId);
    if (!job) return;

    if (job.vus.length < targetCount) {
      const needed = targetCount - job.vus.length;
      for (let i = 0; i < needed; i++) {
        const newVu = new VirtualUser(
          job.vus.length + 1,
          projectId,
          job.config,
          job.project,
          job.client,
          job.generator,
          job.datasetState,
          this
        );
        job.vus.push(newVu);
        newVu.start();
      }
    } else if (job.vus.length > targetCount) {
      const excess = job.vus.length - targetCount;
      const removed = job.vus.splice(targetCount, excess);
      for (const vu of removed) {
        vu.stop();
      }
    }
    
    const stats = this.stats.get(projectId);
    if (stats) {
       stats.vus = job.vus.length;
    }
  }

  public async executeVU(
    vuId: number,
    projectId: string,
    config: SimulationConfig,
    project: any,
    client: any,
    generator: PayloadGenerator,
    datasetState: any
  ): Promise<void> {
    const stats = this.stats.get(projectId);
    const job = this.jobs.get(projectId);
    if (!stats || !job) return;

    // We still support batchSize per VU
    for (let i = 0; i < config.batchSize; i++) {
      let payload: any;
      
      // Generate base payload (evaluates static, random, timestamps, etc.)
      const actualStructure = config.payloadStructure.filter(f => f.name !== '__dataset_mode__');
      let basePayload = actualStructure.length > 0 ? generator.generatePayload(actualStructure) : {};
      
      if (datasetState) {
        if (datasetState.rows.length === 0) return;
        if (datasetState.currentIndex >= datasetState.rows.length) {
          datasetState.currentIndex = 0;
        }
        const rowPayload = datasetState.rows[datasetState.currentIndex++];
        
        // Un-flatten dataset row so "location.latitude" becomes { location: { latitude: ... } }
        const unflattenedRow: any = {};
        for (const [flatKey, val] of Object.entries(rowPayload)) {
          let parsedVal: any = val;
          if (typeof val === 'string') {
            if (!isNaN(Number(val)) && val.trim() !== '') parsedVal = Number(val);
            else if (val.toLowerCase() === 'true') parsedVal = true;
            else if (val.toLowerCase() === 'false') parsedVal = false;
          }

          const keys = flatKey.split('.');
          let current = unflattenedRow;
          for (let k = 0; k < keys.length - 1; k++) {
            const key = keys[k];
            if (!current[key] || typeof current[key] !== 'object') {
              current[key] = {};
            }
            current = current[key];
          }
          current[keys[keys.length - 1]] = parsedVal;
        }
        
        // Deep merge unflattenedRow into basePayload
        const mergeDeep = (target: any, source: any) => {
          for (const key in source) {
            if (source[key] instanceof Object && !Array.isArray(source[key]) && key in target) {
              Object.assign(source[key], mergeDeep(target[key], source[key]));
            }
          }
          Object.assign(target || {}, source);
          return target;
        };
        
        payload = mergeDeep(JSON.parse(JSON.stringify(basePayload)), unflattenedRow);
      } else {
        payload = basePayload;
      }
      
      // Inject VU ID if swarmMode
      if (config.swarmMode) {
        const injectSwarmId = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          for (const key in obj) {
            if (key.toLowerCase() === 'device_id' || key.toLowerCase() === 'deviceid' || key.toLowerCase() === 'id') {
              if (typeof obj[key] === 'string') {
                obj[key] = `${obj[key]}-VU-${vuId}`;
              }
            } else if (typeof obj[key] === 'object') {
              injectSwarmId(obj[key]);
            }
          }
        };
        payload = JSON.parse(JSON.stringify(payload));
        injectSwarmId(payload);
      }

      try {
        const reqStart = performance.now();
        let result: any;

        if (client instanceof HttpClient) {
          result = await client.send(payload);
        } else if (client instanceof MqttClient) {
          result = await client.publish(payload);
        } else if (client instanceof WsClient) {
          result = await client.send(payload);
        }

        const reqEnd = performance.now();
        const latency = reqEnd - reqStart;

        stats.totalSent++;
        stats.http_reqs++;
        job.requestsThisSecond++;
        stats.iterations++;

        if (result.success) {
          stats.successCount++;
        } else {
          stats.errorCount++;
        }

        this.updateLatencyMetrics(projectId, latency);

        // Optimization: For heavy load tests, only log a sample of requests
        const isSwarm = config.swarmMode;
        const currentVUs = job.vus.length;
        const shouldLogDetails = !isSwarm || currentVUs <= 5 || (!result.success && Math.random() < 0.1);

        if (shouldLogDetails) {
          await prisma.log.create({
            data: {
              type: "request",
              protocol: project.protocol,
              message: `→ [VU-${vuId}] POST ${project.endpoint || "/"} | ${Math.round(latency)}ms | ${result.statusCode || 200}`,
              payload: JSON.stringify(payload),
              statusCode: result.statusCode || null,
              latency: Math.round(latency),
              projectId,
            },
          }).catch(() => {});
        }

        if (shouldLogDetails) {
          this.emit("payloadSent", {
            projectId,
            payload,
            result,
            stats: { ...stats },
          });
        }
      } catch (error: any) {
        stats.totalSent++;
        stats.errorCount++;
        stats.http_reqs++;

        Logger.error(`[VU-${vuId}] Simulation error for project ${projectId}:`, error);

        await prisma.log.create({
          data: {
            type: "error",
            protocol: project.protocol,
            message: error.message || "Unknown error",
            payload: JSON.stringify(payload),
            projectId,
          },
        }).catch(() => {});

        this.emit("payloadError", {
          projectId,
          payload,
          error: error.message,
          stats: { ...stats },
        });
      }
    }
  }

  private updateLatencyMetrics(projectId: string, latency: number) {
    const stats = this.stats.get(projectId);
    const buffer = this.latencyBuffers.get(projectId);
    if (!stats || !buffer) return;

    buffer.push(latency);
    // Keep max 5000 samples to prevent memory leak
    if (buffer.length > 5000) {
      // Remove random elements to downsample uniformly rather than dropping newest/oldest
      buffer.splice(Math.floor(Math.random() * buffer.length), 1);
    }

    const sorted = [...buffer].sort((a, b) => a - b);
    
    stats.http_req_duration.min = sorted[0];
    stats.http_req_duration.max = sorted[sorted.length - 1];
    stats.http_req_duration.med = sorted[Math.floor(sorted.length * 0.5)];
    stats.http_req_duration.p90 = sorted[Math.floor(sorted.length * 0.9)];
    stats.http_req_duration.p95 = sorted[Math.floor(sorted.length * 0.95)];
    
    const sum = sorted.reduce((a, b) => a + b, 0);
    stats.http_req_duration.avg = sum / sorted.length;
  }

  stopSimulation(projectId: string): void {
    const job = this.jobs.get(projectId);
    if (job) {
      if (job.stageTimer) clearInterval(job.stageTimer);
      if (job.rpsTimer) clearInterval(job.rpsTimer);
      for (const vu of job.vus) {
        vu.stop();
      }

      if (job.client && typeof job.client.disconnect === "function") {
        job.client.disconnect();
      }

      this.jobs.delete(projectId);
    }

    this.latencyBuffers.delete(projectId);

    Logger.info(`Simulation stopped for project ${projectId}`);
    this.emit("simulationStopped", { projectId });

    prisma.project.update({
      where: { id: projectId },
      data: { lastActivity: new Date() },
    }).catch(() => {});
  }

  getStats(projectId: string): SimulationStats | undefined {
    return this.stats.get(projectId);
  }

  isRunning(projectId: string): boolean {
    return this.jobs.has(projectId);
  }

  stopAll(): void {
    for (const projectId of this.jobs.keys()) {
      this.stopSimulation(projectId);
    }
  }
}
