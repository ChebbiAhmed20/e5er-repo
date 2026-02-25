import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../core/errors/AppError.js";
import { verifyAccessToken } from "../shared/utils/token.js";

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!token) {
    return next(new AppError("Missing bearer token", StatusCodes.UNAUTHORIZED, "UNAUTHORIZED"));
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return next(new AppError("Invalid or expired token", StatusCodes.UNAUTHORIZED, "INVALID_TOKEN"));
  }

  req.user = payload;
  return next();
};
