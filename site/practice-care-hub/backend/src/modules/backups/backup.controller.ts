import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/AppError.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { backupService } from "./backup.service.js";

export const backupController = {
  getLatest: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.dentistId) throw new AppError("Dentist context missing", StatusCodes.FORBIDDEN, "DENTIST_CONTEXT_REQUIRED");
    const backup = await backupService.getLatest(req.user!.dentistId!);
    res.status(StatusCodes.OK).json({ success: true, data: backup });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.dentistId) throw new AppError("Dentist context missing", StatusCodes.FORBIDDEN, "DENTIST_CONTEXT_REQUIRED");
    const page = Number(req.query["page"]) || 1;
    const pageSize = Number(req.query["pageSize"]) || 20;
    const backups = await backupService.list(req.user!.dentistId!, page, pageSize);
    res.status(StatusCodes.OK).json({ success: true, data: backups });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.dentistId) throw new AppError("Dentist context missing", StatusCodes.FORBIDDEN, "DENTIST_CONTEXT_REQUIRED");
    const backup = await backupService.getById(req.user!.dentistId!, req.params["id"]!);
    res.status(StatusCodes.OK).json({ success: true, data: backup });
  }),

  upload: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.dentistId) throw new AppError("Dentist context missing", StatusCodes.FORBIDDEN, "DENTIST_CONTEXT_REQUIRED");
    const backup = await backupService.upload(req.user!.dentistId!, req.body);
    res.status(StatusCodes.CREATED).json({ success: true, data: backup });
  }),

  restore: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.dentistId) throw new AppError("Dentist context missing", StatusCodes.FORBIDDEN, "DENTIST_CONTEXT_REQUIRED");
    const result = await backupService.restore(req.user!.dentistId!, req.params["id"]!);
    res.status(StatusCodes.OK).json({ success: true, data: result });
  }),

  importBackup: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.dentistId) throw new AppError("Dentist context missing", StatusCodes.FORBIDDEN, "DENTIST_CONTEXT_REQUIRED");
    const { backupId } = req.body as { backupId: string };
    const result = await backupService.restore(req.user!.dentistId!, backupId);
    res.status(StatusCodes.OK).json({ success: true, data: result });
  }),
};
