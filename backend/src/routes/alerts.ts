import { Router } from "express";
import { AlertController } from "../controllers/alertController";
import { authMiddleware } from "../middleware/auth";

const router = Router();
const alertController = new AlertController();

router.use(authMiddleware);

router.get("/rules/project/:projectId", alertController.getRulesByProject);
router.post("/rules", alertController.createRule);
router.put("/rules/:id", alertController.updateRule);
router.delete("/rules/:id", alertController.deleteRule);
router.get("/history/project/:projectId", alertController.getHistoryByProject);
router.post("/history/clear/:projectId", alertController.clearHistoryByProject);

export default router;
