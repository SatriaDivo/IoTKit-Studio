import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";
import { Logger } from "./utils/logger";

// Import services
import { schedulerManager } from "./services/scheduler";
import { jobManager } from "./services/jobManager";
import { heraService, droneService, carbonService } from "./modules";

// Import routes
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/projects";
import payloadRoutes from "./routes/payloads";
import simulationRoutes from "./routes/simulations";
import logRoutes from "./routes/logs";
import aiAgentRoutes from "./routes/aiAgent";

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

// Error handler
app.use(errorHandler);

// Socket.IO connection
io.on("connection", (socket) => {
  Logger.info(`Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    Logger.info(`Client disconnected: ${socket.id}`);
  });

  socket.on("subscribe", (projectId: string) => {
    socket.join(`project:${projectId}`);
    Logger.info(`Client ${socket.id} subscribed to project ${projectId}`);
  });

  socket.on("unsubscribe", (projectId: string) => {
    socket.leave(`project:${projectId}`);
    Logger.info(`Client ${socket.id} unsubscribed from project ${projectId}`);
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
