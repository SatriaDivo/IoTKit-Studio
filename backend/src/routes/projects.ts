import { Router } from "express";
import { ProjectController } from "../controllers/projectController";
import { authMiddleware } from "../middleware/auth";

const router = Router();
const projectController = new ProjectController();

router.use(authMiddleware);

router.get("/", projectController.getAll);
router.get("/:id", projectController.getById);
router.post("/", projectController.create);
router.put("/:id", projectController.update);
router.delete("/:id", projectController.delete);
router.post("/:id/test-connection", projectController.testConnection);

export default router;
