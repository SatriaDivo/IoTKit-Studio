import { Router } from "express";
import { WebhookController } from "../controllers/webhookController";
import { authMiddleware } from "../middleware/auth";

const router = Router();
const webhookController = new WebhookController();

// Public endpoint — receives webhook data (no auth required)
router.all("/:token", webhookController.receive);

export default router;
