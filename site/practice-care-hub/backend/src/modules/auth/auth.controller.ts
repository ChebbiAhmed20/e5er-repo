import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { authService } from "./auth.service.js";

export const authController = {
  signUp: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.signUp(req.body);
    res.status(StatusCodes.CREATED).json({ success: true, data: result });
  }),

  signIn: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.signIn(req.body);
    res.status(StatusCodes.OK).json({ success: true, data: result });
  }),

  refreshToken: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.refreshToken(req.body);
    res.status(StatusCodes.OK).json({ success: true, data: result });
  }),

  signOut: asyncHandler(async (req: Request, res: Response) => {
    await authService.signOut(req.body);
    res.status(StatusCodes.NO_CONTENT).send();
  }),

  getMe: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Unauthorized" });
      return;
    }
    const result = await authService.getMe(req.user.sub);
    res.status(StatusCodes.OK).json({ success: true, data: result });
  }),
};
