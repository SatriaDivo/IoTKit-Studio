import express from "express";
import {
  upsertAuthConfig,
  getAuthConfig,
  deleteAuthConfig,
  testAuthConfig,
  refreshToken,
  getRefreshLogs,
} from "../controllers/authConfigController";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Auth config CRUD
router.post("/projects/:projectId/auth-config", upsertAuthConfig);
router.get("/projects/:projectId/auth-config", getAuthConfig);
router.delete("/projects/:projectId/auth-config", deleteAuthConfig);

// Test and refresh
router.post("/projects/:projectId/auth-config/test", testAuthConfig);
router.post("/projects/:projectId/auth-config/refresh", refreshToken);

// Logs
router.get("/projects/:projectId/auth-config/logs", getRefreshLogs);

export default router;
