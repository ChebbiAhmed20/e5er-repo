import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { dentistController } from "./dentist.controller.js";
import { updateProfileSchema } from "./dentist.dto.js";

export const dentistRoutes = Router();

dentistRoutes.get("/profile", authenticate, dentistController.getProfile);
dentistRoutes.put("/profile", authenticate, validate(updateProfileSchema), dentistController.updateProfile);
