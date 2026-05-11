import { Router } from "express";
import { PayloadController } from "../controllers/payloadController";
import { authMiddleware } from "../middleware/auth";

const router = Router();
const payloadController = new PayloadController();

router.use(authMiddleware);

router.get("/project/:projectId", payloadController.getByProject);
router.get("/:id", payloadController.getById);
router.post("/", payloadController.create);
router.put("/:id", payloadController.update);
router.delete("/:id", payloadController.delete);
router.post("/generate", payloadController.generatePayload);

export default router;
