import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/AppError.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { dentistService } from "./dentist.service.js";

const getDentistId = (req: Request) => {
  if (!req.user?.dentistId) {
    throw new AppError("Dentist context missing", StatusCodes.FORBIDDEN, "DENTIST_CONTEXT_REQUIRED");
  }
  return req.user.dentistId;
};

export const dentistController = {
  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const profile = await dentistService.getProfile(getDentistId(req));
    res.status(StatusCodes.OK).json({ success: true, data: profile });
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const profile = await dentistService.updateProfile(getDentistId(req), req.body);
    res.status(StatusCodes.OK).json({ success: true, data: profile });
  }),
};
