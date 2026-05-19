import express from "express";
import {
  createAuthConfig,
  getAuthConfigsByProject,
  getAuthConfigById,
  updateAuthConfig,
  deleteAuthConfig,
  testAuthConfig,
  refreshToken,
  getRefreshLogs,
} from "../controllers/authConfigController";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Auth config CRUD (Frontend Aligned)
router.post("/auth-config", createAuthConfig);
router.get("/auth-config/project/:projectId", getAuthConfigsByProject);
router.get("/auth-config/:id", getAuthConfigById);
router.put("/auth-config/:id", updateAuthConfig);
router.delete("/auth-config/:id", deleteAuthConfig);

// Test and manual refresh (Frontend Aligned)
router.post("/auth-config/:id/test", testAuthConfig);
router.post("/auth-config/:id/refresh", refreshToken);

// Logs (Frontend Aligned)
router.get("/auth-config/:authConfigId/logs", getRefreshLogs);

export default router;
