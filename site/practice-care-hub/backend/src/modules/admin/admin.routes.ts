import { Router } from "express";
import { adminController } from "./admin.controller.js";

const router = Router();

router.get("/clients", adminController.getClients);
router.get("/stats", adminController.getStats);
router.post("/license/grant", adminController.grantLicense);

export default router;
