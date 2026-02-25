import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/AppError.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { reminderService } from "./reminder.service.js";

export const reminderController = {
  getStats: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.dentistId) {
      throw new AppError("Dentist context missing", StatusCodes.FORBIDDEN, "DENTIST_CONTEXT_REQUIRED");
    }

    const stats = await reminderService.getStats(req.user.dentistId);
    res.status(StatusCodes.OK).json({ success: true, data: stats });
  }),
};
