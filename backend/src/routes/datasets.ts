import { Router } from "express";
import { DatasetController } from "../controllers/datasetController";
import { authMiddleware } from "../middleware/auth";

const router = Router();
const datasetController = new DatasetController();

router.use(authMiddleware);

router.post("/upload", datasetController.upload.bind(datasetController));
router.get("/", datasetController.getAll.bind(datasetController));
router.get("/:id", datasetController.getById.bind(datasetController));
router.put("/:id/name", datasetController.updateName.bind(datasetController));
router.delete("/:id", datasetController.delete.bind(datasetController));

export default router;
