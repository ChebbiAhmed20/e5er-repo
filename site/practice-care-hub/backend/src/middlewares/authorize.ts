import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { UserRole } from "../core/types/auth.js";
import { AppError } from "../core/errors/AppError.js";

export const authorize = (...roles: UserRole[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError("Unauthorized", StatusCodes.UNAUTHORIZED, "UNAUTHORIZED"));
  }

  if (!roles.includes(req.user.role)) {
    return next(new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN"));
  }

  return next();
};
