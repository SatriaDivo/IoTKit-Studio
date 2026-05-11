import { Router } from "express";
import { LogController } from "../controllers/logController";
import { authMiddleware } from "../middleware/auth";

const router = Router();
const logController = new LogController();

router.use(authMiddleware);

router.get("/", logController.getAll);
router.get("/project/:projectId", logController.getByProject);
router.get("/:id", logController.getById);
router.delete("/:id", logController.delete);
router.delete("/project/:projectId/clear", logController.clearByProject);

export default router;
