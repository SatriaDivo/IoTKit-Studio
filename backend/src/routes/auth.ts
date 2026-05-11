import { Router } from "express";
import { AuthController } from "../controllers/authController";

const router = Router();
const authController = new AuthController();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", authController.getMe);

export default router;
