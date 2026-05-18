import { Router } from "express";
import { WebhookController } from "../controllers/webhookController";
import { authMiddleware } from "../middleware/auth";

const router = Router();
const webhookController = new WebhookController();

// Auth-protected management routes
router.use(authMiddleware);
router.post("/generate/:projectId", webhookController.generate);
router.delete("/clear/:projectId", webhookController.clear);
router.get("/history/:projectId", webhookController.getHistory);
router.get("/info/:projectId", webhookController.getInfo);

export default router;
