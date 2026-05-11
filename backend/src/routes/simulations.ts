import { Router } from "express";
import { SimulationController } from "../controllers/simulationController";
import { authMiddleware } from "../middleware/auth";

const router = Router();
const simulationController = new SimulationController();

router.use(authMiddleware);

router.post("/start", simulationController.start);
router.post("/stop", simulationController.stop);
router.get("/:projectId/status", simulationController.getStatus);
router.get("/:projectId/stats", simulationController.getStats);

export default router;
