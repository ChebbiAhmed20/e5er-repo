import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import { reminderController } from "./reminder.controller.js";

export const reminderRoutes = Router();

reminderRoutes.get("/stats", authenticate, reminderController.getStats);
