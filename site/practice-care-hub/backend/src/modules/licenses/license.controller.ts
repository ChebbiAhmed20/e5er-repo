import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/AppError.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { licenseService } from "./license.service.js";

export const licenseController = {
  getCurrent: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.dentistId) {
      throw new AppError("Dentist context missing", StatusCodes.FORBIDDEN, "DENTIST_CONTEXT_REQUIRED");
    }
    const license = await licenseService.getCurrent(req.user!.dentistId!);
    res.status(StatusCodes.OK).json({ success: true, data: license });
  }),

  getStatus: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.dentistId) {
      throw new AppError("Dentist context missing", StatusCodes.FORBIDDEN, "DENTIST_CONTEXT_REQUIRED");
    }
    const status = await licenseService.getStatus(req.user!.dentistId!);
    res.status(StatusCodes.OK).json({ success: true, data: status });
  }),

  activate: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.dentistId) {
      throw new AppError("Dentist context missing", StatusCodes.FORBIDDEN, "DENTIST_CONTEXT_REQUIRED");
    }
    const { licenseKey } = req.body as { licenseKey: string };
    const result = await licenseService.activate(req.user!.dentistId!, licenseKey);
    res.status(StatusCodes.OK).json({ success: true, data: result });
  }),
};
