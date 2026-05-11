/**
 * TransportRouter - Protocol routing for HTTP/MQTT/WebSocket
 * Inspired by Hybrid Emulator's transport_router
 */

import axios from "axios";
import mqtt from "mqtt";
import WebSocket from "ws";
import { Logger } from "../utils/logger";
import { retryManager } from "./retryManager";

export class UnsupportedProtocolError extends Error {
  constructor(protocol: string) {
    super(`Unsupported protocol: ${protocol}`);
    this.name = "UnsupportedProtocolError";
  }
}

export interface SendResult {
  success: boolean;
  statusCode?: number;
  response?: any;
  error?: string;
  latency?: number;
}

export class TransportRouter {
  /**
   * Send payload to endpoint with automatic protocol detection
   */
  async send(endpoint: string, payload: any): Promise<SendResult> {
    const url = new URL(endpoint);
    const protocol = url.protocol.replace(":", "");

    Logger.info(`Sending to ${protocol}://${url.host}${url.pathname}`);

    switch (protocol) {
      case "http":
      case "https":
        return await this.sendHttp(endpoint, payload);

      case "mqtt":
      case "mqtts":
        return await this.sendMqtt(endpoint, payload);

      case "ws":
      case "wss":
        return await this.sendWebSocket(endpoint, payload);

      default:
        throw new UnsupportedProtocolError(protocol);
    }
  }

  /**
   * Send via HTTP/HTTPS with retry
   */
  private async sendHttp(endpoint: string, payload: any): Promise<SendResult> {
    const startTime = Date.now();

    try {
      const result = await retryManager.execute(async () => {
        const response = await axios.post(endpoint, payload, {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: parseInt(process.env.REQUEST_TIMEOUT_SECONDS || "10") * 1000,
        });

        return response;
      });

      const latency = Date.now() - startTime;

      return {
        success: true,
        statusCode: result.status,
        response: result.data,
        latency,
      };
    } catch (error: any) {
      const latency = Date.now() - startTime;

      Logger.error(`HTTP send failed:`, error.message);

      return {
        success: false,
        statusCode: error.response?.status,
        response: error.response?.data,
        error: error.message,
        latency,
      };
    }
  }

  /**
   * Send via MQTT/MQTTS with retry
   */
  private async sendMqtt(endpoint: string, payload: any): Promise<SendResult> {
    const startTime = Date.now();

    try {
      const url = new URL(endpoint);
      const topic = url.pathname.substring(1); // Remove leading /

      if (!topic) {
        throw new Error("MQTT topic is required in path");
      }

      const result = await retryManager.execute(async () => {
        return await this.publishMqtt(url, topic, payload);
      });

      const latency = Date.now() - startTime;

      return {
        success: true,
        response: result,
        latency,
      };
    } catch (error: any) {
      const latency = Date.now() - startTime;

      Logger.error(`MQTT send failed:`, error.message);

      return {
        success: false,
        error: error.message,
        latency,
      };
    }
  }

  /**
   * Publish to MQTT broker
   */
  private publishMqtt(url: URL, topic: string, payload: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const options: mqtt.IClientOptions = {
        protocol: url.protocol.replace(":", "") as any,
        host: url.hostname,
        port: parseInt(url.port) || (url.protocol === "mqtts:" ? 8883 : 1883),
        username: url.username || undefined,
        password: url.password || undefined,
        connectTimeout: 5000,
      };

      const client = mqtt.connect(options);

      const timeout = setTimeout(() => {
        client.end(true);
        reject(new Error("MQTT connection timeout"));
      }, 10000);

      client.on("connect", () => {
        clearTimeout(timeout);

        const message = JSON.stringify(payload);

        client.publish(topic, message, { qos: 1 }, (error) => {
          client.end();

          if (error) {
            reject(error);
          } else {
            resolve(`Published to ${topic}`);
          }
        });
      });

      client.on("error", (error) => {
        clearTimeout(timeout);
        client.end(true);
        reject(error);
      });
    });
  }

  /**
   * Send via WebSocket with retry
   */
  private async sendWebSocket(
    endpoint: string,
    payload: any,
  ): Promise<SendResult> {
    const startTime = Date.now();

    try {
      const result = await retryManager.execute(async () => {
        return await this.publishWebSocket(endpoint, payload);
      });

      const latency = Date.now() - startTime;

      return {
        success: true,
        response: result,
        latency,
      };
    } catch (error: any) {
      const latency = Date.now() - startTime;

      Logger.error(`WebSocket send failed:`, error.message);

      return {
        success: false,
        error: error.message,
        latency,
      };
    }
  }

  /**
   * Publish to WebSocket endpoint
   */
  private publishWebSocket(endpoint: string, payload: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(endpoint);

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("WebSocket connection timeout"));
      }, 10000);

      ws.on("open", () => {
        clearTimeout(timeout);

        const message = JSON.stringify(payload);
        ws.send(message);

        // Wait for confirmation or close
        setTimeout(() => {
          ws.close();
          resolve("Sent via WebSocket");
        }, 1000);
      });

      ws.on("error", (error) => {
        clearTimeout(timeout);
        ws.close();
        reject(error);
      });

      ws.on("message", (data) => {
        Logger.info(`WebSocket response: ${data}`);
      });
    });
  }

  /**
   * Validate endpoint URL
   */
  validateEndpoint(endpoint: string): { valid: boolean; error?: string } {
    try {
      const url = new URL(endpoint);
      const protocol = url.protocol.replace(":", "");

      const supportedProtocols = [
        "http",
        "https",
        "mqtt",
        "mqtts",
        "ws",
        "wss",
      ];

      if (!supportedProtocols.includes(protocol)) {
        return {
          valid: false,
          error: `Unsupported protocol: ${protocol}. Supported: ${supportedProtocols.join(", ")}`,
        };
      }

      // MQTT requires topic in path
      if ((protocol === "mqtt" || protocol === "mqtts") && !url.pathname) {
        return {
          valid: false,
          error:
            "MQTT endpoint requires topic in path (e.g., mqtt://host:port/topic)",
        };
      }

      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        error: `Invalid URL: ${error.message}`,
      };
    }
  }
}

// Singleton instance
export const transportRouter = new TransportRouter();
