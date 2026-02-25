import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { licenseController } from "./license.controller.js";
import { activateLicenseSchema } from "./license.dto.js";

export const licenseRoutes = Router();

// GET /api/v1/licenses/current  — existing, kept for backward compat
licenseRoutes.get("/current", authenticate, licenseController.getCurrent);

// GET /api/v1/licenses/status  — enriched status for desktop app
licenseRoutes.get("/status", authenticate, licenseController.getStatus);

// POST /api/v1/licenses/activate  — remote license key activation
licenseRoutes.post("/activate", authenticate, validate(activateLicenseSchema), licenseController.activate);
