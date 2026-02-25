import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { dentistRoutes } from "./modules/dentist/dentist.routes.js";
import { licenseRoutes } from "./modules/licenses/license.routes.js";
import { backupRoutes } from "./modules/backups/backup.routes.js";
import { reminderRoutes } from "./modules/reminders/reminder.routes.js";
import { systemRoutes } from "./modules/system/system.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFoundHandler } from "./middlewares/notFound.js";
import { apiRateLimiter } from "./middlewares/rateLimit.js";

export const app = express();

app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(cors({
  origin: [
    ...env.CORS_ORIGIN.split(",").map(o => o.trim()),
    "http://localhost:8080",
    "http://localhost:8082"
  ],
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(compression());
app.use(apiRateLimiter);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

const apiV1 = express.Router();
apiV1.use("/admin", adminRoutes);
apiV1.use("/auth", authRoutes);
apiV1.use("/dentist", dentistRoutes);
apiV1.use("/licenses", licenseRoutes);
apiV1.use("/backups", backupRoutes);
apiV1.use("/reminders", reminderRoutes);
apiV1.use("/system", systemRoutes);

app.use(env.API_PREFIX, apiV1);

app.use(notFoundHandler);
app.use(errorHandler);
