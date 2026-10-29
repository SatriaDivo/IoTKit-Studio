export interface User {
  id: string;
  email: string;
  name?: string;
  role?: "admin" | "operator" | string;
  projectCount?: number;
  createdAt: string;
  updatedAt: string;
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
  webhookToken?: string;
  webhookEnabled?: boolean;
  headers?: string;
  status: ProjectStatus;
  lastActivity?: string;
  createdAt: string;
  updatedAt: string;
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
  structure: string;
  template: boolean;
  createdAt: string;
  updatedAt: string;
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
  startedAt?: string;
  stoppedAt?: string;
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
  timestamp: string;
  projectId: string;
}

export interface DashboardStats {
  totalProjects: number;
  activeConnections: number;
  totalPayloadSent: number;
  connectedDevices: number;
}

export interface Dataset {
  id: string;
  name: string;
  moduleName: string;
  fileName: string;
  filePath: string;
  filePathRelative?: string;
  fileSizeBytes: number;
  checksumSha256: string;
  delimiter?: string;
  loadedRows: number;
  skippedRows: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
