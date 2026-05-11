import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";
import { Logger } from "./utils/logger";

// Import routes
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/projects";
import payloadRoutes from "./routes/payloads";
import simulationRoutes from "./routes/simulations";
import logRoutes from "./routes/logs";

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

// Start server
httpServer.listen(PORT, () => {
  Logger.info(`🚀 IoTKit-Studio Backend running on port ${PORT}`);
  Logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  Logger.info("SIGTERM signal received: closing HTTP server");
  httpServer.close(() => {
    Logger.info("HTTP server closed");
    process.exit(0);
  });
});
