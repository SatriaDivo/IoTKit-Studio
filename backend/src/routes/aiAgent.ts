import { Router } from "express";
import { AIAgentController } from "../controllers/aiAgentController";
import { authMiddleware } from "../middleware/auth";

const router = Router();
const controller = new AIAgentController();

// All routes require authentication
router.use(authMiddleware);

// Session management
router.get("/sessions", (req, res) => controller.getSessions(req, res));
router.get("/sessions/current", (req, res) =>
  controller.getCurrentSession(req, res),
);
router.post("/sessions", (req, res) => controller.createSession(req, res));
router.delete("/sessions/:id", (req, res) =>
  controller.deleteSession(req, res),
);

// Chat with AI
router.post("/chat", (req, res) => controller.chat(req, res));

// Execute action (create project, payload, etc)
router.post("/execute", (req, res) => controller.executeAction(req, res));

// Get available models
router.get("/models", (req, res) => controller.getModels(req, res));

// Get usage stats
router.get("/usage", (req, res) => controller.getUsage(req, res));

export default router;
