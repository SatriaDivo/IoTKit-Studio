import mqtt, { MqttClient as MQTTClientType } from "mqtt";
import { Project } from "../../types";
import { Logger } from "../../utils/logger";
import { EventEmitter } from "events";
import { headerInjectionService } from "../../services/headerInjectionService";

export class MqttClient extends EventEmitter {
  private client: MQTTClientType | null = null;
  private project: Project;
  private connected: boolean = false;

  constructor(project: Project) {
    super();
    this.project = project;
  }

  async connect(): Promise<void> {
    const dynamicHeaders = await headerInjectionService.getHeadersForProject(this.project.id);

    return new Promise((resolve, reject) => {
      const protocol = this.project.protocol.toLowerCase();
      const url = `${protocol}://${this.project.host}:${this.project.port || 1883}`;

      const options: mqtt.IClientOptions = {
        clientId: `iotkit_${Math.random().toString(16).substring(2, 8)}`,
        clean: true,
        reconnectPeriod: this.project.autoReconnect ? 1000 : 0,
        ...(this.project.username && { username: this.project.username }),
        ...(this.project.password && { password: this.project.password }),
      };

      if (protocol === "ws" || protocol === "wss") {
        const customHeaders: Record<string, string> = {};
        
        if (Object.keys(dynamicHeaders).length > 0) {
          Object.assign(customHeaders, dynamicHeaders);
        } else {
          if (this.project.authToken) {
            customHeaders["Authorization"] = `Bearer ${this.project.authToken}`;
          }
          
          if (this.project.headers) {
            try {
              const parsedHeaders = JSON.parse(this.project.headers);
              if (Array.isArray(parsedHeaders)) {
                parsedHeaders.forEach((h: { key: string; value: string }) => {
                  if (h.key && h.value) {
                    customHeaders[h.key] = h.value;
                  }
                });
              }
            } catch (e) {
              Logger.error("Failed to parse project headers", e);
            }
          }
        }
        
        if (Object.keys(customHeaders).length > 0) {
          options.wsOptions = {
            headers: customHeaders
          };
        }
      }

      this.client = mqtt.connect(url, options);

      this.client.on("connect", () => {
        this.connected = true;
        Logger.info(`MQTT connected to ${url}`);
        this.emit("connected");
        resolve();
      });

      this.client.on("error", (error) => {
        Logger.error("MQTT error:", error);
        this.emit("error", error);
        reject(error);
      });

      this.client.on("close", () => {
        this.connected = false;
        Logger.info("MQTT connection closed");
        this.emit("disconnected");
      });

      this.client.on("message", (topic, message) => {
        this.emit("message", { topic, message: message.toString() });
      });
    });
  }

  async publish(payload: any): Promise<any> {
    const startTime = Date.now();

    if (!this.client || !this.connected) {
      return {
        success: false,
        error: "MQTT client not connected",
        latency: 0,
      };
    }

    return new Promise((resolve) => {
      const topic = this.project.topic || "iotkit/default";
      const message = JSON.stringify(payload);

      this.client!.publish(topic, message, { qos: 1 }, (error) => {
        const latency = Date.now() - startTime;

        if (error) {
          Logger.error("MQTT publish error:", error);
          resolve({
            success: false,
            error: error.message,
            latency,
          });
        } else {
          Logger.info(`MQTT published to ${topic}`);
          resolve({
            success: true,
            topic,
            latency,
          });
        }
      });
    });
  }

  async subscribe(topic?: string): Promise<void> {
    if (!this.client || !this.connected) {
      throw new Error("MQTT client not connected");
    }

    const subscribeTopic = topic || this.project.topic || "iotkit/#";

    return new Promise((resolve, reject) => {
      this.client!.subscribe(subscribeTopic, { qos: 1 }, (error) => {
        if (error) {
          Logger.error("MQTT subscribe error:", error);
          reject(error);
        } else {
          Logger.info(`MQTT subscribed to ${subscribeTopic}`);
          resolve();
        }
      });
    });
  }

  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
