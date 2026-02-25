import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { adminService } from "./admin.service.js";

export const adminController = {
    getClients: asyncHandler(async (_req: Request, res: Response) => {
        const result = await adminService.getClients();
        res.status(StatusCodes.OK).json({ success: true, data: result });
    }),

    getStats: asyncHandler(async (_req: Request, res: Response) => {
        const result = await adminService.getStats();
        res.status(StatusCodes.OK).json({ success: true, data: result });
    }),

    grantLicense: asyncHandler(async (req: Request, res: Response) => {
        const { dentistId } = req.body;
        if (!dentistId) {
            res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Dentist ID is required" });
            return;
        }
        const result = await adminService.grantFullLicense(dentistId);
        res.status(StatusCodes.OK).json({ success: true, data: result });
    }),
};
