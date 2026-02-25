import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import { systemController } from "./system.controller.js";

export const systemRoutes = Router();

// GET /api/v1/system/status          — authenticated: dentist system status
systemRoutes.get("/status", authenticate, systemController.getStatus);

// GET /api/v1/system/version?platform=windows   — public: latest app version
systemRoutes.get("/version", systemController.getVersion);

// GET /api/v1/system/compatibility?v=1.0.0&platform=windows  — public: compatibility check
systemRoutes.get("/compatibility", systemController.checkCompatibility);
