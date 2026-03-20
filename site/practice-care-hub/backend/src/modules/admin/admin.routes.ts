import { Router } from "express";
import { adminController } from "./admin.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";

const router = Router();

router.get("/clients", authenticate, authorize("admin"), adminController.getClients);
router.get("/stats", authenticate, authorize("admin"), adminController.getStats);
router.post("/license/grant", authenticate, authorize("admin"), adminController.grantLicense);

export default router;