import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/AppError.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { systemService } from "./system.service.js";

export const systemController = {
  getStatus: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.dentistId) {
      throw new AppError("Dentist context missing", StatusCodes.FORBIDDEN, "DENTIST_CONTEXT_REQUIRED");
    }
    const status = await systemService.getStatus(req.user.dentistId);
    res.status(StatusCodes.OK).json({ success: true, data: status });
  }),

  getVersion: asyncHandler(async (req: Request, res: Response) => {
    const platform = (req.query["platform"] as string) ?? "windows";
    const version = await systemService.getLatestVersion(platform);
    res.status(StatusCodes.OK).json({ success: true, data: version });
  }),

  checkCompatibility: asyncHandler(async (req: Request, res: Response) => {
    const appVersion = (req.query["v"] as string) ?? "0.0.0";
    const platform = (req.query["platform"] as string) ?? "windows";
    const result = await systemService.checkCompatibility(appVersion, platform);
    res.status(StatusCodes.OK).json({ success: true, data: result });
  }),
};
