import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { Project } from "../../types";
import { Logger } from "../../utils/logger";

export class HttpClient {
  private client: AxiosInstance;
  private project: Project;

  constructor(project: Project) {
    this.project = project;

    const baseURL = `${project.protocol.toLowerCase()}://${project.host}${
      project.port ? `:${project.port}` : ""
    }`;

    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        ...(project.authToken && {
          Authorization: `Bearer ${project.authToken}`,
        }),
      },
    });
  }

  async send(payload: any, method: string = "POST"): Promise<any> {
    const startTime = Date.now();

    try {
      const config: AxiosRequestConfig = {
        method: method.toUpperCase(),
        url: this.project.endpoint || "/",
        ...(method.toUpperCase() !== "GET" && { data: payload }),
      };

      const response = await this.client.request(config);
      const latency = Date.now() - startTime;

      Logger.info(`HTTP ${method} success:`, {
        url: config.url,
        status: response.status,
        latency: `${latency}ms`,
      });

      return {
        success: true,
        statusCode: response.status,
        data: response.data,
        latency,
      };
    } catch (error: any) {
      const latency = Date.now() - startTime;

      Logger.error(`HTTP ${method} error:`, error.message);

      return {
        success: false,
        statusCode: error.response?.status || 500,
        error: error.message,
        data: error.response?.data,
        latency,
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.get(this.project.endpoint || "/");
      return true;
    } catch (error) {
      return false;
    }
  }
}
