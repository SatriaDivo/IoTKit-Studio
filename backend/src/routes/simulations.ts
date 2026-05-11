import { Router } from "express";
import { SimulationController } from "../controllers/simulationController";
import { authMiddleware } from "../middleware/auth";

const router = Router();
const simulationController = new SimulationController();

router.use(authMiddleware);

router.post("/start", simulationController.start);
router.post("/stop", simulationController.stop);
router.get("/status/:projectId", simulationController.getStatus);
router.get("/stats/:projectId", simulationController.getStats);

export default router;
