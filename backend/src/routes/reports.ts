import { Router } from "express";
import { ReportController } from "../controllers/reportController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Protected export reports route
router.post("/export", authMiddleware, ReportController.export);

export default router;
