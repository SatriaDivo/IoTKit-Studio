export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  protocol: ProtocolType;
  host: string;
  port?: number;
  endpoint?: string;
  topic?: string;
  authToken?: string;
  username?: string;
  password?: string;
  sslEnabled: boolean;
  autoReconnect: boolean;
  status: ProjectStatus;
  lastActivity?: Date;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export type ProtocolType = "HTTP" | "HTTPS" | "MQTT" | "MQTTS" | "WS" | "WSS";
export type ProjectStatus = "active" | "inactive" | "error";

export interface PayloadField {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  mode: "random" | "static" | "incremental" | "timestamp";
  value?: any;
  min?: number;
  max?: number;
  unit?: string;
  required: boolean;
  children?: PayloadField[];
}

export interface Payload {
  id: string;
  name: string;
  structure: PayloadField[];
  template: boolean;
  createdAt: Date;
  updatedAt: Date;
  projectId: string;
}

export interface Simulation {
  id: string;
  status: "running" | "stopped" | "paused";
  interval: number;
  batchSize: number;
  totalSent: number;
  successCount: number;
  errorCount: number;
  startedAt?: Date;
  stoppedAt?: Date;
  projectId: string;
}

export interface Log {
  id: string;
  type: "request" | "response" | "error" | "event";
  protocol: string;
  message: string;
  payload?: any;
  statusCode?: number;
  latency?: number;
  timestamp: Date;
  projectId: string;
}

export interface AuthPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends AuthPayload {
  name?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
}

export interface SimulationConfig {
  projectId: string;
  payloadStructure: PayloadField[];
  interval: number;
  batchSize: number;
  swarmMode?: boolean;
  swarmCount?: number;
  stages?: LoadTestStage[];
}

export interface LoadTestStage {
  duration: number; // in seconds
  target: number; // target VUs
}

export interface SimulationStats {
  totalSent: number;
  successCount: number;
  errorCount: number;
  startTime: number;
  vus: number;
  iterations: number;
  http_req_duration: {
    avg: number;
    min: number;
    med: number;
    max: number;
    p90: number;
    p95: number;
  };
  http_reqs: number; // Total requests completed
  rps: number; // Requests per second
}

export interface ConnectionStatus {
  projectId: string;
  connected: boolean;
  latency?: number;
  error?: string;
}
