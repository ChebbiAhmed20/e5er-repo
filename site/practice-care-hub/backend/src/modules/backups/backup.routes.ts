import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { backupController } from "./backup.controller.js";
import { importBackupSchema, uploadBackupSchema } from "./backup.dto.js";

export const backupRoutes = Router();

// GET  /api/v1/backups/latest — latest backup (backward compat)
backupRoutes.get("/latest", authenticate, backupController.getLatest);

// GET  /api/v1/backups         — list all backups (paginated)
backupRoutes.get("/", authenticate, backupController.list);

// GET  /api/v1/backups/:id     — get backup by ID
backupRoutes.get("/:id", authenticate, backupController.getById);

// POST /api/v1/backups/upload  — register backup metadata (desktop uploads file separately to storage)
backupRoutes.post("/upload", authenticate, validate(uploadBackupSchema), backupController.upload);

// POST /api/v1/backups/:id/restore — mark backup as restored / imported
backupRoutes.post("/:id/restore", authenticate, backupController.restore);

// POST /api/v1/backups/import — legacy alias kept for backward compat
backupRoutes.post("/import", authenticate, validate(importBackupSchema), backupController.importBackup);
