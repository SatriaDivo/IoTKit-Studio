import WebSocket from "ws";
import { Project } from "../../types";
import { Logger } from "../../utils/logger";
import { EventEmitter } from "events";
import { headerInjectionService } from "../../services/headerInjectionService";

export class WsClient extends EventEmitter {
  private client: WebSocket | null = null;
  private project: Project;
  private connected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(project: Project) {
    super();
    this.project = project;
  }

  async connect(): Promise<void> {
    const dynamicHeaders = await headerInjectionService.getHeadersForProject(this.project.id);

    return new Promise((resolve, reject) => {
      const protocol = this.project.protocol.toLowerCase();
      const url = `${protocol}://${this.project.host}:${this.project.port || 80}${
        this.project.endpoint || ""
      }`;

      const options: any = { headers: {} };

      if (Object.keys(dynamicHeaders).length > 0) {
        Object.assign(options.headers, dynamicHeaders);
      } else {
        if (this.project.authToken) {
          options.headers.Authorization = `Bearer ${this.project.authToken}`;
        }

        if (this.project.headers) {
          try {
            const parsedHeaders = JSON.parse(this.project.headers);
            if (Array.isArray(parsedHeaders)) {
              parsedHeaders.forEach((h: { key: string; value: string }) => {
                if (h.key && h.value) {
                  options.headers[h.key] = h.value;
                }
              });
            }
          } catch (e) {
            Logger.error("Failed to parse project headers", e);
          }
        }
      }

      this.client = new WebSocket(url, options);

      this.client.on("open", () => {
        this.connected = true;
        Logger.info(`WebSocket connected to ${url}`);
        this.emit("connected");
        resolve();
      });

      this.client.on("error", (error) => {
        Logger.error("WebSocket error:", error);
        this.emit("error", error);
        reject(error);
      });

      this.client.on("close", () => {
        this.connected = false;
        Logger.info("WebSocket connection closed");
        this.emit("disconnected");

        if (this.project.autoReconnect) {
          this.scheduleReconnect();
        }
      });

      this.client.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.emit("message", message);
        } catch (error) {
          this.emit("message", data.toString());
        }
      });
    });
  }

  async send(payload: any): Promise<any> {
    const startTime = Date.now();

    if (!this.client || !this.connected) {
      return {
        success: false,
        error: "WebSocket not connected",
        latency: 0,
      };
    }

    return new Promise((resolve) => {
      const message = JSON.stringify(payload);

      this.client!.send(message, (error) => {
        const latency = Date.now() - startTime;

        if (error) {
          Logger.error("WebSocket send error:", error);
          resolve({
            success: false,
            error: error.message,
            latency,
          });
        } else {
          Logger.info("WebSocket message sent");
          resolve({
            success: true,
            latency,
          });
        }
      });
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      Logger.info("Attempting WebSocket reconnection...");
      this.connect().catch((error) => {
        Logger.error("Reconnection failed:", error);
      });
    }, 5000);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client) {
      this.client.close();
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
