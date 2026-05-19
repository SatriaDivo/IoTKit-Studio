import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";
import { Logger } from "./utils/logger";
import * as mqtt from "mqtt";

// Import services
import { schedulerManager } from "./services/scheduler";
import { jobManager } from "./services/jobManager";
import { heraService, droneService, carbonService } from "./modules";
import { startChatCleanupScheduler } from "./services/chatCleanupScheduler";
import { tokenRefreshService } from "./services/tokenRefreshService";

// Import routes
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/projects";
import payloadRoutes from "./routes/payloads";
import simulationRoutes from "./routes/simulations";
import logRoutes from "./routes/logs";
import aiAgentRoutes from "./routes/aiAgent";
import datasetRoutes from "./routes/datasets";
import webhookRoutes from "./routes/webhook";
import webhookManagementRoutes from "./routes/webhookManagement";
import alertRoutes from "./routes/alerts";
import authConfigRoutes from "./routes/authConfig";

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 4000;

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(morgan("dev"));
app.use(rateLimiter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/payloads", payloadRoutes);
app.use("/api/simulations", simulationRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/ai-agent", aiAgentRoutes);
app.use("/api/datasets", datasetRoutes);
app.use("/api/webhook-manage", webhookManagementRoutes);
app.use("/api/webhook", webhookRoutes); // public — must be AFTER management routes
app.use("/api/alerts", alertRoutes);
app.use("/api", authConfigRoutes); // Auth config routes

// Error handler
app.use(errorHandler);

// Socket.IO connection
// Socket.IO connection
const inspectorClients = new Map<string, any>();

io.on("connection", (socket) => {
  Logger.info(`Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    Logger.info(`Client disconnected: ${socket.id}`);
    const client = inspectorClients.get(socket.id);
    if (client) {
      client.end(true);
      inspectorClients.delete(socket.id);
    }
  });

  socket.on("subscribe", (projectId: string) => {
    socket.join(`project:${projectId}`);
    Logger.info(`Client ${socket.id} subscribed to project ${projectId}`);
  });

  socket.on("subscribeWebhook", (token: string) => {
    socket.join(`webhook:${token}`);
    Logger.info(`Client ${socket.id} subscribed to webhook ${token}`);
  });

  socket.on("unsubscribeWebhook", (token: string) => {
    socket.leave(`webhook:${token}`);
  });

  socket.on("unsubscribe", (projectId: string) => {
    socket.leave(`project:${projectId}`);
    Logger.info(`Client ${socket.id} unsubscribed from project ${projectId}`);
  });

  // MQTT Inspector listeners
  socket.on("mqtt-inspector:connect", (config: any) => {
    // Disconnect any existing inspector for this socket first
    const existing = inspectorClients.get(socket.id);
    if (existing) {
      existing.end(true);
      inspectorClients.delete(socket.id);
    }

    try {
      const { broker, clientId, username, password, topics } = config;

      const client = mqtt.connect(broker, {
        clientId:
          clientId || `iotkit_${Math.random().toString(16).substring(2, 10)}`,
        username: username || undefined,
        password: password || undefined,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 0,
      });

      client.on("connect", () => {
        Logger.info(
          `[MQTT-Inspector] Connected to ${broker} on socket ${socket.id}`,
        );
        socket.emit("mqtt-inspector:connected", { broker });

        if (Array.isArray(topics)) {
          topics.forEach((topic: string) => {
            if (topic) {
              client.subscribe(topic, { qos: 1 });
            }
          });
        }
      });

      client.on("message", (topic, message, packet) => {
        socket.emit("mqtt-inspector:message", {
          topic,
          payload: message.toString(),
          qos: packet.qos,
          retained: packet.retain,
          timestamp: new Date().toISOString(),
        });
      });

      client.on("error", (err) => {
        Logger.error(`[MQTT-Inspector] Connection error: ${err.message}`);
        socket.emit("mqtt-inspector:error", { message: err.message });
      });

      inspectorClients.set(socket.id, client);
    } catch (err: any) {
      socket.emit("mqtt-inspector:error", {
        message: err.message || "Failed to initiate connection",
      });
    }
  });

  socket.on("mqtt-inspector:subscribe", (topics: string[]) => {
    const client = inspectorClients.get(socket.id);
    if (client && client.connected && Array.isArray(topics)) {
      topics.forEach((topic) => {
        if (topic) client.subscribe(topic, { qos: 1 });
      });
    }
  });

  socket.on("mqtt-inspector:publish", (data: any) => {
    const client = inspectorClients.get(socket.id);
    const { topic, message } = data;
    if (client && client.connected && topic) {
      client.publish(topic, message, { qos: 1 });
    }
  });

  socket.on("mqtt-inspector:disconnect", () => {
    const client = inspectorClients.get(socket.id);
    if (client) {
      client.end(true);
      inspectorClients.delete(socket.id);
    }
    socket.emit("mqtt-inspector:disconnected");
  });
});

// Export io for use in other modules
export { io };

// Initialize services
async function initializeServices() {
  try {
    // Start scheduler
    schedulerManager.start();
    Logger.info("✅ Scheduler started");

    // Start chat cleanup scheduler (runs daily at 00:00)
    startChatCleanupScheduler();
    Logger.info("✅ Chat cleanup scheduler started");

    // Start token refresh service (runs every 5 minutes)
    tokenRefreshService.start();
    Logger.info("✅ Token refresh service started");

    // Register modules
    jobManager.registerModule("hera", heraService);
    jobManager.registerModule("drone", droneService);
    jobManager.registerModule("carbon", carbonService);
    Logger.info("✅ Modules registered: HERA, DRONE, Carbon");

    Logger.info("✅ All services initialized");
  } catch (error: any) {
    Logger.error("❌ Failed to initialize services:", error);
    process.exit(1);
  }
}

// Start server
httpServer.listen(PORT, async () => {
  Logger.info(`🚀 IoTKit-Studio Backend running on port ${PORT}`);
  Logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);

  // Initialize services after server starts
  await initializeServices();
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  Logger.info(`${signal} signal received: closing HTTP server`);

  // Shutdown job manager
  await jobManager.shutdown();

  // Shutdown scheduler
  schedulerManager.shutdown();

  // Shutdown token refresh service
  tokenRefreshService.stop();

  // Close HTTP server
  httpServer.close(() => {
    Logger.info("HTTP server closed");
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    Logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
